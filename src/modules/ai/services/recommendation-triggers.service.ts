/**
 * Recommendation Triggers Service
 * Automatically creates AI recommendations based on project events
 */

import { Injectable, Logger } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { PatternCalculatorService } from './pattern-calculator.service';
import { RecommendationType } from '../enums/recommendation-type.enum';
import { RecommendationPriority } from '../enums/recommendation-priority.enum';

/**
 * Event data for budget changes
 */
export interface BudgetChangeEvent {
  projectId: string;
  organizationId: string;
  previousBudget: number;
  newBudget: number;
  variancePercent: number;
  userId: string;
}

/**
 * Event data for schedule changes
 */
export interface ScheduleChangeEvent {
  projectId: string;
  organizationId: string;
  previousEndDate: Date;
  newEndDate: Date;
  delayDays: number;
  userId: string;
}

/**
 * Event data for phase changes
 */
export interface PhaseChangeEvent {
  projectId: string;
  organizationId: string;
  previousPhase: string;
  newPhase: string;
  userId: string;
}

/**
 * Event data for RFI creation
 */
export interface RfiCreatedEvent {
  projectId: string;
  organizationId: string;
  rfiId: string;
  question: string;
  userId: string;
}

/**
 * Event data for change order approval
 */
export interface ChangeOrderApprovedEvent {
  projectId: string;
  organizationId: string;
  changeOrderId: string;
  costImpact: number;
  scheduleImpact: number;
  reason: string;
  userId: string;
}

@Injectable()
export class RecommendationTriggersService {
  private readonly logger = new Logger(RecommendationTriggersService.name);

  constructor(
    private recommendationsService: RecommendationsService,
    private patternCalculatorService: PatternCalculatorService,
  ) {}

