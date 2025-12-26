import { ApiProperty } from '@nestjs/swagger';

export class RfiStatusSummary {
  @ApiProperty()
  draft!: number;

  @ApiProperty()
  open!: number;

  @ApiProperty()
  answered!: number;

  @ApiProperty()
  closed!: number;

  @ApiProperty()
  void!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  overdue!: number;
}

export class RfiResponseTimeMetrics {
  @ApiProperty()
  averageDays!: number;

  @ApiProperty()
  medianDays!: number;

  @ApiProperty()
  minDays!: number;

  @ApiProperty()
  maxDays!: number;

  @ApiProperty()
  onTimePercentage!: number;

  @ApiProperty()
  distribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
}

export class RfiImpactSummary {
  @ApiProperty()
  totalWithCostImpact!: number;

  @ApiProperty()
  totalEstimatedCost!: number;

  @ApiProperty()
  totalWithScheduleImpact!: number;

  @ApiProperty()
  totalScheduleImpactDays!: number;

  @ApiProperty()
  byPriority: Record<string, { count: number; costImpact: number; scheduleImpact: number }>;
}

export class RfiByDiscipline {
  @ApiProperty()
  discipline!: string;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  open!: number;

  @ApiProperty()
  closed!: number;

  @ApiProperty()
  overdue!: number;

  @ApiProperty()
  avgResponseDays!: number;
}

export class RfiAgingBucket {
  @ApiProperty()
  range!: string;

  @ApiProperty()
  count!: number;

  @ApiProperty()
  items: Array<{
    id: string;
    number: string;
    subject: string;
    daysOpen: number;
    assignedTo: string;
  }>;
}

export class RfiTrendData {
  @ApiProperty()
  date!: string;

  @ApiProperty()
  created!: number;

  @ApiProperty()
  closed!: number;

  @ApiProperty()
  openAtDate!: number;
}

export class RfiAnalyticsResponse {
  @ApiProperty()
  projectId!: string;

  @ApiProperty()
  period: {
    startDate: string;
    endDate: string;
  };

  @ApiProperty()
  statusSummary!: RfiStatusSummary;

  @ApiProperty()
  responseTimeMetrics!: RfiResponseTimeMetrics;

  @ApiProperty()
  impactSummary!: RfiImpactSummary;

  @ApiProperty({ type: [RfiByDiscipline] })
  byDiscipline: RfiByDiscipline[];

  @ApiProperty()
  byPriority: Record<string, number>;

  @ApiProperty()
  ballInCourt: Record<string, number>;

  @ApiProperty({ type: [RfiAgingBucket] })
  agingAnalysis: RfiAgingBucket[];

  @ApiProperty({ type: [RfiTrendData] })
  trends: RfiTrendData[];

  @ApiProperty()
  topAssignees: Array<{
    userId: string;
    name: string;
    assigned: number;
    completed: number;
    avgResponseDays: number;
    onTimeRate: number;
  }>;

  @ApiProperty()
  bottlenecks: Array<{
    type: string;
    id: string;
    name: string;
    openItems: number;
    avgDaysOpen: number;
  }>;
}
