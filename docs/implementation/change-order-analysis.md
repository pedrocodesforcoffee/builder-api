# Change Order Management - Pre-Implementation Analysis

## Executive Summary

This document contains the pre-implementation analysis for **TASK 3.6.1.5: Change Order Management**, including codebase structure analysis, entity relationship design, workflow definition, and implementation plan.

**Analysis Date:** 2025-12-08
**Analyzed By:** Claude (AI Assistant)
**Target Module:** src/modules/financials

---

## 1. Existing Codebase Structure Analysis

### 1.1 Entity Patterns

**Discovered Patterns:**
- **Naming Convention:** PascalCase class names with snake_case database columns
- **Primary Keys:** UUID v4 via `@PrimaryGeneratedColumn('uuid')`
- **Audit Fields:** Standard pattern across all entities:
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - `created_by_id` (uuid, references users)
- **Workflow Tracking:** Comprehensive audit trail for approvals:
  - `approved_at`, `approved_by_id`
  - `rejected_at`, `rejected_by_id`, `rejection_reason`
  - `submitted_at`, `submitted_by_id`
- **Indexes:** Applied to:
  - Foreign keys (project_id, commitment_id, etc.)
  - Status fields
  - Composite unique constraints
  - Query-critical fields

**Example Pattern (from PaymentApplication):**
```typescript
@Entity('payment_applications')
@Index('IDX_pay_app_project', ['projectId'])
@Index('IDX_pay_app_status', ['status'])
export class PaymentApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, nullable: false, default: Status.DRAFT })
  status!: Status;

  @Column({ type: 'uuid', name: 'approved_by_id', nullable: true })
  approvedById?: string;

  @Column({ type: 'timestamp with time zone', name: 'approved_at', nullable: true })
  approvedAt?: Date;

  // ... relationships
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy?: User;
}
```

### 1.2 Existing Financial Entities

#### PrimeContract Entity
- **Purpose:** Main contract between owner and contractor
- **Key Fields:**
  - `originalAmount` - Initial contract value
  - `currentAmount` - Contract value after change orders
  - `retentionPercentage` - Holdback percentage
- **Status Workflow:** DRAFT → ACTIVE → COMPLETE → CLOSED
- **Change Order Integration:** Comment states "Should be updated when change orders are approved"
- **Formula:** `currentAmount = originalAmount + sum(approved change orders)`

#### Commitment Entity
- **Purpose:** Subcontracts and purchase orders
- **Key Fields:**
  - `originalAmount` - Initial commitment value
  - `currentAmount` - Commitment value after change orders
  - `type` - SUBCONTRACT or PURCHASE_ORDER
  - `invoicedAmount` - Sum of approved payment applications
  - `paidAmount` - Sum of paid payment applications
- **Status Workflow:** DRAFT → PENDING_APPROVAL → APPROVED → ACTIVE → COMPLETE → CLOSED
- **Change Order Integration:** `currentAmount` should be updated by approved CCOs

#### Budget Entity
- **Purpose:** Project budget tracking by cost codes
- **Key Fields:**
  - `totalBudget` - Computed from line items
  - `status` - DRAFT → ACTIVE → LOCKED → ARCHIVED
- **Change Order Integration:** Budget line items should be updated by approved change orders

#### Budget Line Item Entity
- **Key Fields:**
  - `budgetedCost` - Planned cost for cost code
  - `actualCost` - Actual committed/spent amount (updated by payment applications)
  - `costCodeId` - Link to cost code structure

### 1.3 Existing Service Patterns

**Standard Service Structure:**
```typescript
@Injectable()
export class EntityService {
  private readonly logger = new Logger(EntityService.name);

  constructor(
    @InjectRepository(Entity) private readonly entityRepo: Repository<Entity>,
    @InjectRepository(RelatedEntity) private readonly relatedRepo: Repository<RelatedEntity>,
  ) {}

  // CRUD operations
  async create(dto): Promise<ResponseDto> { /* validation, creation */ }
  async findAll(projectId): Promise<ResponseDto[]> { /* fetch with relations */ }
  async findOne(id): Promise<ResponseDto> { /* fetch with relations */ }
  async update(id, dto): Promise<ResponseDto> { /* validation, update */ }
  async delete(id): Promise<void> { /* soft or hard delete */ }

  // Workflow operations
  async approve(id, userId): Promise<ResponseDto> { /* status transition */ }
  async reject(id, userId, reason): Promise<ResponseDto> { /* status transition */ }
}
```

