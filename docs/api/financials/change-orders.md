# Change Orders API Reference

## Overview

The Change Orders API provides a comprehensive system for managing construction project change orders. The system supports three types of change orders, each serving a specific purpose in the construction workflow:

### Change Order Types

#### 1. Potential Change Order (PCO)
**Purpose**: Track potential changes before they become formal change orders.

**Typical Use Cases**:
- Tracking change proposals from subcontractors
- Recording potential scope changes identified during construction
- Managing change requests pending owner review
- Documenting price proposals before formal approval

**Workflow**: PCOs are created as drafts, submitted for review, go through an approval process, and can ultimately be converted to Owner Change Orders (OCOs).

#### 2. Owner Change Order (OCO)
**Purpose**: Formal change orders that modify the prime contract between the general contractor and the project owner.

**Typical Use Cases**:
- Scope changes requested by the owner
- Design modifications affecting the prime contract
- Additional work authorized by the owner
- Contract value adjustments

**Impact**: When executed, OCOs update the prime contract's current amount and affect the project budget.

#### 3. Commitment Change Order (CCO)
**Purpose**: Modifications to existing commitments (subcontracts or purchase orders).

**Typical Use Cases**:
- Subcontractor change orders
- Purchase order amendments
- Vendor contract modifications
- Adjustments to committed amounts

**Impact**: When executed, CCOs update the commitment's current amount and can be linked to OCOs to track cost passthrough.

### Package Management

Change orders can be grouped into packages for batch processing and approval. This is particularly useful for:
- Monthly change order submissions
- Related changes that should be processed together
- Streamlining approval workflows

## Authentication

All endpoints require authentication using JWT Bearer tokens.

**Header Format**:
```
Authorization: Bearer <your_jwt_token>
```

**Authentication Error Response**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## Potential Change Orders (PCO)

### Status Workflow

```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → CONVERTED
                                  ↓
                              REJECTED (can be revised)
```

**Status Descriptions**:
- **DRAFT**: PCO is being created and can be edited freely
- **SUBMITTED**: PCO has been submitted by contractor for review
- **UNDER_REVIEW**: PCO is being reviewed by project team/architect
- **APPROVED**: PCO has been approved and can be converted to OCO
- **REJECTED**: PCO has been rejected, can be revised and resubmitted
- **CONVERTED**: PCO has been converted to an OCO (terminal state)

---

### POST /api/v1/projects/:projectId/pcos

Create a new Potential Change Order.

**Path Parameters**:
- `projectId` (string, required) - The project ID

**Request Body**:
```json
{
  "number": "PCO-001",
  "title": "Additional Electrical Work",
  "description": "Install additional outlets in conference rooms",
  "reason": "Owner requested changes to accommodate new furniture layout",
  "estimatedCost": 15000.00,
  "status": "DRAFT"
}
```

**Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "number": "PCO-001",
  "title": "Additional Electrical Work",
  "description": "Install additional outlets in conference rooms",
  "reason": "Owner requested changes to accommodate new furniture layout",
  "estimatedCost": 15000.00,
  "totalAmount": 15000.00,
  "status": "DRAFT",
  "createdBy": "user123",
  "createdAt": "2025-12-08T10:00:00Z",
  "updatedAt": "2025-12-08T10:00:00Z"
}
```

---

### GET /api/v1/projects/:projectId/pcos

Retrieve all PCOs for a project.

**Path Parameters**:
- `projectId` (string, required) - The project ID

**Query Parameters**:
- `status` (string, optional) - Filter by status (DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, CONVERTED)

**Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "projectId": "123e4567-e89b-12d3-a456-426614174000",
    "number": "PCO-001",
    "title": "Additional Electrical Work",
    "estimatedCost": 15000.00,
    "totalAmount": 15000.00,
    "status": "SUBMITTED",
    "createdAt": "2025-12-08T10:00:00Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "projectId": "123e4567-e89b-12d3-a456-426614174000",
    "number": "PCO-002",
    "title": "HVAC System Upgrade",
    "estimatedCost": 42000.00,
    "totalAmount": 42000.00,
    "status": "APPROVED",
    "createdAt": "2025-12-07T14:30:00Z"
  }
]
```

---

### GET /api/v1/projects/:projectId/pcos/:id

