# Change Order Calculations

## Overview

The Change Order Calculation Service provides precision financial calculations for change orders, including cost breakdowns, markup calculations, and budget impact analysis. All calculations use the Decimal.js library to ensure financial accuracy and avoid floating-point arithmetic errors.

## Cost Breakdown Structure

### Direct Cost Categories

Change orders support five primary cost categories for detailed cost tracking:

| Category | Description | Typical Use Cases |
|----------|-------------|-------------------|
| **Labor Cost** | Direct labor expenses | Worker wages, supervision, project management time |
| **Material Cost** | Materials and supplies | Building materials, hardware, consumables |
| **Equipment Cost** | Equipment and tool expenses | Equipment rental, tool costs, machinery |
| **Subcontract Cost** | Subcontractor expenses | Specialized trade work, outsourced services |
| **Other Cost** | Miscellaneous expenses | Permits, fees, bonds, insurance deductibles |

### Cost Breakdown Interface

```typescript
interface COCostBreakdown {
  laborCost?: number;
  materialCost?: number;
  equipmentCost?: number;
  subcontractCost?: number;
  otherCost?: number;
}
```

### Example Cost Breakdown

```json
{
  "laborCost": 15000.00,
  "materialCost": 8500.00,
  "equipmentCost": 3200.00,
  "subcontractCost": 12000.00,
  "otherCost": 1300.00
}
```

**Direct Cost Subtotal**: $40,000.00

---

## Markup Calculations

### Markup Components

The system supports four types of markup that are applied sequentially to calculate the final change order amount:

1. **Overhead** - General business overhead costs
2. **Profit** - Contractor profit margin
3. **Bond** - Performance and payment bond costs
4. **Insurance** - Builder's risk and liability insurance

### Markup Configuration

```typescript
interface MarkupConfigDto {
  overheadPercent?: number;   // Default: 0
  profitPercent?: number;      // Default: 0
  bondPercent?: number;        // Default: 0
  insurancePercent?: number;   // Default: 0
}
```

### Example Markup Configuration

```json
{
  "overheadPercent": 10.0,
  "profitPercent": 8.0,
  "bondPercent": 1.5,
  "insurancePercent": 2.0
}
```

---

## Calculation Formulas

### 1. Direct Cost Subtotal

The direct cost subtotal is the sum of all direct cost categories:

```
directCostSubtotal = laborCost + materialCost + equipmentCost + subcontractCost + otherCost
```

**Example**:
```
directCostSubtotal = $15,000 + $8,500 + $3,200 + $12,000 + $1,300
directCostSubtotal = $40,000.00
```

---

### 2. Overhead Amount

Overhead is calculated as a percentage of the direct cost subtotal:

```
overheadAmount = directCostSubtotal × (overheadPercent / 100)
```

**Example** (10% overhead):
```
overheadAmount = $40,000.00 × (10 / 100)
overheadAmount = $40,000.00 × 0.10
overheadAmount = $4,000.00
```

---

### 3. Profit Amount

Profit is calculated as a percentage of the direct cost subtotal PLUS overhead:

```
baseForProfit = directCostSubtotal + overheadAmount
profitAmount = baseForProfit × (profitPercent / 100)
```

**Example** (8% profit):
```
baseForProfit = $40,000.00 + $4,000.00 = $44,000.00
profitAmount = $44,000.00 × (8 / 100)
profitAmount = $44,000.00 × 0.08
profitAmount = $3,520.00
```

---

### 4. Bond Amount

Bond costs are calculated as a percentage of direct cost subtotal + overhead + profit:

```
baseForBond = directCostSubtotal + overheadAmount + profitAmount
bondAmount = baseForBond × (bondPercent / 100)
```

**Example** (1.5% bond):
```
baseForBond = $40,000.00 + $4,000.00 + $3,520.00 = $47,520.00
bondAmount = $47,520.00 × (1.5 / 100)
bondAmount = $47,520.00 × 0.015
bondAmount = $712.80
```

---

### 5. Insurance Amount

