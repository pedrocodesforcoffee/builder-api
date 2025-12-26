# Task 3.6.1.7: Financial Reporting Engine - Implementation Plan

**Status:** 85% Complete → Target: 100% Complete
**Created:** 2025-12-10
**Developer Reference Document**

---

## Executive Summary

This document provides a complete implementation plan for finishing Task 3.6.1.7: Financial Reporting Engine. The task is currently 85% complete with all 16 standard reports implemented. The remaining 15% consists primarily of the Custom Report Builder system, documentation, and testing.

**Estimated Total Effort:** 4-5 days
**Priority:** HIGH (Required for task completion)

---

## Phase 1: Custom Report Builder Infrastructure (Day 1-2)

### 1.1 Create CustomReport Entity

**File:** `src/modules/financials/entities/custom-report.entity.ts`

```typescript
@Entity('custom_reports')
export class CustomReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  @Index()
  projectId: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // JSONB configuration storing CustomReportConfigDto
  @Column({ type: 'jsonb' })
  config: {
    primaryEntity: 'BUDGET' | 'COMMITMENT' | 'COST' | 'PAYAPP' | 'CHANGE_ORDER';
    joins: Array<{
      entity: string;
      alias: string;
      on: string;
      type: 'INNER' | 'LEFT';
    }>;
    columns: Array<{
      field: string;
      label: string;
      dataType: 'STRING' | 'NUMBER' | 'CURRENCY' | 'DATE' | 'PERCENT';
      width: number;
      visible: boolean;
      formula: string | null;
    }>;
    filters: Array<{
      field: string;
      operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'BETWEEN' | 'IN' | 'CONTAINS';
      value: any;
      isParameter: boolean;
    }>;
    groupBy: string[];
    aggregations: Array<{
      field: string;
      function: 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT';
      label: string;
    }>;
    sortBy: Array<{
      field: string;
      direction: 'ASC' | 'DESC';
    }>;
    showTotals: boolean;
    showSubtotals: boolean;
  };

  @Column({ name: 'is_public', type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

**Key Features:**
- JSONB config for flexible report structure
- Project scoping
- Public vs private reports
- Full audit trail

### 1.2 Create ReportExecution Entity

**File:** `src/modules/financials/entities/report-execution.entity.ts`

```typescript
export enum ReportExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum ReportDeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  NOT_REQUIRED = 'NOT_REQUIRED',
}

export enum ReportTriggerType {
  USER = 'USER',
  SCHEDULE = 'SCHEDULE',
}

@Entity('report_executions')
@Index(['projectId', 'reportType'])
@Index(['scheduledReportId'])
@Index(['status'])
@Index(['startedAt'])
export class ReportExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  @Index()
  projectId: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'scheduled_report_id', type: 'uuid', nullable: true })
  scheduledReportId: string;

  @ManyToOne(() => ReportSchedule, { nullable: true })
  @JoinColumn({ name: 'scheduled_report_id' })
  scheduledReport: ReportSchedule;

  @Column({ name: 'report_type', type: 'varchar', length: 100 })
  reportType: string; // ReportType enum or 'CUSTOM'

  @Column({ name: 'custom_report_id', type: 'uuid', nullable: true })
  customReportId: string;

  @ManyToOne(() => CustomReport, { nullable: true })
  @JoinColumn({ name: 'custom_report_id' })
  customReport: CustomReport;

  @Column({ type: 'jsonb', nullable: true })
  parameters: Record<string, any>;

  @Column({ name: 'started_at', type: 'timestamp with time zone' })
  @Index()
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp with time zone', nullable: true })
  completedAt: Date;

  @Column({ type: 'enum', enum: ReportExecutionStatus })
  @Index()
  status: ReportExecutionStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'export_format', type: 'enum', enum: ReportFormat })
  exportFormat: ReportFormat;

  @Column({ name: 'file_url', type: 'varchar', length: 1000, nullable: true })
  fileUrl: string;

  @Column({ name: 'file_size_bytes', type: 'int', nullable: true })
  fileSizeBytes: number;

  @Column({ name: 'recipient_count', type: 'int', default: 0 })
  recipientCount: number;

  @Column({ name: 'delivery_status', type: 'enum', enum: ReportDeliveryStatus, nullable: true })
  deliveryStatus: ReportDeliveryStatus;

  @Column({ name: 'delivery_error', type: 'text', nullable: true })
  deliveryError: string;

  @Column({ name: 'triggered_by_id', type: 'uuid' })
  triggeredById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'triggered_by_id' })
  triggeredBy: User;

  @Column({ name: 'triggered_by_type', type: 'enum', enum: ReportTriggerType })
  triggeredByType: ReportTriggerType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

