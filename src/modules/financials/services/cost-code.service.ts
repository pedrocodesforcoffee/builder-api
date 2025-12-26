import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CostCode } from '../entities/cost-code.entity';
import { Project } from '../../projects/entities/project.entity';
import {
  CreateCostCodeDto,
  UpdateCostCodeDto,
  CostCodeResponseDto,
  CostCodeQueryDto,
  CostCodeTreeDto,
} from '../dto';

/**
 * CostCode Service
 *
 * Handles business logic for cost code management including:
 * - CRUD operations for cost codes
 * - Hierarchical code path generation (fullCode computation)
 * - CSI MasterFormat division validation
 * - Template vs project-specific code management
 * - Code uniqueness validation within project/templates
 * - Soft delete via isActive flag
 *
 * @service CostCodeService
 */
@Injectable()
export class CostCodeService {
  private readonly logger = new Logger(CostCodeService.name);

  constructor(
    @InjectRepository(CostCode)
    private readonly costCodeRepo: Repository<CostCode>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  /**
   * Create a new cost code
   *
   * Validates project exists (if projectId provided).
   * Generates fullCode from parent chain.
   * Ensures code uniqueness within project or templates.
   *
   * @param createDto - Cost code creation data
   * @returns Created cost code
   * @throws NotFoundException if project or parent doesn't exist
   * @throws ConflictException if code already exists in project/templates
   * @throws BadRequestException if division is invalid or parent is in different project
   */
  async create(createDto: CreateCostCodeDto): Promise<CostCodeResponseDto> {
    this.logger.log(
      `Creating cost code "${createDto.code}" for project ${createDto.projectId || 'template'}`,
    );

    // Validate project exists if projectId is provided
    if (createDto.projectId) {
      const project = await this.projectRepo.findOne({
        where: { id: createDto.projectId },
      });

      if (!project) {
        throw new NotFoundException(
          `Project with ID ${createDto.projectId} not found`,
        );
      }
    }

    // Validate parent exists and belongs to same project (if parentId provided)
    let parent: CostCode | null = null;
    if (createDto.parentId) {
      parent = await this.costCodeRepo.findOne({
        where: { id: createDto.parentId },
      });

      if (!parent) {
        throw new NotFoundException(
          `Parent cost code with ID ${createDto.parentId} not found`,
        );
      }

      // Ensure parent belongs to same project (or both are templates)
      if (parent.projectId !== createDto.projectId) {
        throw new BadRequestException(
          'Parent cost code must belong to the same project or both must be templates',
        );
      }
    }

    // Check if code already exists in this project/templates
    const existingCode = await this.costCodeRepo.findOne({
      where: {
        projectId: createDto.projectId || undefined,
        code: createDto.code,
      },
    });

    if (existingCode) {
      const scope = createDto.projectId ? 'this project' : 'templates';
      throw new ConflictException(
        `Cost code "${createDto.code}" already exists in ${scope}`,
      );
    }

    // Generate fullCode from parent chain
    const fullCode = await this.generateFullCode(createDto.code, parent);

    // Create cost code
    const costCode = this.costCodeRepo.create({
      ...createDto,
      fullCode,
    });

    const savedCostCode = await this.costCodeRepo.save(costCode);

    this.logger.log(
      `Cost code created successfully: ${savedCostCode.id} (${savedCostCode.fullCode})`,
    );

    return this.toResponseDto(savedCostCode);
  }

  /**
   * List all cost codes
   *
   * Optionally filter by:
   * - Project (or templates if projectId is 'template')
   * - Division
   * - Active status
   * - Parent (for getting direct children)
   *
   * @param projectId - Filter to specific project or 'template' for templates (optional)
   * @param division - Filter to specific division (optional)
   * @param isActive - Filter by active status (default: true)
   * @param parentId - Filter to direct children of parent (optional, null for root codes)
   * @returns Array of cost codes
   */
  async findAll(
    projectId?: string,
    division?: number,
    isActive = true,
    parentId?: string | null,
  ): Promise<CostCodeResponseDto[]> {
    this.logger.log(
      `Fetching cost codes - projectId: ${projectId}, division: ${division}, isActive: ${isActive}, parentId: ${parentId}`,
    );

    const queryBuilder = this.costCodeRepo.createQueryBuilder('cost_code');

    // Filter by project or templates
    if (projectId === 'template') {
      queryBuilder.andWhere('cost_code.project_id IS NULL');
    } else if (projectId) {
      queryBuilder.andWhere('cost_code.project_id = :projectId', {
        projectId,
      });
    }

    // Filter by division
    if (division !== undefined) {
      queryBuilder.andWhere('cost_code.division = :division', { division });
    }

    // Filter by active status
    queryBuilder.andWhere('cost_code.is_active = :isActive', { isActive });

    // Filter by parent
    if (parentId === null) {
      // Root-level codes only
      queryBuilder.andWhere('cost_code.parent_id IS NULL');
    } else if (parentId) {
      // Direct children of specific parent
      queryBuilder.andWhere('cost_code.parent_id = :parentId', { parentId });
    }

    // Order by division, then sort order, then code
    queryBuilder.orderBy('cost_code.division', 'ASC');
    queryBuilder.addOrderBy('cost_code.sort_order', 'ASC');
    queryBuilder.addOrderBy('cost_code.code', 'ASC');

    const costCodes = await queryBuilder.getMany();

    this.logger.log(`Found ${costCodes.length} cost codes`);

    return costCodes.map((code) => this.toResponseDto(code));
  }

  /**
   * Get cost code by ID
   *
   * @param id - Cost code ID
   * @returns Cost code details
   * @throws NotFoundException if cost code doesn't exist
   */
  async findOne(id: string): Promise<CostCodeResponseDto> {
    this.logger.log(`Fetching cost code by ID: ${id}`);

    const costCode = await this.costCodeRepo.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!costCode) {
      throw new NotFoundException(`Cost code with ID ${id} not found`);
    }

    return this.toResponseDto(costCode);
  }

