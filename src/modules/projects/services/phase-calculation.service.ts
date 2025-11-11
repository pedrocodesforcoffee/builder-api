import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectPhase } from '../entities/project-phase.entity';
import { ProjectMilestone } from '../entities/project-milestone.entity';
import { PhaseStatus } from '../enums/phase-status.enum';

/**
 * Phase Calculation Service
 *
 * Handles calculations for project phases including:
 * - Percentage complete based on milestones
 * - Duration calculations
 * - Status auto-updates
 * - Earned value calculations
 */
@Injectable()
export class PhaseCalculationService {
  constructor(
    @InjectRepository(ProjectPhase)
    private readonly phaseRepository: Repository<ProjectPhase>,
    @InjectRepository(ProjectMilestone)
    private readonly milestoneRepository: Repository<ProjectMilestone>,
  ) {}

  /**
   * Calculate phase percentage complete based on milestones
   */
  async calculatePhasePercentComplete(phaseId: string): Promise<number> {
    const milestones = await this.milestoneRepository.find({
      where: { phaseId },
    });

    if (milestones.length === 0) {
      // If no milestones, use date-based calculation
      const phase = await this.phaseRepository.findOne({
        where: { id: phaseId },
      });

      if (!phase) {
        return 0;
      }

      return this.calculateDateBasedPercentComplete(phase);
    }

    // Weighted calculation based on milestones
    const totalWeight = milestones.reduce((sum, m) => sum + Number(m.weight), 0);
    const completedWeight = milestones
      .filter(m => m.completed)
      .reduce((sum, m) => sum + Number(m.weight), 0);

    if (totalWeight === 0) {
      return 0;
    }

    return Math.round((completedWeight / totalWeight) * 100);
  }

  /**
   * Calculate percentage complete based on dates
   */
  private calculateDateBasedPercentComplete(phase: ProjectPhase): number {
    const today = new Date();
    const start = new Date(phase.startDate);
    const end = new Date(phase.endDate);

    if (today < start) {
      return 0;
    }

    if (today > end || phase.status === PhaseStatus.COMPLETED) {
      return 100;
    }

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    return Math.min(100, Math.round((elapsedDays / totalDays) * 100));
  }

  /**
   * Update phase status based on dates and progress
   */
  async updatePhaseStatus(phaseId: string): Promise<PhaseStatus> {
    const phase = await this.phaseRepository.findOne({
      where: { id: phaseId },
    });

    if (!phase) {
      throw new Error('Phase not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Don't change if manually set to cancelled or on hold
    if (phase.status === PhaseStatus.CANCELLED || phase.status === PhaseStatus.ON_HOLD) {
      return phase.status;
    }

    // Already completed
    if (phase.status === PhaseStatus.COMPLETED && phase.actualEndDate) {
      return phase.status;
    }

    const startDate = new Date(phase.startDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(phase.endDate);
    endDate.setHours(0, 0, 0, 0);

    let newStatus: PhaseStatus;

    // Not started yet
    if (today < startDate) {
      newStatus = PhaseStatus.NOT_STARTED;
    }
    // Past end date but not completed
    else if (today > endDate && phase.status !== PhaseStatus.COMPLETED) {
      newStatus = PhaseStatus.DELAYED;
    }
    // Between start and end dates
    else if (today >= startDate && today <= endDate) {
      newStatus = PhaseStatus.IN_PROGRESS;
    }
    else {
      newStatus = phase.status;
    }

    // Update if changed
    if (newStatus !== phase.status) {
      phase.status = newStatus;
      await this.phaseRepository.save(phase);
    }

    return newStatus;
  }

  /**
   * Calculate earned value for phase
   */
  async calculateEarnedValue(phaseId: string): Promise<number> {
    const phase = await this.phaseRepository.findOne({
      where: { id: phaseId },
    });

    if (!phase || !phase.budgetedCost) {
      return 0;
    }

    const percentComplete = await this.calculatePhasePercentComplete(phaseId);
    return Math.round((Number(phase.budgetedCost) * percentComplete) / 100);
  }

  /**
   * Update earned value for phase
   */
  async updateEarnedValue(phaseId: string): Promise<void> {
    const earnedValue = await this.calculateEarnedValue(phaseId);

    await this.phaseRepository.update(phaseId, {
      earnedValue,
    });
  }

  /**
   * Recalculate and update phase percentage complete
   */
  async recalculatePhaseProgress(phaseId: string): Promise<void> {
    const percentComplete = await this.calculatePhasePercentComplete(phaseId);

    await this.phaseRepository.update(phaseId, {
      percentComplete,
    });

    // Also update earned value
    await this.updateEarnedValue(phaseId);
  }

  /**
   * Recalculate progress for all phases in a project
   */
  async recalculateProjectProgress(projectId: string): Promise<void> {
    const phases = await this.phaseRepository.find({
      where: { projectId },
    });

    for (const phase of phases) {
      await this.recalculatePhaseProgress(phase.id);
      await this.updatePhaseStatus(phase.id);
    }
  }
}
