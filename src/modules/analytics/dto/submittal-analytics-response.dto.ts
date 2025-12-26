import { ApiProperty } from '@nestjs/swagger';

export class SubmittalStatusSummary {
  @ApiProperty()
  notStarted!: number;

  @ApiProperty()
  draft!: number;

  @ApiProperty()
  submitted!: number;

  @ApiProperty()
  underReview!: number;

  @ApiProperty()
  approved!: number;

  @ApiProperty()
  approvedAsNoted!: number;

  @ApiProperty()
  reviseResubmit!: number;

  @ApiProperty()
  rejected!: number;

  @ApiProperty()
  closed!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  overdue!: number;
}

export class SubmittalApprovalMetrics {
  @ApiProperty()
  firstTimeApprovalRate!: number;

  @ApiProperty()
  approvedAsNotedRate!: number;

  @ApiProperty()
  reviseResubmitRate!: number;

  @ApiProperty()
  rejectionRate!: number;

  @ApiProperty()
  averageRevisionsPerSubmittal!: number;

  @ApiProperty()
  byStamp: Record<string, number>;
}

export class SubmittalReviewTimeMetrics {
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

export class SubmittalBySpecDivision {
  @ApiProperty()
  division!: string;

  @ApiProperty()
  divisionName!: string;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  approved!: number;

  @ApiProperty()
  pending!: number;

  @ApiProperty()
  overdue!: number;

  @ApiProperty()
  approvalRate!: number;
}

export class SubmittalByType {
  @ApiProperty()
  type!: string;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  approved!: number;

  @ApiProperty()
  pending!: number;

  @ApiProperty()
  avgReviewDays!: number;
}

export class SubmittalLeadTimeAnalysis {
  @ApiProperty()
  totalWithLeadTime!: number;

  @ApiProperty()
  onTrack!: number;

  @ApiProperty()
  atRisk!: number;

  @ApiProperty()
  late!: number;

  @ApiProperty()
  atRiskItems: Array<{
    id: string;
    number: string;
    title: string;
    requiredOnSiteDate: string;
    daysUntilRequired: number;
    status: string;
  }>;
}

export class SubmittalTrendData {
  @ApiProperty()
  date!: string;

  @ApiProperty()
  submitted!: number;

  @ApiProperty()
  approved!: number;

  @ApiProperty()
  rejected!: number;

  @ApiProperty()
  pendingAtDate!: number;
}

export class SubmittalAnalyticsResponse {
  @ApiProperty()
  projectId!: string;

  @ApiProperty()
  period: {
    startDate: string;
    endDate: string;
  };

  @ApiProperty()
  statusSummary!: SubmittalStatusSummary;

  @ApiProperty()
  approvalMetrics!: SubmittalApprovalMetrics;

  @ApiProperty()
  reviewTimeMetrics!: SubmittalReviewTimeMetrics;

  @ApiProperty({ type: [SubmittalBySpecDivision] })
  bySpecDivision: SubmittalBySpecDivision[];

  @ApiProperty({ type: [SubmittalByType] })
  byType: SubmittalByType[];

  @ApiProperty()
  leadTimeAnalysis: SubmittalLeadTimeAnalysis;

  @ApiProperty({ type: [SubmittalTrendData] })
  trends: SubmittalTrendData[];

  @ApiProperty()
  topReviewers: Array<{
    userId: string;
    name: string;
    reviewed: number;
    avgReviewDays: number;
    approvalRate: number;
    onTimeRate: number;
  }>;

  @ApiProperty()
  contractorPerformance: Array<{
    companyId: string;
    companyName: string;
    submitted: number;
    approved: number;
    rejected: number;
    avgRevisionsNeeded: number;
    firstTimeApprovalRate: number;
  }>;
}
