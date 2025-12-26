# Drawing Management System

Complete documentation for the construction drawing management system with industry-standard features including drawing sets, sheet numbering, revision tracking, and cross-referencing.

## Table of Contents

- [Overview](#overview)
- [Key Concepts](#key-concepts)
- [API Endpoints](#api-endpoints)
- [Workflows](#workflows)
- [Data Models](#data-models)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## Overview

The Drawing Management System provides enterprise-grade construction drawing organization with industry-standard features designed for AEC (Architecture, Engineering, Construction) projects.

### Features

- **Drawing Sets**: Organize drawings by phase (SD, DD, CD, Bid, Permit, IFC, As-Built)
- **Sheet Numbering**: Industry-standard validation (A-101, S-201.1, M-301)
- **Revision Tracking**: Complete revision history with cloud/delta annotations
- **Cross-References**: Bidirectional linking between drawings
- **RFI/ASI Integration**: Link revisions to RFIs, ASIs, change orders, addenda
- **Distribution Tracking**: Track who received which revision when
- **Audit Trail**: Complete compliance-grade tracking

---

## Key Concepts

### Drawing Sets

Drawing sets group related drawings by phase or purpose:

- **SD** (Schematic Design) - Initial design concepts
- **DD** (Design Development) - Refined design
- **CD** (Construction Documents) - Detailed construction drawings
- **BID** - Bid/tender package
- **PERMIT** - Permit submission package
- **IFC** (Issued for Construction) - Final construction documents
- **AS_BUILT** - As-built/record drawings

### Sheet Numbering

Standard format: `{Discipline}-{Number}[.{Sub}]`

**Discipline Codes:**
- **A** - Architectural
- **S** - Structural
- **M** - Mechanical
- **E** - Electrical
- **P** - Plumbing
- **L** - Landscape
- **C** - Civil

**Examples:**
- `A-101` - Architectural, sheet 101
- `S-201.1` - Structural, sheet 201, sub-sheet 1
- `M-301` - Mechanical, sheet 301

### Revisions

Revisions track formal changes to drawings with:
- **Revision marker** (A, B, C or 1, 2, 3)
- **Cloud/delta locations** (where changes are marked)
- **Description** (what changed)
- **Related documents** (RFI, ASI, change order, addendum numbers)
- **Distribution list** (who received it)

### Cross-References

Link drawings that reference each other:
- "See A-501 for wall section detail"
- "Refer to S-201 for structural notes"
- Automatic bidirectional tracking

---

## API Endpoints

Base path: `/api/projects/:projectId`

### Drawing Sets

#### 1. Create Drawing Set

**Endpoint**: `POST /drawing-sets`

**Request Body**:
```json
{
  "name": "Construction Documents - Phase 1",
  "setType": "CD",
  "description": "Complete construction documents for permit submission",
  "issueDate": "2024-01-15",
  "revisionLabel": "A",
  "metadata": {
    "projectPhase": "Phase 1",
    "submittalNumber": "SUB-001"
  }
}
```

**Response** (201):
```json
{
  "id": "set-uuid",
  "projectId": "project-uuid",
  "name": "Construction Documents - Phase 1",
  "setType": "CD",
  "status": "draft",
  "drawingCount": 0,
  "issueDate": "2024-01-15",
  "revisionLabel": "A",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

---

#### 2. Get All Drawing Sets

**Endpoint**: `GET /drawing-sets`

**Query Parameters**:
- `setType` (optional) - Filter by type (SD, DD, CD, etc.)
- `status` (optional) - Filter by status (draft, issued, superseded, archived)
- `isCurrent` (optional) - Filter by current flag

**Response** (200):
```json
[
  {
    "id": "set-uuid",
    "name": "Construction Documents - Phase 1",
    "setType": "CD",
    "status": "issued",
    "drawingCount": 25,
    "isCurrent": true,
    "issueDate": "2024-01-15"
  }
]
```

---

#### 3. Issue Drawing Set

**Endpoint**: `POST /drawing-sets/:setId/issue`

**Request Body**:
```json
{
  "issueDate": "2024-01-15T10:00:00Z",
  "issuePurpose": "Issued for construction",
  "drawingIds": ["drawing-1-id", "drawing-2-id"],
  "recipients": [
    {
      "name": "General Contractor",
      "email": "gc@example.com",
      "company": "ABC Construction"
    }
  ]
}
```

**Response** (200):
```json
{
  "id": "set-uuid",
  "status": "issued",
  "issueDate": "2024-01-15T10:00:00Z",
  "message": "Drawing set issued successfully"
}
```

---

#### 4. Mark Set as Current

**Endpoint**: `POST /drawing-sets/:setId/mark-current`

Marks this set as the current/active set (unmarks previous current set).

**Response** (200):
```json
{
  "id": "set-uuid",
  "isCurrent": true,
  "message": "Drawing set marked as current"
}
```

---

#### 5. Supersede Drawing Set

**Endpoint**: `POST /drawing-sets/:setId/supersede`

**Request Body**:
```json
{
  "supersededById": "new-set-uuid",
  "reason": "New revision issued with design changes per RFI-042"
}
```

**Response** (200):
```json
{
  "id": "set-uuid",
  "status": "superseded",
  "supersededById": "new-set-uuid",
  "message": "Drawing set superseded"
}
```

---

### Drawings

#### 1. Create Drawing

**Endpoint**: `POST /drawings`

**Request Body**:
```json
{
  "documentId": "document-uuid",
  "number": "A-101",
  "title": "First Floor Plan",
  "discipline": "ARCHITECTURAL",
  "drawingType": "PLAN",
  "drawingSetId": "set-uuid",
  "sheetSize": "ARCH D",
  "pageNumber": 1,
  "currentRevision": "A",
  "revisionDate": "2024-01-15",
  "tags": ["floor-plan", "level-1"]
}
```

**Response** (201):
```json
{
  "id": "drawing-uuid",
  "documentId": "document-uuid",
  "number": "A-101",
  "title": "First Floor Plan",
  "discipline": "ARCHITECTURAL",
  "drawingType": "PLAN",
  "currentRevision": "A",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

**Validation**: Sheet number must match pattern `{Discipline}-{Number}[.{Sub}]`

---

#### 2. Get All Drawings

**Endpoint**: `GET /drawings`

**Query Parameters**:
- `discipline` - Filter by discipline (A, S, M, E, P, etc.)
- `drawingType` - Filter by type (PLAN, ELEVATION, SECTION, etc.)
- `drawingSetId` - Filter by drawing set
- `search` - Search by number or title

**Response** (200):
```json
[
  {
    "id": "drawing-uuid",
    "number": "A-101",
    "title": "First Floor Plan",
    "discipline": "ARCHITECTURAL",
    "currentRevision": "B",
    "revisionDate": "2024-02-01"
  }
]
```

---

#### 3. Add Revision to Drawing

**Endpoint**: `POST /drawings/:drawingId/revisions`

**Request Body**:
```json
{
  "revisionMarker": "B",
  "issuedDate": "2024-02-01",
  "description": "Updated room 101 dimensions per RFI-042",
  "cloudLocations": ["Grid A1-A3", "Room 101"],
  "relatedRFIs": ["RFI-042"],
  "relatedASIs": ["ASI-15"],
  "isMajorRevision": false,
  "revisionReason": "rfi_response",
  "issuedTo": [
    {
      "recipientName": "General Contractor",
      "recipientCompany": "ABC Construction",
      "recipientEmail": "gc@example.com",
      "distributionMethod": "email"
    }
  ],
  "transmittalNumber": "TR-2024-001"
}
```

**Response** (201):
```json
{
  "id": "revision-uuid",
  "drawingId": "drawing-uuid",
  "revisionMarker": "B",
  "sequenceNumber": 2,
  "issuedDate": "2024-02-01",
  "description": "Updated room 101 dimensions per RFI-042",
  "status": "issued"
}
```

---

#### 4. Get Drawing Revisions

**Endpoint**: `GET /drawings/:drawingId/revisions`

**Response** (200):
```json
[
  {
    "id": "revision-2-uuid",
    "revisionMarker": "B",
    "sequenceNumber": 2,
    "issuedDate": "2024-02-01",
    "description": "Updated room 101 dimensions per RFI-042",
    "cloudLocations": ["Grid A1-A3", "Room 101"],
    "relatedRFIs": ["RFI-042"],
    "isMajorRevision": false
  },
  {
    "id": "revision-1-uuid",
    "revisionMarker": "A",
    "sequenceNumber": 1,
    "issuedDate": "2024-01-15",
    "description": "Initial issue for construction"
  }
]
```

---

#### 5. Create Cross-Reference

**Endpoint**: `POST /drawings/:drawingId/cross-references`

**Request Body**:
```json
{
  "targetDrawingId": "target-drawing-uuid",
  "referenceType": "DETAIL",
  "calloutText": "3/A-501",
  "description": "Wall section at exterior wall",
  "gridLocation": "A1-B2",
  "coordinates": {
    "x": 100,
    "y": 200,
    "page": 1
  },
  "notes": "See detail for waterproofing requirements"
}
```

**Response** (201):
```json
{
  "id": "cross-ref-uuid",
  "sourceDrawingId": "source-drawing-uuid",
  "targetDrawingId": "target-drawing-uuid",
  "referenceType": "DETAIL",
  "calloutText": "3/A-501",
  "isVerified": true,
  "createdAt": "2024-01-15T10:00:00Z"
}
```

---

#### 6. Get Cross-References

**Endpoint**: `GET /drawings/:drawingId/cross-references`

**Response** (200):
```json
{
  "outgoing": [
    {
      "id": "ref-1-uuid",
      "targetDrawingId": "drawing-2-uuid",
      "referenceType": "DETAIL",
      "calloutText": "3/A-501",
      "targetDrawing": {
        "number": "A-501",
        "title": "Wall Sections"
      }
    }
  ],
  "incoming": [
    {
      "id": "ref-2-uuid",
      "sourceDrawingId": "drawing-3-uuid",
      "referenceType": "PLAN",
      "sourceDrawing": {
        "number": "A-201",
        "title": "Second Floor Plan"
      }
    }
  ]
}
```

---

## Workflows

### Standard Drawing Set Workflow

```
1. Create drawing set (draft status)
   POST /drawing-sets
   → Status: draft

2. Add drawings to set
   POST /drawings (with drawingSetId)
   → Drawings created and added

3. Review and finalize
   (Update drawings as needed)

4. Issue drawing set
   POST /drawing-sets/:setId/issue
   → Status: issued
   → Distribution tracked

5. Mark as current (if applicable)
   POST /drawing-sets/:setId/mark-current
   → isCurrent: true
```

### Drawing Revision Workflow

```
1. Create initial drawing
   POST /drawings
   → Created with currentRevision

2. Make changes requiring revision
   (Upload new document version)

3. Record revision
   POST /drawings/:drawingId/revisions
   → New revision created
   → Drawing's currentRevision updated
   → Distribution tracked

4. Link to RFIs/ASIs
   (Include related RFI/ASI numbers in revision)
   → Traceability maintained
```

### Cross-Reference Workflow

```
1. Identify reference on drawing
   (e.g., "See A-501 for detail")

2. Create cross-reference
   POST /drawings/:drawingId/cross-references
   → Bidirectional link created

3. Query references
   GET /drawings/:drawingId/cross-references
   → See all related drawings
```

---

## Data Models

### DrawingSet

```typescript
{
  id: string;
  projectId: string;
  name: string;
  setType: 'SD' | 'DD' | 'CD' | 'BID' | 'PERMIT' | 'IFC' | 'AS_BUILT' | 'OTHER';
  description: string | null;
  status: 'draft' | 'issued' | 'superseded' | 'archived';
  issueDate: Date | null;
  revisionLabel: string | null;
  drawingCount: number;
  isCurrent: boolean;
  supersededById: string | null;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### Drawing

```typescript
{
  id: string;
  documentId: string;
  drawingSetId: string | null;
  number: string;  // e.g., "A-101", "S-201.1"
  title: string;
  discipline: DrawingDiscipline;
  drawingType: DrawingType;
  sheetSize: string | null;
  pageNumber: number | null;
  currentRevision: string | null;
  revisionDate: Date | null;
  revisionHistory: Array<{
    revision: string;
    date: string;
    description: string;
    cloudLocations?: string[];
  }>;
  gridReference: string | null;
  area: string | null;
  zone: string | null;
  tags: string[];
  customFields: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### DrawingRevision

```typescript
{
  id: string;
  drawingId: string;
  revisionMarker: string;  // "A", "B", "1", "2", etc.
  sequenceNumber: number;
  issuedDate: Date;
  description: string;
  cloudLocations: string[];
  cloudCoordinates: Array<{
    type: 'box' | 'polygon';
    points: Array<{ x: number; y: number }>;
    label?: string;
    page?: number;
  }> | null;
  relatedRFIs: string[];
  relatedASIs: string[];
  relatedChangeOrders: string[];
  relatedAddenda: string[];
  notes: string | null;
  issuedTo: Array<{
    recipientName: string;
    recipientCompany?: string;
    recipientEmail?: string;
    distributionMethod: 'email' | 'transmittal' | 'shared_link' | 'portal';
    distributedAt: string;
    acknowledged?: boolean;
  }>;
  transmittalNumber: string | null;
  status: 'draft' | 'issued' | 'superseded' | 'void';
  isMajorRevision: boolean;
  revisionReason: 'design_change' | 'error_correction' | 'coordination' |
                  'code_compliance' | 'constructability' | 'cost_reduction' |
                  'owner_request' | 'rfi_response' | 'other' | null;
  createdAt: Date;
}
```

### DrawingCrossReference

```typescript
{
  id: string;
  sourceDrawingId: string;
  targetDrawingId: string;
  referenceType: 'DETAIL' | 'SECTION' | 'ELEVATION' | 'PLAN' |
                 'SCHEDULE' | 'ENLARGED_PLAN' | 'REFLECTED_CEILING' | 'OTHER';
  calloutText: string | null;  // e.g., "3/A-501"
  description: string | null;
  gridLocation: string | null;
  coordinates: {
    x: number;
    y: number;
    page?: number;
  } | null;
  notes: string | null;
  isAutoGenerated: boolean;
  isVerified: boolean;
  verifiedById: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
}
```

---

## Best Practices

### Sheet Numbering

**Good practices:**
- Use discipline prefix (A-, S-, M-, E-, etc.)
- Sequential numbering by discipline (A-101, A-102, A-103)
- Sub-sheets with decimal (A-101.1, A-101.2)
- Leave gaps for future sheets (101, 110, 120)

**Examples:**
```
✅ A-101 (Architectural, sheet 101)
✅ S-201.1 (Structural, sheet 201, sub-sheet 1)
✅ M-301 (Mechanical, sheet 301)

❌ A101 (missing hyphen)
❌ ARCH-101 (discipline code too long)
❌ A-1 (should be A-101 or A-001)
```

### Revision Markers

**Sequential letters** (most common):
- A, B, C, D... for design changes
- AA, AB, AC... after Z if needed

**Sequential numbers**:
- 1, 2, 3, 4... for construction changes

**Hybrid**:
- 0, 1, 2... for pre-bid
- A, B, C... for post-bid

### Revision Descriptions

Always include meaningful descriptions:

```
✅ "Updated room 101 dimensions per RFI-042"
✅ "Added door 105 per ASI-15"
✅ "Corrected beam sizes at grid line A per structural review"

❌ "Changes"
❌ "Update"
❌ "Rev B"
```

### Cross-References

Best practices for callout text:

```
✅ "3/A-501" (detail 3 on sheet A-501)
✅ "SECTION A-A" (section marker)
✅ "SEE A-201" (reference to another sheet)

❌ "See detail" (not specific)
❌ "Detail 3" (missing sheet reference)
```

### Distribution Tracking

Always record distributions for:
- Formal submittals (permits, bids)
- Issued for construction (IFC) drawings
- Revisions affecting pricing
- Owner/authority approvals

---

## Examples

### Example 1: Create Complete Drawing Set

```bash
# 1. Create drawing set
POST /api/projects/{projectId}/drawing-sets
{
  "name": "Permit Set - January 2024",
  "setType": "PERMIT",
  "description": "Complete permit submission package",
  "issueDate": "2024-01-15"
}

# 2. Create drawings
POST /api/projects/{projectId}/drawings
{
  "documentId": "doc-1-uuid",
  "number": "A-101",
  "title": "Site Plan",
  "discipline": "ARCHITECTURAL",
  "drawingType": "PLAN",
  "drawingSetId": "{setId}"
}

# 3. Add more drawings...

# 4. Issue the set
POST /api/projects/{projectId}/drawing-sets/{setId}/issue
{
  "issueDate": "2024-01-15T10:00:00Z",
  "issuePurpose": "Permit submission",
  "recipients": [
    {
      "name": "Building Department",
      "company": "City of Portland"
    }
  ]
}
```

### Example 2: Add Revision with RFI Link

```bash
POST /api/projects/{projectId}/drawings/{drawingId}/revisions
{
  "revisionMarker": "B",
  "issuedDate": "2024-02-01",
  "description": "Structural beam size increased per engineer",
  "cloudLocations": ["Grid Line A, between 1-2"],
  "relatedRFIs": ["RFI-042"],
  "relatedASIs": [],
  "isMajorRevision": true,
  "revisionReason": "design_change",
  "issuedTo": [
    {
      "recipientName": "General Contractor",
      "recipientCompany": "ABC Construction",
      "recipientEmail": "pm@abcconstruction.com",
      "distributionMethod": "email"
    }
  ]
}
```

### Example 3: Link Related Drawings

```bash
# Drawing A-101 references detail on A-501
POST /api/projects/{projectId}/drawings/{A-101-id}/cross-references
{
  "targetDrawingId": "{A-501-id}",
  "referenceType": "DETAIL",
  "calloutText": "3/A-501",
  "description": "Wall section at exterior wall",
  "gridLocation": "Grid A, Line 2"
}

# Query all references for A-101
GET /api/projects/{projectId}/drawings/{A-101-id}/cross-references
# Returns both outgoing (A-101 → others) and incoming (others → A-101)
```

---

## Integration Examples

### Frontend Integration

```typescript
// Create drawing set
const createSet = async () => {
  const response = await fetch(
    `/api/projects/${projectId}/drawing-sets`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Construction Documents',
        setType: 'CD',
        description: 'Complete CD set for Phase 1'
      })
    }
  );
  return response.json();
};

// Add revision
const addRevision = async (drawingId: string) => {
  const response = await fetch(
    `/api/projects/${projectId}/drawings/${drawingId}/revisions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        revisionMarker: 'B',
        issuedDate: new Date(),
        description: 'Updated per RFI-042',
        relatedRFIs: ['RFI-042']
      })
    }
  );
  return response.json();
};
```

---

## Troubleshooting

### Sheet Number Validation Fails

**Error**: "Invalid sheet number format"

**Solution**: Ensure format matches `{Discipline}-{Number}[.{Sub}]`
- Valid: A-101, S-201.1, M-301
- Invalid: A101, ARCH-101, A-1

### Cannot Issue Drawing Set

**Error**: "Can only issue drawing sets in draft status"

**Solution**: Check set status - only draft sets can be issued

### Cross-Reference Creation Fails

**Error**: "Target drawing not found"

**Solution**: Verify both drawings exist in the same project

---

## Support

For issues or questions:
- Review API error messages for specific details
- Check validation requirements for sheet numbering
- Verify drawing set status before issuing/superseding
- Contact system administrator for assistance

