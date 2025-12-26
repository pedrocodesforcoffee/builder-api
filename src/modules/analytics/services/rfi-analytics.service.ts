import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Rfi, RfiStatus } from '../../rfis/entities/rfi.entity';
import { RfiHistory } from '../../rfis/entities/rfi-history.entity';
import { AnalyticsQueryDto, DateRangePeriod } from '../dto/analytics-query.dto';
import {
  RfiAnalyticsResponse,
  RfiStatusSummary,
  RfiResponseTimeMetrics,
  RfiImpactSummary,
  RfiByDiscipline,
  RfiAgingBucket,
  RfiTrendData,
} from '../dto/rfi-analytics-response.dto';

@Injectable()
export class RfiAnalyticsService {
  constructor(
    @InjectRepository(Rfi)
    private readonly rfiRepository: Repository<Rfi>,
    @InjectRepository(RfiHistory)
    private readonly historyRepository: Repository<RfiHistory>,
  ) {}

  async getAnalytics(
    projectId: string,
    query: AnalyticsQueryDto,
  ): Promise<RfiAnalyticsResponse> {
    const { startDate, endDate } = this.resolveDateRange(query);

    const [
      statusSummary,
      responseTimeMetrics,
      impactSummary,
      byDiscipline,
      byPriority,
      ballInCourt,
      agingAnalysis,
      trends,
      topAssignees,
      bottlenecks,
    ] = await Promise.all([
      this.getStatusSummary(projectId, query),
      this.getResponseTimeMetrics(projectId, startDate, endDate),
      this.getImpactSummary(projectId, query),
      this.getByDiscipline(projectId, query),
      this.getByPriority(projectId, query),
      this.getBallInCourt(projectId),
      this.getAgingAnalysis(projectId),
      this.getTrends(projectId, startDate, endDate),
      this.getTopAssignees(projectId, startDate, endDate),
      this.getBottlenecks(projectId),
    ]);

    return {
      projectId,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      statusSummary,
      responseTimeMetrics,
      impactSummary,
      byDiscipline,
      byPriority,
      ballInCourt,
      agingAnalysis,
      trends,
      topAssignees,
      bottlenecks,
    };
  }

