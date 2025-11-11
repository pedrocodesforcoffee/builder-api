import { Injectable, Logger } from '@nestjs/common';
import { MetricCalculator } from '../../interfaces/metric-calculator.interface';
import { MetricResult } from '../../interfaces/metric-result.interface';
import { CalculationOptions } from '../../interfaces/calculation-options.interface';
import { ValidationResult } from '../../interfaces/validation-result.interface';
import { MetricGroup } from '../../enums/metric-group.enum';

/**
 * RFICalculator Service
 *
 * Stub implementation for RFI (Request for Information) metrics.
 * TODO: Implement when RFI entity is created
 */
@Injectable()
export class RFICalculatorService implements MetricCalculator {
  private readonly logger = new Logger(RFICalculatorService.name);

  readonly name = 'rfis';
  readonly group = MetricGroup.RFIS;
  readonly ttl = 600; // 10 minutes
  readonly isRealTime = false;
  readonly dependencies = [];

  async calculate(projectId: string, options?: CalculationOptions): Promise<MetricResult> {
    const startTime = Date.now();

    // TODO: Implement RFI metrics when RFI entity is available
    const metrics = {
      totalRFIs: 0,
      openRFIs: 0,
      closedRFIs: 0,
      pendingRFIs: 0,
      overdueRFIs: 0,
      averageResponseTime: 0,
      byStatus: {
        draft: 0,
        submitted: 0,
        inReview: 0,
        answered: 0,
        closed: 0,
      },
      byPriority: {
        urgent: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      averageAge: 0,
      oldestOpenRFI: null,
      responseRate: 0,
    };

    return {
      group: this.group,
      calculatedAt: new Date(),
      calculationDuration: Date.now() - startTime,
      metrics,
      values: [],
      kpis: {
        primary: {
          key: 'openRFIs',
          value: 0,
          label: 'Open RFIs',
          format: 'number',
        },
      },
      summary: {
        total: 0,
        open: 0,
        closed: 0,
        overdue: 0,
      },
      dataSourceVersion: new Date().toISOString(),
      warnings: ['RFI metrics not yet implemented - RFI entity required'],
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
          message: 'RFI calculator not yet implemented',
          suggestion: 'RFI entity needs to be created first',
        },
      ],
    };
  }
}