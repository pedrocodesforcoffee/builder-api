# RFI & Submittal Analytics System

## Overview

The RFI & Submittal Analytics system provides comprehensive metrics, reporting, and insights for construction project management. It tracks performance across RFIs (Requests for Information) and Submittals, helping project teams identify bottlenecks, measure efficiency, and make data-driven decisions.

### Key Capabilities

- **Real-time Analytics**: Status summaries, response times, approval rates, and more
- **Historical Trends**: Daily, weekly, and monthly snapshots for trend analysis
- **Performance Metrics**: Track user, company, and team performance
- **Impact Analysis**: Cost and schedule impact tracking for RFIs
- **Lead Time Management**: Monitor submittal lead times and at-risk items
- **Bottleneck Detection**: Identify users and disciplines with backlogs
- **Saved Reports**: Create, save, and schedule custom reports
- **Multi-format Export**: Export data to CSV, Excel, JSON, and PDF
- **Combined Dashboards**: Unified view of RFI and Submittal health

---

## Architecture

### Components

1. **Entities** (3):
   - `AnalyticsSnapshot`: Historical snapshots of analytics data
   - `UserPerformanceMetrics`: Individual user performance tracking
   - `SavedReport`: User-defined reports with configurations

2. **Services** (5):
   - `RfiAnalyticsService`: RFI metrics calculations (~900 lines)
   - `SubmittalAnalyticsService`: Submittal metrics calculations (~900 lines)
   - `ExportService`: Multi-format data export (~300 lines)
   - `ReportService`: Saved report management (~350 lines)
   - `AnalyticsSnapshotService`: Snapshot creation and management (~300 lines)

3. **Controller**: 25+ REST endpoints for analytics operations

4. **Database Tables**:
   - `analytics_snapshots`: 12 columns, 2 indexes
   - `user_performance_metrics`: 10 columns, 2 indexes
   - `saved_reports`: 12 columns, 3 indexes

### Technology Stack

- **Framework**: NestJS 11
- **ORM**: TypeORM with PostgreSQL
- **Scheduling**: @nestjs/schedule for cron jobs
- **Excel Export**: ExcelJS library
- **Authentication**: JWT with guards

---

## API Reference

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Base URL

```
/api/v1/projects/:projectId/analytics
```

---

## RFI Analytics Endpoints

### 1. Get Complete RFI Analytics

**Endpoint**: `GET /projects/:projectId/analytics/rfis`

**Description**: Returns comprehensive RFI analytics including status summaries, response times, impact analysis, trends, and bottlenecks.

**Query Parameters**:
- `startDate` (optional): ISO 8601 date string (e.g., "2024-01-01T00:00:00Z")
- `endDate` (optional): ISO 8601 date string
- `period` (optional): Predefined period - `LAST_7_DAYS`, `LAST_30_DAYS`, `LAST_90_DAYS`, `LAST_6_MONTHS`, `LAST_YEAR`, `THIS_MONTH`, `THIS_QUARTER`, `THIS_YEAR`
- `statuses` (optional): Comma-separated RFI statuses - `DRAFT`, `OPEN`, `ANSWERED`, `CLOSED`, `VOID`
- `priorities` (optional): Comma-separated priorities - `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `disciplines` (optional): Comma-separated disciplines
- `assigneeIds` (optional): Comma-separated user IDs

**Response**:
```json
{
  "projectId": "a6074e71-6f3f-40c0-a201-1e87b238df81",
  "period": {
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z",
    "type": "CUSTOM"
  },
  "statusSummary": {
    "total": 125,
    "draft": 5,
    "open": 32,
    "answered": 18,
    "closed": 68,
    "void": 2,
    "overdue": 8
  },
  "responseTimeMetrics": {
    "averageDays": 4.2,
    "medianDays": 3,
    "minDays": 0,
    "maxDays": 21,
    "distribution": [
      { "bucket": "0-3 days", "count": 45 },
      { "bucket": "4-7 days", "count": 28 },
      { "bucket": "8-14 days", "count": 12 },
      { "bucket": "15+ days", "count": 3 }
    ],
    "onTimePercentage": 82.5
  },
  "impactSummary": {
    "totalEstimatedCost": 125000,
    "totalScheduleImpactDays": 42,
    "byCostImpact": {
      "CRITICAL": { "count": 3, "totalCost": 85000 },
      "HIGH": { "count": 8, "totalCost": 35000 },
      "MEDIUM": { "count": 12, "totalCost": 5000 }
    }
  },
  "byPriority": [
    { "priority": "CRITICAL", "total": 5, "open": 2, "closed": 3 },
    { "priority": "HIGH", "total": 28, "open": 8, "closed": 20 }
  ],
  "byDiscipline": [
    {
      "discipline": "Structural",
      "total": 35,
      "open": 8,
      "closed": 27,
      "avgResponseDays": 3.8,
      "overdueCount": 2
    }
  ],
  "agingAnalysis": [
    { "bucket": "0-7 days", "count": 15 },
    { "bucket": "8-14 days", "count": 8 },
    { "bucket": "15-30 days", "count": 5 },
    { "bucket": "31+ days", "count": 4 }
  ],
  "trends": [
    { "date": "2024-01-01", "created": 8, "closed": 5 }
  ],
  "topAssignees": [
    {
      "assigneeId": "user-id-1",
      "assigneeName": "John Doe",
      "openCount": 8,
      "closedCount": 42,
      "avgResponseDays": 3.2,
      "overdueCount": 1
    }
  ],
  "ballInCourt": [
    { "holder": "General Contractor", "count": 18 },
    { "holder": "Architect", "count": 8 }
  ],
  "bottlenecks": [
    {
      "type": "USER",
      "id": "user-id-2",
      "name": "Jane Smith",
      "openItems": 12,
      "avgDaysOpen": 15.5,
      "oldestItemDays": 28
    }
  ]
}
```

**Example**:
```bash
curl -X GET "http://localhost:3000/api/v1/projects/a6074e71-6f3f-40c0-a201-1e87b238df81/analytics/rfis?period=LAST_30_DAYS&statuses=OPEN,ANSWERED" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 2. Get RFI Status Summary