  async getStatusSummary(projectId: string, query: AnalyticsQueryDto): Promise<RfiStatusSummary> {
    const qb = this.rfiRepository
      .createQueryBuilder('rfi')
      .select('rfi.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('rfi.projectId = :projectId', { projectId })
      .groupBy('rfi.status');

    this.applyFilters(qb, query);

    const results = await qb.getRawMany();

    const statusMap = results.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count, 10);
      return acc;
    }, {} as Record<string, number>);

    // Get overdue count
    const overdueCount = await this.rfiRepository.count({
      where: {
        projectId,
        status: In([RfiStatus.OPEN, RfiStatus.DRAFT]),
        isOverdue: true,
      },
    });

    return {
      draft: statusMap[RfiStatus.DRAFT] || 0,
      open: statusMap[RfiStatus.OPEN] || 0,
      answered: statusMap[RfiStatus.ANSWERED] || 0,
      closed: statusMap[RfiStatus.CLOSED] || 0,
      void: statusMap[RfiStatus.VOID] || 0,
      total: Object.values(statusMap).reduce((sum: number, count) => sum + (count as number), 0) as number,
      overdue: overdueCount,
    };
  }

  async getResponseTimeMetrics(
    projectId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<RfiResponseTimeMetrics> {
    // Get all closed RFIs with response data
    const rfis = await this.rfiRepository.find({
      where: {
        projectId,
        status: In([RfiStatus.ANSWERED, RfiStatus.CLOSED]),
        responseDate: Between(startDate, endDate),
      },
      select: ['id', 'responseDays', 'slaResponseDays', 'sentDate', 'responseDate'],
    });

    if (rfis.length === 0) {
      return {
        averageDays: 0,
        medianDays: 0,
        minDays: 0,
        maxDays: 0,
        onTimePercentage: 0,
        distribution: [],
      };
    }

    const responseDays = rfis
      .map((r) => r.responseDays)
      .filter((d): d is number => d !== null)
      .sort((a, b) => a - b);

    const average = responseDays.reduce((sum, d) => sum + d, 0) / responseDays.length;
    const median = responseDays[Math.floor(responseDays.length / 2)];
    const min = responseDays[0];
    const max = responseDays[responseDays.length - 1];

    // Calculate on-time percentage
    const onTime = rfis.filter((r) => r.responseDays !== null && r.responseDays <= r.slaResponseDays).length;
    const onTimePercentage = (onTime / rfis.length) * 100;

    // Calculate distribution
    const distribution = this.calculateResponseTimeDistribution(responseDays);

    return {
      averageDays: Math.round(average * 10) / 10,
      medianDays: median,
      minDays: min,
      maxDays: max,
      onTimePercentage: Math.round(onTimePercentage * 10) / 10,
      distribution,
    };
  }

  private calculateResponseTimeDistribution(responseDays: number[]): Array<{
    range: string;
    count: number;
    percentage: number;
  }> {
    const buckets = [
      { range: '0-3 days', min: 0, max: 3 },
      { range: '4-7 days', min: 4, max: 7 },
      { range: '8-14 days', min: 8, max: 14 },
      { range: '15-30 days', min: 15, max: 30 },
      { range: '30+ days', min: 31, max: Infinity },
    ];

    const total = responseDays.length;

    return buckets.map((bucket) => {
      const count = responseDays.filter((d) => d >= bucket.min && d <= bucket.max).length;
      return {
        range: bucket.range,
        count,
        percentage: Math.round((count / total) * 1000) / 10,
      };
    });
  }

  async getImpactSummary(projectId: string, query: AnalyticsQueryDto): Promise<RfiImpactSummary> {
    const qb = this.rfiRepository
      .createQueryBuilder('rfi')
      .select([
        'COUNT(CASE WHEN rfi.hasCostImpact = true THEN 1 END) as "costImpactCount"',
        'COALESCE(SUM(rfi.estimatedCostImpact), 0) as "totalCostImpact"',
        'COUNT(CASE WHEN rfi.hasScheduleImpact = true THEN 1 END) as "scheduleImpactCount"',
        'COALESCE(SUM(rfi.estimatedScheduleImpactDays), 0) as "totalScheduleImpact"',
      ])
      .where('rfi.projectId = :projectId', { projectId });

    this.applyFilters(qb, query);

    const result = await qb.getRawOne();

    // Get by priority
    const byPriorityQb = this.rfiRepository
      .createQueryBuilder('rfi')
      .select('rfi.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(rfi.estimatedCostImpact), 0)', 'costImpact')
      .addSelect('COALESCE(SUM(rfi.estimatedScheduleImpactDays), 0)', 'scheduleImpact')
      .where('rfi.projectId = :projectId', { projectId })
      .andWhere('(rfi.hasCostImpact = true OR rfi.hasScheduleImpact = true)')
      .groupBy('rfi.priority');

    const byPriorityResults = await byPriorityQb.getRawMany();

    const byPriority = byPriorityResults.reduce((acc, row) => {
      acc[row.priority] = {
        count: parseInt(row.count, 10),
        costImpact: parseFloat(row.costImpact),
        scheduleImpact: parseInt(row.scheduleImpact, 10),
      };
      return acc;
    }, {} as Record<string, { count: number; costImpact: number; scheduleImpact: number }>);

    return {
      totalWithCostImpact: parseInt(result.costImpactCount, 10),
      totalEstimatedCost: parseFloat(result.totalCostImpact),
      totalWithScheduleImpact: parseInt(result.scheduleImpactCount, 10),
      totalScheduleImpactDays: parseInt(result.totalScheduleImpact, 10),
      byPriority,
    };
  }

  async getByDiscipline(projectId: string, query: AnalyticsQueryDto): Promise<RfiByDiscipline[]> {
    const qb = this.rfiRepository
      .createQueryBuilder('rfi')
      .select('rfi.discipline', 'discipline')
      .addSelect('COUNT(*)', 'total')
      .addSelect('COUNT(CASE WHEN rfi.status IN (:...openStatuses) THEN 1 END)', 'open')
      .addSelect('COUNT(CASE WHEN rfi.status = :closedStatus THEN 1 END)', 'closed')
      .addSelect('COUNT(CASE WHEN rfi.isOverdue = true THEN 1 END)', 'overdue')
      .addSelect('AVG(rfi.responseDays)', 'avgResponseDays')
      .where('rfi.projectId = :projectId', { projectId })
      .setParameter('openStatuses', [RfiStatus.OPEN, RfiStatus.DRAFT])
      .setParameter('closedStatus', RfiStatus.CLOSED)
      .groupBy('rfi.discipline')
      .orderBy('COUNT(*)', 'DESC');

    const results = await qb.getRawMany();

    return results.map((row) => ({
      discipline: row.discipline,
      total: parseInt(row.total, 10),
      open: parseInt(row.open, 10),
      closed: parseInt(row.closed, 10),
      overdue: parseInt(row.overdue, 10),
      avgResponseDays: row.avgResponseDays ? Math.round(parseFloat(row.avgResponseDays) * 10) / 10 : 0,
    }));
  }

  async getByPriority(projectId: string, query: AnalyticsQueryDto): Promise<Record<string, number>> {
    const qb = this.rfiRepository
      .createQueryBuilder('rfi')
      .select('rfi.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .where('rfi.projectId = :projectId', { projectId })
      .groupBy('rfi.priority');

    this.applyFilters(qb, query);

    const results = await qb.getRawMany();

    return results.reduce((acc, row) => {
      acc[row.priority] = parseInt(row.count, 10);
      return acc;
    }, {} as Record<string, number>);
  }

  async getBallInCourt(projectId: string): Promise<Record<string, number>> {
    const qb = this.rfiRepository
      .createQueryBuilder('rfi')
      .select('rfi.ballInCourt', 'ballInCourt')
      .addSelect('COUNT(*)', 'count')
      .where('rfi.projectId = :projectId', { projectId })
      .andWhere('rfi.status IN (:...statuses)', { statuses: [RfiStatus.OPEN, RfiStatus.ANSWERED] })
      .groupBy('rfi.ballInCourt');

    const results = await qb.getRawMany();

    return results.reduce((acc, row) => {
      acc[row.ballInCourt] = parseInt(row.count, 10);
      return acc;
    }, {} as Record<string, number>);
  }

  async getAgingAnalysis(projectId: string): Promise<RfiAgingBucket[]> {
    const buckets = [
      { range: '0-7 days', min: 0, max: 7 },
      { range: '8-14 days', min: 8, max: 14 },
      { range: '15-30 days', min: 15, max: 30 },
      { range: '31-60 days', min: 31, max: 60 },
      { range: '60+ days', min: 61, max: 9999 },
    ];

    const openRfis = await this.rfiRepository.find({
      where: {
        projectId,
        status: In([RfiStatus.OPEN, RfiStatus.DRAFT]),
      },
      relations: ['assignedTo'],
      select: ['id', 'number', 'subject', 'createdAt'],
    });

    const now = new Date();

    return buckets.map((bucket) => {
      const items = openRfis
        .filter((rfi) => {
          const daysOpen = Math.ceil((now.getTime() - new Date(rfi.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          return daysOpen >= bucket.min && daysOpen <= bucket.max;
        })
        .map((rfi) => {
          const daysOpen = Math.ceil((now.getTime() - new Date(rfi.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          return {
            id: rfi.id,
            number: rfi.number,
            subject: rfi.subject,
            daysOpen,
            assignedTo: (rfi as any).assignedTo ? `${(rfi as any).assignedTo.firstName} ${(rfi as any).assignedTo.lastName}` : 'Unassigned',
          };
        })
        .sort((a, b) => b.daysOpen - a.daysOpen);

      return {
        range: bucket.range,
        count: items.length,
        items,
      };
    });
  }

  async getTrends(projectId: string, startDate: Date, endDate: Date): Promise<RfiTrendData[]> {
    // Generate date series
    const dates: Date[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    // Group by week if more than 60 days
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const groupByWeek = daysDiff > 60;

    // Get created counts
    const createdQb = this.rfiRepository
      .createQueryBuilder('rfi')
      .select(groupByWeek ? "DATE_TRUNC('week', rfi.createdAt)" : 'DATE(rfi.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('rfi.projectId = :projectId', { projectId })
      .andWhere('rfi.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy(groupByWeek ? "DATE_TRUNC('week', rfi.createdAt)" : 'DATE(rfi.createdAt)');

    const createdResults = await createdQb.getRawMany();

    // Get closed counts
    const closedQb = this.rfiRepository
      .createQueryBuilder('rfi')
      .select(groupByWeek ? "DATE_TRUNC('week', rfi.closedDate)" : 'DATE(rfi.closedDate)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('rfi.projectId = :projectId', { projectId })
      .andWhere('rfi.closedDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy(groupByWeek ? "DATE_TRUNC('week', rfi.closedDate)" : 'DATE(rfi.closedDate)');

    const closedResults = await closedQb.getRawMany();

    // Build trend data
    const createdMap = new Map(createdResults.map((r) => [r.date?.toISOString().split('T')[0] || '', parseInt(r.count, 10)]));
    const closedMap = new Map(closedResults.map((r) => [r.date?.toISOString().split('T')[0] || '', parseInt(r.count, 10)]));

    let runningOpen = 0;

    return dates
      .filter((_, i) => !groupByWeek || i % 7 === 0)
      .map((date) => {
        const dateStr = date.toISOString().split('T')[0];
        const created = createdMap.get(dateStr) || 0;
        const closed = closedMap.get(dateStr) || 0;
        runningOpen += created - closed;

        return {
          date: dateStr,
          created,
          closed,
          openAtDate: Math.max(0, runningOpen),
        };
      });
  }

  async getTopAssignees(
    projectId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{
    userId: string;
    name: string;
    assigned: number;
    completed: number;
    avgResponseDays: number;
    onTimeRate: number;
  }>> {
    const qb = this.rfiRepository
      .createQueryBuilder('rfi')
      .select('rfi.assignedToId', 'userId')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('COUNT(*)', 'assigned')
      .addSelect('COUNT(CASE WHEN rfi.status IN (:...completedStatuses) THEN 1 END)', 'completed')
      .addSelect('AVG(rfi.responseDays)', 'avgResponseDays')
      .addSelect(
        'COUNT(CASE WHEN rfi.responseDays <= rfi.slaResponseDays THEN 1 END)::float / NULLIF(COUNT(CASE WHEN rfi.responseDays IS NOT NULL THEN 1 END), 0) * 100',
        'onTimeRate',
      )
      .leftJoin('rfi.assignedTo', 'user')
      .where('rfi.projectId = :projectId', { projectId })
      .andWhere('rfi.assignedToId IS NOT NULL')
      .setParameter('completedStatuses', [RfiStatus.ANSWERED, RfiStatus.CLOSED])
      .groupBy('rfi.assignedToId')
      .addGroupBy('user.firstName')
      .addGroupBy('user.lastName')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10);

    const results = await qb.getRawMany();

    return results.map((row) => ({
      userId: row.userId,
      name: `${row.firstName || ''} ${row.lastName || ''}`.trim(),
      assigned: parseInt(row.assigned, 10),
      completed: parseInt(row.completed, 10),
      avgResponseDays: row.avgResponseDays ? Math.round(parseFloat(row.avgResponseDays) * 10) / 10 : 0,
      onTimeRate: row.onTimeRate ? Math.round(parseFloat(row.onTimeRate) * 10) / 10 : 0,
    }));
  }

  async getBottlenecks(projectId: string): Promise<Array<{
    type: string;
    id: string;
    name: string;
    openItems: number;
    avgDaysOpen: number;
  }>> {
    // Find users/companies with most open items
    const qb = this.rfiRepository
      .createQueryBuilder('rfi')
      .select('rfi.assignedToId', 'id')
      .addSelect("'USER'", 'type')
      .addSelect("CONCAT(user.firstName, ' ', user.lastName)", 'name')
      .addSelect('COUNT(*)', 'openItems')
      .addSelect("AVG(EXTRACT(DAY FROM NOW() - rfi.createdAt))", 'avgDaysOpen')
      .leftJoin('rfi.assignedTo', 'user')
      .where('rfi.projectId = :projectId', { projectId })
      .andWhere('rfi.status IN (:...statuses)', { statuses: [RfiStatus.OPEN] })
      .andWhere('rfi.assignedToId IS NOT NULL')
      .groupBy('rfi.assignedToId')
      .addGroupBy('user.firstName')
      .addGroupBy('user.lastName')
      .having('COUNT(*) >= 3')
      .orderBy('COUNT(*)', 'DESC')
      .limit(5);

    const results = await qb.getRawMany();

    return results.map((row) => ({
      type: row.type,
      id: row.id,
      name: row.name || 'Unknown',
      openItems: parseInt(row.openItems, 10),
      avgDaysOpen: Math.round(parseFloat(row.avgDaysOpen)),
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
        case DateRangePeriod.THIS_MONTH:
          startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
          break;
        case DateRangePeriod.THIS_QUARTER:
          const quarter = Math.floor(endDate.getMonth() / 3);
          startDate = new Date(endDate.getFullYear(), quarter * 3, 1);
          break;
        case DateRangePeriod.THIS_YEAR:
          startDate = new Date(endDate.getFullYear(), 0, 1);
          break;
        case DateRangePeriod.ALL_TIME:
          startDate = new Date('2020-01-01');
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
      qb.andWhere('rfi.status IN (:...statuses)', { statuses: query.statuses });
    }
    if (query.priorities?.length) {
      qb.andWhere('rfi.priority IN (:...priorities)', { priorities: query.priorities });
    }
    if (query.disciplines?.length) {
      qb.andWhere('rfi.discipline IN (:...disciplines)', { disciplines: query.disciplines });
    }
    if (query.assigneeIds?.length) {
      qb.andWhere('rfi.assignedToId IN (:...assigneeIds)', { assigneeIds: query.assigneeIds });
    }
  }
}
