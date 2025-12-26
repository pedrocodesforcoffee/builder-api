# Specification Management System

Complete documentation for the construction specification management system with CSI MasterFormat 2018 organization, addendum tracking, and comprehensive cross-referencing capabilities.

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

The Specification Management System provides enterprise-grade construction specification organization following CSI MasterFormat 2018 standards, designed for AEC (Architecture, Engineering, Construction) projects.

### Features

- **CSI MasterFormat 2018**: Industry-standard 6-digit section numbering (XX YY ZZ)
- **Division Organization**: Complete division structure (00, 01-14, 21-28, 31-35, 40-48)
- **Addendum Tracking**: Post-issuance changes with complete audit trail
- **Product Management**: Track base bid products and acceptable substitutions
- **Cross-References**: Link specifications to drawings and RFIs
- **Applicability Tracking**: Mark sections as N/A for specific projects
- **Submittal Requirements**: Track required submittals per section
- **Comprehensive Audit**: Complete compliance-grade tracking

---

## Key Concepts

### CSI MasterFormat 2018

MasterFormat is the standard for organizing construction specifications and project manuals. Each specification section is identified by a 6-digit number in the format `XX YY ZZ`:

- **XX**: Division (e.g., 03 = Concrete)
- **YY**: Level 2 subdivision
- **ZZ**: Level 3 subdivision

**Example**: `03 30 00` = Division 03 (Concrete) > 30 (Cast-in-Place) > 00 (General)

### Divisions

The system supports all valid CSI MasterFormat 2018 divisions:

#### General Requirements
- **DIV_00**: Procurement and Contracting Requirements
- **DIV_01**: General Requirements

#### Facility Construction (Divisions 02-19)
- **DIV_02**: Existing Conditions
- **DIV_03**: Concrete
- **DIV_04**: Masonry
- **DIV_05**: Metals
- **DIV_06**: Wood, Plastics, and Composites
- **DIV_07**: Thermal and Moisture Protection
- **DIV_08**: Openings
- **DIV_09**: Finishes
- **DIV_10**: Specialties
- **DIV_11**: Equipment
- **DIV_12**: Furnishings
- **DIV_13**: Special Construction
- **DIV_14**: Conveying Equipment

#### Facility Services (Divisions 21-29)
- **DIV_21**: Fire Suppression
- **DIV_22**: Plumbing
- **DIV_23**: Heating, Ventilating, and Air Conditioning (HVAC)
- **DIV_25**: Integrated Automation
- **DIV_26**: Electrical
- **DIV_27**: Communications
- **DIV_28**: Electronic Safety and Security

#### Site and Infrastructure (Divisions 31-39)
- **DIV_31**: Earthwork
- **DIV_32**: Exterior Improvements
- **DIV_33**: Utilities
- **DIV_34**: Transportation
- **DIV_35**: Waterway and Marine Construction

#### Process Equipment (Divisions 40-49)
- **DIV_40**: Process Integration
- **DIV_41**: Material Processing and Handling Equipment
- **DIV_42**: Process Heating, Cooling, and Drying Equipment
- **DIV_43**: Process Gas and Liquid Handling, Purification, and Storage Equipment
- **DIV_44**: Pollution Control Equipment
- **DIV_45**: Industry-Specific Manufacturing Equipment
- **DIV_46**: Water and Wastewater Equipment
- **DIV_48**: Electrical Power Generation

### Section Numbering

Valid section number format: `XX YY ZZ`

**Requirements:**
- Two-digit division code (00, 01-14, 21-28, 31-35, 40-48)
- Two-digit level 2 code (00-99)
- Two-digit level 3 code (00-99)
- Must be separated by single spaces

**Valid Examples:**
- `03 30 00` - Cast-in-Place Concrete (general)
- `09 65 00` - Resilient Flooring
- `26 05 00` - Common Work Results for Electrical

**Invalid Examples:**
- `033000` (no spaces)
- `3 30 00` (single digit division)
- `03-30-00` (dashes instead of spaces)
- `15 30 00` (division 15 not valid in MasterFormat 2018)