**Endpoint**: `GET /projects/:projectId/analytics/rfis/summary`

**Description**: Returns quick summary of RFI status counts.

**Response**:
```json
{
  "total": 125,
  "draft": 5,
  "open": 32,
  "answered": 18,
  "closed": 68,
  "void": 2,
  "overdue": 8
}
```

---

### 3. Get RFI Response Time Metrics

**Endpoint**: `GET /projects/:projectId/analytics/rfis/response-time`

**Description**: Returns detailed response time analysis.

**Response**:
```json
{
  "averageDays": 4.2,
  "medianDays": 3,
  "minDays": 0,
  "maxDays": 21,
  "distribution": [
    { "bucket": "0-3 days", "count": 45 },
    { "bucket": "4-7 days", "count": 28 }
  ],
  "onTimePercentage": 82.5
}
```

---

### 4. Get RFI Aging Analysis

**Endpoint**: `GET /projects/:projectId/analytics/rfis/aging`

**Description**: Returns aging buckets for currently open RFIs.

**Response**:
```json
{
  "buckets": [
    { "bucket": "0-7 days", "count": 15 },
    { "bucket": "8-14 days", "count": 8 },
    { "bucket": "15-30 days", "count": 5 },
    { "bucket": "31+ days", "count": 4 }
  ]
}
```

---

### 5. Get RFI Bottlenecks

**Endpoint**: `GET /projects/:projectId/analytics/rfis/bottlenecks`

**Description**: Identifies users, companies, or disciplines with 3+ open RFIs.

**Response**:
```json
{
  "bottlenecks": [
    {
      "type": "USER",
      "id": "user-id-1",
      "name": "John Doe",
      "openItems": 8,
      "avgDaysOpen": 12.5,
      "oldestItemDays": 25
    },
    {
      "type": "DISCIPLINE",
      "id": "structural",
      "name": "Structural",
      "openItems": 12,
      "avgDaysOpen": 9.8,
      "oldestItemDays": 18
    }
  ]
}
```

---

## Submittal Analytics Endpoints

### 6. Get Complete Submittal Analytics

**Endpoint**: `GET /projects/:projectId/analytics/submittals`

**Description**: Returns comprehensive Submittal analytics including status summaries, approval metrics, lead time analysis, and contractor performance.

**Query Parameters**:
- Same as RFI analytics, plus:
- `specDivisions` (optional): Comma-separated CSI divisions (e.g., "03,05,09")
- `companyIds` (optional): Comma-separated company IDs

**Response**:
```json
{
  "projectId": "a6074e71-6f3f-40c0-a201-1e87b238df81",
  "period": { "startDate": "...", "endDate": "...", "type": "LAST_30_DAYS" },
  "statusSummary": {
    "total": 87,
    "notStarted": 5,
    "draft": 8,
    "submitted": 12,
    "underReview": 18,
    "approved": 32,
    "approvedAsNoted": 8,
    "reviseResubmit": 3,
    "rejected": 1,
    "closed": 0,
    "overdue": 4
  },
  "approvalMetrics": {
    "firstTimeApprovalRate": 68.5,
    "averageRevisionsPerSubmittal": 1.3,
    "approvalRate": 85.2,
    "rejectionRate": 2.8,
    "reviseResubmitRate": 12.0
  },
  "reviewTimeMetrics": {
    "averageDays": 6.8,
    "medianDays": 5,
    "minDays": 1,
    "maxDays": 18,
    "distribution": [
      { "bucket": "0-3 days", "count": 12 },
      { "bucket": "4-7 days", "count": 28 },
      { "bucket": "8-14 days", "count": 15 },
      { "bucket": "15+ days", "count": 5 }
    ]
  },
  "leadTimeAnalysis": {
    "onTrack": 45,
    "atRisk": 12,
    "late": 3,
    "averageDaysToRequired": 18.5
  },
  "byType": [
    { "type": "Shop Drawings", "total": 32, "approved": 20, "pending": 8 },
    { "type": "Product Data", "total": 28, "approved": 18, "pending": 7 }
  ],
  "bySpecDivision": [
    {
      "division": "03",
      "name": "Concrete",
      "total": 18,
      "approved": 12,
      "pending": 4,
      "approvalRate": 75.0
    }
  ],
  "topReviewers": [
    {
      "reviewerId": "user-id-1",
      "reviewerName": "Jane Smith",
      "reviewedCount": 42,
      "approvedCount": 35,
      "avgReviewDays": 4.5,
      "approvalRate": 83.3
    }
  ],
  "contractorPerformance": [
    {
      "contractorId": "company-id-1",
      "contractorName": "ABC Construction",
      "submittedCount": 25,
      "approvedCount": 20,
      "rejectedCount": 1,
      "avgRevisionsPerSubmittal": 1.1,
      "firstTimeApprovalRate": 72.0
    }
  ]
}
```

