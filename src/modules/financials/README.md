# Financials Module

## Overview

The Financials Module provides comprehensive financial management functionality for construction projects, including cost tracking, budgeting, contracts, and commitments management. It follows CSI MasterFormat standards for cost code organization.

## Features

- **Cost Code Management**: Hierarchical cost code structure compatible with CSI MasterFormat (Divisions 0-50)
- **Budget Tracking**: Project budgets with line items mapped to cost codes
- **Prime Contracts**: Owner contract management with retention tracking
- **Commitments**: Subcontract and purchase order management
- **Status Workflows**: Complete lifecycle management for all entities
- **Data Integrity**: Comprehensive validation and business rules

## Module Structure

```
financials/
├── entities/           # TypeORM entities
│   ├── cost-code.entity.ts
│   ├── budget.entity.ts
│   ├── budget-line-item.entity.ts
│   ├── prime-contract.entity.ts
│   ├── commitment.entity.ts
│   ├── commitment-item.entity.ts
│   ├── __tests__/     # Entity unit tests
│   └── index.ts       # Barrel export
├── dto/               # Data Transfer Objects
│   ├── create-*.dto.ts
│   ├── update-*.dto.ts
│   ├── *-response.dto.ts
│   └── index.ts
├── enums/            # Enumerations
│   ├── budget-category.enum.ts
│   ├── budget-status.enum.ts
│   ├── prime-contract-status.enum.ts
│   ├── commitment-type.enum.ts
│   ├── commitment-status.enum.ts
│   └── index.ts
├── services/         # Business logic services
│   ├── cost-code.service.ts
│   ├── budget.service.ts
│   ├── budget-line-item.service.ts
│   ├── budget-audit.service.ts
│   ├── budget-calculation.service.ts
│   ├── budget-import.service.ts
│   ├── budget-export.service.ts
│   ├── prime-contract.service.ts
│   ├── commitment.service.ts
│   ├── commitment-item.service.ts
│   └── index.ts
├── controllers/      # REST API controllers
│   ├── budget.controller.ts
│   ├── budget-line-item.controller.ts
│   ├── cost-code.controller.ts
│   └── index.ts
└── financials.module.ts
```

## Entities

### CostCode
Hierarchical cost code structure following CSI MasterFormat.

**Fields:**
- `code`: Code segment (e.g., "01", "01.01")
- `description`: Human-readable description
- `fullCode`: Auto-generated full path (e.g., "01.01.100")
- `division`: CSI division number (0-50)
- `parentId`: Parent cost code for hierarchy
- `projectId`: Optional - null for templates, set for project-specific codes
- `isActive`: Soft delete flag
- `sortOrder`: Display order

**Relationships:**
- `project`: ManyToOne with Project (optional)
- `parent`: ManyToOne with CostCode (self-referencing)
- `children`: OneToMany with CostCode

### Budget
Project budget container with line items.

**Fields:**
- `projectId`: Associated project
- `name`: Budget name (e.g., "Original Budget")
- `description`: Optional description
- `status`: BudgetStatus (DRAFT, ACTIVE, LOCKED, ARCHIVED)
- `totalBudget`: Calculated sum of line items
- `createdById`: User who created the budget

**Status Workflow:**
- DRAFT → ACTIVE
- ACTIVE → LOCKED or ARCHIVED
- LOCKED → ACTIVE or ARCHIVED
- ARCHIVED → (no transitions)

**Relationships:**
- `project`: ManyToOne with Project
- `createdBy`: ManyToOne with User
- `lineItems`: OneToMany with BudgetLineItem

### BudgetLineItem
Individual budget line item mapped to cost code.

**Fields:**
- `budgetId`: Parent budget
- `costCodeId`: Associated cost code
- `category`: BudgetCategory (LABOR, MATERIAL, EQUIPMENT, SUBCONTRACT, OTHER)
- `description`: Optional line item description
- `quantity`: Optional quantity (4 decimal places)
- `unitCost`: Optional unit cost (4 decimal places)
- `budgetedCost`: Total budgeted amount (2 decimal places) - **required**

