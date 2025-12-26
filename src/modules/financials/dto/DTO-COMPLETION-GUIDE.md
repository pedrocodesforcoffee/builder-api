# DTO Completion Guide

This guide explains how to complete the remaining DTOs for the Financials module.

## Current Status

✅ **Completed (Examples):**
- CostCode DTOs (create, update, response)
- Budget DTOs (create, update, response)

⏳ **Pending:**
- BudgetLineItem DTOs
- PrimeContract DTOs
- Commitment DTOs
- CommitmentItem DTOs

## DTO Pattern Overview

Each entity requires three DTOs following this pattern:

### 1. Create DTO (`create-{entity}.dto.ts`)
Used for creating new records via POST endpoints.

**Pattern:**
```typescript
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsEnum, IsNumber, MaxLength } from 'class-validator';
import { EnumType } from '../enums';

export class Create{Entity}Dto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fieldName: string;

  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  // Add validators for each field from the entity
  // Use @IsOptional() for optional fields
  // Use @IsEnum() for enum fields
  // Use @IsNumber() for numeric fields
  // Use @MaxLength() for strings
}
```

**Key Validators:**
- `@IsString()` - validates string type
- `@IsNumber({ maxDecimalPlaces: 2 })` - for currency (2 decimals)
- `@IsNumber({ maxDecimalPlaces: 4 })` - for quantities/unit costs (4 decimals)
- `@IsUUID()` - for ID references
- `@IsEnum(EnumType)` - for enum fields
- `@IsNotEmpty()` - field is required
- `@IsOptional()` - field is optional
- `@MaxLength(N)` - max string length
- `@Min(0)` - minimum number value (use for amounts/quantities)
- `@Matches(/regex/)` - pattern validation (like cost code format)

### 2. Update DTO (`update-{entity}.dto.ts`)
Used for updating existing records via PATCH endpoints.

**Pattern:**
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { Create{Entity}Dto } from './create-{entity}.dto';

export class Update{Entity}Dto extends PartialType(Create{Entity}Dto) {}
```

This automatically makes all fields from CreateDTO optional for partial updates.

### 3. Response DTO (`{entity}-response.dto.ts`)
Used for API responses to control which fields are exposed to clients.

**Pattern:**
```typescript
import { Expose, Type } from 'class-transformer';
import { EnumType } from '../enums';

export class {Entity}ResponseDto {
  @Expose()
  id: string;

  @Expose()
  fieldName: string;

  @Expose()
  status: EnumType;

  @Expose()
  isActive: boolean;

  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @Expose()
  @Type(() => Date)
  updatedAt: Date;
}
```

Use `@Type(() => Date)` for date fields to ensure proper serialization.

## Step-by-Step: Creating DTOs for an Entity

Let's use `BudgetLineItem` as an example:

### Step 1: Review the Entity

Open `src/modules/financials/entities/budget-line-item.entity.ts` and note:
- All column fields
- Their types (string, number, enum, etc.)
- Which are required vs optional
- Foreign key relationships
- Validation rules in @BeforeInsert/@BeforeUpdate

### Step 2: Create the Create DTO

**File:** `src/modules/financials/dto/create-budget-line-item.dto.ts`

Map each entity field to validators:
- Entity column → DTO property with validators
- Required columns → `@IsNotEmpty()`
- Optional columns → `@IsOptional()`
- Enums → `@IsEnum(EnumType)`
- Numbers → `@IsNumber()` with precision
- Strings → `@IsString()` with `@MaxLength()`
- Foreign keys → `@IsUUID()`

**Example:**
```typescript
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateBudgetLineItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @IsNotEmpty()
  quantity: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @IsNotEmpty()
  unitCost: number;

  @IsUUID()
  @IsNotEmpty()
  budgetId: string;

  @IsUUID()
  @IsNotEmpty()
  costCodeId: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
```

### Step 3: Create the Update DTO

**File:** `src/modules/financials/dto/update-budget-line-item.dto.ts`

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateBudgetLineItemDto } from './create-budget-line-item.dto';

export class UpdateBudgetLineItemDto extends PartialType(CreateBudgetLineItemDto) {}
```

### Step 4: Create the Response DTO

**File:** `src/modules/financials/dto/budget-line-item-response.dto.ts`

Include all fields that should be returned in API responses:

```typescript
import { Expose, Type } from 'class-transformer';

export class BudgetLineItemResponseDto {
  @Expose()
  id: string;

  @Expose()
  description: string;

  @Expose()
  quantity: number;

  @Expose()
  unitCost: number;

  @Expose()
  totalCost: number;

  @Expose()
  budgetId: string;

  @Expose()
  costCodeId: string;

  @Expose()
  notes?: string;

  @Expose()
  isActive: boolean;

  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @Expose()
  @Type(() => Date)
  updatedAt: Date;
}
```

### Step 5: Update the Index File

Add exports to `src/modules/financials/dto/index.ts`:

```typescript
// BudgetLineItem DTOs
export * from './create-budget-line-item.dto';
export * from './update-budget-line-item.dto';
export * from './budget-line-item-response.dto';
```

## Validation Rules Reference

### Common Field Types

| Entity Field Type | Validators |
|------------------|------------|
| `@Column()` string | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(N)` |
| `@Column({ nullable: true })` | Add `@IsOptional()` |
| `@Column({ type: 'decimal', precision: 15, scale: 2 })` | `@IsNumber({ maxDecimalPlaces: 2 })`, `@Min(0)` |
| `@Column({ type: 'decimal', precision: 15, scale: 4 })` | `@IsNumber({ maxDecimalPlaces: 4 })`, `@Min(0)` |
| `@Column({ type: 'enum' })` | `@IsEnum(EnumType)` |
| `@ManyToOne(() => Entity)` | `@IsUUID()`, `@IsNotEmpty()` |
| `@Column({ type: 'date' })` | `@IsDateString()` |
| `@Column({ type: 'boolean' })` | `@IsBoolean()` |

### String Length Guidelines

Based on entity column definitions:
- Short identifiers (code, status): `@MaxLength(50)`
- Names and titles: `@MaxLength(255)`
- Descriptions: `@MaxLength(1000)`
- Notes and details: `@MaxLength(2000)`

### Number Precision

- **Currency amounts** (totalAmount, originalAmount, revisedAmount): `{ maxDecimalPlaces: 2 }`
- **Quantities and unit costs**: `{ maxDecimalPlaces: 4 }`
- Always add `@Min(0)` for amounts/quantities (negative values should use business logic, not validation)

## Testing Your DTOs

After creating DTOs, verify them:

1. **Import Check:** Restart the dev server to ensure no import errors
   ```bash
   npm run start:dev
   ```

2. **Type Check:** Run TypeScript compiler
   ```bash
   npx tsc --noEmit
   ```

3. **Validation Tests:** (Future task) Write unit tests for validators

## Quick Checklist

For each entity, create:
- [ ] `create-{entity}.dto.ts` with all required and optional field validators
- [ ] `update-{entity}.dto.ts` using PartialType
- [ ] `{entity}-response.dto.ts` with @Expose decorators
- [ ] Add exports to `dto/index.ts`
- [ ] Test by restarting the dev server

## Reference Files

Use these completed examples as templates:
- `create-cost-code.dto.ts` - Shows string pattern matching with @Matches
- `create-budget.dto.ts` - Shows enum validation and decimal precision
- `cost-code-response.dto.ts` - Shows response DTO pattern
- `budget-response.dto.ts` - Shows response with enums

## Remaining Entities to Complete

### 1. BudgetLineItem
**Entity:** `budget-line-item.entity.ts`
**Key Fields:** description, quantity, unitCost, totalCost, budgetId, costCodeId, notes

### 2. PrimeContract
**Entity:** `prime-contract.entity.ts`
**Key Fields:** contractNumber, title, description, contractDate, originalAmount, revisedAmount, status, projectId, notes

### 3. Commitment
**Entity:** `commitment.entity.ts`
**Key Fields:** commitmentNumber, title, description, vendor, type, status, originalAmount, revisedAmount, retentionPercent, projectId, notes

### 4. CommitmentItem
**Entity:** `commitment-item.entity.ts`
**Key Fields:** description, quantity, unitCost, totalCost, commitmentId, costCodeId, notes

## Notes

- DTOs are for **input validation** and **output shaping** only
- Business logic belongs in services, not DTOs
- Computed fields (like `totalCost`) should NOT be in Create/Update DTOs - they're calculated in the entity
- Always check the entity's `@BeforeInsert` and `@BeforeUpdate` hooks to understand what gets auto-calculated

## Next Steps After DTOs

Once all DTOs are complete:
1. Create services for CRUD operations
2. Create controllers for API endpoints
3. Write unit tests for services
4. Write integration tests for endpoints
