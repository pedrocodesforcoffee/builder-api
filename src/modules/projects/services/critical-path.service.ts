import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectPhase } from '../entities/project-phase.entity';
import { DependencyType } from '../enums/dependency-type.enum';

interface PhaseNode {
  phase: ProjectPhase;
  earlyStart: Date;
  earlyFinish: Date;
  lateStart: Date;
  lateFinish: Date;
  totalFloat: number;
  freeFloat: number;
}

export interface CriticalPathResult {
  projectId: string;
  calculatedAt: Date;
  criticalPath: {
    phaseId: string;
    name: string;
    startDate: Date;
    endDate: Date;
    duration: number;
    earlyStart: Date;
    earlyFinish: Date;
    lateStart: Date;
    lateFinish: Date;
    totalFloat: number;
    freeFloat: number;
  }[];
  nonCriticalPhases: {
    phaseId: string;
    name: string;
    totalFloat: number;
    freeFloat: number;
    canDelayDays: number;
  }[];
  projectCompletionDate: Date;
  totalProjectDuration: number;
  criticalPathLength: number;
}

/**
 * Critical Path Service
 *
 * Implements Critical Path Method (CPM) algorithm for project schedule analysis.
 * Calculates early start/finish, late start/finish, float, and identifies critical path.
 */
@Injectable()
export class CriticalPathService {
  constructor(
    @InjectRepository(ProjectPhase)
    private readonly phaseRepository: Repository<ProjectPhase>,
  ) {}

  /**
   * Calculate critical path for a project
   */
  async calculateCriticalPath(projectId: string): Promise<CriticalPathResult> {
    const phases = await this.phaseRepository.find({
      where: { projectId },
      order: { order: 'ASC' },
    });

    if (phases.length === 0) {
      throw new Error('No phases found for project');
    }

    // Build phase nodes with calculated values
    const phaseNodes = new Map<string, PhaseNode>();

    // Initialize all nodes
    for (const phase of phases) {
      phaseNodes.set(phase.id, {
        phase,
        earlyStart: new Date(phase.startDate),
        earlyFinish: new Date(phase.endDate),
        lateStart: new Date(phase.startDate),
        lateFinish: new Date(phase.endDate),
        totalFloat: 0,
        freeFloat: 0,
      });
    }

    // Forward pass - Calculate Early Start and Early Finish
    this.forwardPass(phases, phaseNodes);

    // Backward pass - Calculate Late Start and Late Finish
    this.backwardPass(phases, phaseNodes);

    // Calculate float
    this.calculateFloat(phaseNodes);

    // Identify critical path (phases with zero total float)
    const criticalPhases: PhaseNode[] = [];
    const nonCriticalPhases: PhaseNode[] = [];

    for (const node of phaseNodes.values()) {
      if (node.totalFloat === 0) {
        criticalPhases.push(node);
      } else {
        nonCriticalPhases.push(node);
      }
    }

    // Update critical path flag in database
    await this.updateCriticalPathFlags(projectId, criticalPhases.map(n => n.phase.id));

    // Find latest finish date (project completion)
    const projectCompletionDate = new Date(
      Math.max(...Array.from(phaseNodes.values()).map(n => n.earlyFinish.getTime())),
    );

    // Calculate durations
    const totalProjectDuration = this.calculateDurationDays(
      phases[0].startDate,
      projectCompletionDate,
    );

    const criticalPathLength = criticalPhases.reduce(
      (sum, node) => sum + node.phase.getPlannedDuration(),
      0,
    );

    return {
      projectId,
      calculatedAt: new Date(),
      criticalPath: criticalPhases.map(node => ({
        phaseId: node.phase.id,
        name: node.phase.name,
        startDate: new Date(node.phase.startDate),
        endDate: new Date(node.phase.endDate),
        duration: node.phase.getPlannedDuration(),
        earlyStart: node.earlyStart,
        earlyFinish: node.earlyFinish,
        lateStart: node.lateStart,
        lateFinish: node.lateFinish,
        totalFloat: node.totalFloat,
        freeFloat: node.freeFloat,
      })),
      nonCriticalPhases: nonCriticalPhases.map(node => ({
        phaseId: node.phase.id,
        name: node.phase.name,
        totalFloat: node.totalFloat,
        freeFloat: node.freeFloat,
        canDelayDays: node.totalFloat,
      })),
      projectCompletionDate,
      totalProjectDuration,
      criticalPathLength,
    };
  }