**Auto-Calculation:**
If quantity and unitCost are provided without budgetedCost, it will auto-calculate: `budgetedCost = quantity × unitCost`

**Relationships:**
- `budget`: ManyToOne with Budget
- `costCode`: ManyToOne with CostCode

### PrimeContract
Owner contract (prime contract) for the project.

**Fields:**
- `projectId`: Associated project
- `number`: Contract number (unique per project)
- `title`: Contract title
- `description`: Optional description
- `originalAmount`: Original contract amount
- `currentAmount`: Current contract amount (after change orders)
- `retentionPercentage`: Retention % (0-100)
- `startDate`: Optional contract start date
- `endDate`: Optional contract end date
- `completionDate`: Optional actual completion date
- `status`: PrimeContractStatus (DRAFT, ACTIVE, COMPLETE, CLOSED)

**Status Workflow:**
- DRAFT → ACTIVE
- ACTIVE → COMPLETE
- COMPLETE → CLOSED

**Relationships:**
- `project`: ManyToOne with Project

### Commitment
Subcontract or purchase order.

**Fields:**
- `projectId`: Associated project
- `number`: Commitment number (unique per project)
- `type`: CommitmentType (SUBCONTRACT, PURCHASE_ORDER)
- `vendorName`: Vendor/subcontractor name
- `vendorContact`: Optional contact person
- `vendorEmail`: Optional vendor email
- `title`: Commitment title
- `description`: Optional description
- `originalAmount`: Original commitment amount
- `currentAmount`: Current amount (sum of line items)
- `startDate`: Optional start date
- `endDate`: Optional end date
- `completionDate`: Optional actual completion date
- `status`: CommitmentStatus (DRAFT, PENDING_APPROVAL, APPROVED, ACTIVE, COMPLETE, CLOSED, VOID)

**Status Workflow:**
- DRAFT → PENDING_APPROVAL
- PENDING_APPROVAL → APPROVED, DRAFT, or VOID
- APPROVED → ACTIVE, DRAFT, or VOID
- ACTIVE → COMPLETE or DRAFT
- COMPLETE → CLOSED or ACTIVE
- CLOSED/VOID → (no transitions)

**Relationships:**
- `project`: ManyToOne with Project
- `items`: OneToMany with CommitmentItem

### CommitmentItem
Line item within a commitment.

**Fields:**
- `commitmentId`: Parent commitment
- `costCodeId`: Associated cost code
- `category`: BudgetCategory
- `description`: Optional description
- `quantity`: Optional quantity (4 decimal places)
- `unitCost`: Optional unit cost (4 decimal places)
- `amount`: Total amount (2 decimal places) - **required**

**Relationships:**
- `commitment`: ManyToOne with Commitment
- `costCode`: ManyToOne with CostCode

## Services

All services follow consistent patterns:

### CostCodeService
- `create(createDto)`: Create new cost code
- `findAll(projectId?, division?, isActive?, parentId?)`: List cost codes
- `findOne(id)`: Get cost code by ID
- `findByFullCode(fullCode, projectId?)`: Get by full code
- `getTree(projectId?, isActive?)`: Get hierarchical tree
- `update(id, updateDto)`: Update cost code
- `deactivate(id)`: Soft delete (set isActive = false)
- `activate(id)`: Reactivate cost code
- `remove(id)`: Hard delete (if no children)

**Security Notes:**
- Validates project existence before creating project-specific codes
- Prevents circular references in parent-child relationships
- Cannot delete codes with children

### BudgetService
- `create(createDto, userId)`: Create new budget
- `findAll(projectId?, status?)`: List budgets
- `findOne(id, includeLineItems?)`: Get budget by ID
- `update(id, updateDto)`: Update budget
- `updateStatus(id, status)`: Change budget status
- `recalculateTotal(id)`: Recalculate total from line items
- `remove(id)`: Delete budget (if not ACTIVE/LOCKED)