**Key Features:**
- Complete execution tracking
- File storage metadata
- Delivery status tracking
- Performance metrics (duration)

### 1.3 Create Custom Report DTOs

**Directory:** `src/modules/financials/dto/custom-report/`

**Files to create:**

1. **custom-report-config.dto.ts** - Main configuration
2. **custom-report-column.dto.ts** - Column definitions
3. **custom-report-filter.dto.ts** - Filter specifications
4. **custom-report-aggregation.dto.ts** - Aggregation functions
5. **custom-report-join.dto.ts** - Entity joins
6. **custom-report-sort.dto.ts** - Sorting rules
7. **create-custom-report.dto.ts** - Creation request
8. **update-custom-report.dto.ts** - Update request
9. **custom-report-response.dto.ts** - Response format
10. **custom-report-result.dto.ts** - Execution results
11. **validation-result.dto.ts** - Config validation
12. **custom-report-params.dto.ts** - Runtime parameters

**Example: custom-report-config.dto.ts**

```typescript
import { IsEnum, IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum PrimaryEntity {
  BUDGET = 'BUDGET',
  COMMITMENT = 'COMMITMENT',
  COST = 'COST',
  PAYAPP = 'PAYAPP',
  CHANGE_ORDER = 'CHANGE_ORDER',
}

export class CustomReportConfigDto {
  @IsEnum(PrimaryEntity)
  primaryEntity: PrimaryEntity;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomReportJoinDto)
  joins: CustomReportJoinDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomReportColumnDto)
  columns: CustomReportColumnDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomReportFilterDto)
  filters: CustomReportFilterDto[];

  @IsArray()
  groupBy: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomReportAggregationDto)
  aggregations: CustomReportAggregationDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomReportSortDto)
  sortBy: CustomReportSortDto[];

  @IsBoolean()
  showTotals: boolean;

  @IsBoolean()
  showSubtotals: boolean;
}
```

### 1.4 Implement CustomReportService

**File:** `src/modules/financials/services/custom-report.service.ts`

**Estimated Lines:** ~800-1000

**Key Methods:**

```typescript
@Injectable()
export class CustomReportService {
  constructor(
    @InjectRepository(CustomReport)
    private customReportRepository: Repository<CustomReport>,
    @InjectRepository(Budget)
    private budgetRepository: Repository<Budget>,
    @InjectRepository(Commitment)
    private commitmentRepository: Repository<Commitment>,
    @InjectRepository(CostEntry)
    private costEntryRepository: Repository<CostEntry>,
    @InjectRepository(PaymentApplication)
    private paymentApplicationRepository: Repository<PaymentApplication>,
    private dataSource: DataSource,
    private logger: Logger,
  ) {}

  // CRUD Operations
  async create(projectId: string, dto: CreateCustomReportDto, userId: string): Promise<CustomReport>
  async findAll(projectId: string, query?: CustomReportQueryDto): Promise<[CustomReport[], number]>
  async findOne(id: string, projectId: string): Promise<CustomReport>
  async update(id: string, projectId: string, dto: UpdateCustomReportDto): Promise<CustomReport>
  async delete(id: string, projectId: string): Promise<void>

  // Execution
  async run(id: string, projectId: string, params: CustomReportParamsDto): Promise<CustomReportResultDto>
  async exportToExcel(id: string, projectId: string, params: CustomReportParamsDto): Promise<Buffer>
  async exportToPdf(id: string, projectId: string, params: CustomReportParamsDto): Promise<Buffer>

  // Validation
  async validateConfig(config: CustomReportConfigDto): Promise<ValidationResultDto>

  // Internal methods
  private buildQuery(config: CustomReportConfigDto, params: CustomReportParamsDto): SelectQueryBuilder<any>
  private applyJoins(qb: SelectQueryBuilder<any>, joins: CustomReportJoinDto[]): void
  private applyFilters(qb: SelectQueryBuilder<any>, filters: CustomReportFilterDto[], params: Record<string, any>): void
  private applyGrouping(qb: SelectQueryBuilder<any>, groupBy: string[]): void
  private applyAggregations(qb: SelectQueryBuilder<any>, aggregations: CustomReportAggregationDto[]): void
  private applySorting(qb: SelectQueryBuilder<any>, sortBy: CustomReportSortDto[]): void
  private calculateTotals(data: any[], aggregations: CustomReportAggregationDto[]): Record<string, any>
  private calculateSubtotals(data: any[], groupBy: string[], aggregations: CustomReportAggregationDto[]): any[]
}
```

