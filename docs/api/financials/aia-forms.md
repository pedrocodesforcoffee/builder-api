# AIA Forms G702/G703

## Overview

The American Institute of Architects (AIA) G702 and G703 forms are the construction industry standard for progress billing. These forms provide a standardized method for contractors to request payment and for owners/architects to certify payment amounts.

**Forms:**
- **G702**: Application and Certificate for Payment (summary/cover sheet)
- **G703**: Continuation Sheet (detailed line-item breakdown)

## G702 - Application and Certificate for Payment

### Purpose

The G702 is the summary form that shows:
- Total contract amount
- Cumulative work completed to date
- Retainage withheld
- Previous payments made
- Current payment due

### Field Mappings

#### Header Information

| Field | Database Source | Description |
|-------|----------------|-------------|
| Project Name | `project.name` | Construction project name |
| Project Number | `project.projectNumber` | Unique project identifier |
| Application Number | `applicationNumber` | Sequential payment app number |
| Application Date | `applicationDate` | Date contractor submitted |
| Period | `periodStart` to `periodEnd` | Work period covered |
| Owner | `project.company.name` | Property owner |
| Contractor | `commitment.vendor.name` | Subcontractor/vendor |

#### Financial Summary

| Field | Database Field | Calculation | Description |
|-------|---------------|-------------|-------------|
| Original Contract Sum | `commitment.amount` | Fixed | Total contract value |
| Net Change by Change Orders | (future) | Sum of approved COs | Contract modifications |
| Contract Sum to Date | (future) | Original + Changes | Current contract total |
| **Total Completed and Stored to Date (Column G)** | `totalCompletedAndStored` | Sum of all G703 line items | Cumulative work + materials |
| Retainage | `retainageAmount` | Column G × retainage% | Amount withheld |
| Total Earned Less Retainage | `totalEarnedLessRetainage` | Column G - Retainage | Net amount earned |
| Less Previous Certificates for Payment | `previousPayments` | Sum of prior apps | Already paid |
| **Current Payment Due** | `currentPaymentDue` | Earned - Previous | Amount due now |

### Calculation Formula

```typescript
// Step 1: Calculate total work completed and stored
totalCompletedAndStored = Σ(lineItem.totalCompletedAndStored)

// Step 2: Calculate retainage
retainageAmount = totalCompletedAndStored × (retainagePercent / 100)

// Step 3: Calculate total earned less retainage
totalEarnedLessRetainage = totalCompletedAndStored - retainageAmount

// Step 4: Calculate previous payments
previousPayments = Σ(priorPaymentApplications.currentPaymentDue)

// Step 5: Calculate current payment due
currentPaymentDue = totalEarnedLessRetainage - previousPayments
```

### Certification Sections

**Contractor Certification:**
- Submitted by: `submittedBy` user
- Date: `submittedAt`
- Certifies work completed per contract

**Architect/Owner Certification:**
- Approved by: `approvedBy` user
- Date: `approvedAt`
- Certifies approval for payment

---

## G703 - Continuation Sheet

### Purpose

The G703 provides line-item detail for each work item in the Schedule of Values, showing:
- Scheduled value (contract amount for item)
- Work completed to date
- Materials stored on site
- Percentage complete

### Column Structure

| Column | Name | Database Field | Calculation | Description |
|--------|------|---------------|-------------|-------------|
| A | Item Number | `sovItem.itemNumber` | - | Sequential item number |
| B | Description of Work | `sovItem.description` | - | Work item description |
| C | Scheduled Value | `sovItem.scheduledValue` | - | Contract value for item |
| D | Work Completed (From Previous Application) | `workCompletedFromPrevious` | Cumulative from prior apps | Work done in prior periods |
| E | Work Completed (This Period) | `workCompletedThisPeriod` | Entered by contractor | Work done this period |
| F | Materials Presently Stored | `materialsStoredThisPeriod` | Entered by contractor | Materials on site |
| G | **Total Completed and Stored to Date** | `totalCompletedAndStored` | D + E + F | Cumulative total |
| H | Percent Complete | `percentComplete` | (G / C) × 100 | Percentage of item complete |

### Calculation Formulas

#### For Each Line Item:

```typescript
// Column G: Total Completed and Stored to Date
totalCompletedAndStored =
  workCompletedFromPrevious +
  workCompletedThisPeriod +
  materialsStoredThisPeriod

// Column H: Percent Complete
percentComplete = (totalCompletedAndStored / scheduledValue) × 100
```

#### For Totals Row:

```typescript
// Sum each column
totalScheduledValue = Σ(lineItems.scheduledValue)
totalWorkFromPrevious = Σ(lineItems.workCompletedFromPrevious)
totalWorkThisPeriod = Σ(lineItems.workCompletedThisPeriod)
totalMaterialsStored = Σ(lineItems.materialsStoredThisPeriod)
totalCompletedAndStored = Σ(lineItems.totalCompletedAndStored)
overallPercentComplete = (totalCompletedAndStored / totalScheduledValue) × 100
```

### Cumulative Tracking Logic

The system automatically tracks cumulative progress across payment applications:

```typescript
// For payment application #1
workCompletedFromPrevious = 0
workCompletedThisPeriod = {entered by user}
totalCompletedAndStored = 0 + workCompletedThisPeriod + materials

// For payment application #2
workCompletedFromPrevious = payApp1.totalCompletedAndStored
workCompletedThisPeriod = {entered by user}
totalCompletedAndStored = workCompletedFromPrevious + workCompletedThisPeriod + materials

// For payment application #N
workCompletedFromPrevious = Σ(priorPaymentApps.totalCompletedAndStored)
workCompletedThisPeriod = {entered by user}
totalCompletedAndStored = workCompletedFromPrevious + workCompletedThisPeriod + materials
```

---

## Worked Examples

### Example 1: Simple Single-Item Payment Application

**Scenario:**
- Contract for concrete work: $100,000
- Retainage: 10%
- First payment application

**Schedule of Values:**
```
Item 1: Foundation Concrete - $100,000
```

**Payment Application #1 (Month 1):**
```
Item 1:
  Column C (Scheduled Value): $100,000
  Column D (Work From Previous): $0
  Column E (Work This Period): $40,000
  Column F (Materials Stored): $10,000
  Column G (Total to Date): $0 + $40,000 + $10,000 = $50,000
  Column H (% Complete): ($50,000 / $100,000) × 100 = 50%

G702 Summary:
  Total Completed and Stored (G): $50,000
  Retainage (10%): $5,000
  Total Earned Less Retainage: $45,000
  Previous Payments: $0
  Current Payment Due: $45,000
```

**Payment Application #2 (Month 2):**
```
Item 1:
  Column C (Scheduled Value): $100,000
  Column D (Work From Previous): $50,000
  Column E (Work This Period): $30,000
  Column F (Materials Stored): $5,000
  Column G (Total to Date): $50,000 + $30,000 + $5,000 = $85,000
  Column H (% Complete): ($85,000 / $100,000) × 100 = 85%

G702 Summary:
  Total Completed and Stored (G): $85,000
  Retainage (10%): $8,500
  Total Earned Less Retainage: $76,500
  Previous Payments: $45,000
  Current Payment Due: $31,500
```

### Example 2: Multi-Item SOV

**Scenario:**
- Total contract: $500,000
- Retainage: 10%
- Payment Application #1

**Schedule of Values:**
```
Item 1: Site Work - $50,000
Item 2: Foundation - $150,000
Item 3: Framing - $200,000
Item 4: Finishes - $100,000
Total: $500,000
```

**Payment Application #1:**

| Item | Description | C: Sched Value | D: Prev Work | E: This Period | F: Materials | G: Total to Date | H: % |
|------|-------------|----------------|--------------|----------------|--------------|------------------|------|
| 1 | Site Work | $50,000 | $0 | $50,000 | $0 | $50,000 | 100% |
| 2 | Foundation | $150,000 | $0 | $75,000 | $25,000 | $100,000 | 67% |
| 3 | Framing | $200,000 | $0 | $0 | $50,000 | $50,000 | 25% |
| 4 | Finishes | $100,000 | $0 | $0 | $0 | $0 | 0% |
| **TOTALS** | | **$500,000** | **$0** | **$125,000** | **$75,000** | **$200,000** | **40%** |

**G702 Summary:**
```
Total Completed and Stored (G): $200,000
Retainage (10%): $20,000
Total Earned Less Retainage: $180,000
Previous Payments: $0
Current Payment Due: $180,000
```

**Payment Application #2:**

| Item | Description | C: Sched Value | D: Prev Work | E: This Period | F: Materials | G: Total to Date | H: % |
|------|-------------|----------------|--------------|----------------|--------------|------------------|------|
| 1 | Site Work | $50,000 | $50,000 | $0 | $0 | $50,000 | 100% |
| 2 | Foundation | $150,000 | $100,000 | $50,000 | $0 | $150,000 | 100% |
| 3 | Framing | $200,000 | $50,000 | $100,000 | $25,000 | $175,000 | 88% |
| 4 | Finishes | $100,000 | $0 | $20,000 | $10,000 | $30,000 | 30% |
| **TOTALS** | | **$500,000** | **$200,000** | **$170,000** | **$35,000** | **$405,000** | **81%** |