  /**
   * Get cost code by full code within project/templates
   *
   * @param fullCode - Full hierarchical code
   * @param projectId - Project ID or 'template' for templates
   * @returns Cost code details
   * @throws NotFoundException if cost code doesn't exist
   */
  async findByFullCode(
    fullCode: string,
    projectId?: string,
  ): Promise<CostCodeResponseDto> {
    this.logger.log(
      `Fetching cost code by full code: ${fullCode} in project ${projectId || 'template'}`,
    );

    const queryBuilder = this.costCodeRepo
      .createQueryBuilder('cost_code')
      .where('cost_code.full_code = :fullCode', { fullCode });

    if (projectId === 'template') {
      queryBuilder.andWhere('cost_code.project_id IS NULL');
    } else if (projectId) {
      queryBuilder.andWhere('cost_code.project_id = :projectId', {
        projectId,
      });
    }

    const costCode = await queryBuilder.getOne();

    if (!costCode) {
      const scope = projectId ? `project ${projectId}` : 'templates';
      throw new NotFoundException(
        `Cost code with full code "${fullCode}" not found in ${scope}`,
      );
    }

    return this.toResponseDto(costCode);
  }

  /**
   * Get hierarchical tree of cost codes
   *
   * Returns cost codes organized in a tree structure.
   *
   * @param projectId - Filter to specific project or 'template' for templates (optional)
   * @param isActive - Filter by active status (default: true)
   * @returns Hierarchical array of cost codes
   */
  async getTree(
    projectId?: string,
    isActive = true,
  ): Promise<CostCodeResponseDto[]> {
    this.logger.log(
      `Fetching cost code tree for project ${projectId || 'all'}`,
    );

    // Get all cost codes for the project/templates
    const allCodes = await this.findAll(projectId, undefined, isActive);

    // Build tree structure
    const codeMap = new Map<string, any>();
    const rootCodes: any[] = [];

    // First pass: create map of all codes
    allCodes.forEach((code) => {
      codeMap.set(code.id, { ...code, children: [] });
    });

    // Second pass: build tree
    allCodes.forEach((code) => {
      const codeWithChildren = codeMap.get(code.id)!;
      if (code.parentId) {
        const parent = codeMap.get(code.parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(codeWithChildren);
        }
      } else {
        rootCodes.push(codeWithChildren);
      }
    });

    this.logger.log(`Built tree with ${rootCodes.length} root codes`);

    return rootCodes;
  }