**Security Notes:**
- Validates project and user existence
- Enforces status transition rules
- Cannot delete active or locked budgets

### BudgetLineItemService
- `create(createDto)`: Create line item
- `findAll(budgetId?, costCodeId?)`: List line items
- `findOne(id)`: Get line item by ID
- `update(id, updateDto)`: Update line item
- `remove(id)`: Delete line item

**Security Notes:**
- Validates budget and cost code existence
- Prevents edits to locked/archived budgets
- Auto-recalculates parent budget total

### PrimeContractService
- `create(createDto)`: Create prime contract
- `findAll(projectId?, status?)`: List contracts
- `findOne(id)`: Get contract by ID
- `findByNumber(projectId, number)`: Get by contract number
- `update(id, updateDto)`: Update contract
- `updateStatus(id, status)`: Change contract status
- `remove(id)`: Delete contract (if DRAFT only)

**Security Notes:**
- Validates project existence and contract number uniqueness
- Validates retention percentage (0-100)
- Enforces status workflow
- Cannot delete active/complete/closed contracts

### CommitmentService
- `create(createDto)`: Create commitment
- `findAll(projectId?, type?, status?)`: List commitments
- `findOne(id, includeItems?)`: Get commitment by ID
- `findByNumber(projectId, number)`: Get by commitment number
- `update(id, updateDto)`: Update commitment
- `updateStatus(id, status)`: Change commitment status
- `recalculateTotal(id)`: Recalculate from line items
- `remove(id)`: Delete commitment (if DRAFT only)

**Security Notes:**
- Validates project existence and commitment number uniqueness
- Enforces complex status workflow
- Cannot update/delete closed or void commitments
- Auto-recalculates commitment total

### CommitmentItemService
- `create(createDto)`: Create commitment item
- `findAll(commitmentId?, costCodeId?)`: List commitment items
- `findOne(id)`: Get item by ID
- `update(id, updateDto)`: Update item
- `remove(id)`: Delete item

**Security Notes:**
- Validates commitment and cost code existence
- Prevents edits to closed/void commitments
- Auto-recalculates parent commitment total

### BudgetAuditService
Complete audit logging for all budget modifications.

- `logChange(budgetId, userId, changeType, beforeState, afterState, metadata?)`: Log budget change
- `getAuditLog(budgetId, userId?, changeType?, startDate?, endDate?)`: Query audit logs
- `getRecentChanges(budgetId, limit?)`: Get recent changes (default 50)
- `getUserActivity(userId, startDate?, endDate?)`: Track user activity

**Change Types:**
- `CREATED`, `UPDATED`, `DELETED`, `STATUS_CHANGED`, `LINE_ITEM_ADDED`, `LINE_ITEM_UPDATED`, `LINE_ITEM_DELETED`, `LOCKED`, `UNLOCKED`, `ACTIVATED`, `REVISION_CREATED`, `IMPORTED`, `EXPORTED`

**Captured Data:**
- Full before/after state snapshots as JSON
- User ID and timestamp
- Optional metadata (e.g., reason for lock)
- Change type categorization

### BudgetCalculationService
Advanced calculation engine and analytics for budgets.

- `calculateBudgetTotal(budgetId)`: Calculate total budgeted cost (sum of all line items)
- `getBudgetByCategory(budgetId)`: Breakdown by category (LABOR, MATERIAL, EQUIPMENT, SUBCONTRACT, OTHER)
- `getBudgetByCostCode(budgetId)`: Breakdown by cost code with totals and line item counts
- `getBudgetSummary(budgetId)`: Comprehensive summary with top cost codes and category breakdown
- `recalculateAndUpdateBudgetTotal(budgetId)`: Recalculate and persist total to database
- `validateLineItemCalculation(lineItem)`: Validate quantity × unitCost = budgetedCost
- `compareBudgets(budget1Id, budget2Id)`: Compare two budgets with differences and percentage changes