**Critical Implementation Details:**

1. **Dynamic Query Builder:**
   - Start with primary entity repository
   - Build SelectQueryBuilder dynamically
   - Apply joins based on config
   - Support INNER and LEFT joins

2. **Filter Operators:**
   - EQUALS: `qb.andWhere('field = :value', { value })`
   - NOT_EQUALS: `qb.andWhere('field != :value', { value })`
   - GREATER_THAN: `qb.andWhere('field > :value', { value })`
   - LESS_THAN: `qb.andWhere('field < :value', { value })`
   - BETWEEN: `qb.andWhere('field BETWEEN :min AND :max', { min, max })`
   - IN: `qb.andWhere('field IN (:...values)', { values })`
   - CONTAINS: `qb.andWhere('field ILIKE :value', { value: `%${value}%` })`

3. **Aggregation Functions:**
   - SUM: `qb.addSelect('SUM(field)', 'alias')`
   - AVG: `qb.addSelect('AVG(field)', 'alias')`
   - MIN: `qb.addSelect('MIN(field)', 'alias')`
   - MAX: `qb.addSelect('MAX(field)', 'alias')`
   - COUNT: `qb.addSelect('COUNT(field)', 'alias')`

4. **Security:**
   - Validate all field names against entity metadata
   - Use parameterized queries (prevent SQL injection)
   - Validate joins are allowed
   - Check user has access to project

### 1.5 Implement CustomReportController

**File:** `src/modules/financials/controllers/custom-report.controller.ts`

**Estimated Lines:** ~400-500

**8 Required Endpoints:**

```typescript
@ApiTags('Custom Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/projects/:projectId/reports/custom')
export class CustomReportController {
  constructor(
    private readonly customReportService: CustomReportService,
    private readonly excelExportService: ReportExcelExportService,
    private readonly pdfExportService: ReportPdfExportService,
  ) {}

  @Post()
  async create(@Param('projectId') projectId: string, @Body() dto: CreateCustomReportDto, @CurrentUser() user: any)

  @Get()
  async findAll(@Param('projectId') projectId: string, @Query() query: CustomReportQueryDto)

  @Get(':id')
  async findOne(@Param('projectId') projectId: string, @Param('id') id: string)

  @Put(':id')
  async update(@Param('projectId') projectId: string, @Param('id') id: string, @Body() dto: UpdateCustomReportDto)

  @Delete(':id')
  async delete(@Param('projectId') projectId: string, @Param('id') id: string)

  @Get(':id/run')
  async run(@Param('projectId') projectId: string, @Param('id') id: string, @Query() params: CustomReportParamsDto)

  @Get(':id/export/excel')
  async exportExcel(@Param('projectId') projectId: string, @Param('id') id: string, @Query() params: CustomReportParamsDto)

  @Get(':id/export/pdf')
  async exportPdf(@Param('projectId') projectId: string, @Param('id') id: string, @Query() params: CustomReportParamsDto)
}
```

---

## Phase 2: Additional Features (Day 2)

### 2.1 Add Report Execution History Endpoint

**File:** `src/modules/financials/controllers/report-schedule.controller.ts` (modify existing)

**Add endpoint:**

```typescript
@Get(':id/history')
@ApiOperation({ summary: 'Get execution history for a scheduled report' })
async getHistory(
  @Param('projectId') projectId: string,
  @Param('id') id: string,
  @Query() query: ReportExecutionQueryDto,
): Promise<{ data: ReportExecutionResponseDto[]; total: number }>
```

### 2.2 Add Batch Export Endpoint

**File:** `src/modules/financials/controllers/report.controller.ts` (modify existing)

**Add endpoint:**