**Key Observations:**
- Comprehensive validation before create/update
- Logger used for debugging and audit
- NotFoundException for missing entities
- BadRequestException for validation failures
- Status workflow methods separate from CRUD
- DTOs used for input validation and response serialization

### 1.4 Existing Workflow Patterns

**PaymentApplication Workflow (7-state):**
```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED → PAID → VOID
```

**Commitment Workflow:**
```
DRAFT → PENDING_APPROVAL → APPROVED → ACTIVE → COMPLETE → CLOSED
```

**Key Workflow Characteristics:**
- Status enum with explicit states
- Workflow methods enforce valid transitions
- Audit trail captures: actor (user_id), timestamp, reason (for rejection)
- Integration with related entities (e.g., approval updates amounts)

---

## 2. Change Order System Design

### 2.1 Three-Tier Change Order Architecture

Based on the task requirements and existing patterns, we need three distinct change order types:

#### 1. **Potential Change Order (PCO)** - Upstream
- **Source:** Generated by GC or requested by owner
- **Purpose:** Track potential changes before formal approval
- **Status:** DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED → CONVERTED
- **Conversion:** Approved PCOs convert to OCOs (Owner Change Orders)
- **Key Feature:** Multi-tier cost breakdown with markups

#### 2. **Owner Change Order (OCO)** - Midstream
- **Source:** Converted from approved PCOs or created directly
- **Purpose:** Formal change order to prime contract
- **Status:** DRAFT → PENDING_APPROVAL → APPROVED/REJECTED → EXECUTED
- **Integration:** Updates `prime_contract.currentAmount` on approval
- **Key Feature:** Approval threshold configuration ($10K, $25K, $50K, etc.)

#### 3. **Commitment Change Order (CCO)** - Downstream
- **Source:** Created to flow down OCO costs to subcontractors
- **Purpose:** Modify subcontract/PO amounts
- **Status:** DRAFT → PENDING_APPROVAL → APPROVED/REJECTED → EXECUTED
- **Integration:** Updates `commitment.currentAmount` on approval
- **Key Feature:** T&M documentation support

### 2.2 Entity Relationship Diagram

```
Project
  ├── PrimeContract (1:1)
  │     ├── Owner Change Orders (1:n)
  │     │     ├── OCO Cost Breakdowns (1:n)
  │     │     └── OCO Attachments (1:n)
  │     └── Potential Change Orders (1:n)
  │           ├── PCO Cost Tiers (1:n)
  │           ├── PCO Attachments (1:n)
  │           └── Converted To → OCO (1:1 optional)
  │
  ├── Commitments (1:n)
  │     └── Commitment Change Orders (1:n)
  │           ├── CCO Line Items (1:n)
  │           ├── CCO T&M Entries (1:n)
  │           └── CCO Attachments (1:n)
  │
  ├── Change Order Packages (1:n)
  │     └── Package Line Items (1:n)
  │           ├── References → PCO (optional)
  │           ├── References → OCO (optional)
  │           └── References → CCO (optional)
  │
  └── Budget (1:n)
        └── Budget Line Items (1:n)
              ↑ Updated by approved OCOs via cost code mapping
```

### 2.3 Cost Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ POTENTIAL CHANGE ORDER (PCO)                                │
│                                                              │
│ Direct Cost:           $50,000                              │
│ + Overhead (10%):      $ 5,000                              │
│ + Profit (15%):        $ 8,250                              │
│ = Subtotal:            $63,250                              │
│ + Contingency (5%):    $ 3,163                              │
│ = Total PCO Amount:    $66,413                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Convert to OCO (on approval)
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ OWNER CHANGE ORDER (OCO)                                    │
│                                                              │
│ OCO Amount:            $66,413                              │
│                                                              │
│ → Updates prime_contract.currentAmount                      │
│ → Updates budget actualCost via cost code mapping           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Flow down to subcontractors
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ COMMITMENT CHANGE ORDER (CCO)                               │
│                                                              │
│ Electrical Sub:        $25,000                              │
│ Plumbing Sub:          $15,000                              │
│ Materials PO:          $ 5,000                              │
│ = Total CCOs:          $45,000                              │
│                                                              │
│ → Updates commitment.currentAmount                          │
│ → Updates commitment line items                             │
└─────────────────────────────────────────────────────────────┘

