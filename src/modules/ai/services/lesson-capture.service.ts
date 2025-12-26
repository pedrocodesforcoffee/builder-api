/**
 * Lesson Capture Service
 * Prompts users to capture lessons learned at key project milestones
 */

import { Injectable, Logger } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { LessonLearnedCategory } from '../enums/lesson-learned-category.enum';

/**
 * Lesson impact types (stored as strings in database)
 */
export enum LessonImpact {
  MAJOR = 'MAJOR',
  MODERATE = 'MODERATE',
  MINOR = 'MINOR',
  MINIMAL = 'MINIMAL',
}

/**
 * Event data for change order approval
 */
export interface ChangeOrderLessonEvent {
  projectId: string;
  organizationId: string;
  changeOrderId: string;
  costImpact: number;
  scheduleImpact: number;
  reason: string;
  category: string;
  userId: string;
}

/**
 * Event data for project completion
 */
export interface ProjectCompletionEvent {
  projectId: string;
  organizationId: string;
  projectName: string;
  finalCost: number;
  finalDuration: number;
  costVariance: number;
  scheduleVariance: number;
  userId: string;
}

/**
 * Event data for major cost variance
 */
export interface CostVarianceEvent {
  projectId: string;
  organizationId: string;
  budgetedAmount: number;
  actualAmount: number;
  variancePercent: number;
  costCode: string;
  description: string;
  userId: string;
}

/**
 * Event data for major schedule delay
 */
export interface ScheduleDelayEvent {
  projectId: string;
  organizationId: string;
  activityName: string;
  plannedDate: Date;
  actualDate: Date;
  delayDays: number;
  reason: string;
  userId: string;
}

/**
 * Event data for RFI closure
 */
export interface RfiClosureEvent {
  projectId: string;
  organizationId: string;
  rfiId: string;
  question: string;
  answer: string;
  resolutionTime: number; // days
  category: string;
  userId: string;
}

/**
 * Draft lesson learned to be presented to user
 */
export interface DraftLesson {
  projectId: string;
  organizationId: string;
  title: string;
  description: string;
  category: LessonLearnedCategory;
  impact: LessonImpact;
  outcome: string;
  recommendation: string;
  suggestedTags: string[];
  contextData: Record<string, any>;
}

@Injectable()
export class LessonCaptureService {
  private readonly logger = new Logger(LessonCaptureService.name);

  constructor(private recommendationsService: RecommendationsService) {}

  /**
   * Create draft lesson when change order is approved
   * Prompts user to document root cause
   *
   * @param event - Change order lesson event data
   * @returns Draft lesson for user review
   */
  async onChangeOrderApproved(event: ChangeOrderLessonEvent): Promise<DraftLesson> {
    this.logger.log(
      `Creating lesson draft for change order ${event.changeOrderId} (Project: ${event.projectId})`,
    );

    const costImpactDesc =
      event.costImpact > 0
        ? `increased cost by $${event.costImpact.toLocaleString()}`
        : `saved $${Math.abs(event.costImpact).toLocaleString()}`;

    const scheduleImpactDesc =
      event.scheduleImpact > 0
        ? `delayed schedule by ${event.scheduleImpact} days`
        : event.scheduleImpact < 0
        ? `accelerated schedule by ${Math.abs(event.scheduleImpact)} days`
        : 'had no schedule impact';

    const impact = this.determineImpact(event.costImpact, event.scheduleImpact);

    const draft: DraftLesson = {
      projectId: event.projectId,
      organizationId: event.organizationId,
      title: `Change order: ${event.reason}`,
      description: `A change order was approved that ${costImpactDesc} and ${scheduleImpactDesc}. Reason: ${event.reason}`,
      category: this.mapCategoryToEnum(event.category),
      impact,
      outcome: `Cost impact: $${event.costImpact.toLocaleString()}, Schedule impact: ${event.scheduleImpact} days`,
      recommendation: 'Document the root cause and preventive measures for future projects.',
      suggestedTags: ['change-order', event.category.toLowerCase(), impact.toLowerCase()],
      contextData: {
        changeOrderId: event.changeOrderId,
        costImpact: event.costImpact,
        scheduleImpact: event.scheduleImpact,
      },
    };

    this.logger.log(`Created draft lesson: "${draft.title}"`);
    return draft;
  }