Retrieve a specific PCO by ID.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The PCO ID

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "number": "PCO-001",
  "title": "Additional Electrical Work",
  "description": "Install additional outlets in conference rooms",
  "reason": "Owner requested changes to accommodate new furniture layout",
  "estimatedCost": 15000.00,
  "totalAmount": 15000.00,
  "status": "SUBMITTED",
  "submittedById": "user123",
  "submittedAt": "2025-12-08T11:00:00Z",
  "createdBy": "user123",
  "createdAt": "2025-12-08T10:00:00Z",
  "updatedAt": "2025-12-08T11:00:00Z"
}
```

**Error Response** (404 Not Found):
```json
{
  "statusCode": 404,
  "message": "PCO with ID 550e8400-e29b-41d4-a716-446655440000 not found"
}
```

---

### PUT /api/v1/projects/:projectId/pcos/:id

Update a PCO. Only PCOs in DRAFT or REJECTED status can be updated.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The PCO ID

**Request Body**:
```json
{
  "title": "Additional Electrical Work - Updated",
  "description": "Install additional outlets and USB ports in conference rooms",
  "estimatedCost": 17500.00
}
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "number": "PCO-001",
  "title": "Additional Electrical Work - Updated",
  "description": "Install additional outlets and USB ports in conference rooms",
  "estimatedCost": 17500.00,
  "totalAmount": 17500.00,
  "status": "DRAFT",
  "updatedAt": "2025-12-08T12:00:00Z"
}
```

---

### DELETE /api/v1/projects/:projectId/pcos/:id

Delete a PCO. Only PCOs in DRAFT status can be deleted.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The PCO ID

**Response** (204 No Content)

---

### POST /api/v1/projects/:projectId/pcos/:id/submit

Submit a PCO for review. Transitions status from DRAFT to SUBMITTED.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The PCO ID

**Request Body**:
```json
{
  "notes": "Ready for review by architect"
}
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "SUBMITTED",
  "submittedById": "user123",
  "submittedAt": "2025-12-08T13:00:00Z"
}
```

---

### POST /api/v1/projects/:projectId/pcos/:id/approve

Approve a PCO. Transitions status to APPROVED.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The PCO ID

**Request Body**:
```json
{
  "notes": "Approved by project architect"
}
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "APPROVED",
  "approvedById": "user456",
  "approvedAt": "2025-12-08T14:00:00Z"
}
```

---

### POST /api/v1/projects/:projectId/pcos/:id/reject

Reject a PCO. Transitions status to REJECTED.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The PCO ID

**Request Body**:
```json
{
  "reason": "Pricing needs to be revised. Labor hours seem excessive."
}
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "REJECTED",
  "rejectedById": "user456",
  "rejectedAt": "2025-12-08T14:00:00Z",
  "rejectionReason": "Pricing needs to be revised. Labor hours seem excessive."
}
```

---

### POST /api/v1/projects/:projectId/pcos/:id/convert-to-oco

Convert an approved PCO to an Owner Change Order.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The PCO ID

**Request Body**:
```json
{
  "ocoNumber": "OCO-005",
  "ocoTitle": "Additional Electrical Work",
  "amount": 17500.00,
  "includeMarkup": true
}
```

**Response** (201 Created):
```json
{
  "pco": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "CONVERTED",
    "convertedAt": "2025-12-08T15:00:00Z"
  },
  "oco": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "number": "OCO-005",
    "title": "Additional Electrical Work",
    "amount": 17500.00,
    "sourcePcoId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "DRAFT"
  }
}
```

---

### POST /api/v1/projects/:projectId/pcos/:id/cost-tiers

Add cost tier breakdown to a PCO (for detailed pricing by trade or category).

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The PCO ID

**Request Body**:
```json
{
  "costTiers": [
    {
      "category": "Electrical Labor",
      "description": "Installation labor for outlets and wiring",
      "quantity": 40,
      "unit": "hours",
      "unitCost": 125.00,
      "totalCost": 5000.00
    },
    {
      "category": "Electrical Materials",
      "description": "Outlets, wiring, boxes, and hardware",
      "quantity": 1,
      "unit": "lot",
      "unitCost": 2500.00,
      "totalCost": 2500.00
    }
  ]
}
```

**Response** (201 Created):
```json
{
  "pcoId": "550e8400-e29b-41d4-a716-446655440000",
  "costTiers": [
    {
      "id": "tier-001",
      "category": "Electrical Labor",
      "totalCost": 5000.00
    },
    {
      "id": "tier-002",
      "category": "Electrical Materials",
      "totalCost": 2500.00
    }
  ],
  "totalAmount": 7500.00
}
```

---

### GET /api/v1/projects/:projectId/pcos/:id/cost-tiers

Retrieve cost tier breakdown for a PCO.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The PCO ID

**Response** (200 OK):
```json
[
  {
    "id": "tier-001",
    "pcoId": "550e8400-e29b-41d4-a716-446655440000",
    "category": "Electrical Labor",
    "description": "Installation labor for outlets and wiring",
    "quantity": 40,
    "unit": "hours",
    "unitCost": 125.00,
    "totalCost": 5000.00
  },
  {
    "id": "tier-002",
    "pcoId": "550e8400-e29b-41d4-a716-446655440000",
    "category": "Electrical Materials",
    "description": "Outlets, wiring, boxes, and hardware",
    "quantity": 1,
    "unit": "lot",
    "unitCost": 2500.00,
    "totalCost": 2500.00
  }
]
```

---

## Owner Change Orders (OCO)

### Status Workflow

```
DRAFT → PENDING_APPROVAL → APPROVED → EXECUTED
                         ↓
                     REJECTED (can be revised)
```

**Status Descriptions**:
- **DRAFT**: OCO is being created and can be edited freely
- **PENDING_APPROVAL**: OCO has been submitted and is awaiting approval (requirements depend on amount thresholds)
- **APPROVED**: OCO has been approved (side effect: updates prime_contract.currentAmount)
- **REJECTED**: OCO has been rejected, can be revised and resubmitted
- **EXECUTED**: OCO has been fully executed and integrated (terminal state)

---

### POST /api/v1/projects/:projectId/ocos

Create a new Owner Change Order.

**Path Parameters**:
- `projectId` (string, required) - The project ID

**Request Body**:
```json
{
  "number": "OCO-001",
  "title": "Site Work Modifications",
  "description": "Additional grading and drainage work per owner request",
  "changeType": "ADDITION",
  "reason": "Site conditions require additional drainage",
  "amount": 45000.00,
  "scheduledImpactDays": 5,
  "sourcePcoId": null
}
```

**Response** (201 Created):
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "number": "OCO-001",
  "title": "Site Work Modifications",
  "description": "Additional grading and drainage work per owner request",
  "changeType": "ADDITION",
  "reason": "Site conditions require additional drainage",
  "amount": 45000.00,
  "scheduledImpactDays": 5,
  "status": "DRAFT",
  "createdById": "user123",
  "createdAt": "2025-12-08T10:00:00Z",
  "updatedAt": "2025-12-08T10:00:00Z"
}
```

