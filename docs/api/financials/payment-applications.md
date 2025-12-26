# Payment Applications API

## Overview

The Payment Applications API provides comprehensive management of contractor payment applications using the AIA (American Institute of Architects) G702/G703 forms standard. This system supports progress billing, retainage tracking, lien waiver management, and full workflow from draft to payment.

**Key Features:**
- Schedule of Values (SOV) management with cost code mapping
- 7-state payment application workflow
- AIA G702/G703 PDF generation
- Cumulative progress tracking across multiple payment periods
- Automatic integration with commitment and budget tracking
- Lien waiver requirement tracking

## Architecture

### Workflow States

Payment applications follow a 7-state workflow:

```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED → PAID → VOID
```

**State Descriptions:**
- `DRAFT`: Initial state, editable by creator
- `SUBMITTED`: Submitted for review by contractor
- `UNDER_REVIEW`: Under review by project manager/architect
- `APPROVED`: Approved for payment (updates `commitment.invoicedAmount`)
- `REJECTED`: Rejected, can be revised and resubmitted
- `PAID`: Payment issued (updates `commitment.paidAmount`)
- `VOID`: Voided/cancelled application

### Data Model

```
Project
  └── Commitment (Subcontract/PO)
        ├── Schedule of Values (SOV)
        │     └── SOV Items (line items)
        └── Payment Applications
              ├── Payment Application Items (G703 detail)
              └── Lien Waivers
```

## API Endpoints

### Schedule of Values

#### Create Schedule of Values
```
POST /api/v1/projects/:projectId/schedule-of-values
```

Creates a new Schedule of Values for a commitment. The SOV breaks down the total contract amount into billable line items.

**Request Body:**
```json
{
  "commitmentId": "uuid",
  "totalContractAmount": 500000.00,
  "retentionPercent": 10.0,
  "items": [
    {
      "itemNumber": 1,
      "description": "Site Work and Excavation",
      "scheduledValue": 50000.00,
      "costCodeId": "uuid",
      "order": 1
    },
    {
      "itemNumber": 2,
      "description": "Foundation and Concrete",
      "scheduledValue": 150000.00,
      "costCodeId": "uuid",
      "order": 2
    }
  ]
}
```

**Validation Rules:**
- Sum of `scheduledValue` for all items must equal `totalContractAmount`
- Only one SOV allowed per commitment
- `itemNumber` must be unique within SOV

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "commitmentId": "uuid",
  "projectId": "uuid",
  "totalContractAmount": 500000.00,
  "retentionPercent": 10.0,
  "isLocked": false,
  "items": [...],
  "createdAt": "2025-01-15T10:00:00Z"
}
```

#### Get Schedule of Values
```
GET /api/v1/projects/:projectId/schedule-of-values/:id
```

#### Update SOV Line Items
```
PUT /api/v1/projects/:projectId/schedule-of-values/:id/items
```

#### Lock Schedule of Values
```
PUT /api/v1/projects/:projectId/schedule-of-values/:id/lock
```

Locks the SOV to prevent further changes. Required before submitting payment applications.

---

### Payment Applications

#### Create Payment Application
```
POST /api/v1/projects/:projectId/payment-applications
```

Creates a new payment application in DRAFT status.

**Request Body:**
```json
{
  "commitmentId": "uuid",
  "sovId": "uuid",
  "applicationNumber": 1,
  "applicationDate": "2025-01-15",
  "periodStart": "2025-01-01",
  "periodEnd": "2025-01-31",
  "items": [
    {
      "sovItemId": "uuid",
      "workCompletedThisPeriod": 25000.00,
      "materialsStoredThisPeriod": 5000.00
    },
    {
      "sovItemId": "uuid",
      "workCompletedThisPeriod": 75000.00,
      "materialsStoredThisPeriod": 0.00
    }
  ],
  "notes": "First progress payment for January work"
}
```

**Automatic Calculations:**
- `totalCompletedAndStored` = sum of all line items (work + materials)
- `retainageAmount` = `totalCompletedAndStored` × `retainagePercent`
- `totalEarnedLessRetainage` = `totalCompletedAndStored` - `retainageAmount`
- `currentPaymentDue` = `totalEarnedLessRetainage` - `previousPayments`

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "commitmentId": "uuid",
  "sovId": "uuid",
  "projectId": "uuid",
  "applicationNumber": 1,
  "applicationDate": "2025-01-15",
  "periodStart": "2025-01-01",
  "periodEnd": "2025-01-31",
  "status": "DRAFT",
  "totalCompletedAndStored": 105000.00,
  "retainagePercent": 10.0,
  "retainageAmount": 10500.00,
  "totalEarnedLessRetainage": 94500.00,
  "previousPayments": 0.00,
  "currentPaymentDue": 94500.00,
  "conditionalWaiverReceived": false,
  "unconditionalWaiverReceived": false,
  "items": [...],
  "createdAt": "2025-01-15T10:00:00Z"
}
```

