# Lien Waiver Management

## Overview

Lien waivers are legal documents that contractors and subcontractors sign to waive their right to file a mechanic's lien against a property. They are a critical component of the construction payment process, protecting property owners from potential liens after payment has been made.

**Purpose:**
- Confirm payment has been received
- Waive lien rights for work performed
- Protect property owners from future claims
- Required by lenders for construction financing

## Types of Lien Waivers

The system supports six types of lien waivers based on two dimensions:
1. **Timing**: Conditional (before payment) or Unconditional (after payment)
2. **Scope**: Progress (partial) or Final (complete)

### Waiver Types

| Type | Code | When Used | Description |
|------|------|-----------|-------------|
| Conditional Progress | `CONDITIONAL` | With progress billing | Effective upon payment clearing |
| Unconditional Progress | `UNCONDITIONAL` | After payment received | Immediate waiver for progress payment |
| Partial Conditional | `PARTIAL_CONDITIONAL` | Mid-project payment | Conditional waiver for specific work |
| Partial Unconditional | `PARTIAL_UNCONDITIONAL` | Mid-project payment received | Unconditional waiver for specific work |
| Final Conditional | `FINAL_CONDITIONAL` | Final payment application | Conditional waiver for entire project |
| Final Unconditional | `FINAL_UNCONDITIONAL` | Final payment received | Final waiver of all lien rights |

### Conditional vs. Unconditional

**Conditional Waiver:**
- Given BEFORE payment is received
- Becomes effective ONLY when payment clears
- Protects contractor if payment fails
- Required for approval of payment application

**Unconditional Waiver:**
- Given AFTER payment is received
- Immediately effective
- Cannot be revoked
- Required before marking payment as paid

## Workflow

### Standard Payment Application Workflow with Waivers

```
1. Contractor submits payment application (DRAFT → SUBMITTED)

2. Contractor provides CONDITIONAL waiver
   ↓

3. Owner/Architect reviews and approves
   (Payment Application: UNDER_REVIEW → APPROVED)
   ↓

4. Owner issues payment
   ↓

5. Contractor confirms receipt, provides UNCONDITIONAL waiver
   ↓

6. Owner marks payment as paid
   (Payment Application: APPROVED → PAID)
```

### Waiver Status Flow

```
REQUESTED → RECEIVED → APPROVED/REJECTED
```

**Status Descriptions:**
- `REQUESTED`: Waiver requested from contractor
- `RECEIVED`: Physical waiver document received
- `APPROVED`: Waiver reviewed and accepted
- `REJECTED`: Waiver rejected (incorrect, incomplete, etc.)

## API Endpoints

### Create Lien Waiver Request

```
POST /api/v1/projects/:projectId/lien-waivers
```

Creates a lien waiver request for a payment application.

**Request Body:**
```json
{
  "paymentApplicationId": "uuid",
  "type": "CONDITIONAL",
  "amount": 45000.00,
  "throughDate": "2025-01-31",
  "notes": "Conditional waiver for Payment App #1"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "paymentApplicationId": "uuid",
  "projectId": "uuid",
  "type": "CONDITIONAL",
  "status": "REQUESTED",
  "amount": 45000.00,
  "throughDate": "2025-01-31",
  "requestedAt": "2025-01-15T10:00:00Z",
  "requestedBy": {...}
}
```

### Update Waiver Status

```
PUT /api/v1/projects/:projectId/lien-waivers/:id/status
```

Updates waiver status (mark as received, approved, or rejected).

**Request Body:**
```json
{
  "status": "RECEIVED",
  "receivedDate": "2025-01-20",
  "waiverDate": "2025-01-20",
  "documentUrl": "s3://bucket/waivers/waiver-123.pdf",
  "notes": "Signed waiver received via email"
}
```

### Get Waivers for Payment Application

```
GET /api/v1/projects/:projectId/payment-applications/:id/lien-waivers
```

Returns all lien waivers associated with a payment application.

### Get Project Waivers