**Example**:
```bash
curl -X GET "http://localhost:3000/api/v1/projects/a6074e71-6f3f-40c0-a201-1e87b238df81/analytics/submittals?period=LAST_30_DAYS" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 7. Get Submittal Status Summary

**Endpoint**: `GET /projects/:projectId/analytics/submittals/summary`

**Description**: Quick summary of submittal status counts.

---

### 8. Get Submittal Approval Metrics

**Endpoint**: `GET /projects/:projectId/analytics/submittals/approval-metrics`

**Description**: Returns approval rates and revision statistics.

---

### 9. Get Submittal Lead Time Analysis

**Endpoint**: `GET /projects/:projectId/analytics/submittals/lead-time`

**Description**: Categorizes submittals by lead time status (on-track, at-risk, late).

---

### 10. Get Submittals by Spec Division

**Endpoint**: `GET /projects/:projectId/analytics/submittals/by-division`

**Description**: Groups submittals by CSI MasterFormat divisions.

---

### 11. Get Contractor Performance

**Endpoint**: `GET /projects/:projectId/analytics/submittals/contractor-performance`

**Description**: Tracks contractor submittal quality and timeliness.

---

## Combined Dashboard Endpoint

### 12. Get Combined Dashboard

**Endpoint**: `GET /projects/:projectId/analytics/dashboard`

**Description**: Returns unified view of RFI and Submittal metrics with overall health score.

**Response**:
```json
{
  "projectId": "a6074e71-6f3f-40c0-a201-1e87b238df81",
  "period": { "startDate": "...", "endDate": "...", "type": "LAST_30_DAYS" },
  "rfi": {
    "summary": { "total": 125, "open": 32, "overdue": 8 },
    "responseTime": { "averageDays": 4.2, "onTimePercentage": 82.5 },
    "impact": { "totalEstimatedCost": 125000, "totalScheduleImpactDays": 42 },
    "bottlenecks": [...]
  },
  "submittal": {
    "summary": { "total": 87, "submitted": 12, "underReview": 18, "overdue": 4 },
    "approvalMetrics": { "firstTimeApprovalRate": 68.5 },
    "reviewTime": { "averageDays": 6.8 },
    "leadTime": { "onTrack": 45, "atRisk": 12, "late": 3 }
  },
  "combined": {
    "totalOpenItems": 62,
    "totalOverdueItems": 12,
    "healthScore": 78
  }
}
```

**Example**:
```bash
curl -X GET "http://localhost:3000/api/v1/projects/a6074e71-6f3f-40c0-a201-1e87b238df81/analytics/dashboard" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Export Endpoints

### 13. Export Analytics Data

**Endpoint**: `POST /projects/:projectId/analytics/export`

**Description**: Exports analytics data in CSV, Excel, or JSON format.

**Request Body**:
```json
{
  "reportType": "RFI_LIST",
  "format": "EXCEL",
  "filters": {
    "statuses": ["OPEN", "ANSWERED"],
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z"
  }
}
```

**Report Types**:
- `RFI_LIST`: Full RFI list with all fields
- `SUBMITTAL_LIST`: Full submittal list
- `SUBMITTAL_REGISTER`: Submittal log format
- `RFI_ANALYTICS_SUMMARY`: Analytics summary data
- `SUBMITTAL_ANALYTICS_SUMMARY`: Analytics summary data

**Formats**:
- `CSV`: Comma-separated values
- `EXCEL`: Excel workbook with formatted headers
- `JSON`: JSON array
- `PDF`: PDF report (future)

**Response**: Binary file download with appropriate content-type and filename.

**Example**:
```bash
curl -X POST "http://localhost:3000/api/v1/projects/a6074e71-6f3f-40c0-a201-1e87b238df81/analytics/export" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "RFI_LIST",
    "format": "EXCEL",
    "filters": {
      "statuses": ["OPEN", "ANSWERED"]
    }
  }' \
  --output rfis.xlsx
```

---

## Saved Reports Endpoints

### 14. List Saved Reports

**Endpoint**: `GET /projects/:projectId/analytics/reports`