**Analytics Features:**
- Category-level aggregation with percentages
- Cost code ranking by total budgeted amount
- Top 5 cost codes by percentage of total
- Budget-to-budget comparison with variance analysis
- Line item calculation validation

### BudgetImportService
Import budgets from Excel/CSV files with comprehensive validation.

- `importFromExcel(fileBuffer, projectId, budgetName, userId)`: Import from Excel (.xlsx)
- `importFromCSV(fileBuffer, projectId, budgetName, userId)`: Import from CSV (.csv)

**Features:**
- Flexible column mapping (supports variations like "Cost Code"/"CostCode"/"Code")
- Cost code validation and lookup by code
- Category enum validation
- Numeric validation for quantity, unit cost, budgeted cost
- Transaction-based import with automatic rollback on error
- Detailed error and warning reporting
- Auto-calculation support (quantity × unitCost)

**Expected Columns:**
- Cost Code (required) - matches against `code` or `fullCode`
- Category (required) - LABOR, MATERIAL, EQUIPMENT, SUBCONTRACT, OTHER
- Description (optional)
- Quantity (optional, 4 decimal places)
- Unit Cost (optional, 4 decimal places)
- Budgeted Cost (required if quantity/unit cost not provided, 2 decimal places)

**Error Handling:**
- Row-level error collection with line numbers
- Warnings for non-critical issues
- All-or-nothing transaction (rollback on any error)
- Returns detailed import result with counts and messages

### BudgetExportService
Export budgets to Excel/CSV formats with formatting.

- `exportToExcel(budgetId, includeSummary?)`: Export to Excel workbook
- `exportToCSV(budgetId)`: Export to CSV file

**Excel Export Features:**
- Two-sheet workbook (Summary + Detail)
- Summary sheet with category breakdown and totals
- Detail sheet with all line items
- Professional formatting with bold headers
- Column auto-sizing
- Frozen header rows

**CSV Export Features:**
- Standard CSV format with headers
- Proper escaping of quotes and commas
- Compatible with Excel and Google Sheets

**Export Columns:**
- Cost Code
- Cost Code Description
- Category
- Line Item Description
- Quantity
- Unit Cost
- Budgeted Cost

## Usage Examples

### Create a Cost Code Hierarchy

```typescript
// Create root-level division
const division01 = await costCodeService.create({
  code: '01',
  description: 'General Requirements',
  division: 1,
  projectId: null, // Template code
  isActive: true,
  sortOrder: 0,
});

// Create subdivision
const subdivision = await costCodeService.create({
  code: '01.01',
  description: 'Submittals',
  division: 1,
  parentId: division01.id,
  projectId: null,
  isActive: true,
  sortOrder: 0,
});
```

### Create a Budget with Line Items

```typescript
// Create budget
const budget = await budgetService.create(
  {
    projectId: 'project-uuid',
    name: 'Original Budget',
    description: 'Initial project budget',
    status: BudgetStatus.DRAFT,
  },
  'user-uuid'
);

// Add line items
await budgetLineItemService.create({
  budgetId: budget.id,
  costCodeId: 'cost-code-uuid',
  category: BudgetCategory.LABOR,
  description: 'Framing labor',
  quantity: 100,
  unitCost: 50.25,
  budgetedCost: 5025.00, // Or auto-calculated if omitted
});

// Budget total is automatically recalculated
```

### Create a Commitment with Items

```typescript
// Create commitment
const commitment = await commitmentService.create({
  projectId: 'project-uuid',
  number: 'SC-001',
  type: CommitmentType.SUBCONTRACT,
  vendorName: 'ABC Contractors',
  vendorEmail: 'contact@abc.com',
  title: 'Concrete Subcontract',
  originalAmount: 50000.00,
  status: CommitmentStatus.DRAFT,
});

// Add line items
await commitmentItemService.create({
  commitmentId: commitment.id,
  costCodeId: 'cost-code-uuid',
  category: BudgetCategory.SUBCONTRACT,
  description: 'Foundation work',
  amount: 25000.00,
});

// Commitment currentAmount is automatically recalculated
```