### Addenda

Addenda are formal post-issuance changes to specifications. Each addendum:
- Has a sequential number (1, 2, 3 or A, B, C)
- Has an issue date
- Affects one or more specification sections
- Tracks the type of change (add, modify, delete, clarify, supersede)
- Can reference related RFIs

**Change Types:**
- **ADD**: Add new content to section
- **MODIFY**: Change existing content
- **DELETE**: Remove content
- **CLARIFY**: Clarify existing content without changing requirements
- **SUPERSEDE**: Replace section entirely with new document

### Product Tracking

Track products and manufacturers referenced in specifications:

**Base Bid Products**: Primary specified products that bidders must price
**Substitutions**: Acceptable alternatives that may be proposed

Each product record includes:
- Manufacturer name
- Product name
- Model number
- Specification reference (which part mentions it)
- Base bid vs. substitution designation

### Applicability

Mark specification sections as "Not Applicable" for specific projects when:
- Work is not included in the project scope
- Section provided for reference only
- Requirements handled by other sections

### Submittal Requirements

Track required submittals for each specification section:

**Submittal Types:**
- Product Data
- Shop Drawings
- Samples
- Test Reports
- Certifications
- Warranties
- Operation & Maintenance Manuals
- Close-Out Documents

**Timing:**
- Before ordering materials
- Before fabrication
- Before installation
- At completion
- Custom timing requirements

---

## API Endpoints

Base path: `/api/projects/:projectId`

### Specifications

#### 1. Create Specification Section

**Endpoint**: `POST /specifications`

**Request Body**:
```json
{
  "documentId": "uuid",
  "sectionNumber": "03 30 00",
  "sectionTitle": "Cast-in-Place Concrete",
  "division": "DIV_03",
  "scope": "All cast-in-place concrete work including formwork, reinforcement, concrete placement, and finishing.",
  "isApplicable": true,
  "submittalRequirements": [
    {
      "type": "Product Data",
      "description": "Concrete mix designs",
      "timing": "Before concrete placement"
    },
    {
      "type": "Test Reports",
      "description": "Cylinder break tests",
      "timing": "Per testing schedule"
    }
  ],
  "tags": ["concrete", "structural"]
}
```

**Response**: `201 Created`
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "documentId": "uuid",
  "sectionNumber": "03 30 00",
  "sectionTitle": "Cast-in-Place Concrete",
  "division": "DIV_03",
  "divisionName": "Concrete",
  "scope": "All cast-in-place concrete work...",
  "isApplicable": true,
  "submittalRequirements": [...],
  "tags": ["concrete", "structural"],
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

**Validation:**
- Section number must match format `XX YY ZZ`
- Division must be valid CSI MasterFormat division
- Division code must match section number prefix
- Section number must be unique within project
- Document must exist and belong to project

#### 2. List Specifications

**Endpoint**: `GET /specifications`

**Query Parameters**:
- `division` (optional) - Filter by division (e.g., "DIV_03")
- `isApplicable` (optional) - Filter by applicability (true/false)
- `search` (optional) - Search in titles, scope, and tags
- `tag` (optional) - Filter by tag
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 50) - Items per page
- `sort` (optional, default: "sectionNumber") - Sort field
- `order` (optional, default: "asc") - Sort order (asc/desc)

**Response**: `200 OK`
```json
{
  "specifications": [
    {
      "id": "uuid",
      "sectionNumber": "03 30 00",
      "sectionTitle": "Cast-in-Place Concrete",
      "division": "DIV_03",
      "divisionName": "Concrete",
      "isApplicable": true,
      "productCount": 5,
      "drawingLinkCount": 8,
      "rfiLinkCount": 2
    }
  ],
  "summary": {
    "totalSpecifications": 245,
    "applicableCount": 230,
    "notApplicableCount": 15,
    "byDivision": {
      "DIV_03": 12,
      "DIV_09": 18
    }
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "totalPages": 5,
    "totalItems": 245
  }
}
```

#### 3. Get Specification

