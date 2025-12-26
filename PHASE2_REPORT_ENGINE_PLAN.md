# Financial Reporting Engine - Phase 2 Implementation Plan

**Date**: 2025-12-10
**Task**: Phase 2 Advanced Reports
**Status**: Planning

---

## Overview

Phase 2 introduces 4 advanced financial reports that build upon Phase 1's foundation:

1. **Earned Value Analysis (EVA) Report** - Advanced EVM with trend analysis
2. **Cash Flow Projection Report** - Forecast cash inflows/outflows
3. **Invoice Register Report** - Comprehensive invoice tracking
4. **Executive Summary Dashboard** - High-level KPIs and metrics

---

## Report 1: Earned Value Analysis (EVA) Report

### Purpose
Enhanced EVM report with historical tracking, trend analysis, and forecasting. Goes beyond Phase 1's Cost-to-Complete report by adding time-based analysis.

### Key Metrics
**EVM Core:**
- BAC (Budget at Completion) = Total budget
- PV (Planned Value) = Scheduled work value as of reporting date
- EV (Earned Value) = Completed work value
- AC (Actual Cost) = Actual costs incurred
- CV (Cost Variance) = EV - AC
- SV (Schedule Variance) = EV - PV
- CPI (Cost Performance Index) = EV / AC
- SPI (Schedule Performance Index) = EV / PV
- EAC (Estimate at Completion) = BAC / CPI
- ETC (Estimate to Complete) = EAC - AC
- VAC (Variance at Completion) = BAC - EAC
- TCPI (To Complete Performance Index) = (BAC - EV) / (BAC - AC)

**Trend Analysis:**
- Monthly EV, PV, AC values
- CPI trend over time
- SPI trend over time
- Forecast completion date based on current SPI

### Data Structure
```typescript
export class EarnedValueAnalysisReportDto {
  projectId!: string;
  projectName!: string;
  budgetId!: string;
  budgetName!: string;
  asOfDate!: Date;

  // Project-level EVM
  bac!: number;  // Budget at Completion
  pv!: number;   // Planned Value
  ev!: number;   // Earned Value
  ac!: number;   // Actual Cost
  cv!: number;   // Cost Variance
  sv!: number;   // Schedule Variance
  cpi!: number;  // Cost Performance Index
  spi!: number;  // Schedule Performance Index
  eac!: number;  // Estimate at Completion
  etc!: number;  // Estimate to Complete
  vac!: number;  // Variance at Completion
  tcpi!: number; // To Complete Performance Index

  forecastCompletionDate?: Date;

  // Cost code breakdown
  lines!: EarnedValueAnalysisLineDto[];

  // Monthly trend data
  monthlyTrends!: EarnedValueMonthlyTrendDto[];

  generatedAt!: Date;
}

export class EarnedValueAnalysisLineDto {
  costCode!: string;
  description!: string;
  bac!: number;
  pv!: number;
  ev!: number;
  ac!: number;
  cv!: number;
  sv!: number;
  cpi!: number;
  spi!: number;
  eac!: number;
  etc!: number;
  vac!: number;
}

export class EarnedValueMonthlyTrendDto {
  month!: Date;
  plannedValue!: number;
  earnedValue!: number;
  actualCost!: number;
  cpi!: number;
  spi!: number;
}
```

### Business Logic
```typescript
// Calculate Planned Value (PV)
// Based on budget spread over project duration
PV = (daysElapsed / totalProjectDays) * BAC

// Calculate Earned Value (EV)
// Based on % complete of each cost code
EV = sum(costCode.percentComplete * costCode.budget)

// Calculate Actual Cost (AC)
AC = sum(POSTED cost entries)

// Calculate variances
CV = EV - AC  // Positive = under budget, Negative = over budget
SV = EV - PV  // Positive = ahead of schedule, Negative = behind schedule

// Calculate indices
CPI = EV / AC  // > 1.0 = under budget, < 1.0 = over budget
SPI = EV / PV  // > 1.0 = ahead of schedule, < 1.0 = behind schedule

// Forecast completion
EAC = BAC / CPI  // Estimate at Completion
ETC = EAC - AC   // Estimate to Complete
VAC = BAC - EAC  // Variance at Completion

// Required performance to complete on budget
TCPI = (BAC - EV) / (BAC - AC)
```