## Data Validation

All DTOs use class-validator decorators for input validation:

- **UUID validation**: All ID fields
- **String length**: MaxLength decorators on text fields
- **Numeric validation**: Min/Max decorators with decimal precision
- **Enum validation**: Restricted to defined enum values
- **Email validation**: On vendor email fields
- **Date validation**: ISO date string format

## Status Workflows

### Budget Status
```
DRAFT ──> ACTIVE ──> LOCKED ──> ARCHIVED
                 └──> ARCHIVED
```

### Prime Contract Status
```
DRAFT ──> ACTIVE ──> COMPLETE ──> CLOSED
```

### Commitment Status
```
DRAFT ──> PENDING_APPROVAL ──> APPROVED ──> ACTIVE ──> COMPLETE ──> CLOSED
  │              │                  │           │           │
  │              ├──> DRAFT         ├──> DRAFT  └──> DRAFT │
  │              └──> VOID          └──> VOID              │
  │                                                         │
  └─────────────────────────────────────────────────────> VOID
```

## Security Considerations

### Current Implementation

✅ **Input Validation**: All DTOs use class-validator for validation
✅ **SQL Injection Prevention**: TypeORM QueryBuilder with parameterized queries
✅ **Type Safety**: Full TypeScript typing throughout
✅ **Business Logic Validation**: Status workflows, uniqueness checks
✅ **Data Integrity**: Foreign key constraints and cascade rules

### Recommended Enhancements

⚠️ **Authorization Required**: Services currently lack authorization checks
⚠️ **Audit Logging**: Consider adding audit trail for financial changes
⚠️ **Rate Limiting**: Should be implemented at controller/API layer
⚠️ **Data Access Control**: Add project-level permissions
⚠️ **Sensitive Data**: Ensure no financial data in logs

### Authorization Recommendations

When implementing controllers, add:

1. **Project Access Control**
   ```typescript
   // Check user has access to project before operations
   if (!(await authService.canAccessProject(userId, projectId))) {
     throw new ForbiddenException('No access to project');
   }
   ```

2. **Role-Based Permissions**
   ```typescript
   // Different roles for read vs. write operations
   @Roles(ProjectRole.PROJECT_ADMIN, ProjectRole.PROJECT_MANAGER)
   @UseGuards(AuthGuard, RolesGuard, ProjectAccessGuard)
   ```

3. **Financial Data Sensitivity**
   ```typescript
   // Restrict budget/contract access to authorized roles
   @Roles(ProjectRole.PROJECT_ADMIN, ProjectRole.FINANCIAL_CONTROLLER)
   ```

4. **IDOR Prevention**
   - Always validate that the resource belongs to a project the user can access
   - Never trust client-provided IDs without validation
   - Use project context in all queries

## Testing Strategy

### Completed Tests

**Entity Unit Tests** (`entities/__tests__/`):
- ✅ `cost-code.entity.spec.ts` (74 tests)
- ✅ `budget.entity.spec.ts` (65 tests)
- ✅ `budget-line-item.entity.spec.ts` (66 tests)
- ✅ `prime-contract.entity.spec.ts` (67 tests)
- ✅ `commitment.entity.spec.ts` (70 tests)
- ✅ `commitment-item.entity.spec.ts` (59 tests)

**Total: 401 entity unit tests** covering creation, validation, relationships, and business logic.

### Recommended Testing Approach

