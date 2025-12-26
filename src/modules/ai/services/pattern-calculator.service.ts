/**
 * Pattern Calculator Service
 * Analyzes completed projects to identify organizational patterns and trends
 * Runs weekly to update pattern data for recommendations
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectProfile, ProjectPattern } from '../entities';
import { PatternType } from '../enums';

/**
 * Statistical metrics for pattern analysis
 */
interface StatisticalMetrics {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
}

/**
 * Cost variance pattern data
 */
interface CostVariancePattern {
  avgVariancePercent: number;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  highRiskThreshold: number;
  commonCauses: string[];
}

/**
 * Schedule variance pattern data
 */
interface ScheduleVariancePattern {
  avgVarianceDays: number;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  highRiskThreshold: number;
  commonCauses: string[];
}

/**
 * RFI velocity pattern data
 */
interface RfiVelocityPattern {
  avgRfisPerProject: number;
  avgRfisPerMonth: number;
  peakPhases: string[];
  trendDirection: 'increasing' | 'decreasing' | 'stable';
}

/**
 * Change order pattern data
 */
interface ChangeOrderPattern {
  avgChangeOrdersPerProject: number;
  avgChangeOrderValue: number;
  avgChangeOrderPercent: number;
  commonCategories: string[];
}

@Injectable()
export class PatternCalculatorService {
  private readonly logger = new Logger(PatternCalculatorService.name);

  constructor(
    @InjectRepository(ProjectProfile)
    private projectProfileRepo: Repository<ProjectProfile>,

    @InjectRepository(ProjectPattern)
    private projectPatternRepo: Repository<ProjectPattern>,
  ) {}

  // ============================================================================
  // MAIN PATTERN CALCULATION METHODS
  // ============================================================================