```typescript
@Post('export-batch')
@ApiOperation({ summary: 'Export multiple reports to ZIP file' })
async exportBatch(
  @Param('projectId') projectId: string,
  @Body() dto: BatchExportDto,
  @CurrentUser() user: any,
): Promise<StreamableFile>
```

**Implementation:**
- Accept array of report requests (type + parameters)
- Generate each report in requested format
- Create ZIP file with archiver library
- Return ZIP as StreamableFile

### 2.3 Add Metadata Endpoints

**File:** `src/modules/financials/controllers/report.controller.ts` (modify existing)

**Route prefix:** `@Controller('api/v1/reports')` (note: no projectId)

**Add endpoints:**

```typescript
@Get('types')
@ApiOperation({ summary: 'List all available report types with metadata' })
async getReportTypes(): Promise<ReportTypeMetadataDto[]>

@Get('types/:reportType/schema')
@ApiOperation({ summary: 'Get schema and parameters for a report type' })
async getReportSchema(@Param('reportType') reportType: string): Promise<ReportSchemaDto>
```

**ReportTypeMetadataDto:**
```typescript
{
  type: 'BUDGET_DETAIL',
  name: 'Budget Detail Report',
  description: 'Comprehensive budget variance analysis...',
  category: 'BUDGET',
  availableFormats: ['EXCEL', 'PDF'],
  requiredParameters: ['budgetId'],
  optionalParameters: ['asOfDate', 'includeDetails'],
  supportsScheduling: true,
}
```

---

## Phase 3: Documentation (Day 3)

### 3.1 Master Reports Documentation

**File:** `docs/api/financials/reports.md`

**Content:**
- Overview of all 16 report types
- Common parameters (asOfDate, filters, etc.)
- Export formats (Excel vs PDF)
- Authentication requirements
- Rate limiting considerations
- Example workflows

### 3.2 Individual Report Documentation (16 files)

**Template for each report:**

```markdown
# [Report Name] Report

## Overview
Brief description and use case

## Business Logic
### Calculations
- Formula 1: explanation
- Formula 2: explanation

### Data Sources
- Entity 1: fields used
- Entity 2: fields used

## API Endpoint
### Request
```http
POST /api/v1/projects/:projectId/reports/[report-type]
```

### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|

### Response
Example response with all fields documented

### Excel Export
POST /api/v1/projects/:projectId/reports/[report-type]
Returns: .xlsx file

### PDF Export
POST /api/v1/projects/:projectId/reports/[report-type]/pdf
Returns: .pdf file

## Example Use Cases
1. Use case 1
2. Use case 2

## Interpretation Guide
How to read and understand the report

## Related Reports
Links to related reports
```

**Files to create:**
1. `docs/api/financials/reports/budget-detail.md`
2. `docs/api/financials/reports/wip.md`
3. `docs/api/financials/reports/earned-value.md`
4. `docs/api/financials/reports/cash-flow.md`
5. `docs/api/financials/reports/cost-to-complete.md`
6. `docs/api/financials/reports/commitment-list.md`
7. `docs/api/financials/reports/invoice-register.md`
8. `docs/api/financials/reports/executive-summary.md`
9. `docs/api/financials/reports/budget-variance.md`
10. `docs/api/financials/reports/commitment-status.md`
11. `docs/api/financials/reports/payment-history.md`
12. `docs/api/financials/reports/aging.md`
13. `docs/api/financials/reports/change-order-log.md`
14. `docs/api/financials/reports/change-order-summary.md`
15. `docs/api/financials/reports/subcontractor-summary.md`
16. `docs/api/financials/reports/vendor-payments.md`

### 3.3 Custom Reports Documentation

**File:** `docs/api/financials/custom-reports.md`

**Content:**
- Custom Report Builder overview
- Configuration schema explanation
- Available entities and fields
- Filter operators and examples
- Aggregation functions
- Grouping and sorting
- Calculated fields
- Runtime parameters
- Example custom reports
- Best practices
- Limitations

### 3.4 Scheduled Reports Documentation

**File:** `docs/api/financials/scheduled-reports.md`

**Content:**
- Scheduling overview
- Frequency options (daily, weekly, monthly, custom cron)
- Email delivery configuration
- Report parameters
- Execution history
- Troubleshooting failed reports
- Example schedules

### 3.5 Permissions Documentation

**File:** `docs/api/auth/permissions.md` (update existing)

**Add section:**