**Description**: Returns all saved reports for the project (user's own, shared, and templates).

**Response**:
```json
[
  {
    "id": "report-id-1",
    "name": "Weekly RFI Status Report",
    "description": "Open and overdue RFIs",
    "reportType": "RFI_STATUS",
    "configuration": {
      "dateRange": { "relativePeriod": "LAST_7_DAYS" },
      "filters": { "statuses": ["OPEN", "ANSWERED"] }
    },
    "isTemplate": false,
    "isShared": true,
    "isScheduled": true,
    "scheduleConfig": {
      "frequency": "WEEKLY",
      "dayOfWeek": 1,
      "time": "09:00",
      "format": "EXCEL",
      "recipients": ["user@example.com"]
    },
    "createdById": "user-id-1",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
]
```

---

### 15. Create Saved Report

**Endpoint**: `POST /projects/:projectId/analytics/reports`

**Description**: Creates a new saved report.

**Request Body**:
```json
{
  "name": "Weekly RFI Status Report",
  "description": "Open and overdue RFIs",
  "reportType": "RFI_STATUS",
  "configuration": {
    "dateRange": {
      "relativePeriod": "LAST_7_DAYS"
    },
    "filters": {
      "statuses": ["OPEN", "ANSWERED"],
      "priorities": ["HIGH", "CRITICAL"]
    }
  },
  "isTemplate": false,
  "isShared": true,
  "isScheduled": true,
  "scheduleConfig": {
    "frequency": "WEEKLY",
    "dayOfWeek": 1,
    "time": "09:00",
    "format": "EXCEL",
    "recipients": ["user@example.com"]
  }
}
```

**Report Types**:
- `RFI_STATUS`: RFI status summary
- `RFI_AGING`: RFI aging analysis
- `RFI_RESPONSE_TIME`: Response time metrics
- `RFI_BY_DISCIPLINE`: RFI breakdown by discipline
- `RFI_IMPACT`: Cost and schedule impact
- `SUBMITTAL_STATUS`: Submittal status summary
- `SUBMITTAL_LOG`: Submittal register
- `SUBMITTAL_AGING`: Submittal aging
- `SUBMITTAL_BY_SPEC`: Breakdown by spec division
- `SUBMITTAL_APPROVAL_RATE`: Approval metrics
- `COMBINED_DASHBOARD`: Combined RFI/Submittal dashboard
- `USER_PERFORMANCE`: User performance metrics
- `BOTTLENECK_ANALYSIS`: Bottleneck identification
- `TREND_ANALYSIS`: Trend data
- `CUSTOM`: Custom report configuration

---

### 16. Get Saved Report

**Endpoint**: `GET /projects/:projectId/analytics/reports/:reportId`

**Description**: Returns a specific saved report.

---

### 17. Update Saved Report

**Endpoint**: `PUT /projects/:projectId/analytics/reports/:reportId`

**Description**: Updates a saved report configuration.

---

### 18. Run Saved Report

**Endpoint**: `POST /projects/:projectId/analytics/reports/:reportId/run`

**Description**: Executes a saved report and returns the results.

**Response**: Report data based on the report type (same format as corresponding analytics endpoint).

**Example**:
```bash
curl -X POST "http://localhost:3000/api/v1/projects/a6074e71-6f3f-40c0-a201-1e87b238df81/analytics/reports/report-id-1/run" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 19. Clone Saved Report

**Endpoint**: `POST /projects/:projectId/analytics/reports/:reportId/clone`

**Description**: Creates a copy of an existing report.

**Request Body**:
```json
{
  "name": "Cloned Report Name"
}
```

---

### 20. Delete Saved Report

**Endpoint**: `DELETE /projects/:projectId/analytics/reports/:reportId`

**Description**: Deletes a saved report.

**Response**: 204 No Content

---

### 21. Get Report Templates

**Endpoint**: `GET /projects/:projectId/analytics/reports/templates`

**Description**: Returns organization-wide report templates.

---

## Snapshot Endpoints

### 22. Get Historical Snapshots

**Endpoint**: `GET /projects/:projectId/analytics/snapshots/historical`

**Description**: Returns historical snapshots for trend analysis.

**Query Parameters**:
- `type` (required): `DAILY`, `WEEKLY`, or `MONTHLY`
- `limit` (optional): Number of snapshots to return (default: 30)

**Response**:
```json
[
  {
    "id": "snapshot-id-1",
    "projectId": "a6074e71-6f3f-40c0-a201-1e87b238df81",
    "snapshotType": "DAILY",
    "category": "COMBINED",
    "snapshotDate": "2024-01-15",
    "rfiMetrics": {
      "total": 125,
      "open": 32,
      "closed": 68,
      "avgResponseDays": 4.2
    },
    "submittalMetrics": {
      "total": 87,
      "approved": 32,
      "pending": 30,
      "firstTimeApprovalRate": 68.5
    },
    "summaryMetrics": {
      "totalOpenItems": 62,
      "overallHealthScore": 78,
      "riskLevel": "MEDIUM"
    },
    "createdAt": "2024-01-15T00:00:00Z"
  }
]
```

**Example**:
```bash
curl -X GET "http://localhost:3000/api/v1/projects/a6074e71-6f3f-40c0-a201-1e87b238df81/analytics/snapshots/historical?type=DAILY&limit=30" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 23. Get Snapshot Trends

**Endpoint**: `GET /projects/:projectId/analytics/snapshots/trends`

**Description**: Returns time-series trend data from snapshots.

**Query Parameters**:
- `type` (required): `DAILY`, `WEEKLY`, or `MONTHLY`
- `startDate` (required): ISO 8601 date string
- `endDate` (required): ISO 8601 date string

**Response**:
```json
{
  "dates": ["2024-01-01", "2024-01-02", "2024-01-03"],
  "rfiOpenCount": [32, 35, 33],
  "rfiClosedCount": [68, 70, 72],
  "submittalPendingCount": [30, 28, 32],
  "submittalApprovedCount": [32, 34, 35],
  "healthScores": [78, 76, 79]
}
```

**Example**:
```bash
curl -X GET "http://localhost:3000/api/v1/projects/a6074e71-6f3f-40c0-a201-1e87b238df81/analytics/snapshots/trends?type=DAILY&startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 24. Compare Snapshots

**Endpoint**: `POST /projects/:projectId/analytics/snapshots/compare`

**Description**: Compares two snapshots and returns delta changes.

**Request Body**:
```json
{
  "snapshotId1": "snapshot-id-1",
  "snapshotId2": "snapshot-id-2"
}
```

**Response**:
```json
{
  "snapshot1": { /* Full snapshot data */ },
  "snapshot2": { /* Full snapshot data */ },
  "changes": {
    "rfiOpenDelta": 3,
    "rfiClosedDelta": 5,
    "submittalPendingDelta": -2,
    "submittalApprovedDelta": 4,
    "healthScoreDelta": 2
  }
}
```

---

### 25. Create Manual Snapshot

**Endpoint**: `POST /projects/:projectId/analytics/snapshots/create`

**Description**: Manually creates a snapshot (in addition to scheduled snapshots).

**Request Body**:
```json
{
  "type": "DAILY"
}
```

**Response**: Full snapshot object

---

## Metrics Glossary

### RFI Metrics

**Status Summary**:
- `total`: Total number of RFIs
- `draft`: RFIs in DRAFT status
- `open`: RFIs in OPEN status (awaiting response)
- `answered`: RFIs that have been answered but not closed
- `closed`: RFIs marked as CLOSED
- `void`: RFIs marked as VOID
- `overdue`: RFIs past their due date

**Response Time Metrics**:
- `averageDays`: Mean response time in days
- `medianDays`: Median response time in days
- `minDays`: Fastest response time
- `maxDays`: Slowest response time
- `distribution`: Bucketed response times (0-3, 4-7, 8-14, 15+ days)
- `onTimePercentage`: Percentage of RFIs responded to within due date

**Impact Summary**:
- `totalEstimatedCost`: Sum of estimated cost impacts
- `totalScheduleImpactDays`: Sum of schedule delays in days
- `byCostImpact`: Breakdown by priority with cost totals

**Aging Buckets**:
- `0-7 days`: Open RFIs less than a week old
- `8-14 days`: Open RFIs 1-2 weeks old
- `15-30 days`: Open RFIs 2-4 weeks old
- `31+ days`: Open RFIs over a month old

### Submittal Metrics

**Status Summary**:
- `total`: Total number of submittals
- `notStarted`: Submittals not yet started
- `draft`: Submittals in DRAFT status
- `submitted`: Submittals submitted for review
- `underReview`: Submittals currently under review
- `approved`: Submittals approved
- `approvedAsNoted`: Submittals approved with notes
- `reviseResubmit`: Submittals requiring revision
- `rejected`: Submittals rejected
- `closed`: Submittals closed
- `overdue`: Submittals past their required date

**Approval Metrics**:
- `firstTimeApprovalRate`: Percentage approved without revisions (revision 0)
- `averageRevisionsPerSubmittal`: Mean number of revisions per submittal
- `approvalRate`: Percentage of reviewed submittals approved or approved as noted
- `rejectionRate`: Percentage of reviewed submittals rejected
- `reviseResubmitRate`: Percentage requiring revisions

**Review Time Metrics**:
- `averageDays`: Mean time from submission to first response
- `medianDays`: Median review time
- `distribution`: Bucketed review times

**Lead Time Analysis**:
- `onTrack`: Submittals with >14 days until required date
- `atRisk`: Submittals with 7-14 days until required date
- `late`: Submittals past required date
- `averageDaysToRequired`: Mean days remaining to required date

### Combined Metrics

**Health Score** (0-100):
- **100-80**: GREEN - Project on track
- **79-60**: YELLOW - Minor issues
- **59-40**: ORANGE - Attention needed
- **39-0**: RED - Critical issues

**Calculation**:
1. Start with 100 points
2. RFI overdue rate: -20 points max (20 points per 100% overdue rate)
3. RFI on-time % < 80%: -0.3 per point below 80
4. Submittal overdue rate: -20 points max
5. First-time approval < 70%: -0.2 per point below 70
6. Lead time risk: -2 per at-risk or late submittal

**Risk Level**:
- `LOW`: Health score ≥ 80
- `MEDIUM`: Health score 60-79
- `HIGH`: Health score 40-59
- `CRITICAL`: Health score < 40

---

## Scheduled Tasks

### Daily Snapshots

**Schedule**: Every day at midnight (00:00)
**Cron**: `@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)`

Creates a daily snapshot for all active projects, capturing:
- Current RFI metrics
- Current Submittal metrics
- Health score and risk level
- Top bottlenecks

### Weekly Snapshots

**Schedule**: Every Sunday at midnight
**Cron**: `@Cron('0 0 * * 0')`

Creates a weekly snapshot for all active projects.

### Monthly Snapshots

**Schedule**: First day of each month at midnight
**Cron**: `@Cron('0 0 1 * *')`

Creates a monthly snapshot for all active projects.

### Snapshot Retention

Daily snapshots are automatically deleted after 90 days (configurable). Weekly and monthly snapshots are retained indefinitely.

---

## Usage Examples

### Example 1: Get Current RFI Status

```typescript
import { Injectable } from '@nestjs/common';
import { RfiAnalyticsService } from './rfi-analytics.service';