```
GET /api/v1/projects/:projectId/lien-waivers?status=REQUESTED
```

**Query Parameters:**
- `status`: Filter by waiver status
- `type`: Filter by waiver type

---

## Best Practices

### Timing

**Conditional Waiver:**
- Request when payment application is submitted
- Collect before approving payment application
- Include with payment application package

**Unconditional Waiver:**
- Request after payment is issued
- Collect before marking payment as paid
- Obtain after payment clears (typically 3-5 business days)

### Required Language

Lien waivers should include:
1. Project address and legal description
2. Owner and contractor names
3. Payment amount being waived
4. Work period or "through date"
5. Clear waiver of lien rights language
6. Signature and date
7. Notarization (if required by state)

### State-Specific Requirements

Lien waiver laws vary by state:

**California:**
- Statutory forms required (Civil Code §8132-8138)
- Must use exact statutory language
- Conditional and unconditional forms prescribed

**Texas:**
- Texas Property Code §53.284
- Statutory forms available but not required
- Must include specific warnings

**Other States:**
- Verify local lien waiver requirements
- Some states have statutory forms
- Some require notarization
- Deadlines vary

### Common Mistakes to Avoid

1. **Unconditional waiver before payment**
   - Never provide unconditional waiver until payment received
   - Check cleared before signing

2. **Overly broad waivers**
   - Waiver should match payment amount
   - Include "through date" to limit scope
   - Don't waive future work

3. **Missing exceptions**
   - Exclude change orders not yet paid
   - Preserve claims for defective work
   - Reserve rights for retained amounts

4. **Incomplete waivers**
   - Include all required information
   - Verify signatures
   - Attach notary if required

---

## Integration with Payment Applications

### Automatic Waiver Flags

The system automatically updates payment application waiver flags:

```typescript
// When conditional waiver is approved
paymentApplication.conditionalWaiverReceived = true

// When unconditional waiver is approved
paymentApplication.unconditionalWaiverReceived = true
```

### Workflow Guards

The system enforces waiver requirements:

**On Approval:**
```typescript
if (!paymentApplication.conditionalWaiverReceived) {
  // Log warning but allow approval
  logger.warn('Approving payment application without conditional waiver')
}
```

**On Mark as Paid:**
```typescript
if (!paymentApplication.unconditionalWaiverReceived) {
  // Log warning but allow marking as paid
  logger.warn('Marking payment as paid without unconditional waiver')
}
```

### Database Relationships

```sql
CREATE TABLE lien_waivers (
  id UUID PRIMARY KEY,
  payment_application_id UUID NOT NULL REFERENCES payment_applications(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  type VARCHAR(50) CHECK (type IN ('CONDITIONAL', 'UNCONDITIONAL', ...)),
  status VARCHAR(50) CHECK (status IN ('REQUESTED', 'RECEIVED', ...)),
  amount DECIMAL(15,2) NOT NULL,
  through_date DATE NOT NULL,
  waiver_date DATE,
  received_date DATE,
  document_url TEXT,
  ...
);
```

---

## Example Workflow

### Scenario: First Progress Payment

**Step 1: Create Payment Application**
```
POST /api/v1/projects/proj-123/payment-applications
{
  "applicationNumber": 1,
  "amount": 45000.00,
  ...
}
→ Payment App ID: pay-app-001
```

**Step 2: Request Conditional Waiver**
```
POST /api/v1/projects/proj-123/lien-waivers
{
  "paymentApplicationId": "pay-app-001",
  "type": "CONDITIONAL",
  "amount": 45000.00,
  "throughDate": "2025-01-31"
}
→ Waiver ID: waiver-001
```

**Step 3: Contractor Provides Waiver**
```
PUT /api/v1/projects/proj-123/lien-waivers/waiver-001/status
{
  "status": "RECEIVED",
  "receivedDate": "2025-01-20",
  "documentUrl": "s3://bucket/waiver-001.pdf"
}
```