```markdown
## Financial Reports Permissions

### Standard Reports
- `report:view` - View reports (base permission)
- `report:budget` - Access budget-related reports
- `report:commitment` - Access commitment reports
- `report:invoice` - Access invoice and payment reports
- `report:change-order` - Access change order reports
- `report:vendor` - Access vendor and subcontractor reports
- `report:wip` - Access WIP reports
- `report:cash-flow` - Access cash flow projections
- `report:earned-value` - Access earned value analysis
- `report:executive` - Access executive summary

### Export Permissions
- `report:export-excel` - Export reports to Excel format
- `report:export-pdf` - Export reports to PDF format

### Custom Reports
- `custom-report:view` - View custom reports
- `custom-report:create` - Create custom reports
- `custom-report:edit` - Edit custom reports
- `custom-report:delete` - Delete custom reports
- `custom-report:run` - Execute custom reports

### Scheduled Reports
- `scheduled-report:view` - View scheduled reports
- `scheduled-report:manage` - Create, edit, delete schedules
- `scheduled-report:execute` - Manually trigger scheduled reports
```

---

## Phase 4: Testing (Day 4)

### 4.1 Unit Tests for Phase 3 Report Services (8 files)

**Files to create:**

1. `src/modules/financials/services/budget-variance-report.service.spec.ts`
2. `src/modules/financials/services/commitment-status-report.service.spec.ts`
3. `src/modules/financials/services/payment-history-report.service.spec.ts`
4. `src/modules/financials/services/aging-report.service.spec.ts`
5. `src/modules/financials/services/change-order-log-report.service.spec.ts`
6. `src/modules/financials/services/change-order-summary-report.service.spec.ts`
7. `src/modules/financials/services/subcontractor-summary-report.service.spec.ts`
8. `src/modules/financials/services/vendor-payments-report.service.spec.ts`

**Test Template:**

```typescript
describe('[ReportName]ReportService', () => {
  let service: [ReportName]ReportService;
  let mockRepository: MockRepository<Entity>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        [ReportName]ReportService,
        { provide: getRepositoryToken(Entity), useClass: MockRepository },
      ],
    }).compile();

    service = module.get([ReportName]ReportService);
  });

  describe('generateReport', () => {
    it('should generate report with correct data');
    it('should calculate totals correctly');
    it('should handle empty data gracefully');
    it('should apply filters correctly');
    it('should sort results correctly');
  });

  describe('exportToExcel', () => {
    it('should generate valid Excel buffer');
    it('should format currency correctly');
    it('should format dates correctly');
  });
});
```

**Minimum 5 tests per service = 40 tests**

### 4.2 Support Services Tests (4 files)

**Files to create:**

1. **report-pdf-export.service.spec.ts**
   - Test PDF generation for each report type
   - Test formatting and layout
   - Test page breaks
   - Test headers and footers
   - Minimum 10 tests

2. **report-schedule.service.spec.ts**
   - Test CRUD operations
   - Test schedule activation/deactivation
   - Test manual execution
   - Test next run calculation
   - Minimum 10 tests

3. **report-schedule-queue.processor.spec.ts**
   - Test job processing
   - Test error handling
   - Test retry logic
   - Minimum 5 tests

4. **report-email.service.spec.ts**
   - Test email sending
   - Test attachment handling
   - Test recipient parsing
   - Test template rendering
   - Minimum 5 tests

### 4.3 Custom Report Service Tests

**File:** `src/modules/financials/services/custom-report.service.spec.ts`

**Minimum 20 tests:**
- CRUD operations (5 tests)
- Query builder (5 tests)
- Filter operators (8 tests)
- Aggregations (3 tests)
- Validation (5 tests)
- Export (2 tests)

### 4.4 E2E Tests

**File:** `test/financials/reports.e2e-spec.ts`

**Test Structure:**

```typescript
describe('Financial Reports (e2e)', () => {
  describe('Standard Reports', () => {
    describe('Budget Detail Report', () => {
      it('POST /reports/budget-detail should generate Excel report');
      it('POST /reports/budget-detail/pdf should generate PDF report');
      it('should require authentication');
      it('should validate project access');
      it('should handle missing budget gracefully');
    });
    // Repeat for all 16 report types
  });

  describe('Custom Reports', () => {
    it('POST /reports/custom should create custom report');
    it('GET /reports/custom/:id/run should execute custom report');
    it('should validate config on creation');
    it('should prevent SQL injection');
  });

  describe('Scheduled Reports', () => {
    it('POST /report-schedules should create schedule');
    it('POST /report-schedules/:id/execute should trigger execution');
    it('GET /report-schedules/:id/history should return executions');
  });

  describe('Batch Export', () => {
    it('POST /reports/export-batch should return ZIP file');
    it('should include all requested reports in ZIP');
  });

  describe('Metadata', () => {
    it('GET /reports/types should return all report types');
    it('GET /reports/types/:type/schema should return schema');
  });
});
```