@Injectable()
export class ProjectReportService {
  constructor(private rfiAnalytics: RfiAnalyticsService) {}

  async getCurrentRfiStatus(projectId: string) {
    const summary = await this.rfiAnalytics.getStatusSummary(projectId, {});

    console.log(`Total RFIs: ${summary.total}`);
    console.log(`Open: ${summary.open}`);
    console.log(`Overdue: ${summary.overdue}`);

    if (summary.overdue > 0) {
      console.warn(`⚠️ ${summary.overdue} RFIs are overdue!`);
    }

    return summary;
  }
}
```

### Example 2: Identify Bottlenecks

```bash
# Get RFI bottlenecks
curl -X GET "http://localhost:3000/api/v1/projects/$PROJECT_ID/analytics/rfis/bottlenecks" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.bottlenecks[] | select(.openItems > 5)'

# Output:
# {
#   "type": "USER",
#   "name": "John Doe",
#   "openItems": 8,
#   "avgDaysOpen": 15.5
# }
```

### Example 3: Create Weekly Status Report

```bash
# Create saved report
curl -X POST "http://localhost:3000/api/v1/projects/$PROJECT_ID/analytics/reports" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weekly Status Report",
    "reportType": "COMBINED_DASHBOARD",
    "configuration": {
      "dateRange": { "relativePeriod": "LAST_7_DAYS" }
    },
    "isScheduled": true,
    "scheduleConfig": {
      "frequency": "WEEKLY",
      "dayOfWeek": 1,
      "time": "08:00",
      "format": "EXCEL",
      "recipients": ["pm@example.com"]
    }
  }'