  /**
   * Update cost code
   *
   * @param id - Cost code ID
   * @param updateDto - Update data
   * @returns Updated cost code
   * @throws NotFoundException if cost code doesn't exist
   * @throws ConflictException if new code conflicts with existing code
   * @throws BadRequestException if new parent creates circular reference
   */
  async update(
    id: string,
    updateDto: UpdateCostCodeDto,
  ): Promise<CostCodeResponseDto> {
    this.logger.log(`Updating cost code ${id}`);

    const costCode = await this.costCodeRepo.findOne({
      where: { id },
      relations: ['parent'],
    });

    if (!costCode) {
      throw new NotFoundException(`Cost code with ID ${id} not found`);
    }

    // If updating code, check uniqueness within project/templates
    if (updateDto.code && updateDto.code !== costCode.code) {
      const existingCode = await this.costCodeRepo.findOne({
        where: {
          projectId: costCode.projectId || undefined,
          code: updateDto.code,
        },
      });

      if (existingCode && existingCode.id !== id) {
        const scope = costCode.projectId ? 'this project' : 'templates';
        throw new ConflictException(
          `Cost code "${updateDto.code}" already exists in ${scope}`,
        );
      }
    }

    // If updating parent, validate and check for circular reference
    if (updateDto.parentId !== undefined) {
      if (updateDto.parentId === id) {
        throw new BadRequestException(
          'Cost code cannot be its own parent',
        );
      }

      if (updateDto.parentId) {
        const newParent = await this.costCodeRepo.findOne({
          where: { id: updateDto.parentId },
        });

        if (!newParent) {
          throw new NotFoundException(
            `Parent cost code with ID ${updateDto.parentId} not found`,
          );
        }

        // Check parent belongs to same project
        if (newParent.projectId !== costCode.projectId) {
          throw new BadRequestException(
            'Parent cost code must belong to the same project or both must be templates',
          );
        }

        // Check for circular reference
        if (await this.wouldCreateCircularReference(id, updateDto.parentId)) {
          throw new BadRequestException(
            'Cannot set parent: would create circular reference',
          );
        }
      }
    }

    // Regenerate fullCode if code or parent changed
    let newFullCode = costCode.fullCode;
    if (updateDto.code || updateDto.parentId !== undefined) {
      const newCode = updateDto.code || costCode.code;
      const newParentId = updateDto.parentId !== undefined
        ? updateDto.parentId
        : costCode.parentId;

      let parent: CostCode | null = null;
      if (newParentId) {
        parent = await this.costCodeRepo.findOne({
          where: { id: newParentId },
        });
      }

      newFullCode = await this.generateFullCode(newCode, parent);
    }

    // Apply updates
    Object.assign(costCode, {
      ...updateDto,
      fullCode: newFullCode,
    });

    const updatedCostCode = await this.costCodeRepo.save(costCode);

    this.logger.log(`Cost code ${id} updated successfully`);

    // If fullCode changed, update all children
    if (newFullCode !== costCode.fullCode) {
      await this.updateChildrenFullCodes(id);
    }

    return this.toResponseDto(updatedCostCode);
  }

  /**
   * Deactivate cost code (soft delete)
   *
   * Sets isActive to false. Deactivated codes remain in historical data
   * but don't appear in active lists.
   *
   * @param id - Cost code ID
   * @returns Deactivated cost code
   * @throws NotFoundException if cost code doesn't exist
   */
  async deactivate(id: string): Promise<CostCodeResponseDto> {
    this.logger.log(`Deactivating cost code ${id}`);

    const costCode = await this.costCodeRepo.findOne({ where: { id } });

    if (!costCode) {
      throw new NotFoundException(`Cost code with ID ${id} not found`);
    }

    costCode.isActive = false;
    const deactivatedCostCode = await this.costCodeRepo.save(costCode);

    this.logger.log(`Cost code ${id} deactivated successfully`);

    return this.toResponseDto(deactivatedCostCode);
  }

