import { Injectable, Logger } from '@nestjs/common';
import { MetricCalculator } from '../../interfaces/metric-calculator.interface';
import { MetricResult } from '../../interfaces/metric-result.interface';
import { CalculationOptions } from '../../interfaces/calculation-options.interface';
import { ValidationResult } from '../../interfaces/validation-result.interface';
import { MetricGroup } from '../../enums/metric-group.enum';

/**
 * SubmittalsCalculator Service
 *
 * Stub implementation for Submittal metrics.
 * TODO: Implement when Submittal entity is created
 */
@Injectable()
export class SubmittalsCalculatorService implements MetricCalculator {
  private readonly logger = new Logger(SubmittalsCalculatorService.name);

  readonly name = 'submittals';
  readonly group = MetricGroup.SUBMITTALS;
  readonly ttl = 600; // 10 minutes
  readonly isRealTime = false;
  readonly dependencies = [];

  async calculate(projectId: string, options?: CalculationOptions): Promise<MetricResult> {
    const startTime = Date.now();

    // TODO: Implement Submittal metrics when Submittal entity is available
    const metrics = {
      totalSubmittals: 0,
      pendingSubmittals: 0,
      approvedSubmittals: 0,
      rejectedSubmittals: 0,
      overdueSubmittals: 0,
      averageApprovalTime: 0,
      byStatus: {
        draft: 0,
        submitted: 0,
        underReview: 0,
        approved: 0,
        approvedAsNoted: 0,
        rejected: 0,
        reviseResubmit: 0,
      },
      byType: {
        material: 0,
        equipment: 0,
        shopDrawing: 0,
        sample: 0,
        productData: 0,
      },
      approvalRate: 0,
      firstTimeApprovalRate: 0,
      averageRevisions: 0,
    };

    return {
      group: this.group,
      calculatedAt: new Date(),
      calculationDuration: Date.now() - startTime,
      metrics,
      values: [],
      kpis: {
        primary: {
          key: 'pendingSubmittals',
          value: 0,
          label: 'Pending Submittals',
          format: 'number',
        },
      },
      summary: {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      },
      dataSourceVersion: new Date().toISOString(),
      warnings: ['Submittal metrics not yet implemented - Submittal entity required'],
    };
  }

  async getDataSourceVersion(projectId: string): Promise<string> {
    return new Date().toISOString();
  }

  async validate(projectId: string): Promise<ValidationResult> {
    return {
      isValid: true,
      errors: [],
      warnings: [
        {
          code: 'NOT_IMPLEMENTED',
          message: 'Submittals calculator not yet implemented',
          suggestion: 'Submittal entity needs to be created first',
        },
      ],
    };
  }
}