```

### Example 4: Export Overdue RFIs

```bash
# Export overdue RFIs to Excel
curl -X POST "http://localhost:3000/api/v1/projects/$PROJECT_ID/analytics/export" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "RFI_LIST",
    "format": "EXCEL",
    "filters": {
      "statuses": ["OPEN", "ANSWERED"],
      "isOverdue": true
    }
  }' \
  --output overdue_rfis.xlsx
```

### Example 5: Track Submittal Lead Times

```typescript
async checkSubmittalLeadTimes(projectId: string) {
  const leadTime = await this.submittalAnalytics.getLeadTimeAnalysis(projectId);

  console.log(`✅ On Track: ${leadTime.onTrack}`);
  console.log(`⚠️ At Risk: ${leadTime.atRisk}`);
  console.log(`❌ Late: ${leadTime.late}`);

  if (leadTime.late > 0) {
    // Send alert
    await this.notificationService.sendAlert({
      type: 'SUBMITTAL_LATE',
      count: leadTime.late,
      projectId,
    });
  }
}
```

### Example 6: Compare Monthly Performance

```bash
# Get last 2 monthly snapshots
SNAPSHOTS=$(curl -s "http://localhost:3000/api/v1/projects/$PROJECT_ID/analytics/snapshots/historical?type=MONTHLY&limit=2" \
  -H "Authorization: Bearer $TOKEN")

SNAPSHOT1=$(echo $SNAPSHOTS | jq -r '.[1].id')
SNAPSHOT2=$(echo $SNAPSHOTS | jq -r '.[0].id')

# Compare snapshots
curl -X POST "http://localhost:3000/api/v1/projects/$PROJECT_ID/analytics/snapshots/compare" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"snapshotId1\": \"$SNAPSHOT1\",
    \"snapshotId2\": \"$SNAPSHOT2\"
  }" \
  | jq '.changes'