**Service Unit Tests** (Recommended for services):
- Mock TypeORM repositories using Jest mocks
- Test business logic in isolation
- Cover error handling and edge cases
- Example test structure:
  ```typescript
  describe('BudgetService', () => {
    let service: BudgetService;
    let mockBudgetRepo: MockType<Repository<Budget>>;
    let mockAuditService: MockType<BudgetAuditService>;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          BudgetService,
          { provide: getRepositoryToken(Budget), useFactory: repositoryMockFactory },
          { provide: BudgetAuditService, useFactory: jest.fn() },
        ],
      }).compile();

      service = module.get(BudgetService);
      mockBudgetRepo = module.get(getRepositoryToken(Budget));
    });

    it('should create budget and log audit', async () => {
      // Test implementation
    });
  });
  ```

**Controller Unit Tests** (Recommended for controllers):
- Mock services using Jest mocks
- Test request/response handling
- Verify correct service method calls
- Test error handling and HTTP status codes
- Example:
  ```typescript
  describe('BudgetController', () => {
    let controller: BudgetController;
    let mockBudgetService: MockType<BudgetService>;

    it('should create budget', async () => {
      const dto: CreateBudgetDto = { projectId: 'xxx', name: 'Test' };
      const expected: BudgetResponseDto = { id: 'yyy', ...dto };

      mockBudgetService.create.mockResolvedValue(expected);

      const result = await controller.create(dto, mockRequest);
      expect(result).toEqual(expected);
      expect(mockBudgetService.create).toHaveBeenCalledWith(dto, mockRequest.user.id);
    });
  });
  ```

**Integration Tests** (E2E - Recommended for critical paths):
- Test full request/response cycle with real database
- Use test database with migrations
- Test file upload/download functionality
- Test transaction rollback scenarios
- Example focus areas:
  - Budget import with validation errors
  - Budget lock/unlock workflow
  - Line item updates with budget recalculation
  - Export file generation

**Test Data Builders** (Recommended utility):
- Create builder pattern for test entities
- Example:
  ```typescript
  class BudgetBuilder {
    private budget: Partial<Budget> = {
      name: 'Test Budget',
      status: BudgetStatus.DRAFT,
      totalBudget: 0,
    };

    withProjectId(projectId: string) {
      this.budget.projectId = projectId;
      return this;
    }

    withStatus(status: BudgetStatus) {
      this.budget.status = status;
      return this;
    }

    build(): Budget {
      return this.budget as Budget;
    }
  }
  ```

### Running Tests

```bash
# Run all tests
npm test

# Run financials module tests only
npm test -- financials

# Run with coverage
npm run test:cov

# Run E2E tests
npm run test:e2e

# Watch mode for development
npm test -- --watch
```

### Code Coverage Goals

- **Entity Tests**: ✅ 100% coverage achieved
- **Service Tests**: Target 90%+ coverage on business logic
- **Controller Tests**: Target 85%+ coverage on endpoints
- **Integration Tests**: Cover critical workflows (import, export, locking, calculations)

## REST API Controllers (Phase 5)

### BudgetController
Complete budget lifecycle management with advanced operations.

**Base Path:** `/api/budgets`

**Endpoints:**

1. `POST /budgets` - Create new budget
   - Body: `CreateBudgetDto`
   - Returns: `BudgetResponseDto`
   - Logs audit: `CREATED`

2. `GET /budgets` - List budgets
   - Query: `projectId?`, `status?`
   - Returns: `BudgetResponseDto[]`

3. `GET /budgets/:id` - Get budget by ID
   - Query: `includeLineItems?` (default: true)
   - Returns: `BudgetResponseDto` with line items

4. `PATCH /budgets/:id` - Update budget
   - Body: `UpdateBudgetDto`
   - Returns: `BudgetResponseDto`
   - Logs audit: `UPDATED`

5. `DELETE /budgets/:id` - Delete budget
   - Returns: Success message
   - Validation: Cannot delete ACTIVE or LOCKED budgets
   - Logs audit: `DELETED`

6. `POST /budgets/:id/lock` - Lock budget for editing
   - Body: `LockBudgetDto` (optional reason)
   - Returns: `LockBudgetResponseDto`
   - Sets: `lockedById`, `lockedAt`
   - Logs audit: `LOCKED`

