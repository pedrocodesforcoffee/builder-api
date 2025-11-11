import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import {
  FolderTemplate,
  FolderDefinition,
} from '../entities/folder-template.entity';
import { ProjectFolder } from '../entities/project-folder.entity';
import { FolderType } from '../enums/folder-type.enum';
import { FolderValidationService } from './folder-validation.service';

/**
 * Folder Template Service
 *
 * Handles folder template operations including:
 * - Applying templates to projects
 * - Managing custom templates
 * - Providing standard templates
 * - Recursive folder creation from template definitions
 */
@Injectable()
export class FolderTemplateService {
  constructor(
    @InjectRepository(FolderTemplate)
    private readonly templateRepository: Repository<FolderTemplate>,
    @InjectRepository(ProjectFolder)
    private readonly folderRepository: Repository<ProjectFolder>,
    private readonly validationService: FolderValidationService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Apply a template to a project
   *
   * Creates folder structure from a template (standard or custom).
   * All folders are created in a single transaction.
   *
   * @param projectId - Target project ID
   * @param templateName - Name of template to apply
   * @param userId - ID of user applying the template
   * @returns Array of created folders
   * @throws NotFoundException if template not found
   */
  async applyTemplate(
    projectId: string,
    templateName: string,
    userId: string,
  ): Promise<ProjectFolder[]> {
    // Check for standard templates first
    const standardTemplates = this.getStandardTemplates();
    const standardTemplate = standardTemplates.find(
      (t) => t.name === templateName,
    );

    let folderStructure: FolderDefinition[];

    if (standardTemplate) {
      folderStructure = standardTemplate.folderStructure;
    } else {
      // Look for custom template
      const customTemplate = await this.templateRepository.findOne({
        where: { name: templateName, isActive: true },
      });

      if (!customTemplate) {
        throw new NotFoundException(
          `Template "${templateName}" not found`,
        );
      }

      folderStructure = customTemplate.folderStructure;
    }

    // Create folders in transaction
    return await this.dataSource.transaction(async (manager) => {
      const createdFolders = await this.createFoldersFromDefinition(
        projectId,
        folderStructure,
        null,
        userId,
        manager,
      );

      return createdFolders;
    });
  }

  /**
   * Get available templates for an organization
   *
   * Returns both standard templates and organization-specific custom templates.
   *
   * @param organizationId - Organization ID (optional)
   * @returns Array of available templates
   */
  async getTemplates(organizationId?: string): Promise<FolderTemplate[]> {
    const standardTemplates = this.getStandardTemplates();

    // Get custom templates
    let customTemplates: FolderTemplate[] = [];
    if (organizationId) {
      customTemplates = await this.templateRepository.find({
        where: [
          { organizationId, isActive: true },
          { organizationId: IsNull(), isSystem: true, isActive: true },
        ],
      });
    }

    // Convert standard templates to FolderTemplate entities for consistent return type
    const standardTemplateEntities = standardTemplates.map((template) => {
      const entity = new FolderTemplate();
      entity.id = template.name.toLowerCase().replace(/\s+/g, '-');
      entity.name = template.name;
      entity.description = template.description;
      entity.projectType = template.projectType;
      entity.folderStructure = template.folderStructure;
      entity.isSystem = true;
      entity.isActive = true;
      return entity;
    });

    return [...standardTemplateEntities, ...customTemplates];
  }

  /**
   * Find a single template by ID
   *
   * Searches both standard templates and custom templates.
   *
   * @param id - Template ID
   * @returns Template entity
   * @throws NotFoundException if template not found
   */
  async findOne(id: string): Promise<FolderTemplate> {
    // Check standard templates first
    const standardTemplates = this.getStandardTemplates();
    const standardTemplate = standardTemplates.find(
      (t) => t.name.toLowerCase().replace(/\s+/g, '-') === id || t.name === id,
    );

    if (standardTemplate) {
      const entity = new FolderTemplate();
      entity.id = standardTemplate.name.toLowerCase().replace(/\s+/g, '-');
      entity.name = standardTemplate.name;
      entity.description = standardTemplate.description;
      entity.projectType = standardTemplate.projectType;
      entity.folderStructure = standardTemplate.folderStructure;
      entity.isSystem = true;
      entity.isActive = true;
      return entity;
    }

    // Look for custom template
    const customTemplate = await this.templateRepository.findOne({
      where: { id },
    });

    if (!customTemplate) {
      throw new NotFoundException(`Template with ID "${id}" not found`);
    }

    return customTemplate;
  }

  /**
   * Update a custom template
   *
   * Updates an existing custom template.
   * System templates cannot be modified.
   *
   * @param id - Template ID
   * @param dto - Update data
   * @returns Updated template entity
   * @throws NotFoundException if template not found
   * @throws BadRequestException if trying to modify system template
   */
  async update(
    id: string,
    dto: {
      name?: string;
      description?: string;
      projectType?: string;
      folderStructure?: FolderDefinition[];
      isActive?: boolean;
    },
  ): Promise<FolderTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID "${id}" not found`);
    }

    if (template.isSystem) {
      throw new BadRequestException('System templates cannot be modified');
    }

    // Update fields
    if (dto.name !== undefined) template.name = dto.name;
    if (dto.description !== undefined) template.description = dto.description;
    if (dto.projectType !== undefined) template.projectType = dto.projectType;
    if (dto.folderStructure !== undefined)
      template.folderStructure = dto.folderStructure;
    if (dto.isActive !== undefined) template.isActive = dto.isActive;

    return await this.templateRepository.save(template);
  }

  /**
   * Delete a custom template
   *
   * Deletes a custom template.
   * System templates cannot be deleted.
   *
   * @param id - Template ID
   * @throws NotFoundException if template not found
   * @throws BadRequestException if trying to delete system template
   */
  async remove(id: string): Promise<void> {
    const template = await this.templateRepository.findOne({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID "${id}" not found`);
    }

    if (template.isSystem) {
      throw new BadRequestException('System templates cannot be deleted');
    }

    await this.templateRepository.remove(template);
  }

  /**
   * Create a custom template
   *
   * Allows organizations to create their own reusable folder structures.
   *
   * @param dto - Template creation data
   * @param userId - ID of user creating the template
   * @returns Created template entity
   */
  async createTemplate(
    dto: {
      name: string;
      description?: string;
      projectType?: string;
      folderStructure: FolderDefinition[];
      organizationId?: string;
    },
    userId: string,
  ): Promise<FolderTemplate> {
    const template = new FolderTemplate();
    template.name = dto.name;
    template.description = dto.description;
    template.projectType = dto.projectType;
    template.folderStructure = dto.folderStructure;
    template.organizationId = dto.organizationId;
    template.isSystem = false;
    template.isActive = true;
    template.createdBy = userId;
    template.updatedBy = userId;

    return await this.templateRepository.save(template);
  }

  /**
   * Get standard templates
   *
   * Returns hardcoded standard folder templates for common project types.
   *
   * @returns Array of standard templates
   */
  getStandardTemplates(): FolderTemplate[] {
    return [
      this.getCommercialConstructionTemplate(),
      this.getResidentialDevelopmentTemplate(),
    ];
  }

  /**
   * Commercial Construction Standard Template
   *
   * @private
   */
  private getCommercialConstructionTemplate(): FolderTemplate {
    const template = new FolderTemplate();
    template.name = 'Commercial Construction Standard';
    template.description =
      'Standard folder structure for commercial construction projects';
    template.projectType = 'commercial';
    template.isSystem = true;
    template.isActive = true;
    template.folderStructure = [
      {
        name: 'Drawings',
        description: 'All project drawings and plans',
        folderType: FolderType.DRAWINGS,
        icon: 'blueprint',
        color: '#3B82F6',
        order: 1,
        children: [
          {
            name: 'Architectural',
            description: 'Architectural drawings',
            folderType: FolderType.DRAWINGS,
            order: 1,
          },
          {
            name: 'Structural',
            description: 'Structural engineering drawings',
            folderType: FolderType.DRAWINGS,
            order: 2,
          },
          {
            name: 'Mechanical',
            description: 'HVAC and mechanical drawings',
            folderType: FolderType.DRAWINGS,
            order: 3,
          },
          {
            name: 'Electrical',
            description: 'Electrical drawings',
            folderType: FolderType.DRAWINGS,
            order: 4,
          },
          {
            name: 'Plumbing',
            description: 'Plumbing drawings',
            folderType: FolderType.DRAWINGS,
            order: 5,
          },
          {
            name: 'Fire Protection',
            description: 'Fire protection system drawings',
            folderType: FolderType.DRAWINGS,
            order: 6,
          },
          {
            name: 'Civil',
            description: 'Civil engineering drawings',
            folderType: FolderType.DRAWINGS,
            order: 7,
          },
          {
            name: 'Landscape',
            description: 'Landscape drawings',
            folderType: FolderType.DRAWINGS,
            order: 8,
          },
        ],
      },
      {
        name: 'Specifications',
        description: 'Project specifications and technical details',
        folderType: FolderType.SPECIFICATIONS,
        icon: 'document',
        color: '#8B5CF6',
        order: 2,
      },
      {
        name: 'RFIs',
        description: 'Requests for Information',
        folderType: FolderType.RFIS,
        icon: 'question-circle',
        color: '#F59E0B',
        order: 3,
        children: [
          {
            name: 'Open',
            description: 'Open RFIs awaiting response',
            folderType: FolderType.RFIS,
            order: 1,
          },
          {
            name: 'In Review',
            description: 'RFIs under review',
            folderType: FolderType.RFIS,
            order: 2,
          },
          {
            name: 'Closed',
            description: 'Resolved RFIs',
            folderType: FolderType.RFIS,
            order: 3,
          },
        ],
      },
      {
        name: 'Submittals',
        description: 'Contractor submittals for approval',
        folderType: FolderType.SUBMITTALS,
        icon: 'file-check',
        color: '#10B981',
        order: 4,
        children: [
          {
            name: 'Pending',
            description: 'Awaiting review',
            folderType: FolderType.SUBMITTALS,
            order: 1,
          },
          {
            name: 'In Review',
            description: 'Under review',
            folderType: FolderType.SUBMITTALS,
            order: 2,
          },
          {
            name: 'Approved',
            description: 'Approved submittals',
            folderType: FolderType.SUBMITTALS,
            order: 3,
          },
          {
            name: 'Rejected',
            description: 'Rejected submittals',
            folderType: FolderType.SUBMITTALS,
            order: 4,
          },
        ],
      },
      {
        name: 'Photos',
        description: 'Construction progress photos',
        folderType: FolderType.PHOTOS,
        icon: 'camera',
        color: '#EC4899',
        order: 5,
        children: [
          {
            name: 'Site Prep',
            description: 'Site preparation photos',
            folderType: FolderType.PHOTOS,
            order: 1,
          },
          {
            name: 'Foundation',
            description: 'Foundation work photos',
            folderType: FolderType.PHOTOS,
            order: 2,
          },
          {
            name: 'Framing',
            description: 'Framing photos',
            folderType: FolderType.PHOTOS,
            order: 3,
          },
          {
            name: 'Progress',
            description: 'General progress photos',
            folderType: FolderType.PHOTOS,
            order: 4,
          },
        ],
      },
      {
        name: 'Reports',
        description: 'Project reports and documentation',
        folderType: FolderType.REPORTS,
        icon: 'file-text',
        color: '#6366F1',
        order: 6,
        children: [
          {
            name: 'Daily Reports',
            description: 'Daily construction reports',
            folderType: FolderType.REPORTS,
            order: 1,
          },
          {
            name: 'Weekly Reports',
            description: 'Weekly progress reports',
            folderType: FolderType.REPORTS,
            order: 2,
          },
          {
            name: 'Inspection Reports',
            description: 'Inspection reports',
            folderType: FolderType.REPORTS,
            order: 3,
          },
          {
            name: 'Testing Reports',
            description: 'Material and system testing reports',
            folderType: FolderType.REPORTS,
            order: 4,
          },
        ],
      },
      {
        name: 'Contracts',
        description: 'Contracts and agreements',
        folderType: FolderType.CONTRACTS,
        icon: 'file-signature',
        color: '#14B8A6',
        order: 7,
      },
      {
        name: 'Schedules',
        description: 'Project schedules and timelines',
        folderType: FolderType.SCHEDULES,
        icon: 'calendar',
        color: '#F97316',
        order: 8,
      },
      {
        name: 'Permits',
        description: 'Building permits and approvals',
        folderType: FolderType.PERMITS,
        icon: 'certificate',
        color: '#EAB308',
        order: 9,
      },
      {
        name: 'Meeting Notes',
        description: 'Meeting minutes and notes',
        folderType: FolderType.MEETING_NOTES,
        icon: 'users',
        color: '#06B6D4',
        order: 10,
      },
      {
        name: 'Closeout',
        description: 'Project closeout documentation',
        folderType: FolderType.CLOSEOUT,
        icon: 'check-circle',
        color: '#84CC16',
        order: 11,
        children: [
          {
            name: 'Punch List',
            description: 'Punch list items',
            folderType: FolderType.PUNCH_LIST,
            order: 1,
          },
          {
            name: 'As-Builts',
            description: 'As-built drawings',
            folderType: FolderType.AS_BUILTS,
            order: 2,
          },
          {
            name: 'Warranties',
            description: 'Equipment and material warranties',
            folderType: FolderType.WARRANTIES,
            order: 3,
          },
          {
            name: 'O&M Manuals',
            description: 'Operations and maintenance manuals',
            folderType: FolderType.GENERAL,
            order: 4,
          },
        ],
      },
    ];

    return template;
  }

  /**
   * Residential Development Standard Template
   *
   * @private
   */
  private getResidentialDevelopmentTemplate(): FolderTemplate {
    const template = new FolderTemplate();
    template.name = 'Residential Development Standard';
    template.description =
      'Standard folder structure for residential development projects';
    template.projectType = 'residential';
    template.isSystem = true;
    template.isActive = true;
    template.folderStructure = [
      {
        name: 'Plans',
        description: 'Development plans and drawings',
        folderType: FolderType.DRAWINGS,
        icon: 'blueprint',
        color: '#3B82F6',
        order: 1,
        children: [
          {
            name: 'Site Plans',
            description: 'Site development plans',
            folderType: FolderType.DRAWINGS,
            order: 1,
          },
          {
            name: 'Floor Plans',
            description: 'Floor plans for units',
            folderType: FolderType.DRAWINGS,
            order: 2,
          },
          {
            name: 'Elevations',
            description: 'Building elevations',
            folderType: FolderType.DRAWINGS,
            order: 3,
          },
          {
            name: 'Landscape Plans',
            description: 'Landscape and amenity plans',
            folderType: FolderType.DRAWINGS,
            order: 4,
          },
        ],
      },
      {
        name: 'HOA Documents',
        description: 'Homeowners Association documentation',
        folderType: FolderType.GENERAL,
        icon: 'home',
        color: '#8B5CF6',
        order: 2,
        children: [
          {
            name: 'CC&Rs',
            description: 'Covenants, Conditions & Restrictions',
            folderType: FolderType.GENERAL,
            order: 1,
          },
          {
            name: 'Bylaws',
            description: 'HOA bylaws',
            folderType: FolderType.GENERAL,
            order: 2,
          },
          {
            name: 'Regulations',
            description: 'HOA rules and regulations',
            folderType: FolderType.GENERAL,
            order: 3,
          },
        ],
      },
      {
        name: 'Permits',
        description: 'Development permits and approvals',
        folderType: FolderType.PERMITS,
        icon: 'certificate',
        color: '#EAB308',
        order: 3,
      },
      {
        name: 'Inspections',
        description: 'Inspection reports and documentation',
        folderType: FolderType.REPORTS,
        icon: 'clipboard-check',
        color: '#10B981',
        order: 4,
        children: [
          {
            name: 'Foundation',
            description: 'Foundation inspections',
            folderType: FolderType.REPORTS,
            order: 1,
          },
          {
            name: 'Framing',
            description: 'Framing inspections',
            folderType: FolderType.REPORTS,
            order: 2,
          },
          {
            name: 'Final',
            description: 'Final inspections',
            folderType: FolderType.REPORTS,
            order: 3,
          },
          {
            name: 'Occupancy',
            description: 'Certificate of Occupancy',
            folderType: FolderType.REPORTS,
            order: 4,
          },
        ],
      },
      {
        name: 'Marketing',
        description: 'Marketing materials and collateral',
        folderType: FolderType.GENERAL,
        icon: 'megaphone',
        color: '#EC4899',
        order: 5,
        children: [
          {
            name: 'Brochures',
            description: 'Marketing brochures',
            folderType: FolderType.GENERAL,
            order: 1,
          },
          {
            name: 'Renderings',
            description: 'Architectural renderings',
            folderType: FolderType.GENERAL,
            order: 2,
          },
          {
            name: 'Virtual Tours',
            description: 'Virtual tour assets',
            folderType: FolderType.GENERAL,
            order: 3,
          },
        ],
      },
      {
        name: 'Sales',
        description: 'Sales documentation and contracts',
        folderType: FolderType.CONTRACTS,
        icon: 'handshake',
        color: '#14B8A6',
        order: 6,
        children: [
          {
            name: 'Purchase Agreements',
            description: 'Purchase and sale agreements',
            folderType: FolderType.CONTRACTS,
            order: 1,
          },
          {
            name: 'Disclosures',
            description: 'Property disclosures',
            folderType: FolderType.GENERAL,
            order: 2,
          },
          {
            name: 'Closing Documents',
            description: 'Closing documentation',
            folderType: FolderType.CONTRACTS,
            order: 3,
          },
        ],
      },
    ];

    return template;
  }

  /**
   * Create folders from template definition recursively
   *
   * Creates folder hierarchy from an array of folder definitions.
   *
   * @param projectId - Target project ID
   * @param definitions - Array of folder definitions
   * @param parentId - Parent folder ID (null for root)
   * @param userId - ID of user creating folders
   * @param manager - Transaction manager
   * @returns Array of created folders
   */
  async createFoldersFromDefinition(
    projectId: string,
    definitions: FolderDefinition[],
    parentId: string | null,
    userId: string,
    manager: any,
  ): Promise<ProjectFolder[]> {
    const createdFolders: ProjectFolder[] = [];

    for (const definition of definitions) {
      // Create folder
      const folder = new ProjectFolder();
      folder.projectId = projectId;
      folder.parentId = parentId;
      folder.name = definition.name;
      folder.description = definition.description;
      folder.folderType = definition.folderType;
      folder.color = definition.color;
      folder.icon = definition.icon;
      folder.order = definition.order || 0;
      folder.inheritPermissions = true;
      folder.permissions = [];
      folder.isPublic = false;
      folder.tags = [];
      folder.customFields = {};
      folder.createdBy = userId;
      folder.updatedBy = userId;

      // Calculate path and level
      let parent: ProjectFolder | null = null;
      if (parentId) {
        parent = await manager.findOne(ProjectFolder, {
          where: { id: parentId },
        });
      }

      folder.level = this.validationService.calculateLevel(
        parent?.level || null,
      );
      folder.path = this.validationService.calculatePath(
        folder,
        parent || null,
      );

      await manager.save(ProjectFolder, folder);
      createdFolders.push(folder);

      // Create children recursively
      if (definition.children && definition.children.length > 0) {
        const childFolders = await this.createFoldersFromDefinition(
          projectId,
          definition.children,
          folder.id,
          userId,
          manager,
        );
        createdFolders.push(...childFolders);
      }
    }

    return createdFolders;
  }
}
