import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectPhase } from '../entities/project-phase.entity';
import { CreatePhaseDto } from '../dto/phases/create-phase.dto';
import { UpdatePhaseDto } from '../dto/phases/update-phase.dto';
import { PhaseCalculationService } from './phase-calculation.service';
import { PhaseStatus } from '../enums/phase-status.enum';

/**
 * Project Phase Service
 *
 * Handles CRUD operations and business logic for project phases
 */
@Injectable()
export class ProjectPhaseService {
  constructor(
    @InjectRepository(ProjectPhase)
    private readonly phaseRepository: Repository<ProjectPhase>,
    private readonly calculationService: PhaseCalculationService,
  ) {}

  /**
   * Create a new phase
   */
  async create(
    projectId: string,
    dto: CreatePhaseDto,
    userId: string,
  ): Promise<ProjectPhase> {
    // Validate dates
    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('End date must be after start date');
    }

    const phase = this.phaseRepository.create({
      ...dto,
      projectId,
      predecessorIds: dto.predecessorIds || [],
      successorIds: [],
      createdBy: userId,
      updatedBy: userId,
    });

    const saved = await this.phaseRepository.save(phase);

    // Update successor references
    if (dto.predecessorIds && dto.predecessorIds.length > 0) {
      await this.updateSuccessorReferences(dto.predecessorIds, saved.id);
    }

    return saved;
  }

  /**
   * Find all phases for a project
   */
  async findAllByProject(projectId: string): Promise<ProjectPhase[]> {
    return await this.phaseRepository.find({
      where: { projectId },
      relations: ['milestones'],
      order: { order: 'ASC' },
    });
  }

  /**
   * Find one phase by ID
   */
  async findOne(id: string): Promise<ProjectPhase> {
    const phase = await this.phaseRepository.findOne({
      where: { id },
      relations: ['milestones', 'project'],
    });

    if (!phase) {
      throw new NotFoundException(`Phase with ID ${id} not found`);
    }

    return phase;
  }

  /**
   * Update a phase
   */
  async update(
    id: string,
    dto: UpdatePhaseDto,
    userId: string,
  ): Promise<ProjectPhase> {
    const phase = await this.findOne(id);

    // Validate dates if both provided
    if (dto.startDate && dto.endDate) {
      if (new Date(dto.endDate) < new Date(dto.startDate)) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    Object.assign(phase, dto);
    phase.updatedBy = userId;

    return await this.phaseRepository.save(phase);
  }

  /**
   * Delete a phase
   */
  async remove(id: string): Promise<void> {
    const phase = await this.findOne(id);

    // Check if any phases depend on this one
    const dependents = await this.phaseRepository.find({
      where: { projectId: phase.projectId },
    });

    for (const dep of dependents) {
      if (dep.predecessorIds && dep.predecessorIds.includes(id)) {
        throw new BadRequestException(
          `Cannot delete phase: Phase "${dep.name}" depends on it`,
        );
      }
    }

    await this.phaseRepository.remove(phase);
  }

  /**
   * Start a phase
   */
  async startPhase(id: string, userId: string): Promise<ProjectPhase> {
    const phase = await this.findOne(id);

    phase.actualStartDate = new Date();
    phase.status = PhaseStatus.IN_PROGRESS;
    phase.updatedBy = userId;

    return await this.phaseRepository.save(phase);
  }

  /**
   * Complete a phase
   */
  async completePhase(id: string, userId: string): Promise<ProjectPhase> {
    const phase = await this.findOne(id);

    // Check if all critical milestones are completed
    if (phase.milestones) {
      const incompleteCritical = phase.milestones.filter(
        m => m.isCritical && !m.completed,
      );

      if (incompleteCritical.length > 0) {
        throw new BadRequestException(
          `Cannot complete phase: ${incompleteCritical.length} critical milestone(s) incomplete`,
        );
      }
    }

    phase.actualEndDate = new Date();
    phase.status = PhaseStatus.COMPLETED;
    phase.percentComplete = 100;
    phase.updatedBy = userId;

    const saved = await this.phaseRepository.save(phase);

    // Recalculate earned value
    await this.calculationService.updateEarnedValue(id);

    return saved;
  }

  /**
   * Update successor references when adding dependencies
   */
  private async updateSuccessorReferences(
    predecessorIds: string[],
    phaseId: string,
  ): Promise<void> {
    for (const predId of predecessorIds) {
      const predecessor = await this.phaseRepository.findOne({
        where: { id: predId },
      });

      if (predecessor) {
        const successors = predecessor.successorIds || [];
        if (!successors.includes(phaseId)) {
          successors.push(phaseId);
          await this.phaseRepository.update(predId, {
            successorIds: successors,
          });
        }
      }
    }
  }
}