**G702 Summary:**
```
Total Completed and Stored (G): $405,000
Retainage (10%): $40,500
Total Earned Less Retainage: $364,500
Previous Payments: $180,000
Current Payment Due: $184,500
```

---

## Special Considerations

### Materials Stored

Materials can only be claimed if:
1. Properly stored on-site or in approved off-site location
2. Suitably protected and insured
3. Documented with delivery receipts
4. Not yet incorporated into the work

### Retainage

**Standard Practices:**
- Typical retainage: 5-10%
- Applied to all work completed and stored
- Released at substantial completion or per contract terms
- Some states have retainage limits by law

**Retainage Release:**
- May reduce retainage as project progresses
- Final payment typically releases all retained amounts
- Conditional on lien waivers and punch list completion

### Over-Billing Prevention

The system enforces:
```
totalCompletedAndStored ≤ scheduledValue (per line item)
Σ(currentPaymentDue) ≤ commitment.amount (overall)
```

### Change Orders

When change orders modify the contract:
1. Update SOV scheduled values
2. Adjust commitment amount
3. Recalculate percentages and totals

---

## PDF Layout

### G702 Layout (Portrait)

```
┌─────────────────────────────────────┐
│ AIA Document G702                   │
│ Application and Certificate          │
│ for Payment                          │
├─────────────────────────────────────┤
│ PROJECT INFORMATION                  │
│ • Project Name                       │
│ • Owner, Contractor                  │
│ • Contract Date                      │
├─────────────────────────────────────┤
│ APPLICATION INFORMATION              │
│ • Application #, Date                │
│ • Period                             │
├─────────────────────────────────────┤
│ FINANCIAL SUMMARY                    │
│ Original Contract Sum      $XXX,XXX  │
│ Total to Date (G)          $XXX,XXX  │
│ Retainage                 ($XX,XXX)  │
│ Total Less Retainage       $XXX,XXX  │
│ Less Previous Payments    ($XXX,XXX) │
│ ─────────────────────────────────── │
│ CURRENT PAYMENT DUE        $XXX,XXX  │
├─────────────────────────────────────┤
│ CONTRACTOR CERTIFICATION             │
│ Signed, Dated                        │
├─────────────────────────────────────┤
│ ARCHITECT/OWNER CERTIFICATION        │
│ Signed, Dated                        │
└─────────────────────────────────────┘
```

### G703 Layout (Landscape)

```
┌────┬─────────────┬──────┬──────┬──────┬──────┬──────┬──────┐
│ A  │ B           │ C    │ D    │ E    │ F    │ G    │ H    │
│Item│Description  │Sched │Prev  │This  │Matls │Total │%     │
├────┼─────────────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ 1  │Site Work    │50,000│  0   │50,000│  0   │50,000│100%  │
│ 2  │Foundation   │150K  │  0   │75,000│25,000│100K  │67%   │
│... │...          │...   │...   │...   │...   │...   │...   │
├────┴─────────────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ TOTALS           │500K  │  0   │125K  │75K   │200K  │40%   │
└──────────────────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

---

## Implementation Notes

### Database Queries

**For G702 Generation:**
```sql
SELECT
  pa.*,
  SUM(pai.total_completed_and_stored) as total_completed_and_stored,
  SUM(prior.current_payment_due) as previous_payments
FROM payment_applications pa
LEFT JOIN payment_application_items pai ON pa.id = pai.payment_application_id
LEFT JOIN payment_applications prior ON
  prior.commitment_id = pa.commitment_id AND
  prior.application_number < pa.application_number AND
  prior.status = 'PAID'
WHERE pa.id = ?
```

**For G703 Generation:**
```sql
SELECT
  sov_items.*,
  pa_items.*,
  COALESCE(SUM(prior_items.total_completed_and_stored), 0) as work_completed_from_previous
FROM schedule_of_values_items sov_items
LEFT JOIN payment_application_items pa_items ON sov_items.id = pa_items.sov_item_id
LEFT JOIN payment_applications prior_pa ON
  prior_pa.commitment_id = ? AND
  prior_pa.application_number < ? AND
  prior_pa.status = 'PAID'
LEFT JOIN payment_application_items prior_items ON
  prior_pa.id = prior_items.payment_application_id AND
  prior_items.sov_item_id = sov_items.id
WHERE sov_items.sov_id = ?
GROUP BY sov_items.id
ORDER BY sov_items.order
```

---

## References

- [AIA Contract Documents](https://www.aiacontracts.org/)
- AIA Document G702-1992
- AIA Document G703-1992
- [Payment Applications API](./payment-applications.md)