### API Endpoint
```
POST /api/v1/projects/:projectId/reports/earned-value-analysis
Body: { budgetId?: string, asOfDate?: string }
Response: Excel file with EVA report
```

---

## Report 2: Cash Flow Projection Report

### Purpose
Forecast cash inflows (from owner payments) and outflows (to vendors/subcontractors) to help manage project cash requirements.

### Key Metrics
- **Cash Inflows**: Expected payments from owner based on billing schedule
- **Cash Outflows**: Expected payments to vendors based on commitments and retention
- **Net Cash Flow**: Inflows - Outflows per period
- **Cumulative Cash**: Running total of net cash flow
- **Peak Cash Requirement**: Maximum negative cumulative cash
- **Retention Held**: Total retention withheld from vendors
- **Retention Owed**: Total retention owed to us by owner

### Data Structure
```typescript
export class CashFlowProjectionReportDto {
  projectId!: string;
  projectName!: string;
  startDate!: Date;
  endDate!: Date;
  asOfDate!: Date;

  // Summary metrics
  totalProjectedInflows!: number;
  totalProjectedOutflows!: number;
  netCashFlow!: number;
  peakCashRequirement!: number;
  currentCashPosition!: number;
  totalRetentionHeld!: number;  // By us from vendors
  totalRetentionOwed!: number;  // To us from owner

  // Monthly projections
  monthlyProjections!: CashFlowMonthlyProjectionDto[];

  // Commitment-level detail
  commitmentDetails!: CashFlowCommitmentDetailDto[];

  generatedAt!: Date;
}

export class CashFlowMonthlyProjectionDto {
  month!: Date;
  projectedInflows!: number;
  projectedOutflows!: number;
  netCashFlow!: number;
  cumulativeCash!: number;
}

export class CashFlowCommitmentDetailDto {
  commitmentId!: string;
  commitmentNumber!: string;
  vendorName!: string;
  revisedAmount!: number;
  paidToDate!: number;
  retentionHeld!: number;
  remainingBalance!: number;
  projectedPayments!: CashFlowCommitmentPaymentDto[];
}

export class CashFlowCommitmentPaymentDto {
  month!: Date;
  projectedAmount!: number;
}
```

### Business Logic
```typescript
// Calculate projected inflows (owner payments)
// Based on billing schedule and payment terms (e.g., Net 30)
projectedInflows = sum(scheduledBillings) adjusted for payment terms

// Calculate projected outflows (vendor payments)
// Based on commitment payment schedules
projectedOutflows = sum(commitment.remainingBalance / monthsRemaining)

// Net cash flow per period
netCashFlow = projectedInflows - projectedOutflows

// Cumulative cash position
cumulativeCash = previous period cumulative + current period net

// Peak cash requirement
peakCashRequirement = min(cumulativeCash over all periods)

// Retention calculations
retentionHeld = sum(commitment.retentionHeld)  // We hold from vendors
retentionOwed = billedToOwner * retentionPercentage  // Owner holds from us
```

### API Endpoint
```
POST /api/v1/projects/:projectId/reports/cash-flow-projection
Body: { startDate?: string, endDate?: string, asOfDate?: string }
Response: Excel file with cash flow projections
```

---

## Report 3: Invoice Register Report

### Purpose
Comprehensive listing of all invoices (both payable to vendors and receivable from owner) with aging analysis.

### Key Metrics
- **Invoices Payable**: Invoices we owe to vendors
- **Invoices Receivable**: Invoices we bill to owner
- **Aging buckets**: Current, 1-30 days, 31-60 days, 61-90 days, 90+ days
- **Approval status**: Pending, Approved, Paid, Rejected
- **Retention tracking**: Amount held, amount released