# Output:
# {
#   "rfiOpenDelta": -3,
#   "rfiClosedDelta": 8,
#   "healthScoreDelta": 5
# }
```

### Example 7: Monitor Contractor Performance

```typescript
async evaluateContractorPerformance(projectId: string, contractorId: string) {
  const analytics = await this.submittalAnalytics.getAnalytics(projectId, {
    companyIds: [contractorId],
  });

  const contractor = analytics.contractorPerformance.find(
    c => c.contractorId === contractorId
  );

  if (!contractor) {
    console.log('No data for this contractor');
    return;
  }

  console.log(`Contractor: ${contractor.contractorName}`);
  console.log(`First-time approval rate: ${contractor.firstTimeApprovalRate}%`);
  console.log(`Average revisions: ${contractor.avgRevisionsPerSubmittal}`);

  if (contractor.firstTimeApprovalRate < 60) {
    console.warn('⚠️ Low first-time approval rate - may need additional review');
  }
}
```

---

## Troubleshooting

### Issue: Snapshots not being created

**Symptoms**: No new snapshots appearing in `analytics_snapshots` table.

**Possible Causes**:
1. Cron jobs not running (NestJS scheduler not initialized)
2. No active projects in database
3. Errors during snapshot creation

**Solutions**:
1. Verify ScheduleModule is imported in AnalyticsModule:
   ```typescript
   imports: [
     TypeOrmModule.forFeature([...]),
     ScheduleModule.forRoot(), // Required for cron jobs
   ],
   ```

2. Check logs for snapshot creation:
   ```bash
   grep "Creating daily analytics snapshots" /var/log/app.log
   ```

3. Manually trigger snapshot creation:
   ```bash
   curl -X POST "http://localhost:3000/api/v1/projects/$PROJECT_ID/analytics/snapshots/create" \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"type": "DAILY"}'
   ```

4. Verify projects are marked as active:
   ```sql
   SELECT id, name, "isActive" FROM projects WHERE "isActive" = true;
   ```

---

### Issue: Analytics queries slow

**Symptoms**: API endpoints taking >2 seconds to respond.

**Possible Causes**:
1. Missing database indexes
2. Large dataset without pagination
3. Inefficient query patterns

**Solutions**:
1. Verify migration created all indexes:
   ```sql
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename IN ('rfis', 'submittals', 'analytics_snapshots');
   ```

2. Add indexes on frequently queried columns:
   ```sql
   CREATE INDEX idx_rfis_project_status_created
   ON rfis ("projectId", status, "createdDate");

   CREATE INDEX idx_submittals_project_status_submitted
   ON submittals ("projectId", status, "submittedDate");
   ```

3. Use pagination for large datasets:
   ```typescript
   const rfis = await this.rfiRepository.find({
     where: { projectId },
     order: { createdDate: 'DESC' },
     take: 100, // Limit results
   });
   ```

4. Consider materialized views for complex calculations:
   ```sql
   CREATE MATERIALIZED VIEW rfi_metrics_daily AS
   SELECT
     "projectId",
     DATE("createdDate") as date,
     COUNT(*) as total,
     COUNT(*) FILTER (WHERE status = 'OPEN') as open_count
   FROM rfis
   GROUP BY "projectId", DATE("createdDate");
   ```

---

### Issue: Health score calculation incorrect

**Symptoms**: Health scores don't match expected values.

**Possible Causes**:
1. Missing data for calculations (null values)
2. Division by zero errors
3. Incorrect weight factors

**Solutions**:
1. Add null checks in calculations:
   ```typescript
   const rfiOverdueRate = rfiAnalytics.statusSummary.overdue /
     Math.max(rfiAnalytics.statusSummary.open, 1); // Prevent division by zero
   ```

2. Log intermediate values:
   ```typescript
   this.logger.debug(`RFI overdue rate: ${rfiOverdueRate}`);
   this.logger.debug(`Submittal approval rate: ${submittalAnalytics.approvalMetrics.firstTimeApprovalRate}`);
   ```

3. Adjust weight factors in `analytics-snapshot.service.ts`:
   ```typescript
   // Current weights:
   // - RFI overdue rate: 20 points max
   // - Submittal overdue rate: 20 points max
   // - Low on-time %: 0.3 per point
   // - Low approval %: 0.2 per point
   // - Lead time risk: 2 per item
   ```

---

### Issue: Export fails with large datasets

**Symptoms**: Export endpoint times out or returns 500 error.

**Possible Causes**:
1. Too many rows to export at once
2. Memory exhaustion
3. Timeout limits

**Solutions**:
1. Add row limits to exports:
   ```typescript
   const MAX_EXPORT_ROWS = 10000;

   if (data.length > MAX_EXPORT_ROWS) {
     throw new BadRequestException(
       `Export too large. Maximum ${MAX_EXPORT_ROWS} rows allowed.`
     );
   }
   ```

2. Stream large exports:
   ```typescript
   const stream = await this.exportService.streamExcel(projectId, filters);
   res.set({
     'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
     'Content-Disposition': 'attachment; filename="export.xlsx"',
   });
   stream.pipe(res);
   ```

3. Increase timeout for export endpoints:
   ```typescript
   @Post('export')
   @ApiOperation({ summary: 'Export analytics data', timeout: 60000 })
   async exportData(...) { }
   ```

---

### Issue: Saved reports not running on schedule

**Symptoms**: Scheduled reports not being generated/sent.

**Note**: Report scheduling is currently a placeholder in the data model. Actual execution requires:

1. **Implement report scheduler service**:
   ```typescript
   @Injectable()
   export class ReportSchedulerService {
     @Cron(CronExpression.EVERY_HOUR)
     async checkScheduledReports() {
       const now = new Date();
       const reports = await this.reportRepository.find({
         where: { isScheduled: true },
       });

       for (const report of reports) {
         if (this.shouldRunNow(report, now)) {
           await this.runAndEmailReport(report);
         }
       }
     }
   }
   ```

2. **Add email service integration**:
   ```typescript
   async runAndEmailReport(report: SavedReport) {
     const data = await this.reportService.runReport(report.id, report.projectId);
     const buffer = await this.exportService.toExcel(data, ...);

     await this.emailService.send({
       to: report.scheduleConfig.recipients,
       subject: `Scheduled Report: ${report.name}`,
       attachments: [{
         filename: `${report.name}.xlsx`,
         content: buffer,
       }],
     });
   }
   ```

---

## Performance Optimization

### Query Optimization Tips

1. **Use selective filters**: Always include `projectId` and date ranges to limit data scanned.

2. **Leverage indexes**: Queries on `projectId`, `status`, `createdDate` are indexed.

3. **Batch operations**: When fetching multiple metrics, use `Promise.all()`:
   ```typescript
   const [summary, responseTime, aging] = await Promise.all([
     this.getStatusSummary(projectId, query),
     this.getResponseTimeMetrics(projectId, startDate, endDate),
     this.getAgingAnalysis(projectId),
   ]);
   ```

4. **Cache snapshot data**: Snapshots are immutable after creation - cache them:
   ```typescript
   @Cacheable({ ttl: 3600 })
   async getHistoricalSnapshots(projectId: string, type: SnapshotType) {
     return this.snapshotRepository.find({ where: { projectId, snapshotType: type } });
   }
   ```

### Database Tuning

1. **Analyze query plans**:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM rfis
   WHERE "projectId" = 'xxx'
   AND status IN ('OPEN', 'ANSWERED')
   ORDER BY "createdDate" DESC;
   ```