  /**
   * Reactivate cost code
   *
   * Sets isActive to true.
   *
   * @param id - Cost code ID
   * @returns Reactivated cost code
   * @throws NotFoundException if cost code doesn't exist
   */
  async activate(id: string): Promise<CostCodeResponseDto> {
    this.logger.log(`Reactivating cost code ${id}`);

    const costCode = await this.costCodeRepo.findOne({ where: { id } });

    if (!costCode) {
      throw new NotFoundException(`Cost code with ID ${id} not found`);
    }

    costCode.isActive = true;
    const activatedCostCode = await this.costCodeRepo.save(costCode);

    this.logger.log(`Cost code ${id} reactivated successfully`);

    return this.toResponseDto(activatedCostCode);
  }

  /**
   * Delete cost code (hard delete)
   *
   * Permanently removes the cost code.
   * Should only be used if code has no associated budget/commitment items.
   *
   * @param id - Cost code ID
   * @throws NotFoundException if cost code doesn't exist
   * @throws BadRequestException if cost code has children
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Removing cost code ${id}`);

    const costCode = await this.costCodeRepo.findOne({
      where: { id },
      relations: ['children'],
    });

    if (!costCode) {
      throw new NotFoundException(`Cost code with ID ${id} not found`);
    }

    // Check if cost code has children
    if (costCode.children && costCode.children.length > 0) {
      throw new BadRequestException(
        'Cannot delete cost code with children. Delete or reassign children first.',
      );
    }

    // TODO: Check if cost code is referenced by budget line items or commitment items
    // This would require checking budget_line_items and commitment_items tables

    await this.costCodeRepo.remove(costCode);

    this.logger.log(`Cost code ${id} deleted successfully`);
  }

  /**
   * Import CSI MasterFormat template
   *
   * Imports a predefined cost code template (e.g., CSI MasterFormat divisions)
   * into a project.
   *
   * @param projectId - Project ID to import template into
   * @param template - Template identifier (e.g., 'csi-masterformat-2020')
   * @param userId - User ID for audit purposes
   * @returns Array of imported cost codes
   * @throws NotFoundException if project doesn't exist
   * @throws BadRequestException if template is invalid
   */
  async importTemplate(
    projectId: string,
    template: string,
    userId: string,
  ): Promise<CostCodeResponseDto[]> {
    this.logger.log(
      `Importing template "${template}" into project ${projectId}`,
    );

    // Validate project exists
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Define template data (CSI MasterFormat 2020 divisions as example)
    const templates: Record<string, any[]> = {
      'csi-masterformat-2020': [
        { code: '01', division: 1, name: 'General Requirements', sortOrder: 1 },
        { code: '02', division: 2, name: 'Existing Conditions', sortOrder: 2 },
        { code: '03', division: 3, name: 'Concrete', sortOrder: 3 },
        { code: '04', division: 4, name: 'Masonry', sortOrder: 4 },
        { code: '05', division: 5, name: 'Metals', sortOrder: 5 },
        { code: '06', division: 6, name: 'Wood, Plastics, and Composites', sortOrder: 6 },
        { code: '07', division: 7, name: 'Thermal and Moisture Protection', sortOrder: 7 },
        { code: '08', division: 8, name: 'Openings', sortOrder: 8 },
        { code: '09', division: 9, name: 'Finishes', sortOrder: 9 },
        { code: '10', division: 10, name: 'Specialties', sortOrder: 10 },
        { code: '11', division: 11, name: 'Equipment', sortOrder: 11 },
        { code: '12', division: 12, name: 'Furnishings', sortOrder: 12 },
        { code: '13', division: 13, name: 'Special Construction', sortOrder: 13 },
        { code: '14', division: 14, name: 'Conveying Equipment', sortOrder: 14 },
        { code: '21', division: 21, name: 'Fire Suppression', sortOrder: 15 },
        { code: '22', division: 22, name: 'Plumbing', sortOrder: 16 },
        { code: '23', division: 23, name: 'Heating, Ventilating, and Air Conditioning (HVAC)', sortOrder: 17 },
        { code: '25', division: 25, name: 'Integrated Automation', sortOrder: 18 },
        { code: '26', division: 26, name: 'Electrical', sortOrder: 19 },
        { code: '27', division: 27, name: 'Communications', sortOrder: 20 },
        { code: '28', division: 28, name: 'Electronic Safety and Security', sortOrder: 21 },
        { code: '31', division: 31, name: 'Earthwork', sortOrder: 22 },
        { code: '32', division: 32, name: 'Exterior Improvements', sortOrder: 23 },
        { code: '33', division: 33, name: 'Utilities', sortOrder: 24 },
        { code: '34', division: 34, name: 'Transportation', sortOrder: 25 },
        { code: '35', division: 35, name: 'Waterway and Marine Construction', sortOrder: 26 },
        { code: '40', division: 40, name: 'Process Integration', sortOrder: 27 },
        { code: '41', division: 41, name: 'Material Processing and Handling Equipment', sortOrder: 28 },
        { code: '42', division: 42, name: 'Process Heating, Cooling, and Drying Equipment', sortOrder: 29 },
        { code: '43', division: 43, name: 'Process Gas and Liquid Handling, Purification, and Storage Equipment', sortOrder: 30 },
        { code: '44', division: 44, name: 'Pollution Control Equipment', sortOrder: 31 },
        { code: '45', division: 45, name: 'Industry-Specific Manufacturing Equipment', sortOrder: 32 },
        { code: '48', division: 48, name: 'Electrical Power Generation', sortOrder: 33 },
      ],
    };

    const templateData = templates[template];

    if (!templateData) {
      throw new BadRequestException(
        `Template "${template}" not found. Available templates: ${Object.keys(templates).join(', ')}`,
      );
    }

    // Import cost codes
    const importedCodes: CostCode[] = [];

    for (const item of templateData) {
      const costCode = this.costCodeRepo.create({
        projectId,
        code: item.code,
        description: item.name,
        fullCode: item.code,
        division: item.division,
        sortOrder: item.sortOrder,
        isActive: true,
      });

      const saved = await this.costCodeRepo.save(costCode);
      importedCodes.push(saved);
    }

    this.logger.log(
      `Successfully imported ${importedCodes.length} cost codes from template "${template}"`,
    );

    return importedCodes.map((code) => this.toResponseDto(code));
  }