MARGIN CALCULATION:
OCO Amount:      $66,413
CCO Total:       $45,000
Margin:          $21,413 (32% markup)
```

---

## 3. Database Schema Design

### 3.1 Potential Change Orders Table

```sql
CREATE TABLE IF NOT EXISTS "potential_change_orders" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "prime_contract_id" uuid NOT NULL REFERENCES "prime_contracts"("id") ON DELETE CASCADE,

  -- Identification
  "pco_number" varchar(50) NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,

  -- Status workflow
  "status" varchar(50) NOT NULL DEFAULT 'DRAFT',
  "priority" varchar(50) DEFAULT 'MEDIUM',

  -- Financial summary (computed from cost tiers)
  "direct_cost" decimal(15,2) NOT NULL DEFAULT 0,
  "overhead_amount" decimal(15,2) NOT NULL DEFAULT 0,
  "overhead_percent" decimal(5,2) NOT NULL DEFAULT 0,
  "profit_amount" decimal(15,2) NOT NULL DEFAULT 0,
  "profit_percent" decimal(5,2) NOT NULL DEFAULT 0,
  "contingency_amount" decimal(15,2) NOT NULL DEFAULT 0,
  "contingency_percent" decimal(5,2) NOT NULL DEFAULT 0,
  "total_amount" decimal(15,2) NOT NULL DEFAULT 0,

  -- Workflow tracking
  "submitted_at" timestamptz,
  "submitted_by_id" uuid REFERENCES "users"("id"),
  "reviewed_at" timestamptz,
  "reviewed_by_id" uuid REFERENCES "users"("id"),
  "approved_at" timestamptz,
  "approved_by_id" uuid REFERENCES "users"("id"),
  "rejected_at" timestamptz,
  "rejected_by_id" uuid REFERENCES "users"("id"),
  "rejection_reason" text,

  -- Conversion tracking
  "converted_to_oco_id" uuid REFERENCES "owner_change_orders"("id"),
  "converted_at" timestamptz,

  -- Audit
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW(),
  "created_by_id" uuid NOT NULL REFERENCES "users"("id"),

  CONSTRAINT "UQ_pco_number" UNIQUE ("project_id", "pco_number"),
  CONSTRAINT "CHK_pco_status" CHECK (status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CONVERTED'))
);

CREATE INDEX "IDX_pco_project" ON "potential_change_orders"("project_id");
CREATE INDEX "IDX_pco_prime_contract" ON "potential_change_orders"("prime_contract_id");
CREATE INDEX "IDX_pco_status" ON "potential_change_orders"("status");
CREATE INDEX "IDX_pco_converted_to_oco" ON "potential_change_orders"("converted_to_oco_id");
```

### 3.2 PCO Cost Tiers Table

```sql
CREATE TABLE IF NOT EXISTS "pco_cost_tiers" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "pco_id" uuid NOT NULL REFERENCES "potential_change_orders"("id") ON DELETE CASCADE,

  -- Cost code mapping
  "cost_code_id" uuid REFERENCES "cost_codes"("id"),
  "description" text NOT NULL,

  -- Cost breakdown
  "quantity" decimal(15,4),
  "unit" varchar(50),
  "unit_cost" decimal(15,2),
  "direct_cost" decimal(15,2) NOT NULL,

  -- Display order
  "order" int NOT NULL DEFAULT 0,

  -- Timestamps
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX "IDX_pco_cost_tier_pco" ON "pco_cost_tiers"("pco_id");
CREATE INDEX "IDX_pco_cost_tier_cost_code" ON "pco_cost_tiers"("cost_code_id");
```

### 3.3 Owner Change Orders Table

```sql
CREATE TABLE IF NOT EXISTS "owner_change_orders" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "prime_contract_id" uuid NOT NULL REFERENCES "prime_contracts"("id") ON DELETE CASCADE,
  "pco_id" uuid REFERENCES "potential_change_orders"("id"),

  -- Identification
  "oco_number" varchar(50) NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,

  -- Status and type
  "status" varchar(50) NOT NULL DEFAULT 'DRAFT',
  "change_type" varchar(50) NOT NULL,
  "priority" varchar(50) DEFAULT 'MEDIUM',

  -- Financial
  "amount" decimal(15,2) NOT NULL,
  "reason" text,

  -- Schedule impact
  "schedule_impact_days" int DEFAULT 0,

  -- Workflow tracking
  "submitted_at" timestamptz,
  "submitted_by_id" uuid REFERENCES "users"("id"),
  "approved_at" timestamptz,
  "approved_by_id" uuid REFERENCES "users"("id"),
  "rejected_at" timestamptz,
  "rejected_by_id" uuid REFERENCES "users"("id"),
  "rejection_reason" text,
  "executed_at" timestamptz,

  -- Audit
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW(),
  "created_by_id" uuid NOT NULL REFERENCES "users"("id"),

  CONSTRAINT "UQ_oco_number" UNIQUE ("project_id", "oco_number"),
  CONSTRAINT "CHK_oco_status" CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED')),
  CONSTRAINT "CHK_oco_change_type" CHECK (change_type IN ('SCOPE_CHANGE', 'DESIGN_CHANGE', 'UNFORESEEN_CONDITIONS', 'OWNER_REQUEST', 'VALUE_ENGINEERING', 'REGULATORY', 'OTHER'))
);