Insurance costs are calculated as a percentage of direct cost subtotal + overhead + profit (same base as bond):

```
baseForInsurance = directCostSubtotal + overheadAmount + profitAmount
insuranceAmount = baseForInsurance × (insurancePercent / 100)
```

**Example** (2.0% insurance):
```
baseForInsurance = $40,000.00 + $4,000.00 + $3,520.00 = $47,520.00
insuranceAmount = $47,520.00 × (2.0 / 100)
insuranceAmount = $47,520.00 × 0.02
insuranceAmount = $950.40
```

---

### 6. Total Markup Amount

Total markup is the sum of all markup components:

```
totalMarkup = overheadAmount + profitAmount + bondAmount + insuranceAmount
```

**Example**:
```
totalMarkup = $4,000.00 + $3,520.00 + $712.80 + $950.40
totalMarkup = $9,183.20
```

---

### 7. Final Total Amount

The final change order amount includes direct costs plus all markup:

```
totalAmount = directCostSubtotal + totalMarkup
```

**Or equivalently**:
```
totalAmount = directCostSubtotal + overheadAmount + profitAmount + bondAmount + insuranceAmount
```

**Example**:
```
totalAmount = $40,000.00 + $9,183.20
totalAmount = $49,183.20
```

---

## Complete Calculation Example

### Input Data

**Cost Breakdown**:
```json
{
  "laborCost": 15000.00,
  "materialCost": 8500.00,
  "equipmentCost": 3200.00,
  "subcontractCost": 12000.00,
  "otherCost": 1300.00
}
```

**Markup Configuration**:
```json
{
  "overheadPercent": 10.0,
  "profitPercent": 8.0,
  "bondPercent": 1.5,
  "insurancePercent": 2.0
}
```

### Step-by-Step Calculation

| Step | Calculation | Amount |
|------|-------------|--------|
| 1. Direct Cost Subtotal | $15,000 + $8,500 + $3,200 + $12,000 + $1,300 | **$40,000.00** |
| 2. Overhead (10%) | $40,000.00 × 0.10 | **$4,000.00** |
| 3. Base for Profit | $40,000.00 + $4,000.00 | $44,000.00 |
| 4. Profit (8%) | $44,000.00 × 0.08 | **$3,520.00** |
| 5. Base for Bond/Insurance | $40,000.00 + $4,000.00 + $3,520.00 | $47,520.00 |
| 6. Bond (1.5%) | $47,520.00 × 0.015 | **$712.80** |
| 7. Insurance (2.0%) | $47,520.00 × 0.02 | **$950.40** |
| 8. Total Markup | $4,000.00 + $3,520.00 + $712.80 + $950.40 | **$9,183.20** |
| 9. **Total Amount** | $40,000.00 + $9,183.20 | **$49,183.20** |

### Markup Percentage Breakdown

| Component | Amount | % of Direct Cost | % of Final Total |
|-----------|--------|------------------|------------------|
| Direct Cost | $40,000.00 | 100.0% | 81.3% |
| Overhead | $4,000.00 | 10.0% | 8.1% |
| Profit | $3,520.00 | 8.8% | 7.2% |
| Bond | $712.80 | 1.8% | 1.4% |
| Insurance | $950.40 | 2.4% | 1.9% |
| **Total** | **$49,183.20** | **122.96%** | **100.0%** |

The effective markup rate is **22.96%** over direct costs.

---

## Using the ChangeOrderCalculationService

### Service Methods

#### 1. Calculate Total from Breakdown

Calculates the direct cost subtotal from a cost breakdown.

```typescript
calculateTotal(breakdown: COCostBreakdown): Decimal
```

**Example Usage**:
```typescript
const breakdown = {
  laborCost: 15000.00,
  materialCost: 8500.00,
  equipmentCost: 3200.00,
  subcontractCost: 12000.00,
  otherCost: 1300.00
};

const total = calculationService.calculateTotal(breakdown);
// Returns: Decimal(40000.00)
```

---

#### 2. Calculate Markup

Calculates total markup amount based on cost breakdown and markup percentages.