---

### GET /api/v1/projects/:projectId/ocos

Retrieve all OCOs for a project.

**Path Parameters**:
- `projectId` (string, required) - The project ID

**Query Parameters**:
- `status` (string, optional) - Filter by status (DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, EXECUTED)

**Response** (200 OK):
```json
[
  {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "projectId": "123e4567-e89b-12d3-a456-426614174000",
    "number": "OCO-001",
    "title": "Site Work Modifications",
    "amount": 45000.00,
    "status": "APPROVED",
    "createdAt": "2025-12-08T10:00:00Z",
    "approvedAt": "2025-12-08T15:00:00Z"
  }
]
```

---

### GET /api/v1/projects/:projectId/ocos/:id

Retrieve a specific OCO by ID.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The OCO ID

**Response** (200 OK):
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "number": "OCO-001",
  "title": "Site Work Modifications",
  "description": "Additional grading and drainage work per owner request",
  "changeType": "ADDITION",
  "reason": "Site conditions require additional drainage",
  "amount": 45000.00,
  "scheduledImpactDays": 5,
  "status": "APPROVED",
  "approvedById": "user789",
  "approvedAt": "2025-12-08T15:00:00Z",
  "createdById": "user123",
  "createdAt": "2025-12-08T10:00:00Z",
  "updatedAt": "2025-12-08T15:00:00Z"
}
```

---

### PUT /api/v1/projects/:projectId/ocos/:id

Update an OCO. Only OCOs in DRAFT or REJECTED status can be updated.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The OCO ID

**Request Body**:
```json
{
  "title": "Site Work Modifications - Revised",
  "amount": 48500.00,
  "scheduledImpactDays": 7
}
```

**Response** (200 OK):
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "title": "Site Work Modifications - Revised",
  "amount": 48500.00,
  "scheduledImpactDays": 7,
  "status": "DRAFT",
  "updatedAt": "2025-12-08T16:00:00Z"
}
```

---

### DELETE /api/v1/projects/:projectId/ocos/:id

Delete an OCO. Only OCOs in DRAFT status can be deleted.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The OCO ID

**Response** (204 No Content)

---

### POST /api/v1/projects/:projectId/ocos/:id/submit

Submit an OCO for approval. Transitions status from DRAFT to PENDING_APPROVAL.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The OCO ID

**Request Body**:
```json
{
  "notes": "Ready for owner approval"
}
```

**Response** (200 OK):
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "status": "PENDING_APPROVAL",
  "submittedById": "user123",
  "submittedAt": "2025-12-08T13:00:00Z"
}
```

---

### POST /api/v1/projects/:projectId/ocos/:id/approve

Approve an OCO. Transitions status to APPROVED and updates the prime contract amount.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The OCO ID

**Request Body**:
```json
{
  "notes": "Approved by owner representative"
}
```

**Response** (200 OK):
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "status": "APPROVED",
  "approvedById": "user789",
  "approvedAt": "2025-12-08T15:00:00Z",
  "primeContractUpdated": true,
  "newContractAmount": 5045000.00
}
```

---

### POST /api/v1/projects/:projectId/ocos/:id/reject

Reject an OCO. Transitions status to REJECTED.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The OCO ID

**Request Body**:
```json
{
  "reason": "Owner requires additional justification for drainage work"
}
```

**Response** (200 OK):
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "status": "REJECTED",
  "rejectedById": "user789",
  "rejectedAt": "2025-12-08T15:00:00Z",
  "rejectionReason": "Owner requires additional justification for drainage work"
}
```

---

### POST /api/v1/projects/:projectId/ocos/:id/execute

Execute an OCO. Transitions status to EXECUTED (terminal state).

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The OCO ID

**Request Body**:
```json
{
  "executionDate": "2025-12-08",
  "notes": "Work completed and signed off by owner"
}
```

**Response** (200 OK):
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "status": "EXECUTED",
  "executedById": "user123",
  "executedAt": "2025-12-08T17:00:00Z"
}
```

---

### GET /api/v1/projects/:projectId/ocos/:id/cost-breakdown

Retrieve detailed cost breakdown for an OCO.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The OCO ID

**Response** (200 OK):
```json
[
  {
    "id": "cb-001",
    "ocoId": "880e8400-e29b-41d4-a716-446655440003",
    "costCodeId": "cc-123",
    "costCode": {
      "code": "02200",
      "name": "Site Work"
    },
    "description": "Grading and drainage work",
    "amount": 30000.00,
    "laborCost": 18000.00,
    "materialCost": 8000.00,
    "equipmentCost": 4000.00,
    "subcontractCost": 0.00,
    "otherCost": 0.00
  },
  {
    "id": "cb-002",
    "ocoId": "880e8400-e29b-41d4-a716-446655440003",
    "costCodeId": "cc-124",
    "costCode": {
      "code": "02300",
      "name": "Earthwork"
    },
    "description": "Additional excavation",
    "amount": 15000.00,
    "laborCost": 6000.00,
    "equipmentCost": 9000.00
  }
]
```