**Minimum 50 E2E tests**

---

## Phase 5: Integration & Finalization (Day 5)

### 5.1 Update FinancialsModule

**File:** `src/modules/financials/financials.module.ts`

**Changes:**
1. Add CustomReport and ReportExecution to TypeOrmModule.forFeature()
2. Add CustomReportService to providers and exports
3. Add CustomReportController to controllers
4. Ensure all DTOs are properly imported

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([
      // ... existing entities ...
      CustomReport,
      ReportExecution,
    ]),
    BullModule.registerQueue({
      name: 'report-schedule',
    }),
  ],
  controllers: [
    // ... existing controllers ...
    CustomReportController,
  ],
  providers: [
    // ... existing services ...
    CustomReportService,
  ],
  exports: [
    // ... existing exports ...
    CustomReportService,
  ],
})
export class FinancialsModule {}
```

### 5.2 Update entities/index.ts

**File:** `src/modules/financials/entities/index.ts`

**Add exports:**
```typescript
export * from './custom-report.entity';
export * from './report-execution.entity';
```

### 5.3 Update services/index.ts

**File:** `src/modules/financials/services/index.ts`

**Add export:**
```typescript
export * from './custom-report.service';
```

### 5.4 Create Database Migration

**File:** `src/database/migrations/[timestamp]-add-custom-reports.ts`

**Tables to create:**
1. `custom_reports` table
2. `report_executions` table

**Indexes to create:**
- custom_reports: projectId, createdById
- report_executions: projectId, reportType, scheduledReportId, status, startedAt

### 5.5 Update CHANGELOG.md

**File:** `CHANGELOG.md`

**Add comprehensive entry:**

```markdown
### Added - Financial Reporting Engine - Phase 4: Custom Report Builder

#### Custom Report Builder System
- **CustomReport Entity** - Flexible report definition storage
  - JSONB configuration for dynamic report structure
  - Support for 5 primary entities: Budget, Commitment, CostEntry, PaymentApplication, ChangeOrder
  - Public/private report sharing
  - Version control with created/updated timestamps

- **CustomReportService** (800+ lines) - Dynamic query builder
  - Query construction based on JSON configuration
  - Support for complex joins (INNER, LEFT)
  - 8 filter operators: EQUALS, NOT_EQUALS, GREATER_THAN, LESS_THAN, BETWEEN, IN, CONTAINS
  - 5 aggregation functions: SUM, AVG, MIN, MAX, COUNT
  - Grouping with subtotals
  - Runtime parameters for flexible execution
  - SQL injection protection via parameterized queries
  - Configuration validation with detailed error messages

- **CustomReportController** (8 endpoints)
  - `POST /api/v1/projects/:projectId/reports/custom` - Create custom report
  - `GET /api/v1/projects/:projectId/reports/custom` - List custom reports
  - `GET /api/v1/projects/:projectId/reports/custom/:id` - Get custom report
  - `PUT /api/v1/projects/:projectId/reports/custom/:id` - Update custom report
  - `DELETE /api/v1/projects/:projectId/reports/custom/:id` - Delete custom report
  - `GET /api/v1/projects/:projectId/reports/custom/:id/run` - Execute custom report
  - `GET /api/v1/projects/:projectId/reports/custom/:id/export/excel` - Export to Excel
  - `GET /api/v1/projects/:projectId/reports/custom/:id/export/pdf` - Export to PDF

- **Custom Report DTOs** (12 DTOs)
  - CustomReportConfigDto - Main configuration structure
  - CustomReportColumnDto - Column definitions with data types
  - CustomReportFilterDto - Filter specifications with operators
  - CustomReportAggregationDto - Aggregation functions
  - CustomReportJoinDto - Entity relationship definitions
  - CustomReportSortDto - Sorting rules
  - CreateCustomReportDto, UpdateCustomReportDto - CRUD operations
  - CustomReportResponseDto - API responses
  - CustomReportResultDto - Execution results
  - ValidationResultDto - Configuration validation
  - CustomReportParamsDto - Runtime parameters