```typescript
calculateMarkup(breakdown: COCostBreakdown, markupConfig: MarkupConfigDto): Decimal
```

**Example Usage**:
```typescript
const breakdown = {
  laborCost: 15000.00,
  materialCost: 8500.00,
  equipmentCost: 3200.00,
  subcontractCost: 12000.00,
  otherCost: 1300.00
};

const markupConfig = {
  overheadPercent: 10.0,
  profitPercent: 8.0,
  bondPercent: 1.5,
  insurancePercent: 2.0
};

const markup = calculationService.calculateMarkup(breakdown, markupConfig);
// Returns: Decimal(9183.20)
```

---

#### 3. Calculate Total with Markup

Calculates the final total amount including all markup.

```typescript
calculateWithMarkup(breakdown: COCostBreakdown, markupConfig: MarkupConfigDto): Decimal
```

**Example Usage**:
```typescript
const breakdown = {
  laborCost: 15000.00,
  materialCost: 8500.00,
  equipmentCost: 3200.00,
  subcontractCost: 12000.00,
  otherCost: 1300.00
};

const markupConfig = {
  overheadPercent: 10.0,
  profitPercent: 8.0,
  bondPercent: 1.5,
  insurancePercent: 2.0
};

const totalWithMarkup = calculationService.calculateWithMarkup(breakdown, markupConfig);
// Returns: Decimal(49183.20)
```

---

#### 4. Calculate Budget Impact

Analyzes how a change order affects the project budget.

```typescript
async calculateBudgetImpact(
  changeOrderId: string,
  type: 'OCO' | 'CCO'
): Promise<BudgetImpactDto>
```

**Example Usage**:
```typescript
const budgetImpact = await calculationService.calculateBudgetImpact(
  '880e8400-e29b-41d4-a716-446655440003',
  'OCO'
);
```

**Response**:
```json
{
  "changeOrderId": "880e8400-e29b-41d4-a716-446655440003",
  "changeOrderType": "OCO",
  "changeOrderAmount": 49183.20,
  "currentBudgetTotal": 5000000.00,
  "projectedBudgetTotal": 5049183.20,
  "budgetImpact": 49183.20,
  "percentageImpact": 0.984,
  "costCodeBreakdown": [
    {
      "costCodeId": "cc-123",
      "costCode": "02200",
      "costCodeName": "Site Work",
      "amount": 30000.00,
      "currentBudget": 250000.00,
      "projectedBudget": 280000.00
    },
    {
      "costCodeId": "cc-124",
      "costCode": "02300",
      "costCodeName": "Earthwork",
      "amount": 19183.20,
      "currentBudget": 180000.00,
      "projectedBudget": 199183.20
    }
  ]
}
```

---

#### 5. Calculate Project Change Order Summary

Aggregates all change orders in a project with comprehensive statistics.

```typescript
async calculateProjectCOSummary(projectId: string): Promise<COSummaryDto>
```

**Example Usage**:
```typescript
const summary = await calculationService.calculateProjectCOSummary(
  '123e4567-e89b-12d3-a456-426614174000'
);
```

**Response**:
```json
{
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "totalOcoCount": 8,
  "totalOcoAmount": 234567.89,
  "ocoDraftCount": 2,
  "ocoPendingCount": 2,
  "ocoApprovedCount": 3,
  "ocoRejectedCount": 0,
  "ocoExecutedCount": 1,
  "ocoApprovedAmount": 187500.00,
  "ocoExecutedAmount": 49183.20,
  "totalCcoCount": 12,
  "totalCcoAmount": 189234.56,
  "ccoDraftCount": 3,
  "ccoPendingCount": 3,
  "ccoApprovedCount": 5,
  "ccoRejectedCount": 0,
  "ccoExecutedCount": 1,
  "ccoApprovedAmount": 156000.00,
  "ccoExecutedAmount": 32000.00,
  "totalChangeOrderCount": 20,
  "totalChangeOrderAmount": 423802.45,
  "totalApprovedAmount": 343500.00,
  "totalExecutedAmount": 81183.20,
  "budgetImpactPercentage": 6.87
}
```