---

### PUT /api/v1/projects/:projectId/ocos/:id/cost-breakdown

Update or replace the cost breakdown for an OCO.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The OCO ID

**Request Body**:
```json
{
  "breakdowns": [
    {
      "costCodeId": "cc-123",
      "description": "Grading and drainage work",
      "laborCost": 18000.00,
      "materialCost": 8000.00,
      "equipmentCost": 4000.00
    },
    {
      "costCodeId": "cc-124",
      "description": "Additional excavation",
      "laborCost": 6000.00,
      "equipmentCost": 9000.00
    }
  ]
}
```

**Response** (200 OK):
```json
[
  {
    "id": "cb-001",
    "amount": 30000.00,
    "laborCost": 18000.00,
    "materialCost": 8000.00,
    "equipmentCost": 4000.00
  },
  {
    "id": "cb-002",
    "amount": 15000.00,
    "laborCost": 6000.00,
    "equipmentCost": 9000.00
  }
]
```

---

### GET /api/v1/projects/:projectId/ocos/:id/documents

Retrieve all documents attached to an OCO.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The OCO ID

**Response** (200 OK):
```json
[
  {
    "id": "doc-001",
    "changeOrderId": "880e8400-e29b-41d4-a716-446655440003",
    "changeOrderType": "OCO",
    "fileName": "drainage-plans.pdf",
    "fileUrl": "https://storage.example.com/documents/drainage-plans.pdf",
    "fileSize": 2048576,
    "mimeType": "application/pdf",
    "uploadedById": "user123",
    "uploadedAt": "2025-12-08T11:00:00Z"
  }
]
```

---

### POST /api/v1/projects/:projectId/ocos/:id/documents

Attach a document to an OCO.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The OCO ID

**Request Body**:
```json
{
  "fileName": "drainage-plans.pdf",
  "fileUrl": "https://storage.example.com/documents/drainage-plans.pdf",
  "fileSize": 2048576,
  "mimeType": "application/pdf",
  "description": "Updated drainage plans for site work"
}
```

**Response** (201 Created):
```json
{
  "id": "doc-001",
  "changeOrderId": "880e8400-e29b-41d4-a716-446655440003",
  "fileName": "drainage-plans.pdf",
  "description": "Updated drainage plans for site work",
  "uploadedAt": "2025-12-08T11:00:00Z"
}
```

---

### DELETE /api/v1/projects/:projectId/ocos/:id/documents/:docId

Remove a document from an OCO.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The OCO ID
- `docId` (string, required) - The document ID

**Response** (204 No Content)

---

## Commitment Change Orders (CCO)

### Status Workflow

```
DRAFT → PENDING_APPROVAL → APPROVED → EXECUTED
                         ↓
                     REJECTED (can be revised)
```

**Status Descriptions**:
- **DRAFT**: CCO is being created and can be edited freely
- **PENDING_APPROVAL**: CCO has been submitted and is awaiting approval
- **APPROVED**: CCO has been approved (side effect: updates commitment.currentAmount)
- **REJECTED**: CCO has been rejected, can be revised and resubmitted
- **EXECUTED**: CCO has been fully executed and integrated (terminal state)

---

### POST /api/v1/projects/:projectId/ccos

Create a new Commitment Change Order.

**Path Parameters**:
- `projectId` (string, required) - The project ID

**Request Body**:
```json
{
  "commitmentId": "commit-001",
  "number": "CCO-001",
  "title": "Additional Electrical Scope",
  "description": "Add outlets and lighting per revised plans",
  "changeType": "ADDITION",
  "reason": "Design changes require additional electrical work",
  "amount": 12000.00,
  "relatedOcoId": "880e8400-e29b-41d4-a716-446655440003"
}
```

**Response** (201 Created):
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440004",
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "commitmentId": "commit-001",
  "number": "CCO-001",
  "title": "Additional Electrical Scope",
  "description": "Add outlets and lighting per revised plans",
  "changeType": "ADDITION",
  "amount": 12000.00,
  "relatedOcoId": "880e8400-e29b-41d4-a716-446655440003",
  "status": "DRAFT",
  "createdById": "user123",
  "createdAt": "2025-12-08T10:00:00Z"
}
```

---

### GET /api/v1/projects/:projectId/ccos

Retrieve all CCOs for a project.

**Path Parameters**:
- `projectId` (string, required) - The project ID

**Query Parameters**:
- `commitmentId` (string, optional) - Filter by commitment ID
- `status` (string, optional) - Filter by status (DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, EXECUTED)

**Response** (200 OK):
```json
[
  {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "projectId": "123e4567-e89b-12d3-a456-426614174000",
    "commitmentId": "commit-001",
    "number": "CCO-001",
    "title": "Additional Electrical Scope",
    "amount": 12000.00,
    "status": "APPROVED",
    "createdAt": "2025-12-08T10:00:00Z"
  }
]
```

---

### GET /api/v1/projects/:projectId/ccos/:id

Retrieve a specific CCO by ID.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The CCO ID

**Response** (200 OK):
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440004",
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "commitmentId": "commit-001",
  "number": "CCO-001",
  "title": "Additional Electrical Scope",
  "description": "Add outlets and lighting per revised plans",
  "changeType": "ADDITION",
  "reason": "Design changes require additional electrical work",
  "amount": 12000.00,
  "relatedOcoId": "880e8400-e29b-41d4-a716-446655440003",
  "status": "APPROVED",
  "approvedById": "user123",
  "approvedAt": "2025-12-08T14:00:00Z",
  "createdAt": "2025-12-08T10:00:00Z"
}
```

