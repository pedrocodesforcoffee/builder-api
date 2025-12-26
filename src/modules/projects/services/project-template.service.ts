import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ProjectTemplate } from '../entities/project-template.entity';
import { CreateProjectTemplateDto } from '../dto/templates/create-project-template.dto';
import { UpdateProjectTemplateDto } from '../dto/templates/update-project-template.dto';
import { TemplateCategory } from '../enums/template-category.enum';

/**
 * Service for managing project templates
 *
 * Handles CRUD operations for project templates including:
 * - Creating custom organization templates
 * - Creating system-wide templates
 * - Querying templates by various filters
 * - Updating non-system templates
 * - Deleting custom templates
 * - Tracking template usage
 */
@Injectable()
export class ProjectTemplateService {
  constructor(
    @InjectRepository(ProjectTemplate)
    private readonly templateRepository: Repository<ProjectTemplate>,
  ) {}

  /**
   * Create a new project template
   */
  async create(
    dto: CreateProjectTemplateDto,
    userId: string,
  ): Promise<ProjectTemplate> {
    // System templates can only be created by admins (add authorization check if needed)
    if (dto.isSystem && !dto.organizationId) {
      // System templates should not have organization
      dto.organizationId = undefined;
    }

    // If organization template, ensure user belongs to organization (add check if needed)

    const template = this.templateRepository.create({
      ...dto,
      createdBy: userId,
      updatedBy: userId,
    });

    return await this.templateRepository.save(template);
  }

  /**
   * Find all templates with optional filters
   */
  async findAll(filters?: {
    organizationId?: string;
    category?: TemplateCategory;
    isSystem?: boolean;
    isPublic?: boolean;
    includePrivate?: boolean;
  }): Promise<ProjectTemplate[]> {
    const where: FindOptionsWhere<ProjectTemplate> = {};

    if (filters?.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.isSystem !== undefined) {
      where.isSystem = filters.isSystem;
    }

    if (filters?.isPublic !== undefined && !filters.includePrivate) {
      where.isPublic = filters.isPublic;
    }

    return await this.templateRepository.find({
      where,
      order: {
        usageCount: 'DESC',
        name: 'ASC',
      },
    });
  }

  /**
   * Get templates available to a specific organization
   * Includes system templates, public templates, and organization's own templates
   */
  async findAvailableForOrganization(
    organizationId: string,
  ): Promise<ProjectTemplate[]> {
    return await this.templateRepository
      .createQueryBuilder('template')
      .where('template.isSystem = :isSystem', { isSystem: true })
      .orWhere(
        '(template.isPublic = :isPublic AND template.organizationId IS NOT NULL)',
        { isPublic: true },
      )
      .orWhere('template.organizationId = :organizationId', { organizationId })
      .orderBy('template.usageCount', 'DESC')
      .addOrderBy('template.name', 'ASC')
      .getMany();
  }

  /**
   * Get template by ID
   */
  async findOne(id: string): Promise<ProjectTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['createdByUser', 'updatedByUser', 'organization'],
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  /**
   * Get template by ID with access check
   */
  async findOneWithAccess(
    id: string,
    organizationId?: string,
  ): Promise<ProjectTemplate> {
    const template = await this.findOne(id);

    // Check if user has access to this template
    if (
      !template.isSystem &&
      !template.isPublic &&
      template.organizationId !== organizationId
    ) {
      throw new ForbiddenException(
        'You do not have access to this template',
      );
    }

    return template;
  }

  /**
   * Update a project template
   */
  async update(
    id: string,
    dto: UpdateProjectTemplateDto,
    userId: string,
    organizationId?: string,
  ): Promise<ProjectTemplate> {
    const template = await this.findOne(id);

    // System templates cannot be modified
    if (template.isSystem) {
      throw new ForbiddenException('System templates cannot be modified');
    }

    // Only organization that owns the template can modify it
    if (template.organizationId && template.organizationId !== organizationId) {
      throw new ForbiddenException(
        'You do not have permission to modify this template',
      );
    }

    // Update template
    Object.assign(template, dto);

    template.updatedBy = userId;
    template.updatedAt = new Date();

    return await this.templateRepository.save(template);
  }