CREATE INDEX "IDX_oco_project" ON "owner_change_orders"("project_id");
CREATE INDEX "IDX_oco_prime_contract" ON "owner_change_orders"("prime_contract_id");
CREATE INDEX "IDX_oco_pco" ON "owner_change_orders"("pco_id");
CREATE INDEX "IDX_oco_status" ON "owner_change_orders"("status");
CREATE INDEX "IDX_oco_change_type" ON "owner_change_orders"("change_type");
```

### 3.4 OCO Cost Breakdowns Table

```sql
CREATE TABLE IF NOT EXISTS "oco_cost_breakdowns" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "oco_id" uuid NOT NULL REFERENCES "owner_change_orders"("id") ON DELETE CASCADE,

  -- Cost code mapping
  "cost_code_id" uuid REFERENCES "cost_codes"("id"),
  "description" text NOT NULL,

  -- Financial
  "amount" decimal(15,2) NOT NULL,

  -- Display order
  "order" int NOT NULL DEFAULT 0,

  -- Timestamps
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX "IDX_oco_cost_breakdown_oco" ON "oco_cost_breakdowns"("oco_id");
CREATE INDEX "IDX_oco_cost_breakdown_cost_code" ON "oco_cost_breakdowns"("cost_code_id");
```

### 3.5 Commitment Change Orders Table

```sql
CREATE TABLE IF NOT EXISTS "commitment_change_orders" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "commitment_id" uuid NOT NULL REFERENCES "commitments"("id") ON DELETE CASCADE,
  "oco_id" uuid REFERENCES "owner_change_orders"("id"),

  -- Identification
  "cco_number" varchar(50) NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,

  -- Status and type
  "status" varchar(50) NOT NULL DEFAULT 'DRAFT',
  "change_type" varchar(50) NOT NULL,

  -- Financial
  "amount" decimal(15,2) NOT NULL,
  "is_time_and_material" boolean NOT NULL DEFAULT false,

  -- Workflow tracking
  "submitted_at" timestamptz,
  "submitted_by_id" uuid REFERENCES "users"("id"),
  "approved_at" timestamptz,
  "approved_by_id" uuid REFERENCES "users"("id"),
  "rejected_at" timestamptz,
  "rejected_by_id" uuid REFERENCES "users"("id"),
  "rejection_reason" text,
  "executed_at" timestamptz,

  -- Audit
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW(),
  "created_by_id" uuid NOT NULL REFERENCES "users"("id"),

  CONSTRAINT "UQ_cco_number" UNIQUE ("commitment_id", "cco_number"),
  CONSTRAINT "CHK_cco_status" CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED')),
  CONSTRAINT "CHK_cco_change_type" CHECK (change_type IN ('SCOPE_ADDITION', 'SCOPE_REDUCTION', 'DESIGN_CHANGE', 'MATERIAL_SUBSTITUTION', 'UNFORESEEN_CONDITIONS', 'OTHER'))
);