---

### PUT /api/v1/projects/:projectId/ccos/:id

Update a CCO. Only CCOs in DRAFT or REJECTED status can be updated.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The CCO ID

**Request Body**:
```json
{
  "title": "Additional Electrical Scope - Revised",
  "amount": 13500.00
}
```

**Response** (200 OK):
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440004",
  "title": "Additional Electrical Scope - Revised",
  "amount": 13500.00,
  "updatedAt": "2025-12-08T11:00:00Z"
}
```

---

### DELETE /api/v1/projects/:projectId/ccos/:id

Delete a CCO. Only CCOs in DRAFT status can be deleted.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The CCO ID

**Response** (204 No Content)

---

### POST /api/v1/projects/:projectId/ccos/:id/submit

Submit a CCO for approval. Transitions status from DRAFT to PENDING_APPROVAL.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The CCO ID

**Request Body**:
```json
{
  "notes": "Ready for project manager approval"
}
```

**Response** (200 OK):
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440004",
  "status": "PENDING_APPROVAL",
  "submittedById": "user123",
  "submittedAt": "2025-12-08T12:00:00Z"
}
```

---

### POST /api/v1/projects/:projectId/ccos/:id/approve

Approve a CCO. Transitions status to APPROVED and updates the commitment amount.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The CCO ID

**Request Body**:
```json
{
  "notes": "Approved - consistent with OCO pricing"
}
```

**Response** (200 OK):
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440004",
  "status": "APPROVED",
  "approvedById": "user123",
  "approvedAt": "2025-12-08T14:00:00Z",
  "commitmentUpdated": true,
  "newCommitmentAmount": 312000.00
}
```

---

### POST /api/v1/projects/:projectId/ccos/:id/reject

Reject a CCO. Transitions status to REJECTED.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The CCO ID

**Request Body**:
```json
{
  "reason": "Pricing needs to be renegotiated with subcontractor"
}
```

**Response** (200 OK):
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440004",
  "status": "REJECTED",
  "rejectedById": "user123",
  "rejectedAt": "2025-12-08T14:00:00Z",
  "rejectionReason": "Pricing needs to be renegotiated with subcontractor"
}
```

---

### POST /api/v1/projects/:projectId/ccos/:id/execute

Execute a CCO. Transitions status to EXECUTED (terminal state).

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The CCO ID

**Request Body**:
```json
{
  "executionDate": "2025-12-08",
  "notes": "Subcontractor work completed"
}
```