---

## OCO Cost Breakdown Management

Owner Change Orders (OCOs) support detailed cost breakdowns by cost code for precise budget tracking.

### Cost Breakdown Entity Structure

```typescript
interface OcoCostBreakdown {
  id: string;
  ocoId: string;
  costCodeId: string;
  description: string;
  amount: number;
  laborCost?: number;
  materialCost?: number;
  equipmentCost?: number;
  subcontractCost?: number;
  otherCost?: number;
}
```

### Creating Cost Breakdowns

Cost breakdowns can be created when updating an OCO's cost breakdown:

**API Endpoint**: `PUT /api/v1/projects/:projectId/ocos/:id/cost-breakdown`

**Request**:
```json
{
  "breakdowns": [
    {
      "costCodeId": "cc-123",
      "description": "Additional site grading",
      "laborCost": 8000.00,
      "equipmentCost": 5000.00,
      "materialCost": 2000.00
    },
    {
      "costCodeId": "cc-456",
      "description": "Drainage improvements",
      "laborCost": 12000.00,
      "materialCost": 8000.00,
      "equipmentCost": 4000.00
    }
  ]
}
```

The system automatically calculates the amount for each breakdown based on the cost categories.

### Retrieving Cost Breakdowns

**API Endpoint**: `GET /api/v1/projects/:projectId/ocos/:id/cost-breakdown`

**Response**:
```json
[
  {
    "id": "cb-001",
    "ocoId": "oco-123",
    "costCodeId": "cc-123",
    "costCode": {
      "code": "02200",
      "name": "Site Work"
    },
    "description": "Additional site grading",
    "amount": 15000.00,
    "laborCost": 8000.00,
    "equipmentCost": 5000.00,
    "materialCost": 2000.00,
    "subcontractCost": 0.00,
    "otherCost": 0.00
  },
  {
    "id": "cb-002",
    "ocoId": "oco-123",
    "costCodeId": "cc-456",
    "costCode": {
      "code": "02300",
      "name": "Earthwork"
    },
    "description": "Drainage improvements",
    "amount": 24000.00,
    "laborCost": 12000.00,
    "materialCost": 8000.00,
    "equipmentCost": 4000.00,
    "subcontractCost": 0.00,
    "otherCost": 0.00
  }
]
```

---

## CCO Line Item Calculations

Commitment Change Orders (CCOs) use line items for detailed cost tracking.

### Line Item Structure

```typescript
interface CcoLineItem {
  id: string;
  ccoId: string;
  costCodeId: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  amount: number;
}
```

### Automatic Amount Calculation

When creating or updating CCO line items, the amount is automatically calculated:

```
amount = quantity × unitCost
```

**Example**:
```json
{
  "description": "Additional electrical outlets",
  "quantity": 20,
  "unit": "EA",
  "unitCost": 125.00
}
```

**Calculated Amount**: 20 × $125.00 = **$2,500.00**

### CCO Total Recalculation

CCOs provide an endpoint to recalculate the total amount from all line items:

**API Endpoint**: `POST /api/v1/projects/:projectId/ccos/:id/recalculate`

This endpoint:
1. Sums all line item amounts
2. Updates the CCO's total amount
3. Returns the updated CCO

---

## Budget Impact Analysis

### Understanding Budget Impact

Budget impact analysis shows how change orders affect the project budget at both the project level and cost code level.

### Project-Level Impact

```json
{
  "currentBudgetTotal": 5000000.00,
  "projectedBudgetTotal": 5049183.20,
  "budgetImpact": 49183.20,
  "percentageImpact": 0.984
}
```

**Interpretation**:
- The change order adds $49,183.20 to the budget
- This represents a 0.984% increase
- The new projected budget is $5,049,183.20

### Cost Code Level Impact

```json
{
  "costCodeId": "cc-123",
  "costCode": "02200",
  "costCodeName": "Site Work",
  "amount": 30000.00,
  "currentBudget": 250000.00,
  "projectedBudget": 280000.00
}
```