  /**
   * Delete a project template
   */
  async remove(id: string, organizationId?: string): Promise<void> {
    const template = await this.findOne(id);

    // System templates cannot be deleted
    if (template.isSystem) {
      throw new ForbiddenException('System templates cannot be deleted');
    }

    // Only organization that owns the template can delete it
    if (template.organizationId && template.organizationId !== organizationId) {
      throw new ForbiddenException(
        'You do not have permission to delete this template',
      );
    }

    await this.templateRepository.remove(template);
  }

  /**
   * Duplicate a template
   */
  async duplicate(
    id: string,
    userId: string,
    organizationId?: string,
  ): Promise<ProjectTemplate> {
    const original = await this.findOneWithAccess(id, organizationId);

    const duplicate = this.templateRepository.create({
      name: `${original.name} (Copy)`,
      description: original.description,
      organizationId: organizationId, // Assign to the requesting organization
      isSystem: false, // Duplicates are never system templates
      isPublic: false, // Duplicates are private by default
      category: original.category,
      projectType: original.projectType,
      deliveryMethod: original.deliveryMethod,
      defaultContractType: original.defaultContractType,
      defaultTimezone: original.defaultTimezone,
      defaultWorkingDays: original.defaultWorkingDays,
      defaultHolidays: original.defaultHolidays,
      phases: original.phases,
      folderStructure: original.folderStructure,
      customFieldsSchema: original.customFieldsSchema,
      defaultTags: original.defaultTags,
      settings: original.settings,
      createdBy: userId,
      updatedBy: userId,
    });

    return await this.templateRepository.save(duplicate);
  }

  /**
   * Increment usage count for a template
   */
  async incrementUsageCount(id: string): Promise<void> {
    await this.templateRepository
      .createQueryBuilder()
      .update(ProjectTemplate)
      .set({
        usageCount: () => 'usage_count + 1',
        lastUsedAt: new Date(),
      })
      .where('id = :id', { id })
      .execute();
  }

  /**
   * Get templates by category
   */
  async findByCategory(category: TemplateCategory): Promise<ProjectTemplate[]> {
    return await this.templateRepository.find({
      where: { category },
      order: {
        usageCount: 'DESC',
        name: 'ASC',
      },
    });
  }

  /**
   * Get most popular templates
   */
  async findMostPopular(limit: number = 10): Promise<ProjectTemplate[]> {
    return await this.templateRepository.find({
      where: {
        isPublic: true,
      },
      order: {
        usageCount: 'DESC',
      },
      take: limit,
    });
  }

  /**
   * Get system templates
   */
  async findSystemTemplates(): Promise<ProjectTemplate[]> {
    return await this.templateRepository.find({
      where: {
        isSystem: true,
      },
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Validate template structure
   */
  validateTemplateStructure(template: ProjectTemplate): string[] {
    const errors: string[] = [];

    // Validate phases
    if (!template.phases || template.phases.length === 0) {
      errors.push('Template must have at least one phase');
    }

    // Check for duplicate phase orders
    const orders = template.phases.map(p => p.order);
    const uniqueOrders = new Set(orders);
    if (orders.length !== uniqueOrders.size) {
      errors.push('Phase orders must be unique');
    }

    // Validate phase milestones
    template.phases.forEach((phase, index) => {
      if (phase.durationDays <= 0) {
        errors.push(`Phase ${index + 1} must have positive duration`);
      }

      if (phase.milestones) {
        phase.milestones.forEach((milestone, mIndex) => {
          if (milestone.offsetDays < 0 || milestone.offsetDays > phase.durationDays) {
            errors.push(
              `Milestone ${mIndex + 1} in phase ${index + 1} has invalid offset`,
            );
          }
        });
      }
    });

    return errors;
  }
}