**Response** (200 OK):
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440004",
  "status": "EXECUTED",
  "executedById": "user123",
  "executedAt": "2025-12-08T17:00:00Z"
}
```

---

### GET /api/v1/projects/:projectId/ccos/:id/documents

Retrieve all documents attached to a CCO.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The CCO ID

**Response** (200 OK):
```json
[
  {
    "id": "doc-002",
    "changeOrderId": "990e8400-e29b-41d4-a716-446655440004",
    "changeOrderType": "CCO",
    "fileName": "subcontractor-proposal.pdf",
    "fileUrl": "https://storage.example.com/documents/subcontractor-proposal.pdf",
    "uploadedAt": "2025-12-08T10:30:00Z"
  }
]
```

---

### POST /api/v1/projects/:projectId/ccos/:id/documents

Attach a document to a CCO.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The CCO ID

**Request Body**:
```json
{
  "fileName": "subcontractor-proposal.pdf",
  "fileUrl": "https://storage.example.com/documents/subcontractor-proposal.pdf",
  "fileSize": 1024000,
  "mimeType": "application/pdf",
  "description": "Electrical subcontractor pricing proposal"
}
```

**Response** (201 Created):
```json
{
  "id": "doc-002",
  "changeOrderId": "990e8400-e29b-41d4-a716-446655440004",
  "fileName": "subcontractor-proposal.pdf",
  "uploadedAt": "2025-12-08T10:30:00Z"
}
```

---

### DELETE /api/v1/projects/:projectId/ccos/:id/documents/:docId

Remove a document from a CCO.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The CCO ID
- `docId` (string, required) - The document ID

**Response** (204 No Content)

---

## Change Order Packages

### Status Workflow

```
DRAFT → SUBMITTED → APPROVED
```

**Status Descriptions**:
- **DRAFT**: Package is being assembled and can be edited
- **SUBMITTED**: Package has been submitted for approval
- **APPROVED**: Package has been approved (all change orders should be processed)

---

### POST /api/v1/projects/:projectId/co-packages

Create a new change order package.

**Path Parameters**:
- `projectId` (string, required) - The project ID

**Request Body**:
```json
{
  "number": "PKG-2025-12",
  "title": "December 2025 Change Orders",
  "description": "Monthly change order package for December"
}
```

**Response** (201 Created):
```json
{
  "id": "pkg-001",
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "number": "PKG-2025-12",
  "title": "December 2025 Change Orders",
  "description": "Monthly change order package for December",
  "status": "DRAFT",
  "totalAmount": 0.00,
  "itemCount": 0,
  "createdAt": "2025-12-08T10:00:00Z"
}
```

---

### GET /api/v1/projects/:projectId/co-packages

Retrieve all packages for a project.

**Path Parameters**:
- `projectId` (string, required) - The project ID

**Query Parameters**:
- `status` (string, optional) - Filter by status (DRAFT, SUBMITTED, APPROVED)

**Response** (200 OK):
```json
[
  {
    "id": "pkg-001",
    "number": "PKG-2025-12",
    "title": "December 2025 Change Orders",
    "status": "SUBMITTED",
    "totalAmount": 75000.00,
    "itemCount": 3,
    "createdAt": "2025-12-08T10:00:00Z"
  }
]
```

---

### GET /api/v1/projects/:projectId/co-packages/:id

Retrieve a specific package by ID.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The package ID

**Response** (200 OK):
```json
{
  "id": "pkg-001",
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "number": "PKG-2025-12",
  "title": "December 2025 Change Orders",
  "description": "Monthly change order package for December",
  "status": "SUBMITTED",
  "totalAmount": 75000.00,
  "itemCount": 3,
  "items": [
    {
      "id": "item-001",
      "changeOrderType": "OCO",
      "changeOrderId": "880e8400-e29b-41d4-a716-446655440003",
      "changeOrderNumber": "OCO-001",
      "amount": 45000.00
    },
    {
      "id": "item-002",
      "changeOrderType": "CCO",
      "changeOrderId": "990e8400-e29b-41d4-a716-446655440004",
      "changeOrderNumber": "CCO-001",
      "amount": 12000.00
    },
    {
      "id": "item-003",
      "changeOrderType": "OCO",
      "changeOrderId": "aa0e8400-e29b-41d4-a716-446655440005",
      "changeOrderNumber": "OCO-002",
      "amount": 18000.00
    }
  ],
  "createdAt": "2025-12-08T10:00:00Z",
  "submittedAt": "2025-12-08T15:00:00Z"
}
```

---

### PUT /api/v1/projects/:projectId/co-packages/:id

Update a package. Only packages in DRAFT status can be updated.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The package ID

**Request Body**:
```json
{
  "title": "December 2025 Change Orders - Final",
  "description": "Final monthly change order package for December with all approved items"
}
```

**Response** (200 OK):
```json
{
  "id": "pkg-001",
  "title": "December 2025 Change Orders - Final",
  "description": "Final monthly change order package for December with all approved items",
  "updatedAt": "2025-12-08T14:00:00Z"
}
```

---

### DELETE /api/v1/projects/:projectId/co-packages/:id

Delete a package. Only packages in DRAFT status can be deleted.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The package ID

**Response** (204 No Content)

---

### POST /api/v1/projects/:projectId/co-packages/:id/add-items

Add change orders to a package.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The package ID

**Request Body**:
```json
{
  "items": [
    {
      "changeOrderType": "OCO",
      "changeOrderId": "880e8400-e29b-41d4-a716-446655440003"
    },
    {
      "changeOrderType": "CCO",
      "changeOrderId": "990e8400-e29b-41d4-a716-446655440004"
    }
  ]
}
```

**Response** (201 Created):
```json
{
  "packageId": "pkg-001",
  "itemsAdded": 2,
  "totalAmount": 57000.00,
  "items": [
    {
      "id": "item-001",
      "changeOrderType": "OCO",
      "changeOrderId": "880e8400-e29b-41d4-a716-446655440003",
      "amount": 45000.00
    },
    {
      "id": "item-002",
      "changeOrderType": "CCO",
      "changeOrderId": "990e8400-e29b-41d4-a716-446655440004",
      "amount": 12000.00
    }
  ]
}
```

---

### POST /api/v1/projects/:projectId/co-packages/:id/submit

Submit a package for approval. Transitions status from DRAFT to SUBMITTED.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The package ID

**Request Body**:
```json
{
  "notes": "All change orders reviewed and ready for batch approval"
}
```

**Response** (200 OK):
```json
{
  "id": "pkg-001",
  "status": "SUBMITTED",
  "submittedById": "user123",
  "submittedAt": "2025-12-08T15:00:00Z"
}
```

---

### POST /api/v1/projects/:projectId/co-packages/:id/approve

Approve a package. Transitions status to APPROVED.

**Path Parameters**:
- `projectId` (string, required) - The project ID
- `id` (string, required) - The package ID

**Request Body**:
```json
{
  "notes": "Package approved - proceed with execution"
}
```

**Response** (200 OK):
```json
{
  "id": "pkg-001",
  "status": "APPROVED",
  "approvedById": "user789",
  "approvedAt": "2025-12-08T16:00:00Z"
}
```

---

## Unified Change Order Queries

These endpoints provide project-wide views across all change order types.

### GET /api/v1/projects/:projectId/change-orders

Retrieve all change orders for a project (PCOs, OCOs, and CCOs).

**Path Parameters**:
- `projectId` (string, required) - The project ID

**Query Parameters**:
- `includePcos` (boolean, optional, default: true) - Include PCOs in results
- `includeOcos` (boolean, optional, default: true) - Include OCOs in results
- `includeCcos` (boolean, optional, default: true) - Include CCOs in results
- `pcoStatus` (string, optional) - Filter PCOs by status
- `ocoStatus` (string, optional) - Filter OCOs by status
- `ccoStatus` (string, optional) - Filter CCOs by status

**Response** (200 OK):
```json
{
  "pcos": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "number": "PCO-001",
      "title": "Additional Electrical Work",
      "totalAmount": 17500.00,
      "status": "CONVERTED"
    }
  ],
  "ocos": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "number": "OCO-001",
      "title": "Site Work Modifications",
      "amount": 45000.00,
      "status": "APPROVED"
    }
  ],
  "ccos": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440004",
      "number": "CCO-001",
      "title": "Additional Electrical Scope",
      "amount": 12000.00,
      "status": "APPROVED"
    }
  ],
  "totalCount": 3,
  "totalAmount": 74500.00
}
```

---

### GET /api/v1/projects/:projectId/change-orders/summary

Get comprehensive change order statistics for a project.

**Path Parameters**:
- `projectId` (string, required) - The project ID

**Response** (200 OK):
```json
{
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "totalOcoCount": 5,
  "totalOcoAmount": 187500.00,
  "ocoDraftCount": 1,
  "ocoPendingCount": 1,
  "ocoApprovedCount": 2,
  "ocoRejectedCount": 0,
  "ocoExecutedCount": 1,
  "ocoApprovedAmount": 95000.00,
  "ocoExecutedAmount": 45000.00,
  "totalCcoCount": 8,
  "totalCcoAmount": 156000.00,
  "ccoDraftCount": 2,
  "ccoPendingCount": 2,
  "ccoApprovedCount": 3,
  "ccoRejectedCount": 0,
  "ccoExecutedCount": 1,
  "ccoApprovedAmount": 78000.00,
  "ccoExecutedAmount": 32000.00,
  "totalChangeOrderCount": 13,
  "totalChangeOrderAmount": 343500.00,
  "totalApprovedAmount": 173000.00,
  "totalExecutedAmount": 77000.00,
  "budgetImpactPercentage": 3.46
}
```

---

### GET /api/v1/projects/:projectId/change-orders/log

Get change order history log (audit trail for all change orders).

**Path Parameters**:
- `projectId` (string, required) - The project ID

**Query Parameters**:
- `limit` (number, optional, default: 100) - Maximum number of history entries to return

**Response** (200 OK):
```json
[
  {
    "id": "hist-001",
    "changeOrderId": "880e8400-e29b-41d4-a716-446655440003",
    "changeOrderType": "OCO",
    "changeOrderNumber": "OCO-001",
    "action": "APPROVED",
    "performedById": "user789",
    "performedBy": {
      "id": "user789",
      "name": "John Smith",
      "email": "john.smith@example.com"
    },
    "performedAt": "2025-12-08T15:00:00Z",
    "notes": "Approved by owner representative",
    "previousStatus": "PENDING_APPROVAL",
    "newStatus": "APPROVED"
  },
  {
    "id": "hist-002",
    "changeOrderId": "990e8400-e29b-41d4-a716-446655440004",
    "changeOrderType": "CCO",
    "changeOrderNumber": "CCO-001",
    "action": "SUBMITTED",
    "performedById": "user123",
    "performedBy": {
      "id": "user123",
      "name": "Jane Doe",
      "email": "jane.doe@example.com"
    },
    "performedAt": "2025-12-08T12:00:00Z",
    "notes": "Ready for project manager approval",
    "previousStatus": "DRAFT",
    "newStatus": "PENDING_APPROVAL"
  }
]
```

---

## Approval Thresholds

### GET /api/v1/projects/:projectId/co-approval-thresholds

Get approval threshold configuration for a project.

**Path Parameters**:
- `projectId` (string, required) - The project ID

**Response** (200 OK):
```json
[
  {
    "id": "threshold-001",
    "projectId": "123e4567-e89b-12d3-a456-426614174000",
    "minAmount": 0,
    "maxAmount": 10000,
    "requiredRole": "PROJECT_MANAGER",
    "requiresOwnerApproval": false,
    "sortOrder": 0,
    "isActive": true
  },
  {
    "id": "threshold-002",
    "projectId": "123e4567-e89b-12d3-a456-426614174000",
    "minAmount": 10000,
    "maxAmount": 50000,
    "requiredRole": "DIRECTOR",
    "requiresOwnerApproval": true,
    "sortOrder": 1,
    "isActive": true
  },
  {
    "id": "threshold-003",
    "projectId": "123e4567-e89b-12d3-a456-426614174000",
    "minAmount": 50000,
    "maxAmount": null,
    "requiredRole": "VP",
    "requiresOwnerApproval": true,
    "sortOrder": 2,
    "isActive": true
  }
]
```

**Default Thresholds**:

If no custom thresholds are configured, the system uses these defaults:

| Amount Range | Required Role | Owner Approval Required |
|--------------|---------------|-------------------------|
| $0 - $10,000 | PROJECT_MANAGER | No |
| $10,000 - $50,000 | DIRECTOR | Yes |
| $50,000+ | VP | Yes |

---

### PUT /api/v1/projects/:projectId/co-approval-thresholds

Update approval threshold configuration for a project.

**Path Parameters**:
- `projectId` (string, required) - The project ID

**Request Body**:
```json
{
  "thresholds": [
    {
      "minAmount": 0,
      "maxAmount": 5000,
      "requiredRole": "PROJECT_MANAGER",
      "requiresOwnerApproval": false
    },
    {
      "minAmount": 5000,
      "maxAmount": 25000,
      "requiredRole": "DIRECTOR",
      "requiresOwnerApproval": false
    },
    {
      "minAmount": 25000,
      "maxAmount": 100000,
      "requiredRole": "VP",
      "requiresOwnerApproval": true
    },
    {
      "minAmount": 100000,
      "maxAmount": null,
      "requiredRole": "CEO",
      "requiresOwnerApproval": true
    }
  ]
}
```

**Response** (200 OK):
```json
[
  {
    "id": "threshold-004",
    "minAmount": 0,
    "maxAmount": 5000,
    "requiredRole": "PROJECT_MANAGER",
    "requiresOwnerApproval": false,
    "sortOrder": 0,
    "isActive": true
  },
  {
    "id": "threshold-005",
    "minAmount": 5000,
    "maxAmount": 25000,
    "requiredRole": "DIRECTOR",
    "requiresOwnerApproval": false,
    "sortOrder": 1,
    "isActive": true
  },
  {
    "id": "threshold-006",
    "minAmount": 25000,
    "maxAmount": 100000,
    "requiredRole": "VP",
    "requiresOwnerApproval": true,
    "sortOrder": 2,
    "isActive": true
  },
  {
    "id": "threshold-007",
    "minAmount": 100000,
    "maxAmount": null,
    "requiredRole": "CEO",
    "requiresOwnerApproval": true,
    "sortOrder": 3,
    "isActive": true
  }
]
```

**Validation Rules**:
- Threshold ranges must not overlap
- Each threshold must have minAmount < maxAmount (except the last threshold which can have null maxAmount)
- Ranges should be continuous with no gaps
- The last threshold should have maxAmount = null to cover all amounts above minAmount

---

## Error Codes

### Standard HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created successfully |
| 204 | No Content - Request succeeded with no response body |
| 400 | Bad Request - Invalid request parameters or body |
| 401 | Unauthorized - Authentication required or failed |
| 403 | Forbidden - User lacks permission for this action |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Request conflicts with current state |
| 422 | Unprocessable Entity - Validation failed |
| 500 | Internal Server Error - Server encountered an error |

### Common Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "amount",
      "message": "amount must be a positive number"
    }
  ]
}
```