**Endpoint**: `GET /specifications/:specId`

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "document": {
    "id": "uuid",
    "name": "Section 03 30 00",
    "currentVersionId": "uuid",
    "status": "active"
  },
  "sectionNumber": "03 30 00",
  "sectionTitle": "Cast-in-Place Concrete",
  "division": "DIV_03",
  "divisionName": "Concrete",
  "scope": "All cast-in-place concrete work...",
  "isApplicable": true,
  "submittalRequirements": [...],
  "products": [
    {
      "id": "uuid",
      "manufacturer": "Hilti",
      "productName": "HIT-HY 200",
      "modelNumber": "HIT-HY 200-R",
      "isBaseBid": true,
      "isSubstitution": false,
      "specReference": "Part 2, Section 2.3"
    }
  ],
  "drawingLinks": [
    {
      "id": "uuid",
      "drawing": {
        "id": "uuid",
        "sheetNumber": "S-201",
        "title": "Foundation Plan"
      },
      "relationship": "Referenced in Part 3"
    }
  ],
  "rfiLinks": [
    {
      "id": "uuid",
      "rfi": {
        "id": "uuid",
        "number": "RFI-045",
        "subject": "Concrete strength at parking deck"
      },
      "context": "Clarification on minimum strength"
    }
  ],
  "tags": ["concrete", "structural"],
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

#### 4. Update Specification

**Endpoint**: `PUT /specifications/:specId`

**Request Body**:
```json
{
  "sectionTitle": "Cast-in-Place Concrete - Updated",
  "scope": "Updated scope description...",
  "isApplicable": false,
  "submittalRequirements": [...],
  "tags": ["concrete", "structural", "updated"]
}
```

**Response**: `200 OK` (returns updated specification)

**Note**: Cannot update `sectionNumber` or `division` after creation. Delete and recreate if needed.

#### 5. Delete Specification

**Endpoint**: `DELETE /specifications/:specId`

**Response**: `204 No Content`

**Note**: Cascade deletes all related products, drawing links, RFI links, and addendum sections.

#### 6. Add Product

**Endpoint**: `POST /specifications/:specId/products`

**Request Body**:
```json
{
  "manufacturer": "Hilti",
  "productName": "HIT-HY 200",
  "modelNumber": "HIT-HY 200-R",
  "isBaseBid": true,
  "isSubstitution": false,
  "specReference": "Part 2, Section 2.3",
  "notes": "Approved for structural applications only"
}
```

**Response**: `201 Created`

#### 7. Link Drawing

**Endpoint**: `POST /specifications/:specId/link-drawing`

**Request Body**:
```json
{
  "drawingId": "uuid",
  "relationship": "Referenced in Part 3 - Execution"
}
```

**Response**: `201 Created`

**Validation:**
- Drawing must exist and belong to project
- No duplicate links (same spec + drawing)

#### 8. Link RFI

**Endpoint**: `POST /specifications/:specId/link-rfi`

**Request Body**:
```json
{
  "rfiId": "uuid",
  "context": "Clarification on concrete strength requirements for parking deck"
}
```

**Response**: `201 Created`

**Validation:**
- RFI must exist and belong to project

### Addenda

#### 1. Create Addendum

**Endpoint**: `POST /addenda`

**Request Body**:
```json
{
  "number": "1",
  "title": "Addendum No. 1",
  "issueDate": "2024-01-20",
  "description": "Changes to concrete and waterproofing specifications",
  "documentId": "uuid",
  "affectedSections": [
    {
      "specificationId": "uuid",
      "changeType": "modify",
      "changeDescription": "Updated concrete strength from 3,500 PSI to 4,000 PSI",
      "newContent": "4,000 PSI minimum at 28 days",
      "newDocumentId": "uuid"
    },
    {
      "specificationId": "uuid",
      "changeType": "add",
      "changeDescription": "Added waterproofing requirements for below-grade walls"
    }
  ],
  "relatedRfis": ["uuid", "uuid"]
}
```