  /**
   * Create draft lesson when project is completed
   * Prompts user for retrospective
   *
   * @param event - Project completion event data
   * @returns Draft lesson for user review
   */
  async onProjectCompletion(event: ProjectCompletionEvent): Promise<DraftLesson> {
    this.logger.log(
      `Creating lesson draft for project completion: ${event.projectName} (${event.projectId})`,
    );

    const costVarianceDesc =
      event.costVariance > 0
        ? `${event.costVariance.toFixed(1)}% over budget`
        : event.costVariance < 0
        ? `${Math.abs(event.costVariance).toFixed(1)}% under budget`
        : 'on budget';

    const scheduleVarianceDesc =
      event.scheduleVariance > 0
        ? `${event.scheduleVariance} days late`
        : event.scheduleVariance < 0
        ? `${Math.abs(event.scheduleVariance)} days early`
        : 'on schedule';

    const impact =
      Math.abs(event.costVariance) > 10 || Math.abs(event.scheduleVariance) > 30
        ? LessonImpact.MAJOR
        : Math.abs(event.costVariance) > 5 || Math.abs(event.scheduleVariance) > 14
        ? LessonImpact.MODERATE
        : LessonImpact.MINOR;

    const draft: DraftLesson = {
      projectId: event.projectId,
      organizationId: event.organizationId,
      title: `Project retrospective: ${event.projectName}`,
      description: `Project completed ${costVarianceDesc} and ${scheduleVarianceDesc}. Final cost: $${event.finalCost.toLocaleString()}, Final duration: ${event.finalDuration} days.`,
      category: LessonLearnedCategory.OTHER,
      impact,
      outcome: `Final cost: $${event.finalCost.toLocaleString()}, Cost variance: ${event.costVariance.toFixed(1)}%, Schedule variance: ${event.scheduleVariance} days`,
      recommendation:
        'Capture key takeaways: What worked well? What challenges were encountered? How can future projects benefit from this experience?',
      suggestedTags: ['project-completion', 'retrospective', impact.toLowerCase()],
      contextData: {
        finalCost: event.finalCost,
        finalDuration: event.finalDuration,
        costVariance: event.costVariance,
        scheduleVariance: event.scheduleVariance,
      },
    };

    this.logger.log(`Created draft lesson: "${draft.title}"`);
    return draft;
  }

  /**
   * Create draft lesson when major cost variance is detected
   * Prompts user to document root cause
   *
   * @param event - Cost variance event data
   * @returns Draft lesson for user review
   */
  async onCostVariance(event: CostVarianceEvent): Promise<DraftLesson> {
    this.logger.log(
      `Creating lesson draft for cost variance: ${event.variancePercent}% (Project: ${event.projectId})`,
    );

    const varianceType = event.variancePercent > 0 ? 'overrun' : 'savings';
    const impact =
      Math.abs(event.variancePercent) > 20
        ? LessonImpact.MAJOR
        : Math.abs(event.variancePercent) > 10
        ? LessonImpact.MODERATE
        : LessonImpact.MINOR;

    const draft: DraftLesson = {
      projectId: event.projectId,
      organizationId: event.organizationId,
      title: `Cost ${varianceType}: ${event.description}`,
      description: `Significant cost ${varianceType} of ${Math.abs(event.variancePercent).toFixed(1)}% detected for ${event.costCode} - ${event.description}. Budgeted: $${event.budgetedAmount.toLocaleString()}, Actual: $${event.actualAmount.toLocaleString()}.`,
      category: LessonLearnedCategory.BUDGET_MANAGEMENT,
      impact,
      outcome: `Variance: $${(event.actualAmount - event.budgetedAmount).toLocaleString()} (${event.variancePercent.toFixed(1)}%)`,
      recommendation:
        varianceType === 'overrun'
          ? 'Document the root cause of the cost overrun and identify preventive measures for future estimates.'
          : 'Document what enabled the cost savings so it can be replicated on future projects.',
      suggestedTags: ['cost-variance', event.costCode, varianceType, impact.toLowerCase()],
      contextData: {
        costCode: event.costCode,
        budgetedAmount: event.budgetedAmount,
        actualAmount: event.actualAmount,
        variancePercent: event.variancePercent,
      },
    };

    this.logger.log(`Created draft lesson: "${draft.title}"`);
    return draft;
  }

  /**
   * Create draft lesson when major schedule delay occurs
   * Prompts user to document root cause
   *
   * @param event - Schedule delay event data
   * @returns Draft lesson for user review
   */
  async onScheduleDelay(event: ScheduleDelayEvent): Promise<DraftLesson> {
    this.logger.log(
      `Creating lesson draft for schedule delay: ${event.delayDays} days (Project: ${event.projectId})`,
    );

    const impact =
      event.delayDays > 30
        ? LessonImpact.MAJOR
        : event.delayDays > 14
        ? LessonImpact.MODERATE
        : LessonImpact.MINOR;

    const draft: DraftLesson = {
      projectId: event.projectId,
      organizationId: event.organizationId,
      title: `Schedule delay: ${event.activityName}`,
      description: `Activity "${event.activityName}" was delayed by ${event.delayDays} days. Planned completion: ${event.plannedDate.toISOString().split('T')[0]}, Actual completion: ${event.actualDate.toISOString().split('T')[0]}. Reason: ${event.reason}`,
      category: LessonLearnedCategory.SCHEDULE_MANAGEMENT,
      impact,
      outcome: `Delay: ${event.delayDays} days`,
      recommendation:
        'Document the root cause of the delay and identify preventive measures for scheduling similar activities in future projects.',
      suggestedTags: ['schedule-delay', event.reason.toLowerCase(), impact.toLowerCase()],
      contextData: {
        activityName: event.activityName,
        plannedDate: event.plannedDate,
        actualDate: event.actualDate,
        delayDays: event.delayDays,
      },
    };

    this.logger.log(`Created draft lesson: "${draft.title}"`);
    return draft;
  }