### Business Logic Errors

**Cannot Update - Invalid Status**:
```json
{
  "statusCode": 400,
  "message": "Cannot update OCO in APPROVED status. Only DRAFT or REJECTED OCOs can be updated."
}
```

**Insufficient Permissions**:
```json
{
  "statusCode": 403,
  "message": "User does not have required role (DIRECTOR) to approve this change order"
}
```

**State Transition Error**:
```json
{
  "statusCode": 409,
  "message": "Cannot approve OCO. Current status is DRAFT. OCO must be PENDING_APPROVAL to be approved."
}
```

**Validation Error**:
```json
{
  "statusCode": 422,
  "message": "Cannot convert PCO to OCO. PCO must be in APPROVED status."
}
```

---

## Best Practices

### 1. Status Workflow Management

Always follow the proper status workflow for each change order type:
- **PCO**: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → CONVERTED
- **OCO/CCO**: DRAFT → PENDING_APPROVAL → APPROVED → EXECUTED

Do not skip states or attempt unauthorized transitions.

### 2. Cost Breakdown Detail

For OCOs, always provide detailed cost breakdowns by cost code. This ensures:
- Accurate budget impact analysis
- Proper cost tracking
- Better project financial reporting

### 3. Document Attachments

Attach supporting documents to change orders:
- Proposals from subcontractors
- Design drawings
- Owner correspondence
- Signed approvals