**Response**: `201 Created`
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "number": "1",
  "title": "Addendum No. 1",
  "issueDate": "2024-01-20",
  "description": "Changes to concrete and waterproofing specifications",
  "document": {
    "id": "uuid",
    "name": "Addendum 1"
  },
  "affectedSections": [
    {
      "specificationId": "uuid",
      "sectionNumber": "03 30 00",
      "sectionTitle": "Cast-in-Place Concrete",
      "changeType": "modify",
      "changeDescription": "Updated concrete strength..."
    },
    {
      "specificationId": "uuid",
      "sectionNumber": "07 10 00",
      "sectionTitle": "Dampproofing and Waterproofing",
      "changeType": "add",
      "changeDescription": "Added waterproofing requirements..."
    }
  ],
  "createdAt": "2024-01-20T14:00:00Z"
}
```

**Validation:**
- Addendum number must be unique within project
- All affected specifications must exist in project
- Document (if provided) must exist in project

#### 2. List Addenda

**Endpoint**: `GET /addenda`

**Query Parameters**:
- `affectsSection` (optional) - Filter by section number (e.g., "03 30 00")
- `issuedAfter` (optional) - ISO date string
- `issuedBefore` (optional) - ISO date string
- `sortOrder` (optional, default: "desc") - Sort by issue date (asc/desc)

**Response**: `200 OK`
```json
{
  "addenda": [
    {
      "id": "uuid",
      "number": "2",
      "title": "Addendum No. 2",
      "issueDate": "2024-01-25",
      "affectedSections": [...]
    },
    {
      "id": "uuid",
      "number": "1",
      "title": "Addendum No. 1",
      "issueDate": "2024-01-20",
      "affectedSections": [...]
    }
  ],
  "summary": {
    "totalAddenda": 2,
    "totalSectionsAffected": 8,
    "latestIssueDate": "2024-01-25"
  }
}
```

#### 3. Get Addendum

**Endpoint**: `GET /addenda/:addendumId`

**Response**: `200 OK` (returns full addendum with all affected sections)

#### 4. Get Specification Addendum History

**Endpoint**: `GET /addenda/specifications/:specId/history`

**Response**: `200 OK`
```json
{
  "specificationId": "uuid",
  "sectionNumber": "03 30 00",
  "sectionTitle": "Cast-in-Place Concrete",
  "addendaHistory": [
    {
      "addendumId": "uuid",
      "addendumNumber": "1",
      "issueDate": "2024-01-20",
      "changeType": "modify",
      "changeDescription": "Updated concrete strength from 3,500 PSI to 4,000 PSI"
    },
    {
      "addendumId": "uuid",
      "addendumNumber": "2",
      "issueDate": "2024-01-25",
      "changeType": "clarify",
      "changeDescription": "Clarified curing requirements for cold weather"
    }
  ]
}
```

#### 5. Delete Addendum

**Endpoint**: `DELETE /addenda/:addendumId`

**Response**: `204 No Content`

**Note**: Soft delete - record marked as deleted but retained for audit purposes.

---

## Workflows

### 1. Creating a Complete Specification Package

```javascript
// Step 1: Create specification section
const spec = await createSpecification({
  sectionNumber: "03 30 00",
  sectionTitle: "Cast-in-Place Concrete",
  division: "DIV_03",
  scope: "All cast-in-place concrete work...",
  documentId: "uploaded-spec-document-uuid",
  submittalRequirements: [
    {
      type: "Product Data",
      description: "Concrete mix designs",
      timing: "Before concrete placement"
    }
  ]
});

// Step 2: Add base bid products
await addProduct(spec.id, {
  manufacturer: "BASF",
  productName: "MasterGlenium 7920",
  modelNumber: "7920",
  isBaseBid: true,
  specReference: "Part 2, Section 2.1"
});

// Step 3: Add acceptable substitutions
await addProduct(spec.id, {
  manufacturer: "Sika",
  productName: "ViscoCrete 2100",
  isBaseBid: false,
  isSubstitution: true,
  specReference: "Part 2, Section 2.1"
});