2. **Update statistics**:
   ```sql
   ANALYZE rfis;
   ANALYZE submittals;
   ANALYZE analytics_snapshots;
   ```

3. **Vacuum regularly**:
   ```sql
   VACUUM ANALYZE rfis;
   ```

---

## Security Considerations

### Authentication

All analytics endpoints require JWT authentication. Ensure tokens are:
- Properly validated
- Not expired
- Contain valid project access

### Authorization

Implement project-level access control:
```typescript
@UseGuards(JwtAuthGuard, ProjectAccessGuard)
export class AnalyticsController {
  // Endpoints automatically check if user has access to projectId
}
```

### Data Privacy

When exporting data:
1. Audit export actions
2. Redact sensitive fields if needed
3. Limit export frequency per user

---

## Migration Guide

### Running the Migration

```bash
# Generate migration if needed
npm run migration:generate -- -n CreateAnalyticsTables

# Run migration
npm run migration:run

# Verify tables created
psql -d bobthebuilder -c "\dt analytics*"

# Expected output:
#  analytics_snapshots
#  user_performance_metrics
#  saved_reports
```

### Rolling Back

```bash
# Revert migration
npm run migration:revert

# Verify tables dropped
psql -d bobthebuilder -c "\dt analytics*"
```

---

## Testing

### Manual Testing Script

A comprehensive testing script is provided: `/scripts/test-analytics-endpoints.sh`

```bash
# Set environment variables
export API_URL="http://localhost:3000/api/v1"
export PROJECT_ID="a6074e71-6f3f-40c0-a201-1e87b238df81"
export TOKEN="your-jwt-token"

# Run all tests
./scripts/test-analytics-endpoints.sh

# Run specific test
./scripts/test-analytics-endpoints.sh rfi_summary
```

### Unit Testing

Example unit test for RFI analytics:
```typescript
import { Test } from '@nestjs/testing';
import { RfiAnalyticsService } from './rfi-analytics.service';

describe('RfiAnalyticsService', () => {
  let service: RfiAnalyticsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [RfiAnalyticsService, ...],
    }).compile();

    service = module.get(RfiAnalyticsService);
  });

  it('should calculate correct status summary', async () => {
    const result = await service.getStatusSummary('project-id', {});

    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.open + result.closed).toBeLessThanOrEqual(result.total);
  });

  it('should calculate health score between 0-100', async () => {
    const rfiAnalytics = { statusSummary: { open: 10, overdue: 2 } };
    const submittalAnalytics = { statusSummary: { submitted: 15, overdue: 1 } };

    const score = service['calculateHealthScore'](rfiAnalytics, submittalAnalytics);

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
```

---

## Future Enhancements

### Planned Features

1. **Real-time Analytics**: WebSocket support for live updates
2. **Predictive Analytics**: Machine learning for forecasting
3. **Custom Dashboards**: User-configurable dashboard layouts
4. **Advanced Filtering**: Saved filter presets
5. **PDF Reports**: Full PDF export with charts
6. **Mobile Optimization**: Mobile-specific endpoints
7. **Benchmark Comparisons**: Compare against industry averages
8. **Cost Code Integration**: Link to project cost codes
9. **Schedule Integration**: Link to project schedule data
10. **AI Insights**: Automated insights and recommendations

---

## Support

For issues, questions, or feature requests:

- **GitHub**: https://github.com/bobthebuilder/analytics
- **Documentation**: https://docs.bobthebuilder.com/analytics
- **API Status**: https://status.bobthebuilder.com

---

## Changelog

### Version 1.0.0 (2024-01-15)

- Initial release
- 25+ analytics endpoints
- 5 analytics services
- Scheduled snapshot creation
- Multi-format export support
- Saved reports with scheduling
- Health score calculation
- Bottleneck detection
- Lead time tracking
- Contractor performance metrics

---

## License

Copyright © 2024 Bob the Builder. All rights reserved.