7. `POST /budgets/:id/unlock` - Unlock budget
   - Returns: `UnlockBudgetResponseDto`
   - Validation: Only lock owner can unlock
   - Logs audit: `UNLOCKED`

8. `POST /budgets/:id/activate` - Activate budget (deactivates others)
   - Returns: `ActivateBudgetResponseDto`
   - Side effect: Sets other project budgets to DRAFT
   - Logs audit: `ACTIVATED`

9. `POST /budgets/:id/revision` - Create new revision from existing budget
   - Body: `CreateRevisionDto` (new budget name)
   - Returns: `CreateRevisionResponseDto`
   - Copies all line items to new budget
   - Logs audit: `REVISION_CREATED` on both budgets

10. `POST /budgets/import` - Import budget from file
    - Body: Multipart form with file + `BudgetImportDto`
    - Returns: `BudgetImportResultDto`
    - Supports: Excel (.xlsx), CSV (.csv)
    - Logs audit: `IMPORTED`

11. `GET /budgets/:id/export` - Export budget to file
    - Query: `format` (excel/csv), `includeSummary?`
    - Returns: File download stream
    - Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet or text/csv
    - Logs audit: `EXPORTED`

12. `GET /budgets/:id/summary` - Get budget summary with analytics
    - Returns: `BudgetSummaryDto`
    - Includes: Total, category breakdown, top cost codes

13. `GET /budgets/:id/category-breakdown` - Get breakdown by category
    - Returns: `BudgetCategoryBreakdownDto`

14. `GET /budgets/:id/cost-code-breakdown` - Get breakdown by cost code
    - Returns: `BudgetCostCodeBreakdownDto`

15. `GET /budgets/compare/:id1/:id2` - Compare two budgets
    - Returns: `BudgetComparisonDto`
    - Shows: Differences, percentage changes, category variances

16. `POST /budgets/:id/recalculate` - Recalculate and update total
    - Returns: New total amount
    - Triggers: Full recalculation from line items

17. `GET /budgets/:id/audit-log` - Get audit log for budget
    - Query: `userId?`, `changeType?`, `startDate?`, `endDate?`
    - Returns: Array of audit log entries

### BudgetLineItemController
Budget line item operations.

**Base Path:** `/api/budget-line-items`

**Endpoints:**

1. `POST /budget-line-items` - Create line item
   - Body: `CreateBudgetLineItemDto`
   - Returns: `BudgetLineItemResponseDto`
   - Side effect: Recalculates parent budget total
   - Logs audit: `LINE_ITEM_ADDED` on parent budget

2. `GET /budget-line-items` - List line items
   - Query: `budgetId?`, `costCodeId?`
   - Returns: `BudgetLineItemResponseDto[]`

3. `GET /budget-line-items/:id` - Get line item by ID
   - Returns: `BudgetLineItemResponseDto`

4. `PATCH /budget-line-items/:id` - Update line item
   - Body: `UpdateBudgetLineItemDto`
   - Returns: `BudgetLineItemResponseDto`
   - Side effect: Recalculates parent budget total
   - Validation: Cannot update line items in LOCKED/ARCHIVED budgets
   - Logs audit: `LINE_ITEM_UPDATED` on parent budget

5. `DELETE /budget-line-items/:id` - Delete line item
   - Returns: Success message
   - Side effect: Recalculates parent budget total
   - Validation: Cannot delete from LOCKED/ARCHIVED budgets
   - Logs audit: `LINE_ITEM_DELETED` on parent budget

### CostCodeController
Cost code hierarchy management.

**Base Path:** `/api/cost-codes`

**Endpoints:**

1. `POST /cost-codes` - Create cost code
   - Body: `CreateCostCodeDto`
   - Returns: `CostCodeResponseDto`
   - Auto-generates: `fullCode` from parent hierarchy