**Interpretation**:
- $30,000 of the change order impacts Site Work (02200)
- Current budget for Site Work: $250,000
- Projected budget after change: $280,000
- This is a 12% increase in the Site Work cost code

### When to Review Budget Impact

Review budget impact:
- **Before submitting** a change order for approval
- **During approval** to assess financial implications
- **After approval** to update project forecasts
- **During monthly reviews** to track cumulative impact

---

## Precision and Rounding

### Decimal.js Usage

All financial calculations use Decimal.js to ensure precision:

```typescript
import Decimal from 'decimal.js';

const labor = new Decimal(15000.00);
const material = new Decimal(8500.00);
const total = labor.plus(material);
// Result: Decimal(23500.00) - no floating point errors
```

### Why Decimal.js?

Standard JavaScript floating-point arithmetic can produce errors:

```javascript
// JavaScript floating point (INCORRECT)
0.1 + 0.2 === 0.3  // false! (0.30000000000000004)

// Decimal.js (CORRECT)
new Decimal(0.1).plus(0.2).equals(0.3)  // true
```

### Rounding Rules

Financial amounts are rounded to 2 decimal places using banker's rounding (round half to even):

```typescript
const amount = new Decimal(123.456);
const rounded = amount.toFixed(2);  // "123.46"
```

### Display Formatting

When displaying amounts to users:
- Always round to 2 decimal places
- Use thousand separators for readability
- Include currency symbol ($)

**Example**: `$49,183.20`

---

## Common Calculation Scenarios

### Scenario 1: Simple Labor and Materials

**Input**:
- Labor: $10,000
- Materials: $5,000
- Overhead: 10%
- Profit: 8%

**Calculation**:
```
Direct Cost: $15,000
Overhead (10%): $15,000 × 0.10 = $1,500
Base for Profit: $15,000 + $1,500 = $16,500
Profit (8%): $16,500 × 0.08 = $1,320
Total: $15,000 + $1,500 + $1,320 = $17,820
```

**Result**: $17,820.00

---

### Scenario 2: Subcontractor Passthrough with Markup

**Input**:
- Subcontractor Quote: $25,000
- Overhead: 5%
- Profit: 6%
- Bond: 1%
- Insurance: 1.5%

**Calculation**:
```
Direct Cost (Subcontract): $25,000
Overhead (5%): $25,000 × 0.05 = $1,250
Base for Profit: $25,000 + $1,250 = $26,250
Profit (6%): $26,250 × 0.06 = $1,575
Base for Bond/Ins: $25,000 + $1,250 + $1,575 = $27,825
Bond (1%): $27,825 × 0.01 = $278.25
Insurance (1.5%): $27,825 × 0.015 = $417.38
Total: $25,000 + $1,250 + $1,575 + $278.25 + $417.38 = $28,520.63
```

**Result**: $28,520.63

---

### Scenario 3: Credit Change Order

For credit change orders (reductions), use negative amounts:

**Input**:
- Labor Credit: -$5,000
- Material Credit: -$2,000

**Calculation**:
```
Direct Cost: -$7,000
Overhead (10%): -$7,000 × 0.10 = -$700
Base for Profit: -$7,000 + (-$700) = -$7,700
Profit (8%): -$7,700 × 0.08 = -$616
Total: -$7,000 + (-$700) + (-$616) = -$8,316
```

**Result**: -$8,316.00 (credit)

---

## Best Practices

### 1. Use Detailed Cost Breakdowns

Always provide detailed cost breakdowns by category:
- Improves cost tracking
- Enables better budget analysis
- Supports audit requirements
- Facilitates cost code allocation

### 2. Configure Appropriate Markup

Set markup percentages based on:
- Company policy
- Project complexity
- Risk factors
- Contract requirements
- Industry standards

### 3. Review Budget Impact Before Approval

Always review budget impact analysis:
- Check percentage impact on overall budget
- Review cost code level changes
- Identify budget overruns early
- Plan for budget adjustments

### 4. Maintain Calculation Audit Trail

The system automatically logs:
- Original amounts
- Markup percentages applied
- Calculated totals
- Changes over time