### 4. Package Usage

Use packages for:
- Monthly change order batches
- Related scope changes
- Streamlined approval workflows

### 5. Approval Thresholds

Configure approval thresholds based on:
- Company policy
- Project size and complexity
- Owner requirements
- Risk management needs

Review and adjust thresholds periodically as projects evolve.

### 6. Linking OCOs and CCOs

When creating CCOs that relate to OCOs:
- Set the `relatedOcoId` field
- Ensure CCO amounts align with OCO budgets
- Track cost passthrough from owner to subcontractor

### 7. Audit Trail

The change order log provides a complete audit trail. Review it regularly to:
- Track approval timelines
- Identify bottlenecks
- Ensure compliance
- Support project reviews

---

## Rate Limiting

API requests are subject to rate limiting to ensure system stability:
- **Rate Limit**: 1000 requests per hour per user
- **Burst Limit**: 100 requests per minute per user

**Rate Limit Headers**:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 857
X-RateLimit-Reset: 1638360000
```

**Rate Limit Exceeded Response** (429 Too Many Requests):
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 3600
}
```

---

## Pagination

List endpoints support pagination for large result sets:

**Query Parameters**:
- `page` (number, default: 1) - Page number
- `limit` (number, default: 50, max: 200) - Items per page

**Paginated Response Format**:
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 50,
    "totalItems": 234,
    "totalPages": 5
  },
  "links": {
    "first": "/api/v1/projects/:projectId/ocos?page=1&limit=50",
    "prev": null,
    "next": "/api/v1/projects/:projectId/ocos?page=2&limit=50",
    "last": "/api/v1/projects/:projectId/ocos?page=5&limit=50"
  }
}
```

---

## Versioning

The API uses URL-based versioning:
- Current version: **v1**
- Base URL format: `/api/v1/...`

When breaking changes are introduced, a new version will be released (e.g., `/api/v2/...`). Previous versions will be maintained for a deprecation period.

---

## Support

For API support and questions:
- **Documentation**: https://docs.bobthebuilder.com
- **Email**: api-support@bobthebuilder.com
- **Status Page**: https://status.bobthebuilder.com