CREATE INDEX "IDX_cco_project" ON "commitment_change_orders"("project_id");
CREATE INDEX "IDX_cco_commitment" ON "commitment_change_orders"("commitment_id");
CREATE INDEX "IDX_cco_oco" ON "commitment_change_orders"("oco_id");
CREATE INDEX "IDX_cco_status" ON "commitment_change_orders"("status");
```

### 3.6 CCO Line Items Table

```sql
CREATE TABLE IF NOT EXISTS "cco_line_items" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "cco_id" uuid NOT NULL REFERENCES "commitment_change_orders"("id") ON DELETE CASCADE,

  -- Cost code mapping
  "cost_code_id" uuid REFERENCES "cost_codes"("id"),
  "description" text NOT NULL,

  -- Quantity breakdown
  "quantity" decimal(15,4),
  "unit" varchar(50),
  "unit_cost" decimal(15,2),
  "amount" decimal(15,2) NOT NULL,

  -- Display order
  "order" int NOT NULL DEFAULT 0,

  -- Timestamps
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX "IDX_cco_line_item_cco" ON "cco_line_items"("cco_id");
CREATE INDEX "IDX_cco_line_item_cost_code" ON "cco_line_items"("cost_code_id");
```

### 3.7 CCO T&M Entries Table

```sql
CREATE TABLE IF NOT EXISTS "cco_tm_entries" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "cco_id" uuid NOT NULL REFERENCES "commitment_change_orders"("id") ON DELETE CASCADE,

  -- Entry details
  "date" date NOT NULL,
  "description" text NOT NULL,

  -- Labor
  "labor_hours" decimal(8,2),
  "labor_rate" decimal(10,2),
  "labor_cost" decimal(15,2),

  -- Equipment
  "equipment_hours" decimal(8,2),
  "equipment_rate" decimal(10,2),
  "equipment_cost" decimal(15,2),

  -- Materials
  "material_cost" decimal(15,2),

  -- Total
  "total_cost" decimal(15,2) NOT NULL,

  -- Approval
  "approved" boolean NOT NULL DEFAULT false,
  "approved_at" timestamptz,
  "approved_by_id" uuid REFERENCES "users"("id"),

  -- Timestamps
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX "IDX_cco_tm_entry_cco" ON "cco_tm_entries"("cco_id");
CREATE INDEX "IDX_cco_tm_entry_date" ON "cco_tm_entries"("date");
```

### 3.8 Change Order Packages Table

```sql
CREATE TABLE IF NOT EXISTS "change_order_packages" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,

  -- Package details
  "package_number" varchar(50) NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,

  -- Status
  "status" varchar(50) NOT NULL DEFAULT 'DRAFT',

  -- Financial summary
  "total_amount" decimal(15,2) NOT NULL DEFAULT 0,

  -- Workflow
  "submitted_at" timestamptz,
  "approved_at" timestamptz,

  -- Audit
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW(),
  "created_by_id" uuid NOT NULL REFERENCES "users"("id"),

  CONSTRAINT "UQ_package_number" UNIQUE ("project_id", "package_number"),
  CONSTRAINT "CHK_package_status" CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED'))
);

CREATE INDEX "IDX_co_package_project" ON "change_order_packages"("project_id");
```

### 3.9 Change Order Package Items Table

```sql
CREATE TABLE IF NOT EXISTS "change_order_package_items" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "package_id" uuid NOT NULL REFERENCES "change_order_packages"("id") ON DELETE CASCADE,

  -- Polymorphic relationship (links to PCO, OCO, or CCO)
  "change_order_type" varchar(50) NOT NULL,
  "pco_id" uuid REFERENCES "potential_change_orders"("id"),
  "oco_id" uuid REFERENCES "owner_change_orders"("id"),
  "cco_id" uuid REFERENCES "commitment_change_orders"("id"),

  -- Display order
  "order" int NOT NULL DEFAULT 0,

  -- Timestamps
  "created_at" timestamptz NOT NULL DEFAULT NOW(),

  CONSTRAINT "CHK_package_item_type" CHECK (change_order_type IN ('PCO', 'OCO', 'CCO')),
  CONSTRAINT "CHK_package_item_reference" CHECK (
    (change_order_type = 'PCO' AND pco_id IS NOT NULL AND oco_id IS NULL AND cco_id IS NULL) OR
    (change_order_type = 'OCO' AND pco_id IS NULL AND oco_id IS NOT NULL AND cco_id IS NULL) OR
    (change_order_type = 'CCO' AND pco_id IS NULL AND oco_id IS NULL AND cco_id IS NOT NULL)
  )
);

CREATE INDEX "IDX_co_package_item_package" ON "change_order_package_items"("package_id");
CREATE INDEX "IDX_co_package_item_pco" ON "change_order_package_items"("pco_id");
CREATE INDEX "IDX_co_package_item_oco" ON "change_order_package_items"("oco_id");
CREATE INDEX "IDX_co_package_item_cco" ON "change_order_package_items"("cco_id");
```

---

## 4. Workflow State Machines

### 4.1 PCO Workflow

```
           ┌──────┐
           │DRAFT │
           └───┬──┘
               │ submit()
               ↓
        ┌──────────────┐
        │  SUBMITTED   │
        └──────┬───────┘
               │ startReview()
               ↓
        ┌──────────────┐
        │ UNDER_REVIEW │◄──┐
        └──────┬───────┘   │
               │ approve() or reject()
          ┌────┴────┐
          ↓         ↓
      ┌────────┐ ┌──────────┐
      │APPROVED│ │ REJECTED │──┐
      └────┬───┘ └──────────┘  │
           │                    │ revise()
           │ convertToOCO()     │
           ↓                    ↓
      ┌───────────┐      ┌──────────┐
      │ CONVERTED │      │  DRAFT   │
      └───────────┘      └──────────┘