2. `GET /cost-codes` - List cost codes
   - Query: `projectId?`, `division?`, `isActive?`, `parentId?`
   - Returns: `CostCodeResponseDto[]`
   - Includes: Flat list with filters

3. `GET /cost-codes/tree` - Get hierarchical tree
   - Query: `projectId?`, `isActive?`
   - Returns: Nested `CostCodeResponseDto[]`
   - Structure: Parent → children → grandchildren

4. `GET /cost-codes/:id` - Get cost code by ID
   - Returns: `CostCodeResponseDto`

5. `GET /cost-codes/by-code/:fullCode` - Get by full code
   - Query: `projectId?`
   - Returns: `CostCodeResponseDto`
   - Example: `/api/cost-codes/by-code/01.01.100?projectId=xxx`

6. `PATCH /cost-codes/:id` - Update cost code
   - Body: `UpdateCostCodeDto`
   - Returns: `CostCodeResponseDto`
   - Validation: Cannot change parent if children exist

7. `POST /cost-codes/:id/deactivate` - Deactivate cost code (soft delete)
   - Returns: Success message
   - Sets: `isActive = false`
   - Validation: Cannot deactivate if used in budgets/commitments

8. `POST /cost-codes/:id/activate` - Reactivate cost code
   - Returns: Success message
   - Sets: `isActive = true`

9. `DELETE /cost-codes/:id` - Hard delete cost code
   - Returns: Success message
   - Validation: Cannot delete if children exist or used in budgets/commitments

### Controller Implementation Notes

**Authentication & Authorization:**
- All endpoints protected with `@UseGuards(JwtAuthGuard)`
- User ID extracted from request: `(req as any).user.id`
- Recommended: Add ProjectAccessGuard to validate user has project access
- Recommended: Add role-based guards for financial operations

**Validation:**
- All DTOs use class-validator decorators
- UUID validation on all ID parameters
- Enum validation for status, category, type fields
- Business rule validation in services

**Error Handling:**
- `NotFoundException`: Resource not found (404)
- `BadRequestException`: Validation errors, business rule violations (400)
- `ForbiddenException`: Authorization failures (403)
- `ConflictException`: Duplicate entries, constraint violations (409)

**File Uploads:**
- Use `@UseInterceptors(FileInterceptor('file'))` for import endpoints
- Parse multipart/form-data for file + metadata
- Validate file types: .xlsx, .csv
- Maximum file size: Configure in NestJS

**File Downloads:**
- Set appropriate Content-Type headers
- Use streaming responses for large files
- Set Content-Disposition header for filename
- Example:
  ```typescript
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="budget-${id}.xlsx"`,
  });
  ```

**Swagger Documentation:**
- All endpoints documented with `@ApiOperation()`
- Request/response DTOs with `@ApiResponse()`
- File upload documented with `@ApiConsumes('multipart/form-data')`
- File download with `@ApiProduces('application/octet-stream')`

## Next Steps

### Additional Features (Future)
- [ ] PrimeContractController - REST endpoints for prime contracts
- [ ] CommitmentController - REST endpoints for commitments
- [ ] CommitmentItemController - REST endpoints for commitment items
- [ ] Change order management
- [ ] Payment applications
- [ ] Invoice processing
- [ ] Budget vs. actual cost analysis
- [ ] Cash flow forecasting

## API Documentation

Once controllers are implemented, API documentation will be available via Swagger at:
```
http://localhost:3000/api/docs
```

## Database Schema

The module creates the following tables:
- `cost_codes` - Hierarchical cost code structure
- `budgets` - Project budgets
- `budget_line_items` - Budget line items
- `prime_contracts` - Owner contracts
- `commitments` - Subcontracts and purchase orders
- `commitment_items` - Commitment line items

All tables include:
- UUID primary keys
- Timestamps (created_at, updated_at)
- Foreign key constraints
- Indexes on key fields

## License

Proprietary - BobTheBuilder Project

## Support

For questions or issues, please contact the development team.