#### Report Execution Tracking
- **ReportExecution Entity** - Complete execution audit trail
  - Tracks all report generations (scheduled and manual)
  - File storage metadata (URL, size)
  - Email delivery status and error tracking
  - Performance metrics (start, completion, duration)
  - User or system triggered tracking

- **Execution History Endpoint**
  - `GET /api/v1/projects/:projectId/report-schedules/:id/history` - View execution history

#### Additional Features
- **Batch Export**
  - `POST /api/v1/projects/:projectId/reports/export-batch` - Export multiple reports to ZIP

- **Report Metadata Endpoints**
  - `GET /api/v1/reports/types` - List all available report types
  - `GET /api/v1/reports/types/:reportType/schema` - Get report schema

#### Documentation (20+ files)
- Master reports documentation (`docs/api/financials/reports.md`)
- Individual report documentation (16 files, one per report type)
  - Budget Detail, WIP, Cost to Complete, Commitment List
  - Earned Value Analysis, Cash Flow Projection, Invoice Register, Executive Summary
  - Budget Variance, Commitment Status, Payment History, Aging
  - Change Order Log, Change Order Summary, Subcontractor Summary, Vendor Payments
  - Each document includes: calculations, data sources, parameters, examples, interpretation guide
- Custom Report Builder documentation (`docs/api/financials/custom-reports.md`)
- Scheduled Reports documentation (`docs/api/financials/scheduled-reports.md`)
- RBAC permissions documentation update (`docs/api/auth/permissions.md`)

#### Testing
- **Unit Tests** (13 new test files, 150+ tests)
  - Phase 3 report services (8 services × 5 tests = 40 tests)
  - Custom report service (20 tests)
  - Report PDF export service (10 tests)
  - Report schedule service (10 tests)
  - Report schedule queue processor (5 tests)
  - Report email service (5 tests)

- **E2E Tests** (1 file, 50+ tests)
  - All 16 standard reports (Excel + PDF)
  - Custom report CRUD and execution
  - Scheduled reports
  - Batch export
  - Metadata endpoints

#### Summary
- **Total Implementation**: ~5,000 lines of new code
- **API Endpoints**: 11 new endpoints (8 custom reports + 3 additional)
- **Documentation**: 20+ documentation files
- **Test Coverage**: 200+ tests (150 unit + 50 E2E)
- **Completion**: Task 3.6.1.7 - 100% complete

Part of Epic 3.6 - Financial Management System
```

---

## Implementation Checklist

### Phase 1: Custom Report Builder (Day 1-2)
- [ ] Create CustomReport entity
- [ ] Create ReportExecution entity
- [ ] Create 12 Custom Report DTOs
- [ ] Implement CustomReportService (~800 lines)
- [ ] Implement CustomReportController (~400 lines)
- [ ] Update entities/index.ts
- [ ] Update services/index.ts

### Phase 2: Additional Features (Day 2)
- [ ] Add execution history endpoint
- [ ] Add batch export endpoint
- [ ] Add report types metadata endpoint
- [ ] Add report schema endpoint
- [ ] Create BatchExportDto
- [ ] Create ReportTypeMetadataDto
- [ ] Create ReportSchemaDto

### Phase 3: Documentation (Day 3)
- [ ] Create master reports.md
- [ ] Create 16 individual report docs
- [ ] Create custom-reports.md
- [ ] Create scheduled-reports.md
- [ ] Update permissions.md

### Phase 4: Testing (Day 4)
- [ ] Unit tests for 8 Phase 3 report services
- [ ] Unit test for PDF export service
- [ ] Unit test for schedule service
- [ ] Unit test for queue processor
- [ ] Unit test for email service
- [ ] Unit test for custom report service
- [ ] E2E tests (50+ tests)

### Phase 5: Integration (Day 5)
- [ ] Update FinancialsModule
- [ ] Create database migration
- [ ] Update CHANGELOG.md
- [ ] Run all tests (npm test)
- [ ] Build project (npm run build)
- [ ] Verify TypeScript compilation
- [ ] Manual testing of key features

---

## Technical Notes

### SQL Injection Prevention

Always use parameterized queries:

```typescript
// GOOD - Parameterized
qb.andWhere('field = :value', { value: userInput });