### Data Structure
```typescript
export class InvoiceRegisterReportDto {
  projectId!: string;
  projectName!: string;
  asOfDate!: Date;
  filterType?: 'PAYABLE' | 'RECEIVABLE';
  filterStatus?: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';

  // Summary metrics
  totalInvoices!: number;
  totalInvoiceAmount!: number;
  totalPaidAmount!: number;
  totalOutstandingAmount!: number;
  totalRetentionHeld!: number;

  // Aging summary
  agingCurrent!: number;       // 0-30 days
  aging31To60!: number;        // 31-60 days
  aging61To90!: number;        // 61-90 days
  aging90Plus!: number;        // 90+ days

  // Invoice details
  invoices!: InvoiceRegisterLineDto[];

  generatedAt!: Date;
}

export class InvoiceRegisterLineDto {
  invoiceId!: string;
  invoiceNumber!: string;
  invoiceType!: 'PAYABLE' | 'RECEIVABLE';
  invoiceDate!: Date;
  dueDate!: Date;
  vendorOrCustomerName!: string;
  commitmentNumber?: string;
  description!: string;
  amount!: number;
  retentionHeld!: number;
  amountDue!: number;
  amountPaid!: number;
  status!: string;
  daysOutstanding!: number;
  agingBucket!: string;  // "Current", "1-30", "31-60", "61-90", "90+"
}
```

### Business Logic
```typescript
// Calculate days outstanding
daysOutstanding = daysBetween(invoiceDate, asOfDate)

// Determine aging bucket
if (daysOutstanding <= 30) agingBucket = "Current"
else if (daysOutstanding <= 60) agingBucket = "1-30"
else if (daysOutstanding <= 90) agingBucket = "31-60"
else if (daysOutstanding <= 120) agingBucket = "61-90"
else agingBucket = "90+"

// Calculate amounts
amountDue = amount - retentionHeld
amountOutstanding = amountDue - amountPaid
```

### API Endpoint
```
POST /api/v1/projects/:projectId/reports/invoice-register
Body: {
  type?: 'PAYABLE' | 'RECEIVABLE',
  status?: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED',
  asOfDate?: string
}
Response: Excel file with invoice register
```

---

## Report 4: Executive Summary Dashboard

### Purpose
High-level dashboard providing project executives with key performance indicators and financial health metrics at a glance.

### Key Metrics
- **Project Overview**: Contract value, budget, costs, profit
- **Financial Health**: Budget variance, profit margin, cash position
- **Schedule Performance**: % complete, behind/ahead schedule
- **Risk Indicators**: Over-budget line items, delayed commitments
- **Top 5 Issues**: Largest variances, oldest unpaid invoices

### Data Structure
```typescript
export class ExecutiveSummaryReportDto {
  projectId!: string;
  projectName!: string;
  projectManager!: string;
  asOfDate!: Date;

  // Contract & Budget
  contractValue!: number;
  originalBudget!: number;
  approvedChangeOrders!: number;
  revisedBudget!: number;

  // Costs & Commitments
  committedCost!: number;
  actualCost!: number;
  projectedFinalCost!: number;

  // Financial Performance
  budgetVariance!: number;           // revisedBudget - projectedFinalCost
  budgetVariancePercent!: number;    // (variance / revisedBudget) * 100
  projectedProfit!: number;          // contractValue - projectedFinalCost
  projectedProfitMargin!: number;    // (profit / contractValue) * 100

  // Schedule Performance
  percentComplete!: number;
  scheduledPercentComplete!: number;
  scheduleVarianceDays!: number;
  forecastCompletionDate?: Date;

  // Cash Flow
  currentCashPosition!: number;
  projectedPeakCashNeed!: number;
  billedToDate!: number;
  receivedFromOwner!: number;

  // EVM Indices
  cpi!: number;  // Cost Performance Index
  spi!: number;  // Schedule Performance Index

  // Risk Indicators
  overBudgetLineItemsCount!: number;
  delayedCommitmentsCount!: number;
  overdueInvoicesCount!: number;
  overdueInvoicesAmount!: number;

  // Top Issues
  topCostOverruns!: ExecutiveSummaryIssueDto[];
  topDelayedCommitments!: ExecutiveSummaryIssueDto[];
  topOverdueInvoices!: ExecutiveSummaryIssueDto[];

  // Trend Charts Data
  costTrend!: ExecutiveSummaryTrendDto[];
  cashFlowTrend!: ExecutiveSummaryTrendDto[];

  generatedAt!: Date;
}

export class ExecutiveSummaryIssueDto {
  description!: string;
  value!: number;
  daysOrPercent!: number;
  status!: string;
}

export class ExecutiveSummaryTrendDto {
  month!: Date;
  planned!: number;
  actual!: number;
}
```

