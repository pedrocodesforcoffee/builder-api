import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { ProjectMilestone } from '../entities/project-milestone.entity';
import { CreateMilestoneDto } from '../dto/milestones/create-milestone.dto';
import { UpdateMilestoneDto } from '../dto/milestones/update-milestone.dto';
import { PhaseCalculationService } from './phase-calculation.service';
import { MilestoneStatus } from '../enums/milestone-status.enum';

/**
 * Project Milestone Service
 *
 * Handles CRUD operations and business logic for project milestones
 */
@Injectable()
export class ProjectMilestoneService {
  constructor(
    @InjectRepository(ProjectMilestone)
    private readonly milestoneRepository: Repository<ProjectMilestone>,
    private readonly calculationService: PhaseCalculationService,
  ) {}

  /**
   * Create a new milestone
   */
  async create(
    projectId: string,
    phaseId: string,
    dto: CreateMilestoneDto,
    userId: string,
  ): Promise<ProjectMilestone> {
    const milestone = this.milestoneRepository.create({
      ...dto,
      projectId,
      phaseId,
      completionCriteria: dto.completionCriteria || [],
      tags: dto.tags || [],
      createdBy: userId,
      updatedBy: userId,
    });

    return await this.milestoneRepository.save(milestone);
  }

  /**
   * Find all milestones for a phase
   */
  async findAllByPhase(phaseId: string): Promise<ProjectMilestone[]> {
    return await this.milestoneRepository.find({
      where: { phaseId },
      order: { order: 'ASC', plannedDate: 'ASC' },
    });
  }

  /**
   * Find all milestones for a project
   */
  async findAllByProject(projectId: string): Promise<ProjectMilestone[]> {
    return await this.milestoneRepository.find({
      where: { projectId },
      relations: ['phase'],
      order: { plannedDate: 'ASC' },
    });
  }

  /**
   * Find one milestone by ID
   */
  async findOne(id: string): Promise<ProjectMilestone> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id },
      relations: ['phase', 'project'],
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone with ID ${id} not found`);
    }

    return milestone;
  }

  /**
   * Update a milestone
   */
  async update(
    id: string,
    dto: UpdateMilestoneDto,
    userId: string,
  ): Promise<ProjectMilestone> {
    const milestone = await this.findOne(id);

    Object.assign(milestone, dto);
    milestone.updatedBy = userId;

    const saved = await this.milestoneRepository.save(milestone);

    // Recalculate phase progress
    await this.calculationService.recalculatePhaseProgress(milestone.phaseId);

    return saved;
  }

  /**
   * Delete a milestone
   */
  async remove(id: string): Promise<void> {
    const milestone = await this.findOne(id);
    const phaseId = milestone.phaseId;

    await this.milestoneRepository.remove(milestone);

    // Recalculate phase progress after removal
    await this.calculationService.recalculatePhaseProgress(phaseId);
  }

  /**
   * Complete a milestone
   */
  async completeMilestone(
    id: string,
    actualDate: Date | string,
    userId: string,
  ): Promise<ProjectMilestone> {
    const milestone = await this.findOne(id);

    // Check if all completion criteria are met
    if (milestone.completionCriteria && milestone.completionCriteria.length > 0) {
      const incomplete = milestone.completionCriteria.filter(c => !c.completed);
      if (incomplete.length > 0) {
        throw new BadRequestException(
          `Cannot complete milestone: ${incomplete.length} completion criteria not met`,
        );
      }
    }

    milestone.completed = true;
    milestone.actualDate = new Date(actualDate);
    milestone.completedAt = new Date();
    milestone.completedBy = userId;
    milestone.status = MilestoneStatus.ACHIEVED;
    milestone.updatedBy = userId;

    const saved = await this.milestoneRepository.save(milestone);

    // Recalculate phase progress
    await this.calculationService.recalculatePhaseProgress(milestone.phaseId);

    return saved;
  }

  /**
   * Approve a milestone
   */
  async approveMilestone(
    id: string,
    userId: string,
  ): Promise<ProjectMilestone> {
    const milestone = await this.findOne(id);

    if (!milestone.requiresApproval) {
      throw new BadRequestException('Milestone does not require approval');
    }

    if (!milestone.completed) {
      throw new BadRequestException('Milestone must be completed before approval');
    }

    milestone.approvedBy = userId;
    milestone.approvedAt = new Date();
    milestone.updatedBy = userId;

    return await this.milestoneRepository.save(milestone);
  }

  /**
   * Get upcoming milestones (within next 30 days)
   */
  async getUpcomingMilestones(projectId: string): Promise<ProjectMilestone[]> {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    return await this.milestoneRepository.find({
      where: {
        projectId,
        completed: false,
        plannedDate: Between(today, thirtyDaysFromNow),
      },
      relations: ['phase'],
      order: { plannedDate: 'ASC' },
    });
  }

  /**
   * Get overdue milestones
   */
  async getOverdueMilestones(projectId: string): Promise<ProjectMilestone[]> {
    const today = new Date();

    return await this.milestoneRepository.find({
      where: {
        projectId,
        completed: false,
        plannedDate: LessThan(today),
      },
      relations: ['phase'],
      order: { plannedDate: 'ASC' },
    });
  }
}
