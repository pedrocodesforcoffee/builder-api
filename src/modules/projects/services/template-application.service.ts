import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Project } from '../entities/project.entity';
import { ProjectPhase } from '../entities/project-phase.entity';
import { ProjectMilestone } from '../entities/project-milestone.entity';
import { ProjectFolder } from '../entities/project-folder.entity';
import { ProjectTemplate, FolderDefinition } from '../entities/project-template.entity';
import { CreateProjectFromTemplateDto } from '../dto/templates/create-project-from-template.dto';
import { ProjectTemplateService } from './project-template.service';
import { PhaseStatus } from '../enums/phase-status.enum';
import { ProjectStatus } from '../enums/project-status.enum';

/**
 * Service for applying project templates
 *
 * Handles the complex logic of creating new projects from templates:
 * - Creates project with template defaults
 * - Generates phases with calculated dates
 * - Creates milestones within phases
 * - Sets up folder structure
 * - Applies custom fields schema
 * - Tracks template usage
 */
@Injectable()
export class TemplateApplicationService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectPhase)
    private readonly phaseRepository: Repository<ProjectPhase>,
    @InjectRepository(ProjectMilestone)
    private readonly milestoneRepository: Repository<ProjectMilestone>,
    @InjectRepository(ProjectFolder)
    private readonly folderRepository: Repository<ProjectFolder>,
    private readonly templateService: ProjectTemplateService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new project from a template
   */
  async createProjectFromTemplate(
    dto: CreateProjectFromTemplateDto,
    userId: string,
  ): Promise<Project> {
    // Get template
    const template = await this.templateService.findOneWithAccess(
      dto.templateId,
      dto.organizationId,
    );

    // Validate template structure
    const validationErrors = this.templateService.validateTemplateStructure(template);
    if (validationErrors.length > 0) {
      throw new BadRequestException(
        `Template validation failed: ${validationErrors.join(', ')}`,
      );
    }

    // Use transaction to ensure all-or-nothing creation
    return await this.dataSource.transaction(async manager => {
      // 1. Create the project
      const project = manager.create(Project, {
        name: dto.projectName,
        number: dto.projectNumber || `PROJ-${Date.now()}`,
        organizationId: dto.organizationId,
        status: ProjectStatus.PRECONSTRUCTION,
        startDate: new Date(dto.startDate),
        type: template.projectType || undefined,
        deliveryMethod: template.deliveryMethod || undefined,
        contractType: dto.overrides?.customFields?.contractType || template.defaultContractType,
        timezone: template.defaultTimezone,
        workingDays: template.defaultWorkingDays,
        holidays: template.defaultHolidays,
        customFields: {
          ...template.customFieldsSchema,
          ...dto.overrides?.customFields,
        },
        tags: template.defaultTags,
        // Apply overrides
        address: dto.overrides?.address,
        city: dto.overrides?.city,
        state: dto.overrides?.state,
        zip: dto.overrides?.zip,
        country: dto.overrides?.country,
        squareFootage: dto.overrides?.squareFootage,
        originalContract: dto.overrides?.originalContract,
        currentContract: dto.overrides?.currentContract || dto.overrides?.originalContract,
      });

      const savedProject = await manager.save(Project, project);

      // 2. Create phases with calculated dates
      const phases = await this.createPhasesFromTemplate(
        manager,
        savedProject.id,
        template,
        new Date(dto.startDate),
      );

      // 3. Create milestones
      await this.createMilestonesFromPhases(manager, phases, template);

      // 4. Create folder structure
      if (template.folderStructure) {
        await this.createFolderStructure(
          manager,
          savedProject.id,
          template.folderStructure,
        );
      }

      // 5. Increment template usage
      await this.templateService.incrementUsageCount(template.id);

      // Return project with relations
      return await manager.findOne(Project, {
        where: { id: savedProject.id },
        relations: ['phases', 'phases.milestones', 'folders'],
      }) as Project;
    });
  }

  /**
   * Create project phases from template
   */
  private async createPhasesFromTemplate(
    manager: any,
    projectId: string,
    template: ProjectTemplate,
    projectStartDate: Date,
  ): Promise<ProjectPhase[]> {
    const phases: ProjectPhase[] = [];
    let currentStartDate = new Date(projectStartDate);

    // Sort phases by order
    const sortedPhases = [...template.phases].sort((a, b) => a.order - b.order);

    for (const phaseDefinition of sortedPhases) {
      const startDate = new Date(currentStartDate);
      const endDate = this.addDays(startDate, phaseDefinition.durationDays);

      const phase = manager.create(ProjectPhase, {
        projectId,
        name: phaseDefinition.name,
        description: phaseDefinition.description,
        startDate,
        endDate,
        status: PhaseStatus.NOT_STARTED,
        order: phaseDefinition.order,
        percentComplete: 0,
      });

      const savedPhase = await manager.save(ProjectPhase, phase);
      phases.push(savedPhase);

      // Next phase starts after this one ends
      currentStartDate = this.addDays(endDate, 1);
    }

    return phases;
  }

  /**
   * Create milestones from phase definitions
   */
  private async createMilestonesFromPhases(
    manager: any,
    phases: ProjectPhase[],
    template: ProjectTemplate,
  ): Promise<void> {
    for (const phase of phases) {
      // Find corresponding template phase
      const phaseDefinition = template.phases.find(
        p => p.name === phase.name && p.order === phase.order,
      );

      if (phaseDefinition?.milestones) {
        for (const milestoneDefinition of phaseDefinition.milestones) {
          const milestoneDate = this.addDays(
            phase.startDate!,
            milestoneDefinition.offsetDays,
          );

          const milestone = manager.create(ProjectMilestone, {
            phaseId: phase.id,
            name: milestoneDefinition.name,
            description: milestoneDefinition.description,
            date: milestoneDate,
            completed: false,
          });

          await manager.save(ProjectMilestone, milestone);
        }
      }
    }
  }

  /**
   * Create folder structure recursively
   */
  private async createFolderStructure(
    manager: any,
    projectId: string,
    folders: FolderDefinition[],
    parentId?: string,
    parentPath: string = '',
  ): Promise<void> {
    for (let i = 0; i < folders.length; i++) {
      const folderDef = folders[i];
      const path = parentPath ? `${parentPath}/${folderDef.name}` : folderDef.name;

      const folder = manager.create(ProjectFolder, {
        projectId,
        name: folderDef.name,
        description: folderDef.description,
        parentId,
        path,
        order: i,
      });

      const savedFolder = await manager.save(ProjectFolder, folder);

      // Recursively create children
      if (folderDef.children && folderDef.children.length > 0) {
        await this.createFolderStructure(
          manager,
          projectId,
          folderDef.children,
          savedFolder.id,
          path,
        );
      }
    }
  }

  /**
   * Add days to a date (accounting for working days if needed)
   */
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Preview what a project from template would look like (without saving)
   */
  async previewProjectFromTemplate(
    dto: CreateProjectFromTemplateDto,
  ): Promise<{
    project: Partial<Project>;
    phases: Partial<ProjectPhase>[];
    milestones: Partial<ProjectMilestone>[];
    folders: Partial<ProjectFolder>[];
    totalDuration: number;
    estimatedEndDate: Date;
  }> {
    const template = await this.templateService.findOneWithAccess(
      dto.templateId,
      dto.organizationId,
    );

    const startDate = new Date(dto.startDate);
    const totalDuration = template.getTotalDuration();
    const estimatedEndDate = this.addDays(startDate, totalDuration);

    // Build preview phases
    const phases: Partial<ProjectPhase>[] = [];
    const milestones: Partial<ProjectMilestone>[] = [];
    let currentStartDate = new Date(startDate);

    const sortedPhases = [...template.phases].sort((a, b) => a.order - b.order);

    for (const phaseDefinition of sortedPhases) {
      const phaseStartDate = new Date(currentStartDate);
      const phaseEndDate = this.addDays(phaseStartDate, phaseDefinition.durationDays);

      phases.push({
        name: phaseDefinition.name,
        description: phaseDefinition.description,
        startDate: phaseStartDate,
        endDate: phaseEndDate,
        status: PhaseStatus.NOT_STARTED,
        order: phaseDefinition.order,
        percentComplete: 0,
      });

      // Add milestones for this phase
      if (phaseDefinition.milestones) {
        for (const milestoneDef of phaseDefinition.milestones) {
          milestones.push({
            name: milestoneDef.name,
            description: milestoneDef.description,
            plannedDate: this.addDays(phaseStartDate, milestoneDef.offsetDays),
            completed: false,
          });
        }
      }

      currentStartDate = this.addDays(phaseEndDate, 1);
    }

    // Build preview folders
    const folders = this.buildFolderPreview(template.folderStructure || []);

    return {
      project: {
        name: dto.projectName,
        number: dto.projectNumber || `PROJ-${Date.now()}`,
        organizationId: dto.organizationId,
        startDate,
        type: template.projectType || undefined,
        deliveryMethod: template.deliveryMethod || undefined,
        address: dto.overrides?.address,
        city: dto.overrides?.city,
        state: dto.overrides?.state,
      },
      phases,
      milestones,
      folders,
      totalDuration,
      estimatedEndDate,
    };
  }

  /**
   * Build folder preview recursively
   */
  private buildFolderPreview(
    folders: FolderDefinition[],
    parentPath: string = '',
  ): Partial<ProjectFolder>[] {
    const result: Partial<ProjectFolder>[] = [];

    for (let i = 0; i < folders.length; i++) {
      const folderDef = folders[i];
      const path = parentPath ? `${parentPath}/${folderDef.name}` : folderDef.name;

      result.push({
        name: folderDef.name,
        description: folderDef.description,
        path,
        order: i,
      });

      if (folderDef.children && folderDef.children.length > 0) {
        result.push(...this.buildFolderPreview(folderDef.children, path));
      }
    }

    return result;
  }
}