  /**
   * Trigger recommendations when budget changes significantly
   * Checks patterns and suggests cost adjustments
   *
   * @param event - Budget change event data
   */
  async onBudgetChange(event: BudgetChangeEvent): Promise<void> {
    this.logger.log(
      `Budget change detected for project ${event.projectId}: ${event.variancePercent}% variance`,
    );

    try {
      // Get cost variance pattern for this organization
      const pattern = await this.patternCalculatorService.getPattern(
        event.organizationId,
        'COST_VARIANCE' as any,
      );

      if (!pattern) {
        this.logger.debug(
          `No cost variance pattern found for organization ${event.organizationId}`,
        );
        return;
      }

      const avgVariance = pattern.averageValue;
      const highRiskThreshold = avgVariance + pattern.standardDeviation;

      // If current variance exceeds organization's average
      if (Math.abs(event.variancePercent) > avgVariance) {
        const priority =
          Math.abs(event.variancePercent) > highRiskThreshold
            ? RecommendationPriority.HIGH
            : RecommendationPriority.MEDIUM;

        const title =
          event.variancePercent > 0
            ? 'Budget overrun detected - review cost controls'
            : 'Budget savings opportunity - reallocate contingency';

        const description =
          event.variancePercent > 0
            ? `Your project is ${Math.abs(event.variancePercent).toFixed(1)}% over budget, which exceeds your organization's average of ${avgVariance.toFixed(1)}%. Based on ${pattern.sampleSize} similar projects, consider reviewing cost controls and renegotiating with high-cost subcontractors.`
            : `Your project is ${Math.abs(event.variancePercent).toFixed(1)}% under budget. Consider reallocating savings to quality improvements or accelerating the schedule.`;

        await this.recommendationsService.createRecommendation({
          projectId: event.projectId,
          organizationId: event.organizationId,
          type: RecommendationType.COST_OPTIMIZATION,
          priority,
          title,
          description,
          recommendationData: {
            patternId: pattern.id,
            avgVariance,
            currentVariance: event.variancePercent,
            threshold: highRiskThreshold,
          },
        });

        this.logger.log(
          `Created ${priority} priority cost optimization recommendation for project ${event.projectId}`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to create budget change recommendation: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Trigger recommendations when schedule is delayed
   * Suggests mitigations from similar projects
   *
   * @param event - Schedule change event data
   */
  async onScheduleDelay(event: ScheduleChangeEvent): Promise<void> {
    this.logger.log(
      `Schedule delay detected for project ${event.projectId}: ${event.delayDays} days`,
    );

    try {
      // Get schedule variance pattern for this organization
      const pattern = await this.patternCalculatorService.getPattern(
        event.organizationId,
        'SCHEDULE_VARIANCE' as any,
      );

      if (!pattern) {
        this.logger.debug(
          `No schedule variance pattern found for organization ${event.organizationId}`,
        );
        return;
      }

      const avgDelayDays = pattern.averageValue;
      const highRiskThreshold = avgDelayDays + pattern.standardDeviation;

      // If current delay exceeds organization's average
      if (event.delayDays > avgDelayDays) {
        const priority =
          event.delayDays > highRiskThreshold
            ? RecommendationPriority.HIGH
            : RecommendationPriority.MEDIUM;

        const title = 'Schedule delay exceeds organization average';
        const description = `Your project is delayed by ${event.delayDays} days, which exceeds your organization's average of ${avgDelayDays.toFixed(0)} days. Based on ${pattern.sampleSize} similar projects, consider: 1) Reviewing critical path activities, 2) Adding crew or working overtime, 3) Fast-tracking parallel activities where possible.`;

        await this.recommendationsService.createRecommendation({
          projectId: event.projectId,
          organizationId: event.organizationId,
          type: RecommendationType.SCHEDULE_RISK,
          priority,
          title,
          description,
          recommendationData: {
            patternId: pattern.id,
            avgDelay: avgDelayDays,
            currentDelay: event.delayDays,
            threshold: highRiskThreshold,
          },
        });

        this.logger.log(
          `Created ${priority} priority schedule optimization recommendation for project ${event.projectId}`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to create schedule delay recommendation: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Trigger recommendations when project phase changes
   * Suggests next steps based on organizational patterns
   *
   * @param event - Phase change event data
   */
  async onPhaseChange(event: PhaseChangeEvent): Promise<void> {
    this.logger.log(
      `Phase change detected for project ${event.projectId}: ${event.previousPhase} -> ${event.newPhase}`,
    );

    try {
      // Define recommendations for each phase transition
      const phaseRecommendations: Record<string, { title: string; description: string; type: RecommendationType }> = {
        PRECONSTRUCTION: {
          title: 'Preconstruction checklist - ensure readiness',
          description:
            'Key tasks for preconstruction phase: 1) Complete design development, 2) Finalize subcontractor bids, 3) Secure permits and approvals, 4) Order long-lead items (steel, elevators, HVAC), 5) Establish site logistics and safety plans.',
          type: RecommendationType.PROCESS_IMPROVEMENT,
        },
        CONSTRUCTION: {
          title: 'Construction phase - monitor critical items',
          description:
            'Key tasks for construction phase: 1) Implement daily quality inspections, 2) Track schedule closely (weekly updates), 3) Monitor RFI velocity and respond quickly, 4) Conduct weekly safety meetings, 5) Track cost to budget variances weekly.',
          type: RecommendationType.PROCESS_IMPROVEMENT,
        },
        CLOSEOUT: {
          title: 'Closeout phase - prepare for completion',
          description:
            'Key tasks for closeout phase: 1) Compile all O&M manuals, 2) Complete punch list inspection, 3) Obtain final inspections and certificates of occupancy, 4) Close out subcontractor contracts, 5) Prepare final as-built drawings.',
          type: RecommendationType.PROCESS_IMPROVEMENT,
        },
        COMPLETE: {
          title: 'Project complete - capture lessons learned',
          description:
            'Your project is complete! Take time to document lessons learned: 1) What went well?, 2) What would you change?, 3) Any unexpected issues?, 4) Subcontractor performance, 5) Cost and schedule variance root causes. This helps improve future projects.',
          type: RecommendationType.PROCESS_IMPROVEMENT,
        },
      };

      const recommendation = phaseRecommendations[event.newPhase];

      if (recommendation) {
        await this.recommendationsService.createRecommendation({
          projectId: event.projectId,
          organizationId: event.organizationId,
          type: recommendation.type,
          priority: RecommendationPriority.MEDIUM,
          title: recommendation.title,
          description: recommendation.description,
          recommendationData: {
            previousPhase: event.previousPhase,
            newPhase: event.newPhase,
          },
        });

        this.logger.log(
          `Created phase transition recommendation for project ${event.projectId}`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to create phase change recommendation: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Trigger recommendations when RFI is created
   * Suggests similar RFIs and their resolutions
   *
   * @param event - RFI created event data
   */
  async onRfiCreated(event: RfiCreatedEvent): Promise<void> {
    this.logger.log(
      `RFI created for project ${event.projectId}: ${event.rfiId}`,
    );

    try {
      // Get RFI velocity pattern for this organization
      const pattern = await this.patternCalculatorService.getPattern(
        event.organizationId,
        'RFI_VELOCITY' as any,
      );

      if (!pattern) {
        this.logger.debug(
          `No RFI velocity pattern found for organization ${event.organizationId}`,
        );
        return;
      }

      const avgRfisPerMonth = pattern.averageValue;

      // Create informational recommendation about RFI trends
      const title = 'RFI created - monitor velocity';
      const description = `A new RFI has been created. Your organization averages ${avgRfisPerMonth.toFixed(1)} RFIs per month across projects. To reduce RFI volume: 1) Improve design clarity, 2) Conduct more thorough pre-construction reviews, 3) Use BIM clash detection, 4) Hold regular coordination meetings.`;

      await this.recommendationsService.createRecommendation({
        projectId: event.projectId,
        organizationId: event.organizationId,
        type: RecommendationType.PROCESS_IMPROVEMENT,
        priority: RecommendationPriority.LOW,
        title,
        description,
        recommendationData: {
          patternId: pattern.id,
          rfiId: event.rfiId,
          avgRfisPerMonth,
        },
      });

      this.logger.log(
        `Created RFI velocity recommendation for project ${event.projectId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to create RFI recommendation: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Trigger recommendations when change order is approved
   * Predicts cost/schedule impact using patterns
   *
   * @param event - Change order approved event data
   */
  async onChangeOrderApproved(event: ChangeOrderApprovedEvent): Promise<void> {
    this.logger.log(
      `Change order approved for project ${event.projectId}: ${event.changeOrderId}, Cost impact: $${event.costImpact}`,
    );

    try {
      // Get change order pattern for this organization
      const pattern = await this.patternCalculatorService.getPattern(
        event.organizationId,
        'CHANGE_ORDER_FREQUENCY' as any,
      );

      if (!pattern) {
        this.logger.debug(
          `No change order pattern found for organization ${event.organizationId}`,
        );
        return;
      }

      const avgCOPercent = pattern.averageValue;

      // If change orders are accumulating beyond organization average
      const title = 'Change order approved - monitor budget impact';
      const description = `Change order approved with $${event.costImpact.toLocaleString()} cost impact. Your organization averages ${avgCOPercent.toFixed(1)}% of contract value in change orders. To reduce change orders: 1) Improve design completeness, 2) Better site investigation, 3) More thorough contract documents, 4) Early subcontractor involvement.`;

      await this.recommendationsService.createRecommendation({
        projectId: event.projectId,
        organizationId: event.organizationId,
        type: RecommendationType.COST_OPTIMIZATION,
        priority: RecommendationPriority.MEDIUM,
        title,
        description,
        recommendationData: {
          patternId: pattern.id,
          changeOrderId: event.changeOrderId,
          costImpact: event.costImpact,
          scheduleImpact: event.scheduleImpact,
          avgCOPercent,
        },
      });

      this.logger.log(
        `Created change order recommendation for project ${event.projectId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to create change order recommendation: ${error.message}`,
        error.stack,
      );
    }
  }
}
