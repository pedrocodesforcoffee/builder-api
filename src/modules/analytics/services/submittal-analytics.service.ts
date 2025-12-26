import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Submittal, SubmittalStatus } from '../../submittals/entities/submittal.entity';
import { SubmittalResponse, ApprovalStamp } from '../../submittals/entities/submittal-response.entity';
import { AnalyticsQueryDto, DateRangePeriod } from '../dto/analytics-query.dto';
import {
  SubmittalAnalyticsResponse,
  SubmittalStatusSummary,
  SubmittalApprovalMetrics,
  SubmittalReviewTimeMetrics,
  SubmittalBySpecDivision,
  SubmittalByType,
  SubmittalLeadTimeAnalysis,
  SubmittalTrendData,
} from '../dto/submittal-analytics-response.dto';

// Division names for CSI MasterFormat
const DIVISION_NAMES: Record<string, string> = {
  '01': 'General Requirements',
  '02': 'Existing Conditions',
  '03': 'Concrete',
  '04': 'Masonry',
  '05': 'Metals',
  '06': 'Wood, Plastics, Composites',
  '07': 'Thermal & Moisture Protection',
  '08': 'Openings',
  '09': 'Finishes',
  '10': 'Specialties',
  '11': 'Equipment',
  '12': 'Furnishings',
  '13': 'Special Construction',
  '14': 'Conveying Equipment',
  '21': 'Fire Suppression',
  '22': 'Plumbing',
  '23': 'HVAC',
  '26': 'Electrical',
  '27': 'Communications',
  '28': 'Electronic Safety & Security',
  '31': 'Earthwork',
  '32': 'Exterior Improvements',
  '33': 'Utilities',
};

@Injectable()
export class SubmittalAnalyticsService {
  constructor(
    @InjectRepository(Submittal)
    private readonly submittalRepository: Repository<Submittal>,
    @InjectRepository(SubmittalResponse)
    private readonly responseRepository: Repository<SubmittalResponse>,
  ) {}

  async getAnalytics(
    projectId: string,
    query: AnalyticsQueryDto,
  ): Promise<SubmittalAnalyticsResponse> {
    const { startDate, endDate } = this.resolveDateRange(query);

    const [
      statusSummary,
      approvalMetrics,
      reviewTimeMetrics,
      bySpecDivision,
      byType,
      leadTimeAnalysis,
      trends,
      topReviewers,
      contractorPerformance,
    ] = await Promise.all([
      this.getStatusSummary(projectId, query),
      this.getApprovalMetrics(projectId, startDate, endDate),
      this.getReviewTimeMetrics(projectId, startDate, endDate),
      this.getBySpecDivision(projectId, query),
      this.getByType(projectId, query),
      this.getLeadTimeAnalysis(projectId),
      this.getTrends(projectId, startDate, endDate),
      this.getTopReviewers(projectId, startDate, endDate),
      this.getContractorPerformance(projectId, startDate, endDate),
    ]);

    return {
      projectId,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      statusSummary,
      approvalMetrics,
      reviewTimeMetrics,
      bySpecDivision,
      byType,
      leadTimeAnalysis,
      trends,
      topReviewers,
      contractorPerformance,
    };
  }