### Business Logic
```typescript
// Financial Performance
budgetVariance = revisedBudget - projectedFinalCost
budgetVariancePercent = (budgetVariance / revisedBudget) * 100
projectedProfit = contractValue - projectedFinalCost
projectedProfitMargin = (projectedProfit / contractValue) * 100

// Schedule Performance
percentComplete = (actualCost / revisedBudget) * 100
scheduledPercentComplete = (daysElapsed / totalDays) * 100
scheduleVarianceDays = (percentComplete - scheduledPercentComplete) * totalDays / 100

// Cash Flow
currentCashPosition = receivedFromOwner - paidToVendors

// Risk Identification
overBudgetLineItems = count(line items where actualCost > revisedBudget)
delayedCommitments = count(commitments where completionDate > scheduledDate)
overdueInvoices = count(invoices where daysOutstanding > 30)

// Top Issues
topCostOverruns = top 5 cost codes ordered by variance DESC
topDelayedCommitments = top 5 commitments ordered by days delayed DESC
topOverdueInvoices = top 5 invoices ordered by days outstanding DESC
```

### API Endpoint
```
POST /api/v1/projects/:projectId/reports/executive-summary
Body: { asOfDate?: string }
Response: Excel file with executive summary dashboard
```

---

## Implementation Order

### Phase 1: DTOs (4 files, ~400 lines)
1. `earned-value-analysis-report.dto.ts` (~120 lines)
2. `cash-flow-projection-report.dto.ts` (~100 lines)
3. `invoice-register-report.dto.ts` (~90 lines)
4. `executive-summary-report.dto.ts` (~90 lines)

### Phase 2: Services (4 files, ~3,500 lines)
1. `earned-value-analysis-report.service.ts` (~900 lines)
   - Complex EVM calculations
   - Monthly trend analysis
   - Forecast completion date

2. `cash-flow-projection-report.service.ts` (~900 lines)
   - Commitment payment schedules
   - Owner billing projections
   - Cumulative cash calculations

3. `invoice-register-report.service.ts` (~800 lines)
   - Invoice aggregation
   - Aging bucket calculations
   - Payable vs Receivable split

4. `executive-summary-report.service.ts` (~900 lines)
   - Aggregates data from multiple sources
   - Risk identification algorithms
   - Trend data compilation

### Phase 3: Excel Export Updates (~300 lines)
Update `report-excel-export.service.ts` with 4 new methods:
- `exportEarnedValueAnalysisToExcel()`
- `exportCashFlowProjectionToExcel()`
- `exportInvoiceRegisterToExcel()`
- `exportExecutiveSummaryToExcel()`

### Phase 4: Controller Updates (~150 lines)
Update `report.controller.ts` with 4 new endpoints:
- `POST /earned-value-analysis`
- `POST /cash-flow-projection`
- `POST /invoice-register`
- `POST /executive-summary`

### Phase 5: Unit Tests (4 files, ~1,600 lines)
- `earned-value-analysis-report.service.spec.ts`
- `cash-flow-projection-report.service.spec.ts`
- `invoice-register-report.service.spec.ts`
- `executive-summary-report.service.spec.ts`

---

## Total Estimated Lines: ~6,000 lines

---

## Dependencies

Phase 2 reports leverage existing data:
- CostEntry (actual costs)
- Commitment (commitments)
- CommitmentChangeOrder (change orders)
- BudgetLineItem (budget data)
- PaymentApplication (billing data) - **Note: Need to verify this entity exists**
- Invoice (invoice data) - **Note: Need to verify this entity exists**

---

## Next Session Plan

1. Create 4 DTO files (~400 lines)
2. Implement EarnedValueAnalysisReportService (~900 lines)
3. Implement CashFlowProjectionReportService (~900 lines)
4. Implement InvoiceRegisterReportService (~800 lines)
5. Implement ExecutiveSummaryReportService (~900 lines)
6. Update ReportExcelExportService with 4 new methods (~300 lines)
7. Update ReportController with 4 new endpoints (~150 lines)
8. Write unit tests (4 files, ~1,600 lines)
9. Update CHANGELOG.md
10. Compile, test, commit, and push

**Estimated Time**: 3-4 hours focused implementation

---

**End of Phase 2 Plan**