  /**
   * Generate full hierarchical code
   *
   * Builds fullCode by walking up the parent chain.
   * Example: parent "01" + code "100" = fullCode "01.100"
   *
   * @param code - Current code segment
   * @param parent - Parent cost code (optional)
   * @returns Full hierarchical code
   */
  private async generateFullCode(
    code: string,
    parent: CostCode | null,
  ): Promise<string> {
    if (!parent) {
      return code;
    }

    return `${parent.fullCode}.${code}`;
  }

  /**
   * Check if setting new parent would create circular reference
   *
   * @param costCodeId - Cost code being updated
   * @param newParentId - Proposed parent ID
   * @returns True if would create circular reference
   */
  private async wouldCreateCircularReference(
    costCodeId: string,
    newParentId: string,
  ): Promise<boolean> {
    let currentId: string | undefined = newParentId;

    // Walk up the parent chain
    while (currentId) {
      if (currentId === costCodeId) {
        return true; // Circular reference detected
      }

      const parent = await this.costCodeRepo.findOne({
        where: { id: currentId },
      });

      currentId = parent?.parentId;
    }

    return false;
  }

  /**
   * Update fullCode for all children recursively
   *
   * Called when a cost code's fullCode changes to propagate
   * the change to all descendants.
   *
   * @param parentId - Parent cost code ID
   */
  private async updateChildrenFullCodes(parentId: string): Promise<void> {
    const children = await this.costCodeRepo.find({
      where: { parentId },
    });

    for (const child of children) {
      const parent = await this.costCodeRepo.findOne({
        where: { id: parentId },
      });

      if (parent) {
        child.fullCode = `${parent.fullCode}.${child.code}`;
        await this.costCodeRepo.save(child);

        // Recursively update grandchildren
        await this.updateChildrenFullCodes(child.id);
      }
    }
  }

  /**
   * Convert entity to response DTO
   *
   * @param costCode - CostCode entity
   * @returns Response DTO
   */
  private toResponseDto(costCode: CostCode): CostCodeResponseDto {
    return {
      id: costCode.id,
      projectId: costCode.projectId || '',
      code: costCode.code,
      description: costCode.description,
      // fullCode: costCode.fullCode, // Not in DTO
      division: costCode.division,
      parentId: costCode.parentId,
      isActive: costCode.isActive,
      // sortOrder: costCode.sortOrder, // Not in DTO
      createdAt: costCode.createdAt,
      updatedAt: costCode.updatedAt,
    };
  }
}