  /**
   * Create draft lesson when RFI is closed
   * Captures resolution for future reference
   *
   * @param event - RFI closure event data
   * @returns Draft lesson for user review
   */
  async onRfiClosure(event: RfiClosureEvent): Promise<DraftLesson> {
    this.logger.log(
      `Creating lesson draft for RFI closure: ${event.rfiId} (Project: ${event.projectId})`,
    );

    const impact =
      event.resolutionTime > 14
        ? LessonImpact.MODERATE
        : event.resolutionTime > 7
        ? LessonImpact.MINOR
        : LessonImpact.MINIMAL;

    const draft: DraftLesson = {
      projectId: event.projectId,
      organizationId: event.organizationId,
      title: `RFI resolution: ${event.question.substring(0, 60)}...`,
      description: `RFI Question: ${event.question}\n\nAnswer: ${event.answer}\n\nResolution time: ${event.resolutionTime} days`,
      category: this.mapCategoryToEnum(event.category),
      impact,
      outcome: `RFI resolved in ${event.resolutionTime} days`,
      recommendation:
        'This RFI resolution may help answer similar questions on future projects. Consider adding to knowledge base.',
      suggestedTags: ['rfi', event.category.toLowerCase(), 'resolution'],
      contextData: {
        rfiId: event.rfiId,
        resolutionTime: event.resolutionTime,
        category: event.category,
      },
    };

    this.logger.log(`Created draft lesson: "${draft.title}"`);
    return draft;
  }

  /**
   * Determine impact severity based on cost and schedule impacts
   *
   * @private
   * @param costImpact - Dollar amount of cost impact
   * @param scheduleImpact - Number of days schedule impact
   * @returns Impact severity
   */
  private determineImpact(costImpact: number, scheduleImpact: number): LessonImpact {
    const absCost = Math.abs(costImpact);
    const absSchedule = Math.abs(scheduleImpact);

    // Major if cost > $100k or schedule > 30 days
    if (absCost > 100000 || absSchedule > 30) {
      return LessonImpact.MAJOR;
    }

    // Moderate if cost > $25k or schedule > 14 days
    if (absCost > 25000 || absSchedule > 14) {
      return LessonImpact.MODERATE;
    }

    // Minor if cost > $5k or schedule > 3 days
    if (absCost > 5000 || absSchedule > 3) {
      return LessonImpact.MINOR;
    }

    return LessonImpact.MINIMAL;
  }

  /**
   * Map string category to LessonLearnedCategory enum
   *
   * @private
   * @param category - Category string
   * @returns LessonLearnedCategory enum value
   */
  private mapCategoryToEnum(category: string): LessonLearnedCategory {
    const categoryMap: Record<string, LessonLearnedCategory> = {
      'design': LessonLearnedCategory.DESIGN_COORDINATION,
      'procurement': LessonLearnedCategory.MATERIAL_PROCUREMENT,
      'construction': LessonLearnedCategory.SITE_CONDITIONS,
      'quality': LessonLearnedCategory.QUALITY_CONTROL,
      'safety': LessonLearnedCategory.SAFETY,
      'budget': LessonLearnedCategory.BUDGET_MANAGEMENT,
      'cost': LessonLearnedCategory.BUDGET_MANAGEMENT,
      'schedule': LessonLearnedCategory.SCHEDULE_MANAGEMENT,
      'subcontractor': LessonLearnedCategory.SUBCONTRACTOR_MANAGEMENT,
      'vendor': LessonLearnedCategory.SUBCONTRACTOR_MANAGEMENT,
      'rfi': LessonLearnedCategory.COMMUNICATION,
      'submittal': LessonLearnedCategory.DESIGN_COORDINATION,
      'closeout': LessonLearnedCategory.OTHER,
      'warranty': LessonLearnedCategory.OTHER,
      'change': LessonLearnedCategory.CHANGE_MANAGEMENT,
      'change-order': LessonLearnedCategory.CHANGE_MANAGEMENT,
    };

    const normalized = category.toLowerCase();
    return categoryMap[normalized] || LessonLearnedCategory.OTHER;
  }
}