#### Get All Payment Applications
```
GET /api/v1/projects/:projectId/payment-applications?includeItems=true
```

**Query Parameters:**
- `includeItems` (boolean): Include line item detail (default: false)

#### Get Single Payment Application
```
GET /api/v1/projects/:projectId/payment-applications/:id?includeItems=true
```

#### Get by Commitment
```
GET /api/v1/projects/:projectId/payment-applications/commitment/:commitmentId?includeItems=true
```

#### Submit Payment Application
```
PUT /api/v1/projects/:projectId/payment-applications/:id/submit
```

Transitions from DRAFT → SUBMITTED. Contractor submits to owner/architect for review.

**Request Body:**
```json
{
  "notes": "Submitting January progress payment for review"
}
```

**Requirements:**
- Payment application must be in DRAFT status
- SOV must be locked

**Response:** `200 OK` (returns updated payment application)

#### Start Review
```
PUT /api/v1/projects/:projectId/payment-applications/:id/start-review
```

Transitions from SUBMITTED → UNDER_REVIEW.

#### Approve Payment Application
```
PUT /api/v1/projects/:projectId/payment-applications/:id/approve
```

Transitions from UNDER_REVIEW → APPROVED. This action:
- Updates `commitment.invoicedAmount` += `currentPaymentDue`
- Updates budget `actualCost` via cost code mapping
- Triggers notifications

**Request Body:**
```json
{
  "notes": "Approved for payment",
  "approvalDate": "2025-02-01"
}
```

**Requirements:**
- Payment application must be in UNDER_REVIEW status
- Conditional lien waiver should be received (warning if not)

**Response:** `200 OK`

#### Reject Payment Application
```
PUT /api/v1/projects/:projectId/payment-applications/:id/reject
```

Transitions from UNDER_REVIEW → REJECTED.

**Request Body:**
```json
{
  "reason": "Line item 3 quantity exceeds SOV scheduled value",
  "notes": "Please revise and resubmit"
}
```

**Response:** `200 OK`

#### Mark as Paid
```
PUT /api/v1/projects/:projectId/payment-applications/:id/mark-paid
```

Transitions from APPROVED → PAID. This action:
- Updates `commitment.paidAmount` += `currentPaymentDue`
- Records payment details

**Request Body:**
```json
{
  "paymentDate": "2025-02-05",
  "checkNumber": "CHK-00123",
  "notes": "Wire transfer confirmation ABC123"
}
```

**Requirements:**
- Payment application must be in APPROVED status
- Unconditional lien waiver should be received (warning if not)

**Response:** `200 OK`

---

### PDF Generation

#### Download G702 PDF
```
GET /api/v1/projects/:projectId/payment-applications/:id/g702
```

Generates and downloads the AIA G702 form (Application and Certificate for Payment).

**Response:** Binary PDF file
```
Content-Type: application/pdf
Content-Disposition: attachment; filename=G702-{id}.pdf
```

#### Download G703 PDF
```
GET /api/v1/projects/:projectId/payment-applications/:id/g703
```

Generates and downloads the AIA G703 form (Continuation Sheet - line item detail).

**Response:** Binary PDF file
```
Content-Type: application/pdf
Content-Disposition: attachment; filename=G703-{id}.pdf
```