```

**Validation Rules:**
- DRAFT → SUBMITTED: Must have at least one cost tier, total > 0
- SUBMITTED → UNDER_REVIEW: Requires reviewer assignment
- UNDER_REVIEW → APPROVED: Requires approver with sufficient authority
- APPROVED → CONVERTED: Creates OCO with same amount, links via `converted_to_oco_id`

### 4.2 OCO Workflow

```
           ┌──────┐
           │DRAFT │
           └───┬──┘
               │ submit()
               ↓
        ┌─────────────────┐
        │ PENDING_APPROVAL│
        └────────┬────────┘
                 │ approve() or reject()
            ┌────┴────┐
            ↓         ↓
        ┌────────┐ ┌──────────┐
        │APPROVED│ │ REJECTED │
        └────┬───┘ └──────────┘
             │
             │ execute()
             ↓
        ┌──────────┐
        │ EXECUTED │
        └──────────┘
```

**Side Effects on Approval:**
```typescript
async approve(ocoId: string, userId: string) {
  // 1. Update OCO status
  oco.status = 'APPROVED';
  oco.approvedAt = new Date();
  oco.approvedById = userId;

  // 2. Update prime contract current amount
  primeContract.currentAmount += oco.amount;

  // 3. Update budget line items via cost code mappings
  for (const breakdown of oco.costBreakdowns) {
    const budgetLineItem = await findBudgetLineItemByCostCode(
      oco.projectId,
      breakdown.costCodeId
    );
    budgetLineItem.budgetedCost += breakdown.amount;
  }

  // 4. Log audit trail
  logger.log(`OCO ${oco.ocoNumber} approved by user ${userId}`);
}
```

**Approval Threshold Configuration:**
```typescript
interface ApprovalThreshold {
  minAmount: number;
  maxAmount: number;
  requiredRole: string[]; // ['PROJECT_MANAGER', 'DIRECTOR', 'VP']
}

const DEFAULT_THRESHOLDS: ApprovalThreshold[] = [
  { minAmount: 0, maxAmount: 10000, requiredRole: ['PROJECT_MANAGER'] },
  { minAmount: 10001, maxAmount: 50000, requiredRole: ['DIRECTOR'] },
  { minAmount: 50001, maxAmount: Infinity, requiredRole: ['VP', 'CFO'] }
];
```

### 4.3 CCO Workflow

```
           ┌──────┐
           │DRAFT │
           └───┬──┘
               │ submit()
               ↓
        ┌─────────────────┐
        │ PENDING_APPROVAL│
        └────────┬────────┘
                 │ approve() or reject()
            ┌────┴────┐
            ↓         ↓
        ┌────────┐ ┌──────────┐
        │APPROVED│ │ REJECTED │
        └────┬───┘ └──────────┘
             │
             │ execute()
             ↓
        ┌──────────┐
        │ EXECUTED │
        └──────────┘
```

**Side Effects on Approval:**
```typescript
async approve(ccoId: string, userId: string) {
  // 1. Update CCO status
  cco.status = 'APPROVED';
  cco.approvedAt = new Date();
  cco.approvedById = userId;

  // 2. Update commitment current amount
  commitment.currentAmount += cco.amount;

  // 3. Update commitment line items if mapped
  for (const lineItem of cco.lineItems) {
    if (lineItem.costCodeId) {
      // Update or create commitment item
      await upsertCommitmentItem(
        commitment.id,
        lineItem.costCodeId,
        lineItem.amount
      );
    }
  }

  // 4. If T&M, validate all entries are approved
  if (cco.isTimeAndMaterial) {
    const unapprovedEntries = await countUnapprovedTMEntries(cco.id);
    if (unapprovedEntries > 0) {
      throw new BadRequestException(
        `Cannot approve T&M CCO with ${unapprovedEntries} unapproved entries`
      );
    }
  }

  // 5. Log audit trail
  logger.log(`CCO ${cco.ccoNumber} approved by user ${userId}`);
}
```

---

## 5. Integration Points

### 5.1 Prime Contract Integration

**Update Pattern:**
```typescript
// When OCO is approved
primeContract.currentAmount += oco.amount;