// Step 4: Link related drawings
await linkDrawing(spec.id, {
  drawingId: "foundation-plan-uuid",
  relationship: "Referenced in Part 3 - Placement"
});

// Step 5: Link related RFIs
await linkRfi(spec.id, {
  rfiId: "rfi-045-uuid",
  context: "Clarification on minimum strength"
});
```

### 2. Issuing an Addendum

```javascript
// Step 1: Create addendum
const addendum = await createAddendum({
  number: "1",
  title: "Addendum No. 1",
  issueDate: "2024-01-20",
  description: "Modifications to concrete specifications per RFI-045",
  documentId: "addendum-doc-uuid",
  affectedSections: [
    {
      specificationId: "spec-uuid",
      changeType: "modify",
      changeDescription: "Increased concrete strength to 4,000 PSI",
      newContent: "Minimum 4,000 PSI at 28 days"
    }
  ],
  relatedRfis: ["rfi-045-uuid"]
});

// Step 2: Review affected sections
const history = await getSpecificationHistory(spec.id);
console.log(`Section ${history.sectionNumber} has been modified by ${history.addendaHistory.length} addenda`);
```

### 3. Managing Specification Applicability

```javascript
// Mark section as Not Applicable
await updateSpecification(spec.id, {
  isApplicable: false,
  scope: "N/A - Work not included in this project scope"
});

// Filter for applicable sections only
const applicable = await listSpecifications({
  isApplicable: true
});
```

### 4. Tracking Products Across Divisions

```javascript
// Search for all specifications mentioning Hilti products
const specs = await listSpecifications({
  search: "Hilti"
});

// Get detailed product references
for (const spec of specs) {
  const detail = await getSpecification(spec.id);
  const hiltiProducts = detail.products.filter(p =>
    p.manufacturer === "Hilti"
  );
  console.log(`${spec.sectionNumber}: ${hiltiProducts.length} Hilti products`);
}
```

---

## Data Models

### Specification Entity

```typescript
interface Specification {
  id: string;
  projectId: string;
  documentId: string;
  sectionNumber: string;          // "03 30 00"
  sectionTitle: string;            // "Cast-in-Place Concrete"
  division: SpecificationDivision; // DIV_03
  scope: string | null;
  isApplicable: boolean;           // Default: true
  submittalRequirements: SubmittalRequirement[];
  tags: string[];
  createdById: string;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  // Relations
  document: Document;
  products: SpecificationProduct[];
  drawingLinks: SpecificationDrawing[];
  rfiLinks: SpecificationRfi[];
  addendumSections: AddendumSection[];
}

interface SubmittalRequirement {
  type: string;        // "Product Data", "Shop Drawings", etc.
  description: string;
  timing?: string;     // "Before fabrication", etc.
}
```

### SpecificationProduct Entity

```typescript
interface SpecificationProduct {
  id: string;
  specificationId: string;
  manufacturer: string;
  productName: string;
  modelNumber: string | null;
  isBaseBid: boolean;         // Default: true
  isSubstitution: boolean;    // Default: false
  specReference: string | null; // "Part 2, Section 2.3"
  notes: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  specification: Specification;
}
```

### Addendum Entity

```typescript
interface Addendum {
  id: string;
  projectId: string;
  number: string;              // "1", "2", "A", "B"
  title: string;
  issueDate: Date;
  description: string;
  documentId: string | null;
  relatedRfiIds: string[];     // Array of RFI UUIDs
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  // Relations
  document: Document | null;
  affectedSections: AddendumSection[];
}
```

### AddendumSection Entity

```typescript
enum AddendumChangeType {
  ADD = 'add',
  MODIFY = 'modify',
  DELETE = 'delete',
  CLARIFY = 'clarify',
  SUPERSEDE = 'supersede'
}

interface AddendumSection {
  id: string;
  addendumId: string;
  specificationId: string;
  changeType: AddendumChangeType;
  changeDescription: string;
  newContent: string | null;
  newDocumentId: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  addendum: Addendum;
  specification: Specification;
  newDocument: Document | null;
}
```

### SpecificationDrawing Entity

```typescript
interface SpecificationDrawing {
  id: string;
  specificationId: string;
  drawingId: string;
  relationship: string | null;  // "Referenced in Part 3"
  createdById: string;
  createdAt: Date;