  /**
   * Calculate all patterns for an organization
   * Called by weekly cron job
   */
  async calculateOrganizationPatterns(organizationId: string): Promise<void> {
    this.logger.log(`Calculating patterns for organization ${organizationId}`);

    try {
      // Load all completed projects for this organization
      const completedProjects = await this.projectProfileRepo.find({
        where: {
          organizationId,
          isComplete: true,
        },
        order: {
          completionDate: 'DESC',
        },
      });

      if (completedProjects.length === 0) {
        this.logger.warn(
          `No completed projects found for organization ${organizationId}. Skipping pattern calculation.`,
        );
        return;
      }

      this.logger.log(
        `Found ${completedProjects.length} completed projects for pattern analysis`,
      );

      // Calculate each pattern type
      await this.calculateCostVariancePattern(organizationId, completedProjects);
      await this.calculateScheduleVariancePattern(organizationId, completedProjects);
      await this.calculateRfiVelocityPattern(organizationId, completedProjects);
      await this.calculateChangeOrderPattern(organizationId, completedProjects);

      this.logger.log(`Pattern calculation complete for organization ${organizationId}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to calculate patterns for organization ${organizationId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ============================================================================
  // COST VARIANCE PATTERN
  // ============================================================================

  /**
   * Calculate cost variance patterns
   * Identifies trends in budget overruns/savings
   */
  private async calculateCostVariancePattern(
    organizationId: string,
    projects: ProjectProfile[],
  ): Promise<void> {
    this.logger.debug('Calculating cost variance pattern');

    // Filter projects with cost variance data
    const projectsWithCostData = projects.filter(
      (p) => p.costVariancePercent !== null && p.costVariancePercent !== undefined,
    );

    if (projectsWithCostData.length < 3) {
      this.logger.warn('Insufficient cost variance data (need at least 3 projects)');
      return;
    }

    const variances = projectsWithCostData.map((p) => Number(p.costVariancePercent));
    const stats = this.calculateStatistics(variances);

    // Determine trend direction (last 5 projects vs previous 5)
    const recentVariances = variances.slice(0, Math.min(5, variances.length));
    const olderVariances = variances.slice(5, Math.min(10, variances.length));
    const trendDirection = this.determineTrend(recentVariances, olderVariances);

    // Identify common causes (projects with >10% variance)
    const highVarianceProjects = projectsWithCostData.filter(
      (p) => Math.abs(Number(p.costVariancePercent)) > 10,
    );
    const commonCauses = this.extractCommonCauses(highVarianceProjects);

    // Calculate confidence (based on sample size and consistency)
    const consistency = 1 - stats.stdDev / Math.abs(stats.mean || 1);
    const sampleFactor = Math.min(1, projectsWithCostData.length / 10);
    const confidence = Math.max(0, Math.min(1, (consistency * 0.6 + sampleFactor * 0.4)));

    // Determine risk level
    const avgVariance = Math.abs(stats.mean);
    let riskLevel: 'low' | 'medium' | 'high';
    if (avgVariance < 5) riskLevel = 'low';
    else if (avgVariance < 15) riskLevel = 'medium';
    else riskLevel = 'high';

    // Create or update pattern
    const pattern: CostVariancePattern = {
      avgVariancePercent: stats.mean,
      trendDirection,
      highRiskThreshold: stats.mean + stats.stdDev,
      commonCauses,
    };

    await this.savePattern(organizationId, PatternType.COST_VARIANCE, pattern, {
      averageValue: stats.mean,
      medianValue: stats.median,
      standardDeviation: stats.stdDev,
      percentile25: stats.min,
      percentile75: stats.max,
      confidenceScore: confidence,
      sampleSize: projectsWithCostData.length,
      impactSeverity: riskLevel,
      trendDirection,
    });

    this.logger.log(
      `Cost variance pattern: avg=${stats.mean.toFixed(2)}%, trend=${trendDirection}, risk=${riskLevel}`,
    );
  }

  // ============================================================================
  // SCHEDULE VARIANCE PATTERN
  // ============================================================================

  /**
   * Calculate schedule variance patterns
   * Identifies trends in project delays/early completions
   */
  private async calculateScheduleVariancePattern(
    organizationId: string,
    projects: ProjectProfile[],
  ): Promise<void> {
    this.logger.debug('Calculating schedule variance pattern');

    const projectsWithScheduleData = projects.filter(
      (p) => p.scheduleVarianceDays !== null && p.scheduleVarianceDays !== undefined,
    );

    if (projectsWithScheduleData.length < 3) {
      this.logger.warn('Insufficient schedule variance data (need at least 3 projects)');
      return;
    }

    const variances = projectsWithScheduleData.map((p) => Number(p.scheduleVarianceDays));
    const stats = this.calculateStatistics(variances);

    // Determine trend
    const recentVariances = variances.slice(0, Math.min(5, variances.length));
    const olderVariances = variances.slice(5, Math.min(10, variances.length));
    const trendDirection = this.determineTrend(recentVariances, olderVariances);

    // Identify common causes (projects with >14 days variance)
    const highVarianceProjects = projectsWithScheduleData.filter(
      (p) => Math.abs(Number(p.scheduleVarianceDays)) > 14,
    );
    const commonCauses = this.extractCommonCauses(highVarianceProjects);

    // Calculate confidence
    const consistency = 1 - stats.stdDev / Math.abs(stats.mean || 1);
    const sampleFactor = Math.min(1, projectsWithScheduleData.length / 10);
    const confidence = Math.max(0, Math.min(1, (consistency * 0.6 + sampleFactor * 0.4)));

    // Determine risk level (based on average delay)
    const avgVariance = Math.abs(stats.mean);
    let riskLevel: 'low' | 'medium' | 'high';
    if (avgVariance < 7) riskLevel = 'low';
    else if (avgVariance < 21) riskLevel = 'medium';
    else riskLevel = 'high';

    const pattern: ScheduleVariancePattern = {
      avgVarianceDays: stats.mean,
      trendDirection,
      highRiskThreshold: stats.mean + stats.stdDev,
      commonCauses,
    };

    await this.savePattern(organizationId, PatternType.SCHEDULE_VARIANCE, pattern, {
      averageValue: stats.mean,
      medianValue: stats.median,
      standardDeviation: stats.stdDev,
      percentile25: stats.min,
      percentile75: stats.max,
      confidenceScore: confidence,
      sampleSize: projectsWithScheduleData.length,
      impactSeverity: riskLevel,
      trendDirection,
    });

    this.logger.log(
      `Schedule variance pattern: avg=${stats.mean.toFixed(1)} days, trend=${trendDirection}, risk=${riskLevel}`,
    );
  }

  // ============================================================================
  // RFI VELOCITY PATTERN
  // ============================================================================

  /**
   * Calculate RFI velocity patterns
   * Identifies RFI frequency trends
   */
  private async calculateRfiVelocityPattern(
    organizationId: string,
    projects: ProjectProfile[],
  ): Promise<void> {
    this.logger.debug('Calculating RFI velocity pattern');

    const projectsWithRfiData = projects.filter(
      (p) => p.rfiCount !== null && p.rfiCount !== undefined && p.durationDays,
    );

    if (projectsWithRfiData.length < 3) {
      this.logger.warn('Insufficient RFI data (need at least 3 projects)');
      return;
    }

    const rfiCounts = projectsWithRfiData.map((p) => Number(p.rfiCount));
    const stats = this.calculateStatistics(rfiCounts);

    // Calculate RFIs per month
    const rfisPerMonth = projectsWithRfiData.map((p) => {
      const durationMonths = Number(p.durationDays) / 30;
      return Number(p.rfiCount) / durationMonths;
    });
    const monthlyStats = this.calculateStatistics(rfisPerMonth);

    // Determine trend
    const recentRfis = rfiCounts.slice(0, Math.min(5, rfiCounts.length));
    const olderRfis = rfiCounts.slice(5, Math.min(10, rfiCounts.length));
    const trendDirection = this.determineTrend(recentRfis, olderRfis);

    // Calculate confidence
    const consistency = 1 - stats.stdDev / (stats.mean || 1);
    const sampleFactor = Math.min(1, projectsWithRfiData.length / 10);
    const confidence = Math.max(0, Math.min(1, (consistency * 0.6 + sampleFactor * 0.4)));

    // Determine risk level (based on RFIs per month)
    let riskLevel: 'low' | 'medium' | 'high';
    if (monthlyStats.mean < 5) riskLevel = 'low';
    else if (monthlyStats.mean < 15) riskLevel = 'medium';
    else riskLevel = 'high';

    const pattern: RfiVelocityPattern = {
      avgRfisPerProject: stats.mean,
      avgRfisPerMonth: monthlyStats.mean,
      peakPhases: ['Construction'], // Could be enhanced with actual phase data
      trendDirection,
    };

    await this.savePattern(organizationId, PatternType.RFI_VELOCITY, pattern, {
      averageValue: monthlyStats.mean,
      medianValue: monthlyStats.median,
      standardDeviation: monthlyStats.stdDev,
      percentile25: monthlyStats.min,
      percentile75: monthlyStats.max,
      confidenceScore: confidence,
      sampleSize: projectsWithRfiData.length,
      impactSeverity: riskLevel,
      trendDirection,
    });

    this.logger.log(
      `RFI velocity pattern: avg=${stats.mean.toFixed(1)} RFIs/project, ${monthlyStats.mean.toFixed(1)}/month, risk=${riskLevel}`,
    );
  }

  // ============================================================================
  // CHANGE ORDER PATTERN
  // ============================================================================

  /**
   * Calculate change order patterns
   * Identifies change order frequency and value trends
   */
  private async calculateChangeOrderPattern(
    organizationId: string,
    projects: ProjectProfile[],
  ): Promise<void> {
    this.logger.debug('Calculating change order pattern');

    const projectsWithCoData = projects.filter(
      (p) =>
        p.changeOrderCount !== null &&
        p.changeOrderCount !== undefined &&
        p.changeOrderValue !== null &&
        p.changeOrderValue !== undefined &&
        p.contractValue,
    );

    if (projectsWithCoData.length < 3) {
      this.logger.warn('Insufficient change order data (need at least 3 projects)');
      return;
    }

    const coCounts = projectsWithCoData.map((p) => Number(p.changeOrderCount));
    const coValues = projectsWithCoData.map((p) => Number(p.changeOrderValue));
    const coPercents = projectsWithCoData.map(
      (p) => (Number(p.changeOrderValue) / Number(p.contractValue)) * 100,
    );

    const countStats = this.calculateStatistics(coCounts);
    const valueStats = this.calculateStatistics(coValues);
    const percentStats = this.calculateStatistics(coPercents);

    // Calculate confidence
    const consistency = 1 - percentStats.stdDev / (percentStats.mean || 1);
    const sampleFactor = Math.min(1, projectsWithCoData.length / 10);
    const confidence = Math.max(0, Math.min(1, (consistency * 0.6 + sampleFactor * 0.4)));

    // Determine risk level (based on change order percentage)
    let riskLevel: 'low' | 'medium' | 'high';
    if (percentStats.mean < 5) riskLevel = 'low';
    else if (percentStats.mean < 15) riskLevel = 'medium';
    else riskLevel = 'high';

    const pattern: ChangeOrderPattern = {
      avgChangeOrdersPerProject: countStats.mean,
      avgChangeOrderValue: valueStats.mean,
      avgChangeOrderPercent: percentStats.mean,
      commonCategories: ['Scope Changes', 'Unforeseen Conditions', 'Design Errors'],
    };

    await this.savePattern(organizationId, PatternType.CHANGE_ORDER_FREQUENCY, pattern, {
      averageValue: percentStats.mean,
      medianValue: percentStats.median,
      standardDeviation: percentStats.stdDev,
      percentile25: percentStats.min,
      percentile75: percentStats.max,
      confidenceScore: confidence,
      sampleSize: projectsWithCoData.length,
      impactSeverity: riskLevel,
      trendDirection: 'stable', // Can enhance with actual trend calculation
    });

    this.logger.log(
      `Change order pattern: avg=${countStats.mean.toFixed(1)} COs/project, ${percentStats.mean.toFixed(1)}% of contract, risk=${riskLevel}`,
    );
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Calculate statistical metrics for a dataset
   */
  private calculateStatistics(values: number[]): StatisticalMetrics {
    if (values.length === 0) {
      return {
        mean: 0,
        median: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        count: 0,
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / count;

    // Calculate median
    const median =
      count % 2 === 0
        ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
        : sorted[Math.floor(count / 2)];

    // Calculate standard deviation
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / count;
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      median,
      stdDev,
      min: sorted[0],
      max: sorted[count - 1],
      count,
    };
  }

  /**
   * Determine trend direction by comparing recent vs older data
   */
  private determineTrend(
    recent: number[],
    older: number[],
  ): 'increasing' | 'decreasing' | 'stable' {
    if (recent.length === 0) {
      return 'stable';
    }

    // If no older data, check if recent values are trending
    if (older.length === 0) {
      if (recent.length < 2) return 'stable';

      const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
      const secondHalf = recent.slice(Math.floor(recent.length / 2));

      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      const diff = secondAvg - firstAvg;
      const threshold = Math.abs(firstAvg) * 0.05; // 5% threshold

      if (Math.abs(diff) < threshold) return 'stable';
      return diff > 0 ? 'increasing' : 'decreasing';
    }

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const diff = recentAvg - olderAvg;
    const threshold = Math.abs(olderAvg) * 0.05; // 5% threshold (reduced from 10%)

    if (Math.abs(diff) < threshold) return 'stable';
    return diff > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Extract common causes from high-variance projects
   * TODO: Enhance with actual root cause analysis from project metadata
   */
  private extractCommonCauses(projects: ProjectProfile[]): string[] {
    // Placeholder implementation
    // In a real system, this would analyze project metadata, notes, issues, etc.
    const causes: string[] = [];

    if (projects.length > 0) {
      causes.push('Design Changes');
      causes.push('Unforeseen Site Conditions');
      causes.push('Material Delays');
    }

    return causes;
  }

  /**
   * Save pattern to database
   */
  private async savePattern(
    organizationId: string,
    patternType: PatternType,
    patternData: any,
    metadata: {
      averageValue: number;
      medianValue: number;
      standardDeviation: number;
      percentile25: number;
      percentile75: number;
      confidenceScore: number;
      sampleSize: number;
      impactSeverity: 'low' | 'medium' | 'high';
      trendDirection: 'increasing' | 'decreasing' | 'stable';
    },
  ): Promise<void> {
    // Check if pattern exists
    const existing = await this.projectPatternRepo.findOne({
      where: {
        organizationId,
        patternType,
      },
    });

    // Generate pattern name and description based on type
    const patternName = this.generatePatternName(patternType, metadata);
    const patternDescription = this.generatePatternDescription(patternType, metadata, patternData);

    if (existing) {
      // Update existing pattern
      existing.patternName = patternName;
      existing.patternDescription = patternDescription;
      existing.sampleSize = metadata.sampleSize;
      existing.averageValue = metadata.averageValue;
      existing.medianValue = metadata.medianValue;
      existing.standardDeviation = metadata.standardDeviation;
      existing.percentile25 = metadata.percentile25;
      existing.percentile75 = metadata.percentile75;
      existing.confidenceScore = metadata.confidenceScore;
      existing.trendDirection = metadata.trendDirection.toUpperCase();
      existing.impactSeverity = metadata.impactSeverity.toUpperCase();
      existing.detailedAnalysis = patternData;
      existing.calculatedAt = new Date();

      await this.projectPatternRepo.save(existing);
      this.logger.debug(`Updated existing ${patternType} pattern`);
    } else {
      // Create new pattern
      const pattern = this.projectPatternRepo.create({
        organizationId,
        patternType,
        patternName,
        patternDescription,
        sampleSize: metadata.sampleSize,
        averageValue: metadata.averageValue,
        medianValue: metadata.medianValue,
        standardDeviation: metadata.standardDeviation,
        percentile25: metadata.percentile25,
        percentile75: metadata.percentile75,
        confidenceScore: metadata.confidenceScore,
        trendDirection: metadata.trendDirection.toUpperCase(),
        impactSeverity: metadata.impactSeverity.toUpperCase(),
        detailedAnalysis: patternData,
        calculatedAt: new Date(),
        isActive: true,
      });

      await this.projectPatternRepo.save(pattern);
      this.logger.debug(`Created new ${patternType} pattern`);
    }
  }

  /**
   * Generate a human-readable pattern name
   */
  private generatePatternName(patternType: PatternType, metadata: any): string {
    const type = patternType.replace(/_/g, ' ').toLowerCase();
    const direction = metadata.trendDirection;
    return `${type} - ${direction} trend`;
  }

  /**
   * Generate a human-readable pattern description
   */
  private generatePatternDescription(
    patternType: PatternType,
    metadata: any,
    patternData: any,
  ): string {
    switch (patternType) {
      case PatternType.COST_VARIANCE:
        return `Projects are averaging ${metadata.averageValue.toFixed(1)}% cost variance with ${metadata.impactSeverity} risk. Sample size: ${metadata.sampleSize} projects.`;
      case PatternType.SCHEDULE_VARIANCE:
        return `Projects are averaging ${metadata.averageValue.toFixed(1)} days schedule variance with ${metadata.impactSeverity} risk. Sample size: ${metadata.sampleSize} projects.`;
      case PatternType.RFI_VELOCITY:
        return `Average RFI velocity is ${metadata.averageValue.toFixed(1)} per month with ${metadata.impactSeverity} impact. Sample size: ${metadata.sampleSize} projects.`;
      case PatternType.CHANGE_ORDER_FREQUENCY:
        return `Change orders average ${metadata.averageValue.toFixed(1)}% of contract value with ${metadata.impactSeverity} impact. Sample size: ${metadata.sampleSize} projects.`;
      default:
        return `Pattern detected with ${metadata.sampleSize} projects analyzed.`;
    }
  }

  /**
   * Get all active patterns for an organization
   */
  async getOrganizationPatterns(organizationId: string): Promise<ProjectPattern[]> {
    return this.projectPatternRepo.find({
      where: {
        organizationId,
      },
      order: {
        calculatedAt: 'DESC',
      },
    });
  }

  /**
   * Get a specific pattern for an organization
   */
  async getPattern(
    organizationId: string,
    patternType: PatternType,
  ): Promise<ProjectPattern | null> {
    return this.projectPatternRepo.findOne({
      where: {
        organizationId,
        patternType,
      },
      order: {
        calculatedAt: 'DESC',
      },
    });
  }

  /**
   * Delete old patterns (older than 90 days and inactive)
   */
  async cleanupOldPatterns(): Promise<number> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await this.projectPatternRepo
      .createQueryBuilder()
      .delete()
      .where('calculatedAt < :ninetyDaysAgo', { ninetyDaysAgo })
      .andWhere('isActive = :isActive', { isActive: false })
      .execute();

    return result.affected || 0;
  }
}