// Validation: Prevent over-billing
if (primeContract.currentAmount < 0) {
  throw new BadRequestException(
    'Change order would result in negative contract amount'
  );
}
```

### 5.2 Commitment Integration

**Update Pattern:**
```typescript
// When CCO is approved
commitment.currentAmount += cco.amount;

// Validation: Prevent negative commitment
if (commitment.currentAmount < 0) {
  throw new BadRequestException(
    'Change order would result in negative commitment amount'
  );
}
```

### 5.3 Budget Integration

**Update Pattern:**
```typescript
// When OCO with cost breakdowns is approved
for (const breakdown of oco.costBreakdowns) {
  const budgetLineItem = await budgetLineItemService.findByCostCode(
    oco.projectId,
    breakdown.costCodeId
  );

  if (budgetLineItem) {
    budgetLineItem.budgetedCost += breakdown.amount;
    await budgetLineItemService.update(budgetLineItem);
  } else {
    // Create new budget line item if doesn't exist
    await budgetLineItemService.create({
      budgetId: activeBudget.id,
      costCodeId: breakdown.costCodeId,
      budgetedCost: breakdown.amount,
      actualCost: 0
    });
  }
}
```

### 5.4 Schedule of Values Integration

**SOV Update When CCO Approved:**
```typescript
// Update SOV items to reflect new commitment amount
const sov = await sovService.findByCommitment(cco.commitmentId);