---

## AIA Form Field Mappings

### G702 Fields

| AIA Field | Database Field | Description |
|-----------|---------------|-------------|
| Application Number | `applicationNumber` | Sequential payment app number |
| Application Date | `applicationDate` | Date of application |
| Period To/From | `periodStart`, `periodEnd` | Work period covered |
| Original Contract Sum | `commitment.amount` | Total contract value |
| Column G Total | `totalCompletedAndStored` | Work + materials to date |
| Total Retainage | `retainageAmount` | Amount withheld |
| Total Earned Less Retainage | `totalEarnedLessRetainage` | Net amount earned |
| Less Previous Payments | `previousPayments` | Sum of prior payments |
| Current Payment Due | `currentPaymentDue` | Amount due this period |

### G703 Fields (per line item)

| AIA Column | Database Field | Description |
|------------|---------------|-------------|
| A | `sovItem.itemNumber` | Item number |
| B | `sovItem.description` | Description of work |
| C | `sovItem.scheduledValue` | Contract value for item |
| D | `workCompletedFromPrevious` | From prior apps |
| E | `workCompletedThisPeriod` | Work done this period |
| F | `materialsStoredThisPeriod` | Materials on site |
| G | `totalCompletedAndStored` | D + E + F |
| H | `percentComplete` | (G / C) × 100 |

---

## Calculation Examples

### Example 1: First Payment Application

**Given:**
- SOV Item 1: $100,000 scheduled value
- Work completed this period: $40,000
- Materials stored: $10,000
- Retainage: 10%

**Calculations:**
```
Total Completed and Stored (G) = $40,000 + $10,000 = $50,000
Percent Complete (H) = ($50,000 / $100,000) × 100 = 50%
Retainage Amount = $50,000 × 10% = $5,000
Total Earned Less Retainage = $50,000 - $5,000 = $45,000
Previous Payments = $0
Current Payment Due = $45,000 - $0 = $45,000
```

### Example 2: Second Payment Application (Cumulative)

**Given:**
- Same SOV Item 1: $100,000 scheduled value
- Work completed from previous: $40,000
- Materials stored from previous: $10,000
- Work completed this period: $30,000
- Materials stored this period: $5,000
- Retainage: 10%
- Previous payment: $45,000

**Calculations:**
```
Total Completed and Stored (G) = $40,000 + $10,000 + $30,000 + $5,000 = $85,000
Percent Complete (H) = ($85,000 / $100,000) × 100 = 85%
Retainage Amount = $85,000 × 10% = $8,500
Total Earned Less Retainage = $85,000 - $8,500 = $76,500
Previous Payments = $45,000
Current Payment Due = $76,500 - $45,000 = $31,500
```

---

## Error Responses

### Common Error Codes

**400 Bad Request**
```json
{
  "statusCode": 400,
  "message": "SOV line items must sum to commitment amount",
  "error": "Bad Request"
}
```

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Payment application not found",
  "error": "Not Found"
}
```

**409 Conflict**
```json
{
  "statusCode": 409,
  "message": "Payment application must be in DRAFT status to submit",
  "error": "Conflict"
}
```

---

## Best Practices

1. **SOV Setup**
   - Create and lock SOV before first payment application
   - Map SOV items to cost codes for budget integration
   - Ensure line items sum exactly to contract amount

2. **Progress Billing**
   - Submit payment applications monthly or per contract terms
   - Include only work completed and materials properly stored
   - Provide detailed notes for reviewers

3. **Lien Waivers**
   - Collect conditional waivers before approval
   - Collect unconditional waivers before marking as paid
   - Store physical copies securely

4. **Retainage**
   - Standard construction retainage is 10%
   - May reduce or eliminate on final payment
   - Verify state-specific retainage laws

5. **Documentation**
   - Maintain daily logs and photos
   - Keep material delivery receipts
   - Document stored materials location and condition

---

## Related Documentation

- [AIA Forms G702/G703](./aia-forms.md)
- [Lien Waiver Management](./lien-waivers.md)
- [Commitment Tracking](./commitments.md)
- [Budget Management](./budgets.md)