  async getStatusSummary(projectId: string, query: AnalyticsQueryDto): Promise<SubmittalStatusSummary> {
    const qb = this.submittalRepository
      .createQueryBuilder('submittal')
      .select('submittal.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('submittal.projectId = :projectId', { projectId })
      .groupBy('submittal.status');

    this.applyFilters(qb, query);

    const results = await qb.getRawMany();

    const statusMap = results.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count, 10);
      return acc;
    }, {} as Record<string, number>);

    const overdueCount = await this.submittalRepository.count({
      where: {
        projectId,
        status: In([SubmittalStatus.SUBMITTED, SubmittalStatus.UNDER_REVIEW]),
        isOverdue: true,
      },
    });

    return {
      notStarted: statusMap[SubmittalStatus.NOT_STARTED] || 0,
      draft: statusMap[SubmittalStatus.DRAFT] || 0,
      submitted: statusMap[SubmittalStatus.SUBMITTED] || 0,
      underReview: statusMap[SubmittalStatus.UNDER_REVIEW] || 0,
      approved: statusMap[SubmittalStatus.APPROVED] || 0,
      approvedAsNoted: statusMap[SubmittalStatus.APPROVED_AS_NOTED] || 0,
      reviseResubmit: statusMap[SubmittalStatus.REVISE_RESUBMIT] || 0,
      rejected: statusMap[SubmittalStatus.REJECTED] || 0,
      closed: statusMap[SubmittalStatus.CLOSED] || 0,
      total: Object.values(statusMap).reduce((sum: number, count) => sum + (count as number), 0) as number,
      overdue: overdueCount,
    };
  }

  async getApprovalMetrics(
    projectId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SubmittalApprovalMetrics> {
    // Get submittals approved in period
    const approvedSubmittals = await this.submittalRepository.find({
      where: {
        projectId,
        approvedDate: Between(startDate, endDate),
      },
      select: ['id', 'currentRevision', 'approvalStamp'],
    });

    if (approvedSubmittals.length === 0) {
      return {
        firstTimeApprovalRate: 0,
        approvedAsNotedRate: 0,
        reviseResubmitRate: 0,
        rejectionRate: 0,
        averageRevisionsPerSubmittal: 0,
        byStamp: {},
      };
    }

    // First-time approval = approved on Rev 0
    const firstTimeApprovals = approvedSubmittals.filter((s) => s.currentRevision === 0).length;
    const approvedAsNoted = approvedSubmittals.filter(
      (s) => s.approvalStamp === ApprovalStamp.APPROVED_AS_NOTED,
    ).length;

    // Get all responses to calculate revision rates
    const allResponses = await this.responseRepository.find({
      where: {
        submittal: { projectId },
      },
      select: ['stamp'],
    });

    const reviseResubmit = allResponses.filter(
      (r) => r.stamp === ApprovalStamp.REVISE_AND_RESUBMIT,
    ).length;
    const rejected = allResponses.filter((r) => r.stamp === ApprovalStamp.REJECTED).length;
    const totalResponses = allResponses.length;

    // Calculate average revisions
    const avgRevisions =
      approvedSubmittals.reduce((sum, s) => sum + s.currentRevision, 0) / approvedSubmittals.length;

    // By stamp distribution
    const byStamp = allResponses.reduce((acc, r) => {
      acc[r.stamp] = (acc[r.stamp] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      firstTimeApprovalRate: Math.round((firstTimeApprovals / approvedSubmittals.length) * 1000) / 10,
      approvedAsNotedRate: Math.round((approvedAsNoted / approvedSubmittals.length) * 1000) / 10,
      reviseResubmitRate: totalResponses > 0 ? Math.round((reviseResubmit / totalResponses) * 1000) / 10 : 0,
      rejectionRate: totalResponses > 0 ? Math.round((rejected / totalResponses) * 1000) / 10 : 0,
      averageRevisionsPerSubmittal: Math.round(avgRevisions * 10) / 10,
      byStamp,
    };
  }

  async getReviewTimeMetrics(
    projectId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SubmittalReviewTimeMetrics> {
    const submittals = await this.submittalRepository.find({
      where: {
        projectId,
        approvedDate: Between(startDate, endDate),
      },
      select: ['id', 'daysInReview', 'reviewTimeDays'],
    });

    if (submittals.length === 0) {
      return {
        averageDays: 0,
        medianDays: 0,
        minDays: 0,
        maxDays: 0,
        onTimePercentage: 0,
        distribution: [],
      };
    }

    const reviewDays = submittals
      .map((s) => s.daysInReview)
      .filter((d): d is number => d !== null)
      .sort((a, b) => a - b);

    if (reviewDays.length === 0) {
      return {
        averageDays: 0,
        medianDays: 0,
        minDays: 0,
        maxDays: 0,
        onTimePercentage: 0,
        distribution: [],
      };
    }

    const average = reviewDays.reduce((sum, d) => sum + d, 0) / reviewDays.length;
    const median = reviewDays[Math.floor(reviewDays.length / 2)];
    const min = reviewDays[0];
    const max = reviewDays[reviewDays.length - 1];

    const onTime = submittals.filter(
      (s) => s.daysInReview !== null && s.daysInReview <= s.reviewTimeDays,
    ).length;
    const onTimePercentage = (onTime / submittals.length) * 100;

    const distribution = this.calculateReviewTimeDistribution(reviewDays);

    return {
      averageDays: Math.round(average * 10) / 10,
      medianDays: median,
      minDays: min,
      maxDays: max,
      onTimePercentage: Math.round(onTimePercentage * 10) / 10,
      distribution,
    };
  }

  private calculateReviewTimeDistribution(reviewDays: number[]): Array<{
    range: string;
    count: number;
    percentage: number;
  }> {
    const buckets = [
      { range: '0-7 days', min: 0, max: 7 },
      { range: '8-14 days', min: 8, max: 14 },
      { range: '15-21 days', min: 15, max: 21 },
      { range: '22-30 days', min: 22, max: 30 },
      { range: '30+ days', min: 31, max: Infinity },
    ];

    const total = reviewDays.length;

    return buckets.map((bucket) => {
      const count = reviewDays.filter((d) => d >= bucket.min && d <= bucket.max).length;
      return {
        range: bucket.range,
        count,
        percentage: Math.round((count / total) * 1000) / 10,
      };
    });
  }

  async getBySpecDivision(projectId: string, query: AnalyticsQueryDto): Promise<SubmittalBySpecDivision[]> {
    const qb = this.submittalRepository
      .createQueryBuilder('submittal')
      .select("SUBSTRING(submittal.specSection, 1, 2)", 'division')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        'COUNT(CASE WHEN submittal.status IN (:...approvedStatuses) THEN 1 END)',
        'approved',
      )
      .addSelect(
        'COUNT(CASE WHEN submittal.status IN (:...pendingStatuses) THEN 1 END)',
        'pending',
      )
      .addSelect('COUNT(CASE WHEN submittal.isOverdue = true THEN 1 END)', 'overdue')
      .where('submittal.projectId = :projectId', { projectId })
      .setParameter('approvedStatuses', [SubmittalStatus.APPROVED, SubmittalStatus.APPROVED_AS_NOTED, SubmittalStatus.CLOSED])
      .setParameter('pendingStatuses', [SubmittalStatus.SUBMITTED, SubmittalStatus.UNDER_REVIEW])
      .groupBy("SUBSTRING(submittal.specSection, 1, 2)")
      .orderBy('COUNT(*)', 'DESC');

    const results = await qb.getRawMany();

    return results.map((row) => {
      const total = parseInt(row.total, 10);
      const approved = parseInt(row.approved, 10);

      return {
        division: row.division,
        divisionName: DIVISION_NAMES[row.division] || 'Unknown',
        total,
        approved,
        pending: parseInt(row.pending, 10),
        overdue: parseInt(row.overdue, 10),
        approvalRate: total > 0 ? Math.round((approved / total) * 1000) / 10 : 0,
      };
    });
  }

  async getByType(projectId: string, query: AnalyticsQueryDto): Promise<SubmittalByType[]> {
    const qb = this.submittalRepository
      .createQueryBuilder('submittal')
      .select('submittal.submittalType', 'type')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        'COUNT(CASE WHEN submittal.status IN (:...approvedStatuses) THEN 1 END)',
        'approved',
      )
      .addSelect(
        'COUNT(CASE WHEN submittal.status IN (:...pendingStatuses) THEN 1 END)',
        'pending',
      )
      .addSelect('AVG(submittal.daysInReview)', 'avgReviewDays')
      .where('submittal.projectId = :projectId', { projectId })
      .setParameter('approvedStatuses', [SubmittalStatus.APPROVED, SubmittalStatus.APPROVED_AS_NOTED, SubmittalStatus.CLOSED])
      .setParameter('pendingStatuses', [SubmittalStatus.SUBMITTED, SubmittalStatus.UNDER_REVIEW])
      .groupBy('submittal.submittalType')
      .orderBy('COUNT(*)', 'DESC');

    const results = await qb.getRawMany();

    return results.map((row) => ({
      type: row.type,
      total: parseInt(row.total, 10),
      approved: parseInt(row.approved, 10),
      pending: parseInt(row.pending, 10),
      avgReviewDays: row.avgReviewDays ? Math.round(parseFloat(row.avgReviewDays) * 10) / 10 : 0,
    }));
  }

  async getLeadTimeAnalysis(projectId: string): Promise<SubmittalLeadTimeAnalysis> {
    const now = new Date();
    const warningDays = 14;

    const submittalsWithLeadTime = await this.submittalRepository.find({
      where: {
        projectId,
        status: In([
          SubmittalStatus.NOT_STARTED,
          SubmittalStatus.DRAFT,
          SubmittalStatus.SUBMITTED,
          SubmittalStatus.UNDER_REVIEW,
          SubmittalStatus.REVISE_RESUBMIT,
        ]),
      },
      select: ['id', 'number', 'title', 'requiredOnSiteDate', 'status', 'leadTimeDays'],
    });

    const withLeadTime = submittalsWithLeadTime.filter((s) => s.requiredOnSiteDate);

    const analysis = {
      totalWithLeadTime: withLeadTime.length,
      onTrack: 0,
      atRisk: 0,
      late: 0,
      atRiskItems: [] as Array<{
        id: string;
        number: string;
        title: string;
        requiredOnSiteDate: string;
        daysUntilRequired: number;
        status: string;
      }>,
    };

    for (const submittal of withLeadTime) {
      const daysUntilRequired = Math.ceil(
        (new Date(submittal.requiredOnSiteDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysUntilRequired < 0) {
        analysis.late++;
      } else if (daysUntilRequired <= warningDays) {
        analysis.atRisk++;
        analysis.atRiskItems.push({
          id: submittal.id,
          number: submittal.number,
          title: submittal.title,
          requiredOnSiteDate: submittal.requiredOnSiteDate!.toISOString(),
          daysUntilRequired,
          status: submittal.status,
        });
      } else {
        analysis.onTrack++;
      }
    }

    // Sort at-risk items by urgency
    analysis.atRiskItems.sort((a, b) => a.daysUntilRequired - b.daysUntilRequired);

    return analysis;
  }

  async getTrends(projectId: string, startDate: Date, endDate: Date): Promise<SubmittalTrendData[]> {
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const groupByWeek = daysDiff > 60;

    const dateFunc = groupByWeek ? "DATE_TRUNC('week', " : 'DATE(';

    // Submitted counts
    const submittedQb = this.submittalRepository
      .createQueryBuilder('submittal')
      .select(`${dateFunc}submittal.submittedDate)`, 'date')
      .addSelect('COUNT(*)', 'count')
      .where('submittal.projectId = :projectId', { projectId })
      .andWhere('submittal.submittedDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy(`${dateFunc}submittal.submittedDate)`);

    const submittedResults = await submittedQb.getRawMany();

    // Approved counts
    const approvedQb = this.submittalRepository
      .createQueryBuilder('submittal')
      .select(`${dateFunc}submittal.approvedDate)`, 'date')
      .addSelect('COUNT(*)', 'count')
      .where('submittal.projectId = :projectId', { projectId })
      .andWhere('submittal.approvedDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy(`${dateFunc}submittal.approvedDate)`);

    const approvedResults = await approvedQb.getRawMany();

    // Build maps
    const submittedMap = new Map(
      submittedResults.map((r) => [r.date?.toISOString().split('T')[0] || '', parseInt(r.count, 10)]),
    );
    const approvedMap = new Map(
      approvedResults.map((r) => [r.date?.toISOString().split('T')[0] || '', parseInt(r.count, 10)]),
    );

    // Generate date series
    const dates: Date[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + (groupByWeek ? 7 : 1));
    }

    let runningPending = 0;

    return dates.map((date) => {
      const dateStr = date.toISOString().split('T')[0];
      const submitted = submittedMap.get(dateStr) || 0;
      const approved = approvedMap.get(dateStr) || 0;
      runningPending += submitted - approved;

      return {
        date: dateStr,
        submitted,
        approved,
        rejected: 0, // Could add rejected tracking
        pendingAtDate: Math.max(0, runningPending),
      };
    });
  }

  async getTopReviewers(
    projectId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{
    userId: string;
    name: string;
    reviewed: number;
    avgReviewDays: number;
    approvalRate: number;
    onTimeRate: number;
  }>> {
    const qb = this.responseRepository
      .createQueryBuilder('response')
      .select('response.reviewerId', 'userId')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('COUNT(*)', 'reviewed')
      .addSelect('AVG(response.reviewDurationDays)', 'avgReviewDays')
      .addSelect(
        "COUNT(CASE WHEN response.stamp IN ('APPROVED', 'APPROVED_AS_NOTED') THEN 1 END)::float / COUNT(*) * 100",
        'approvalRate',
      )
      .leftJoin('response.reviewer', 'user')
      .leftJoin('response.submittal', 'submittal')
      .where('submittal.projectId = :projectId', { projectId })
      .andWhere('response.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('response.reviewerId')
      .addGroupBy('user.firstName')
      .addGroupBy('user.lastName')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10);

    const results = await qb.getRawMany();

    return results.map((row) => ({
      userId: row.userId,
      name: `${row.firstName || ''} ${row.lastName || ''}`.trim(),
      reviewed: parseInt(row.reviewed, 10),
      avgReviewDays: row.avgReviewDays ? Math.round(parseFloat(row.avgReviewDays) * 10) / 10 : 0,
      approvalRate: row.approvalRate ? Math.round(parseFloat(row.approvalRate) * 10) / 10 : 0,
      onTimeRate: 0, // Would need to calculate based on SLA
    }));
  }

  async getContractorPerformance(
    projectId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{
    companyId: string;
    companyName: string;
    submitted: number;
    approved: number;
    rejected: number;
    avgRevisionsNeeded: number;
    firstTimeApprovalRate: number;
  }>> {
    const qb = this.submittalRepository
      .createQueryBuilder('submittal')
      .select('submittal.responsibleContractorId', 'companyId')
      .addSelect('org.name', 'companyName')
      .addSelect('COUNT(*)', 'submitted')
      .addSelect(
        'COUNT(CASE WHEN submittal.status IN (:...approvedStatuses) THEN 1 END)',
        'approved',
      )
      .addSelect(
        'COUNT(CASE WHEN submittal.status = :rejectedStatus THEN 1 END)',
        'rejected',
      )
      .addSelect('AVG(submittal.currentRevision)', 'avgRevisions')
      .addSelect(
        'COUNT(CASE WHEN submittal.currentRevision = 0 AND submittal.status IN (:...approvedStatuses) THEN 1 END)::float / NULLIF(COUNT(CASE WHEN submittal.status IN (:...approvedStatuses) THEN 1 END), 0) * 100',
        'firstTimeApprovalRate',
      )
      .leftJoin('submittal.responsibleContractor', 'org')
      .where('submittal.projectId = :projectId', { projectId })
      .andWhere('submittal.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .setParameter('approvedStatuses', [SubmittalStatus.APPROVED, SubmittalStatus.APPROVED_AS_NOTED, SubmittalStatus.CLOSED])
      .setParameter('rejectedStatus', SubmittalStatus.REJECTED)
      .groupBy('submittal.responsibleContractorId')
      .addGroupBy('org.name')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10);

    const results = await qb.getRawMany();

    return results.map((row) => ({
      companyId: row.companyId,
      companyName: row.companyName || 'Unknown',
      submitted: parseInt(row.submitted, 10),
      approved: parseInt(row.approved, 10),
      rejected: parseInt(row.rejected, 10),
      avgRevisionsNeeded: row.avgRevisions ? Math.round(parseFloat(row.avgRevisions) * 10) / 10 : 0,
      firstTimeApprovalRate: row.firstTimeApprovalRate ? Math.round(parseFloat(row.firstTimeApprovalRate) * 10) / 10 : 0,
    }));
  }

  private resolveDateRange(query: AnalyticsQueryDto): { startDate: Date; endDate: Date } {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    let startDate: Date;

    if (query.startDate) {
      startDate = new Date(query.startDate);
    } else {
      switch (query.period) {
        case DateRangePeriod.LAST_7_DAYS:
          startDate = new Date(endDate);
          startDate.setDate(startDate.getDate() - 7);
          break;
        case DateRangePeriod.LAST_90_DAYS:
          startDate = new Date(endDate);
          startDate.setDate(startDate.getDate() - 90);
          break;
        case DateRangePeriod.LAST_30_DAYS:
        default:
          startDate = new Date(endDate);
          startDate.setDate(startDate.getDate() - 30);
          break;
      }
    }

    return { startDate, endDate };
  }

  private applyFilters(qb: any, query: AnalyticsQueryDto): void {
    if (query.statuses?.length) {
      qb.andWhere('submittal.status IN (:...statuses)', { statuses: query.statuses });
    }
    if (query.specDivisions?.length) {
      qb.andWhere("SUBSTRING(submittal.specSection, 1, 2) IN (:...divisions)", {
        divisions: query.specDivisions,
      });
    }
    if (query.companyIds?.length) {
      qb.andWhere('submittal.responsibleContractorId IN (:...companyIds)', {
        companyIds: query.companyIds,
      });
    }
  }
}