**Step 4: Approve Waiver**
```
PUT /api/v1/projects/proj-123/lien-waivers/waiver-001/status
{
  "status": "APPROVED"
}
→ Updates: paymentApplication.conditionalWaiverReceived = true
```

**Step 5: Approve Payment Application**
```
PUT /api/v1/projects/proj-123/payment-applications/pay-app-001/approve
→ Status: APPROVED
```

**Step 6: Issue Payment**
```
(External: Owner issues check/wire transfer)
```

**Step 7: Request Unconditional Waiver**
```
POST /api/v1/projects/proj-123/lien-waivers
{
  "paymentApplicationId": "pay-app-001",
  "type": "UNCONDITIONAL",
  "amount": 45000.00,
  "throughDate": "2025-01-31"
}
→ Waiver ID: waiver-002
```

**Step 8: Contractor Confirms Payment, Provides Unconditional Waiver**
```
PUT /api/v1/projects/proj-123/lien-waivers/waiver-002/status
{
  "status": "RECEIVED",
  "receivedDate": "2025-02-05",
  "documentUrl": "s3://bucket/waiver-002.pdf"
}
```

**Step 9: Approve Unconditional Waiver**
```
PUT /api/v1/projects/proj-123/lien-waivers/waiver-002/status
{
  "status": "APPROVED"
}
→ Updates: paymentApplication.unconditionalWaiverReceived = true
```

**Step 10: Mark Payment as Paid**
```
PUT /api/v1/projects/proj-123/payment-applications/pay-app-001/mark-paid
{
  "paymentDate": "2025-02-05",
  "checkNumber": "CHK-00123"
}
→ Status: PAID
```

---

## Legal Considerations

### When Waivers Are Required

**Always Required:**
- Prime contractor from owner
- Subcontractors from general contractor
- Suppliers from contractors

**Sometimes Required:**
- Sub-tier subcontractors (by lender)
- Material suppliers to subcontractors
- Equipment rental companies

### What Waivers Cover

**Typically Waived:**
- Mechanic's lien rights
- Stop notice rights (in some states)
- Bond claim rights

**Not Typically Waived:**
- Claims for defective work
- Claims for personal injury
- Claims for breach of contract
- Change orders not yet invoiced

### Enforceability

**Requirements for Valid Waiver:**
1. Signed by authorized party
2. Specific payment amount
3. Specific work period ("through date")
4. Given for consideration (payment)
5. Complies with state law

**Invalid Waivers:**
- Signed under duress
- Waiving future work
- Missing required statutory language
- Not properly executed

---

## Document Storage

### File Management

**Recommended Storage:**
```
/projects/{projectId}/lien-waivers/{waiverType}/{date}/
  - waiver-{payAppNumber}-conditional.pdf
  - waiver-{payAppNumber}-unconditional.pdf
```

**Metadata to Track:**
- Upload timestamp
- Uploader user ID
- File checksum (verification)
- OCR text (searchability)
- Expiration date (if applicable)

### Retention Requirements

**Keep waivers for:**
- Duration of project + statute of limitations
- Typically 5-10 years after project completion
- Verify state-specific requirements
- Lenders may require longer retention

---

## Reporting

### Waiver Status Dashboard

**Key Metrics:**
- Outstanding waiver requests by contractor
- Overdue waivers (> 30 days from request)
- Waiver compliance rate by project
- Average time from request to receipt

### Compliance Reports

**Monthly Waiver Report:**
- All payment applications for month
- Waiver status for each
- Missing waivers highlighted
- Action items for collection

---

## Related Documentation

- [Payment Applications API](./payment-applications.md)
- [AIA Forms G702/G703](./aia-forms.md)
- [Commitment Tracking](./commitments.md)

## References

- Mechanic's Lien Law (varies by state)
- AIA Document G706 (Contractor's Affidavit of Payment)
- AIA Document G706A (Contractor's Affidavit of Release of Liens)
- California Civil Code §8132-8138 (Lien Release Forms)
- Texas Property Code §53.284 (Waiver Requirements)