if (sov && sov.isLocked) {
  // If SOV is locked (payment apps in progress), log warning
  logger.warn(
    `CCO ${cco.ccoNumber} approved but SOV is locked. Manual SOV update required.`
  );
} else if (sov) {
  // Distribute CCO amount across SOV items based on cost code mapping
  for (const lineItem of cco.lineItems) {
    const sovItem = sov.items.find(item =>
      item.costCodeId === lineItem.costCodeId
    );

    if (sovItem) {
      sovItem.scheduledValue += lineItem.amount;
    }
  }

  await sovService.update(sov.id, sov);
}
```

---

## 6. Implementation Plan

### Phase 1: Database and Entities (Est: 3-4 hours)
1. Create database migration SQL script
2. Create entity files:
   - `potential-change-order.entity.ts`
   - `pco-cost-tier.entity.ts`
   - `owner-change-order.entity.ts`
   - `oco-cost-breakdown.entity.ts`
   - `commitment-change-order.entity.ts`
   - `cco-line-item.entity.ts`
   - `cco-tm-entry.entity.ts`
   - `change-order-package.entity.ts`
   - `change-order-package-item.entity.ts`
3. Create enum files:
   - `pco-status.enum.ts`
   - `oco-status.enum.ts`
   - `oco-change-type.enum.ts`
   - `cco-status.enum.ts`
   - `cco-change-type.enum.ts`
   - `co-package-status.enum.ts`
   - `co-priority.enum.ts`
4. Update `entities/index.ts` barrel export
5. Update `FinancialsModule` with new entities

### Phase 2: DTOs (Est: 2-3 hours)
1. Create request DTOs for each entity (Create, Update)
2. Create response DTOs with proper serialization
3. Create workflow action DTOs (Submit, Approve, Reject, etc.)
4. Add validation decorators (@IsNotEmpty, @IsNumber, etc.)

### Phase 3: Services (Est: 6-8 hours)
1. **PotentialChangeOrderService:**
   - CRUD operations
   - Workflow: submit, startReview, approve, reject
   - Cost calculation from tiers
   - Convert to OCO method
2. **OwnerChangeOrderService:**
   - CRUD operations
   - Workflow: submit, approve, reject, execute
   - Integration: update PrimeContract.currentAmount
   - Integration: update Budget via cost breakdowns
   - Approval threshold validation
3. **CommitmentChangeOrderService:**
   - CRUD operations
   - Workflow: submit, approve, reject, execute
   - Integration: update Commitment.currentAmount
   - T&M entry validation
   - Integration: update SOV items
4. **ChangeOrderPackageService:**
   - CRUD operations
   - Add/remove change orders from package
   - Calculate package totals
   - Workflow: submit, approve

### Phase 4: Controllers (Est: 3-4 hours)
1. **PotentialChangeOrderController:**
   - REST endpoints for CRUD
   - Workflow endpoints (submit, approve, reject, convert)
   - Cost tier management endpoints
2. **OwnerChangeOrderController:**
   - REST endpoints for CRUD
   - Workflow endpoints
   - Cost breakdown management endpoints
3. **CommitmentChangeOrderController:**
   - REST endpoints for CRUD
   - Workflow endpoints
   - Line item management endpoints
   - T&M entry endpoints
4. **ChangeOrderPackageController:**
   - REST endpoints for CRUD
   - Package item management endpoints

### Phase 5: Integration Updates (Est: 2-3 hours)
1. Update PrimeContractService to include OCO-related methods
2. Update CommitmentService to include CCO-related methods
3. Update BudgetCalculationService to handle OCO cost breakdowns
4. Update ScheduleOfValuesService to handle CCO updates

### Phase 6: Database Migration (Est: 1 hour)
1. Run PostgreSQL migration script
2. Verify all tables created with correct indexes
3. Verify foreign key constraints

### Phase 7: Documentation (Est: 3-4 hours)
1. Create API documentation:
   - `docs/api/financials/change-orders-pco.md`
   - `docs/api/financials/change-orders-oco.md`
   - `docs/api/financials/change-orders-cco.md`
   - `docs/api/financials/change-order-packages.md`
2. Update CHANGELOG.md with all changes
3. Create workflow diagrams
4. Document approval thresholds and configuration

### Total Estimated Time: 20-27 hours

---

## 7. Risk Analysis

### 7.1 Technical Risks

**Risk: Circular Dependencies**
- PCO → OCO conversion creates bidirectional reference
- **Mitigation:** Use nullable `converted_to_oco_id` on PCO, no reverse reference on OCO

**Risk: Budget Update Conflicts**
- Multiple OCOs approved concurrently could cause race conditions
- **Mitigation:** Use database transactions, optimistic locking on Budget entity

**Risk: SOV Locked During CCO Approval**
- Payment applications in progress prevent SOV updates
- **Mitigation:** Log warning, require manual SOV adjustment, or queue update for later

**Risk: Complex T&M Validation**
- T&M CCOs require all entries approved before CCO approval
- **Mitigation:** Add validation step, clear error messages, T&M approval workflow

### 7.2 Business Logic Risks

**Risk: Approval Authority Bypass**
- Users might try to approve change orders beyond their authority
- **Mitigation:** Enforce approval thresholds in service layer, audit all approvals

**Risk: Negative Contract/Commitment Amounts**
- Deductive change orders could make amounts negative
- **Mitigation:** Validation in service layer, require confirmation for large reductions

**Risk: PCO→OCO Conversion Timing**
- Converting PCO before all details finalized
- **Mitigation:** Require PCO approval before conversion, allow OCO editing post-conversion

---

## 8. Key Assumptions

1. **User Roles:** System has existing role-based access control that can be leveraged for approval thresholds
2. **PostgreSQL Version:** Database is PostgreSQL 9.4+ (confirmed from payment application implementation)
3. **No Real-Time Sync:** Budget and SOV updates are event-driven, not real-time bidirectional sync
4. **Manual T&M Entry:** T&M entries are manually created by users, not auto-calculated
5. **Single Active Budget:** Each project has one active budget at a time for change order integration
6. **Cost Code Required:** All cost breakdowns require cost code mapping for budget integration
7. **No Multi-Currency:** All financial amounts are in project base currency
8. **No Approval Chains:** Single approver per threshold, not sequential approval chains

---

## 9. Open Questions

1. **Approval Threshold Configuration:** Should this be project-level configurable or system-wide defaults?
2. **PCO Expiration:** Should PCOs have an expiration date if not converted to OCO?
3. **Change Order Numbering:** Should numbers auto-increment or be user-defined?
4. **Document Attachments:** Where should change order attachments be stored (S3, local filesystem)?
5. **Notification System:** Should approval/rejection trigger email notifications?
6. **Audit Log Granularity:** Should we track every field change or just status transitions?
7. **Multi-Project Packages:** Can change order packages span multiple projects?
8. **Retroactive Changes:** Can change orders be backdated or must use current timestamp?

---

## 10. Next Steps

1. **Get User Confirmation:** Review this analysis with stakeholders
2. **Resolve Open Questions:** Get answers to configuration and business logic questions
3. **Begin Phase 1:** Start with database schema and entity creation
4. **Incremental Testing:** Test each entity as it's created before moving to next phase
5. **Parallel Documentation:** Document as we build, not after

---

**End of Pre-Implementation Analysis**