### 5. Validate Totals

When working with cost breakdowns:
- Verify line item amounts sum correctly
- Check that markup calculations are accurate
- Ensure cost code allocations are complete
- Validate against source quotes/proposals

### 6. Handle Credits Carefully

For credit change orders:
- Use negative amounts
- Apply same markup percentages
- Verify credit doesn't exceed original cost
- Document reason for credit

---

## API Integration Examples

### Example 1: Creating an OCO with Cost Breakdown

```javascript
// Step 1: Create the OCO
const oco = await fetch('/api/v1/projects/proj-123/ocos', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    number: 'OCO-001',
    title: 'Site Work Modifications',
    description: 'Additional grading and drainage',
    amount: 49183.20
  })
});

const ocoData = await oco.json();

// Step 2: Add cost breakdown
const breakdown = await fetch(`/api/v1/projects/proj-123/ocos/${ocoData.id}/cost-breakdown`, {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    breakdowns: [
      {
        costCodeId: 'cc-123',
        description: 'Grading work',
        laborCost: 15000.00,
        equipmentCost: 8000.00,
        materialCost: 2000.00
      },
      {
        costCodeId: 'cc-456',
        description: 'Drainage improvements',
        laborCost: 12000.00,
        materialCost: 6500.00,
        equipmentCost: 3200.00
      }
    ]
  })
});
```

### Example 2: Getting Budget Impact Before Approval

```javascript
// Get budget impact analysis
const impact = await fetch('/api/v1/projects/proj-123/ocos/oco-id-123', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
});

const ocoData = await impact.json();

// Calculate impact using the calculation service
// (This happens automatically on the backend when you request budget impact)

// Display to user for review before approval
console.log(`Change Order Amount: $${ocoData.amount}`);
console.log(`Budget Impact: ${ocoData.percentageImpact}%`);
```

### Example 3: Project Summary for Dashboard

```javascript
// Get comprehensive project summary
const summary = await fetch('/api/v1/projects/proj-123/change-orders/summary', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
});

const summaryData = await summary.json();

// Display on dashboard
console.log(`Total Change Orders: ${summaryData.totalChangeOrderCount}`);
console.log(`Total Amount: $${summaryData.totalChangeOrderAmount.toLocaleString()}`);
console.log(`Approved Amount: $${summaryData.totalApprovedAmount.toLocaleString()}`);
console.log(`Budget Impact: ${summaryData.budgetImpactPercentage.toFixed(2)}%`);
```

---

## Troubleshooting

### Issue: Calculation Totals Don't Match

**Symptoms**: Manual calculation doesn't match system calculation

**Common Causes**:
- Rounding differences
- Incorrect order of operations
- Missing cost categories

**Solution**:
1. Verify all cost categories are included
2. Check markup percentages are correct
3. Follow the sequential calculation order
4. Use the service methods for consistency

### Issue: Budget Impact Shows 0%

**Symptoms**: Budget impact percentage is 0 or null

**Common Causes**:
- No active budget for the project
- Budget total is 0
- Cost code assignments missing

**Solution**:
1. Verify project has an active budget
2. Check budget total is non-zero
3. Ensure cost codes are assigned
4. Review budget line items exist

### Issue: Negative Amounts Not Calculating Correctly

**Symptoms**: Credit change orders show incorrect totals

**Common Causes**:
- Positive amounts used instead of negative
- Markup applied incorrectly to credits

**Solution**:
1. Use negative amounts for credits
2. Apply same markup percentages (they'll be negative)
3. Verify total is negative (credit)

---

## Summary

The Change Order Calculation Service provides:

- **Precision**: Decimal.js ensures accurate financial calculations
- **Flexibility**: Support for five cost categories
- **Comprehensiveness**: Four markup types (overhead, profit, bond, insurance)
- **Transparency**: Clear calculation formulas and audit trail
- **Integration**: Budget impact analysis at project and cost code levels

By following the formulas and best practices outlined in this document, you can ensure accurate and consistent change order calculations throughout your construction projects.