// BAD - String concatenation
qb.andWhere(`field = '${userInput}'`); // NEVER DO THIS
```

### Performance Considerations

1. **Large Datasets:**
   - Use pagination for list endpoints
   - Add indexes on frequently filtered columns
   - Consider streaming for very large reports

2. **Report Generation:**
   - Generate reports asynchronously for scheduled reports
   - Cache report results if appropriate
   - Monitor memory usage for large Excel files

3. **Query Optimization:**
   - Limit joins to necessary relationships
   - Use `select()` to fetch only required fields
   - Add database indexes for common filter fields

### Error Handling

All services should handle:
- Invalid parameters (throw BadRequestException)
- Missing data (throw NotFoundException)
- Permission errors (throw ForbiddenException)
- Database errors (log and throw InternalServerErrorException)

### Logging

Add comprehensive logging:
```typescript
this.logger.log(`Generating custom report ${reportId} for project ${projectId}`);
this.logger.debug(`Query: ${qb.getSql()}`);
this.logger.error(`Report generation failed: ${error.message}`, error.stack);
```

---

## Success Criteria

Task 3.6.1.7 is considered complete when:

### Functional
- [x] All 16 standard reports generate correctly
- [ ] Custom Report Builder creates and executes reports
- [ ] All export formats (Excel, PDF) work
- [ ] Scheduled reports execute and deliver via email
- [ ] Report execution history is tracked
- [ ] Batch export generates ZIP files
- [ ] Metadata endpoints return correct data

### Technical
- [ ] All TypeScript compiles without errors
- [ ] All unit tests pass (≥80% coverage)
- [ ] All E2E tests pass
- [ ] Database migrations run successfully
- [ ] Module properly registered

### Documentation
- [ ] All 20+ documentation files created
- [ ] All endpoints documented with examples
- [ ] All calculations documented with formulas
- [ ] Permissions documented
- [ ] CHANGELOG.md updated

### Testing
- [ ] 150+ unit tests passing
- [ ] 50+ E2E tests passing
- [ ] Manual testing completed
- [ ] Performance tested with large datasets

---

## Risk Assessment

### High Risk
1. **Custom Report Query Builder** - Complex dynamic SQL generation
   - Mitigation: Extensive testing, SQL injection prevention
2. **Performance with Large Datasets** - Reports could be slow
   - Mitigation: Pagination, indexes, query optimization

### Medium Risk
1. **PDF Generation Quality** - Formatting issues
   - Mitigation: Use established libraries, test thoroughly
2. **Email Delivery Reliability** - Email service failures
   - Mitigation: Retry logic, error tracking

### Low Risk
1. **Documentation Completeness** - Time-consuming but straightforward
2. **Test Coverage** - Following established patterns

---

## Estimated Timeline

**Total: 4-5 days (32-40 hours)**

| Phase | Task | Hours |
|-------|------|-------|
| 1 | Custom Report entities | 2 |
| 1 | Custom Report DTOs | 3 |
| 1 | CustomReportService | 8 |
| 1 | CustomReportController | 3 |
| 2 | Additional features | 4 |
| 3 | Documentation (20+ files) | 8 |
| 4 | Unit tests | 6 |
| 4 | E2E tests | 4 |
| 5 | Integration & testing | 4 |
| **Total** | | **42 hours** |

---

## Completion Verification

After implementation, verify:

```bash
# 1. TypeScript compilation
npm run build

# 2. All tests pass
npm test

# 3. E2E tests pass
npm run test:e2e

# 4. Lint checks
npm run lint

# 5. Manual verification
# - Create a custom report
# - Execute it
# - Export to Excel
# - Export to PDF
# - Schedule a report
# - View execution history
# - Test batch export
# - Check metadata endpoints
```

---

## Conclusion

This implementation plan provides a complete roadmap for finishing Task 3.6.1.7. The primary focus is the Custom Report Builder, which represents the majority of remaining work. All other components build upon the existing, well-architected foundation.

**Key Success Factor:** Follow the established patterns in the codebase. The existing report services provide excellent examples for structure, error handling, and testing approaches.

**Next Steps:** Begin with Phase 1 (Custom Report Builder infrastructure) as it's the foundation for everything else.