  // Relations
  specification: Specification;
  drawing: Drawing;
}
```

### SpecificationRfi Entity

```typescript
interface SpecificationRfi {
  id: string;
  specificationId: string;
  rfiId: string;
  context: string | null;  // "Clarification on strength requirements"
  createdById: string;
  createdAt: Date;

  // Relations
  specification: Specification;
  rfi: Rfi;
}
```

---

## Best Practices

### 1. Section Numbering

**DO:**
- Use proper CSI MasterFormat 2018 section numbers
- Include spaces between digit pairs: `03 30 00`
- Validate division codes before creation
- Keep numbering consistent with industry standards

**DON'T:**
- Use invalid division numbers (15, 16, 17, 18, 19, 20, 24, 29, 36-39, 47, 49)
- Omit spaces in section numbers
- Create custom numbering schemes

### 2. Specification Content

**DO:**
- Write clear, concise scope statements
- Include all submittal requirements
- Tag specifications with searchable keywords
- Mark inapplicable sections explicitly
- Reference related drawings and RFIs

**DON'T:**
- Leave scope field empty
- Duplicate content across multiple sections
- Forget to link related documents

### 3. Product Management

**DO:**
- Clearly designate base bid vs. substitutions
- Include complete manufacturer and model information
- Reference specific specification locations
- Track all acceptable alternatives

**DON'T:**
- List products without manufacturer names
- Mix base bid and substitution designations
- Forget to update products when specs change

### 4. Addendum Management

**DO:**
- Use sequential numbering (1, 2, 3)
- Include clear change descriptions
- Reference related RFIs
- Track issue dates accurately
- Link to updated specification documents

**DON'T:**
- Skip addendum numbers
- Issue addenda without proper documentation
- Forget to mark affected sections
- Leave change descriptions vague

### 5. Cross-Referencing

**DO:**
- Link specifications to related drawings
- Link specifications to related RFIs
- Include relationship context
- Maintain bidirectional links

**DON'T:**
- Create references without context
- Link unrelated documents
- Forget to update links when documents change

### 6. Data Integrity

**DO:**
- Validate section numbers before creation
- Check for duplicate section numbers
- Verify division/section number consistency
- Soft delete instead of hard delete
- Maintain complete audit trails

**DON'T:**
- Allow duplicate section numbers
- Hard delete specifications with dependencies
- Skip validation checks

---

## Examples

### Example 1: Complete Concrete Specification

```json
{
  "sectionNumber": "03 30 00",
  "sectionTitle": "Cast-in-Place Concrete",
  "division": "DIV_03",
  "scope": "All cast-in-place concrete work including formwork, reinforcement, concrete placement, finishing, and curing for foundations, slabs-on-grade, suspended slabs, columns, beams, and walls.",
  "submittalRequirements": [
    {
      "type": "Product Data",
      "description": "Concrete mix designs with supporting test data",
      "timing": "Before concrete placement"
    },
    {
      "type": "Product Data",
      "description": "Admixture technical data sheets",
      "timing": "Before ordering materials"
    },
    {
      "type": "Test Reports",
      "description": "Cylinder compression test reports",
      "timing": "Per testing schedule - 7, 14, and 28 days"
    },
    {
      "type": "Certifications",
      "description": "Ready-mix concrete plant certifications",
      "timing": "Before first delivery"
    }
  ],
  "tags": ["concrete", "structural", "cast-in-place"]
}
```

### Example 2: Addendum with Multiple Changes

```json
{
  "number": "3",
  "title": "Addendum No. 3 - Concrete and Waterproofing Changes",
  "issueDate": "2024-02-01",
  "description": "Multiple changes to specifications per architect's directive and RFI responses",
  "affectedSections": [
    {
      "specificationId": "spec-concrete-uuid",
      "changeType": "modify",
      "changeDescription": "Increased concrete strength for parking deck from 4,000 PSI to 4,500 PSI per structural engineer's revised calculations",
      "newContent": "Minimum 4,500 PSI at 28 days for elevated slabs in parking areas"
    },
    {
      "specificationId": "spec-waterproofing-uuid",
      "changeType": "add",
      "changeDescription": "Added requirement for waterproofing membrane at all below-grade walls per RFI-067",
      "newContent": "Install fluid-applied waterproofing membrane..."
    },
    {
      "specificationId": "spec-formwork-uuid",
      "changeType": "clarify",
      "changeDescription": "Clarified form tie requirements - patching procedure",
      "newContent": "Patch all tie holes flush with adjacent concrete surface using non-shrink grout"
    },
    {
      "specificationId": "spec-joints-uuid",
      "changeType": "delete",
      "changeDescription": "Deleted Section 3.4 - Saw-cut control joints (not applicable to post-tensioned slab design)"
    }
  ],
  "relatedRfis": ["rfi-067-uuid", "rfi-072-uuid"]
}
```

### Example 3: Product Tracking

```json
{
  "specification": "03 30 00 - Cast-in-Place Concrete",
  "products": [
    {
      "manufacturer": "BASF",
      "productName": "MasterGlenium 7920",
      "modelNumber": "7920",
      "isBaseBid": true,
      "isSubstitution": false,
      "specReference": "Part 2, Section 2.1 - High-Range Water-Reducing Admixture",
      "notes": "Base bid superplasticizer for all elevated slabs"
    },
    {
      "manufacturer": "Sika",
      "productName": "ViscoCrete 2100",
      "modelNumber": "2100",
      "isBaseBid": false,
      "isSubstitution": true,
      "specReference": "Part 2, Section 2.1 - High-Range Water-Reducing Admixture",
      "notes": "Acceptable substitution - subject to approval"
    },
    {
      "manufacturer": "Grace Construction Products",
      "productName": "ADVA Cast 575",
      "modelNumber": "575",
      "isBaseBid": false,
      "isSubstitution": true,
      "specReference": "Part 2, Section 2.1 - High-Range Water-Reducing Admixture",
      "notes": "Acceptable substitution - subject to approval"
    }
  ]
}
```

### Example 4: Cross-Reference Tracking

```json
{
  "specification": "03 30 00 - Cast-in-Place Concrete",
  "drawingLinks": [
    {
      "drawing": "S-101 - Foundation Plan",
      "relationship": "Referenced in Part 1 for foundation layout and footing locations"
    },
    {
      "drawing": "S-201 - Second Floor Framing Plan",
      "relationship": "Referenced in Part 3 for elevated slab placement sequence"
    },
    {
      "drawing": "A-401 - Wall Sections",
      "relationship": "Referenced for architectural concrete finish requirements"
    }
  ],
  "rfiLinks": [
    {
      "rfi": "RFI-045 - Parking Deck Concrete Strength",
      "context": "Clarification resulted in strength increase to 4,500 PSI per Addendum 3"
    },
    {
      "rfi": "RFI-072 - Cold Weather Concreting Procedures",
      "context": "Clarified curing requirements for winter construction"
    }
  ]
}
```

---

## Database Schema

### Indexes

The following indexes are created for optimal query performance:

**Specification Table:**
- PRIMARY KEY: `id`
- UNIQUE: `(projectId, sectionNumber)`
- INDEX: `projectId`
- INDEX: `division`
- INDEX: `isApplicable`
- INDEX: `deletedAt`

**SpecificationProduct Table:**
- PRIMARY KEY: `id`
- INDEX: `specificationId`
- INDEX: `manufacturer`
- INDEX: `isBaseBid`

**Addendum Table:**
- PRIMARY KEY: `id`
- UNIQUE: `(projectId, number)`
- INDEX: `projectId`
- INDEX: `issueDate`
- INDEX: `deletedAt`

**AddendumSection Table:**
- PRIMARY KEY: `id`
- INDEX: `addendumId`
- INDEX: `specificationId`
- INDEX: `changeType`

**SpecificationDrawing Table:**
- PRIMARY KEY: `id`
- INDEX: `specificationId`
- INDEX: `drawingId`

**SpecificationRfi Table:**
- PRIMARY KEY: `id`
- INDEX: `specificationId`
- INDEX: `rfiId`

### Foreign Key Relationships

```
Specification
  └─> Document (documentId)
  └─> User (createdById, updatedById)