  /**
   * Forward pass - Calculate Early Start and Early Finish
   */
  private forwardPass(
    phases: ProjectPhase[],
    phaseNodes: Map<string, PhaseNode>,
  ): void {
    for (const phase of phases) {
      const node = phaseNodes.get(phase.id)!;

      // If phase has predecessors, early start is max of predecessor early finishes
      if (phase.predecessorIds && phase.predecessorIds.length > 0) {
        let maxFinish = new Date(0);

        for (const predId of phase.predecessorIds) {
          const predNode = phaseNodes.get(predId);
          if (predNode) {
            const predFinish = this.applyLag(
              predNode.earlyFinish,
              phase.lagDays,
              phase.dependencyType,
            );

            if (predFinish > maxFinish) {
              maxFinish = predFinish;
            }
          }
        }

        node.earlyStart = maxFinish;
      }

      // Early finish = Early start + duration
      node.earlyFinish = this.addDays(node.earlyStart, phase.getPlannedDuration());
    }
  }

  /**
   * Backward pass - Calculate Late Start and Late Finish
   */
  private backwardPass(
    phases: ProjectPhase[],
    phaseNodes: Map<string, PhaseNode>,
  ): void {
    // Find project end (max early finish)
    const projectEnd = new Date(
      Math.max(...Array.from(phaseNodes.values()).map(n => n.earlyFinish.getTime())),
    );

    // Start from the end and work backwards
    const reversedPhases = [...phases].reverse();

    // Initialize phases with no successors
    for (const phase of phases) {
      const node = phaseNodes.get(phase.id)!;

      if (!phase.successorIds || phase.successorIds.length === 0) {
        node.lateFinish = node.earlyFinish;
        node.lateStart = this.subtractDays(node.lateFinish, phase.getPlannedDuration());
      }
    }

    // Calculate for phases with successors
    for (const phase of reversedPhases) {
      const node = phaseNodes.get(phase.id)!;

      if (phase.successorIds && phase.successorIds.length > 0) {
        let minStart = new Date(8640000000000000); // Max date

        for (const succId of phase.successorIds) {
          const succNode = phaseNodes.get(succId);
          if (succNode) {
            const succStart = this.applyLag(
              succNode.lateStart,
              -phase.lagDays,
              phase.dependencyType,
            );

            if (succStart < minStart) {
              minStart = succStart;
            }
          }
        }

        node.lateFinish = minStart;
        node.lateStart = this.subtractDays(node.lateFinish, phase.getPlannedDuration());
      }
    }
  }

  /**
   * Calculate float for all phases
   */
  private calculateFloat(phaseNodes: Map<string, PhaseNode>): void {
    for (const node of phaseNodes.values()) {
      // Total Float = Late Start - Early Start (or Late Finish - Early Finish)
      node.totalFloat = this.calculateDurationDays(node.earlyStart, node.lateStart);

      // Free Float = Early Start of next - Early Finish of current - 1
      let minSuccessorEarlyStart = new Date(8640000000000000);

      if (node.phase.successorIds && node.phase.successorIds.length > 0) {
        for (const succId of node.phase.successorIds) {
          const succNode = phaseNodes.get(succId);
          if (succNode && succNode.earlyStart < minSuccessorEarlyStart) {
            minSuccessorEarlyStart = succNode.earlyStart;
          }
        }

        node.freeFloat = Math.max(
          0,
          this.calculateDurationDays(node.earlyFinish, minSuccessorEarlyStart),
        );
      } else {
        node.freeFloat = node.totalFloat;
      }
    }
  }

  /**
   * Update critical path flags in database
   */
  private async updateCriticalPathFlags(
    projectId: string,
    criticalPhaseIds: string[],
  ): Promise<void> {
    // Set all phases to not on critical path
    await this.phaseRepository.update(
      { projectId },
      { isOnCriticalPath: false },
    );

    // Set critical phases
    if (criticalPhaseIds.length > 0) {
      await this.phaseRepository.update(
        criticalPhaseIds,
        { isOnCriticalPath: true },
      );
    }
  }

  /**
   * Apply lag days based on dependency type
   */
  private applyLag(
    date: Date,
    lagDays: number,
    dependencyType?: DependencyType,
  ): Date {
    // For now, simple implementation assuming Finish-to-Start
    return this.addDays(date, lagDays);
  }

  /**
   * Add days to a date
   */
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Subtract days from a date
   */
  private subtractDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }

  /**
   * Calculate duration in days between two dates
   */
  private calculateDurationDays(start: Date, end: Date): number {
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