SpecificationProduct
  └─> Specification (specificationId) [CASCADE DELETE]
  └─> User (createdById)

SpecificationDrawing
  └─> Specification (specificationId) [CASCADE DELETE]
  └─> Drawing (drawingId) [CASCADE DELETE]
  └─> User (createdById)

SpecificationRfi
  └─> Specification (specificationId) [CASCADE DELETE]
  └─> Rfi (rfiId) [CASCADE DELETE]
  └─> User (createdById)

Addendum
  └─> Document (documentId) [SET NULL]
  └─> User (createdById)

AddendumSection
  └─> Addendum (addendumId) [CASCADE DELETE]
  └─> Specification (specificationId)
  └─> Document (newDocumentId) [SET NULL]
```

---

## Testing

Comprehensive test suites are provided:

### SpecificationService Tests

Location: `src/modules/documents/services/__tests__/specification.service.spec.ts`

**Coverage:**
- Section number format validation
- Division code validation
- Division/section number consistency checks
- Duplicate section number prevention
- CRUD operations
- Product management
- Drawing linking with duplicate prevention
- RFI linking

### AddendumService Tests

Location: `src/modules/documents/services/__tests__/addendum.service.spec.ts`

**Coverage:**
- Transaction-based addendum creation
- Affected section management
- Duplicate addendum number prevention
- Document reference validation
- Specification history tracking
- Date range filtering
- Rollback on error

### Running Tests

```bash
# Run all specification tests
npm test -- specification

# Run specific test file
npm test -- specification.service.spec.ts

# Run with coverage
npm test -- --coverage specification
```

---

## Migration Notes

### Database Migrations

When deploying this system, run migrations in order:

1. Create `specifications` table (existing)
2. Create `specification_products` table
3. Create `specification_drawings` table
4. Create `specification_rfis` table
5. Create `addenda` table
6. Create `addendum_sections` table
7. Update `specifications` table with new fields (`isApplicable`, `submittalRequirements`)

### Data Migration

If migrating from an existing specification system:

1. Map existing section numbers to CSI MasterFormat 2018 format
2. Validate all section numbers against format `XX YY ZZ`
3. Assign correct division codes
4. Extract product references from spec text
5. Identify drawing references for cross-linking
6. Import historical addenda with original dates
7. Link addenda to affected sections

---

## Security and Permissions

### Access Control

Specification management respects project-level permissions:

- **View**: Read specifications, products, links, addenda
- **Edit**: Create/update specifications, add products/links
- **Admin**: Delete specifications, issue addenda, manage all aspects

### Audit Trail

All operations are logged with:
- User ID (createdById, updatedById)
- Timestamps (createdAt, updatedAt)
- Soft delete tracking (deletedAt)

### Data Validation

- Section number format enforced at API level
- Division codes validated against CSI MasterFormat 2018
- Foreign key constraints prevent orphaned records
- Unique constraints prevent duplicates
- Transaction management ensures data consistency

---

## Support and Resources

### CSI MasterFormat Resources

- [CSI MasterFormat 2018](https://www.csiresources.org/standards/masterformat)
- CSI Division Naming Standards
- Section Numbering Guidelines

### Related Documentation

- [Document Upload System](./DOCUMENT_UPLOAD.md)
- [Drawing Management System](./DRAWING_MANAGEMENT.md)
- [Version Control System](./VERSION_CONTROL.md)

### API Reference

Full API documentation available via Swagger UI at `/api/docs`

---

**Last Updated**: January 2024
**Version**: 1.0
**Module**: Documents Module - Specification Management
