# Phase 2 Complete: DTOs (Data Transfer Objects)

**Task:** 3.8.1.3 - AI-Powered Recommendations & Cross-Project Learning - Backend Implementation
**Phase:** 2 of 8
**Status:** ✅ COMPLETE
**Date:** December 23, 2025

---

## What Was Completed

Created **13 comprehensive DTO files** with full validation and Swagger documentation:

### ✅ Input DTOs (5 files)

1. **create-project-profile.dto.ts**
   - For creating project profiles when projects are initiated
   - Fields: projectId, organizationId, projectType, buildingType, contractValue, squareFootage, etc.
   - Validators: UUID, string, number range, arrays
   - 14 properties total

2. **update-project-profile.dto.ts**
   - For updating project profiles when projects complete
   - Fields: isComplete, completionDate, finalCost, costVariancePercent, safetyIncidentCount, etc.
   - All fields optional
   - 13 properties total

3. **create-recommendation.dto.ts**
   - For AI services to generate recommendations
   - Fields: projectId, type, priority, title, description, reasoning, confidenceScore, etc.
   - Enum validation for type and priority
   - 16 properties total

4. **update-recommendation.dto.ts**
   - For user interactions with recommendations
   - Fields: status, userFeedback, userRating, expiresAt
   - All fields optional
   - 5 properties total

5. **create-lesson-learned.dto.ts**
   - For creating lessons learned (manual or AI-generated)
   - Fields: category, title, situation, action, outcome, lesson, recommendedAction, etc.
   - Structured STAR format (Situation-Action-Result)
   - 16 properties total

### ✅ Query DTOs (3 files)

6. **find-similar-projects.dto.ts**
   - For similarity matching algorithm
   - Fields: projectId, limit, minSimilarityScore, onlyCompleted, useEmbeddings
   - Pagination and filtering support
   - Default values: limit=5, minSimilarityScore=0.3, onlyCompleted=true
   - 7 properties total

7. **get-recommendations.dto.ts**
   - For querying and filtering recommendations
   - Fields: projectId, types[], statuses[], priorities[], actionableOnly, page, limit, sortBy
   - Pagination support (page, limit)
   - Sorting support (sortBy, sortOrder)
   - Default: statuses=[ACTIVE], page=1, limit=20
   - 10 properties total

8. **get-lessons-learned.dto.ts**
   - For searching organizational knowledge base
   - Fields: organizationId, projectId, categories[], tags[], search, approvedOnly, page, limit
   - Full-text search support
   - Category and tag filtering
   - Default: approvedOnly=true, page=1, limit=20
   - 11 properties total

### ✅ Response DTOs (5 files)

9. **project-profile-response.dto.ts**
   - Complete project profile data
   - Uses @Exclude/@Expose decorators for transformation
   - Excludes embedding vector (1536 dimensions) for performance
   - 29 properties total

10. **recommendation-response.dto.ts**
    - Complete recommendation data
    - Includes user interaction fields
    - Uses transformation decorators
    - 26 properties total

11. **lesson-learned-response.dto.ts**
    - Complete lesson learned data
    - Includes effectiveness metrics (timesReferenced, timesApplied, effectivenessScore)
    - Excludes embedding vector
    - 28 properties total

12. **similar-project.dto.ts**
    - Extends ProjectProfileResponseDto
    - Adds similarity metrics: similarityScore, matchingFactors, explanations
    - Includes AI-generated recommendations based on similar project
    - Matching factors breakdown: projectType, buildingType, size, contractValue, deliveryMethod, scopeOverlap, location
    - 5 properties total

13. **smart-defaults-response.dto.ts**
    - AI-suggested default values for new projects
    - Includes: budgetEstimate, durationEstimate, manpowerEstimate, expectedRfiCount, expectedChangeOrders
    - Each estimate includes: value, confidence, basis, range (low/high)
    - Recommended subcontractors and scope elements
    - Risk factors and success factors
    - 11 properties total

---

## Validation Features

All DTOs include:

### ✅ Class-Validator Decorators
- `@IsUUID()` - UUID validation
- `@IsString()` - String validation
- `@IsNumber()` - Number validation
- `@IsInt()` - Integer validation
- `@IsBoolean()` - Boolean validation
- `@IsArray()` - Array validation
- `@IsEnum()` - Enum validation
- `@IsOptional()` - Optional field
- `@Min()` / `@Max()` - Range validation
- `@IsDateString()` - ISO date validation
- `@Type()` - Type transformation (for query params)

### ✅ Swagger Documentation
- `@ApiProperty()` - Required field documentation
- `@ApiPropertyOptional()` - Optional field documentation
- Examples for all fields
- Enum references where applicable
- Type arrays properly documented

### ✅ Class-Transformer Decorators
- `@Exclude()` - Exclude all fields by default (response DTOs)
- `@Expose()` - Explicitly expose fields (response DTOs)
- Ensures embedding vectors are not sent in API responses

---

## File Structure

```
/src/modules/ai/dto/
├── create-project-profile.dto.ts       (Input)
├── update-project-profile.dto.ts       (Input)
├── create-recommendation.dto.ts        (Input)
├── update-recommendation.dto.ts        (Input)
├── create-lesson-learned.dto.ts        (Input)
├── find-similar-projects.dto.ts        (Query)
├── get-recommendations.dto.ts          (Query)
├── get-lessons-learned.dto.ts          (Query)
├── project-profile-response.dto.ts     (Response)
├── recommendation-response.dto.ts      (Response)
├── lesson-learned-response.dto.ts      (Response)
├── similar-project.dto.ts              (Response)
├── smart-defaults-response.dto.ts      (Response)
└── index.ts                            (Barrel export)
```

---

## DTO Categories Summary

| Category | Count | Purpose |
|----------|-------|---------|
| **Input DTOs** | 5 | Create/update operations |
| **Query DTOs** | 3 | Filtering and pagination |
| **Response DTOs** | 5 | API responses with transformation |
| **Total** | **13** | Full CRUD + query + response coverage |

---

## Key Design Decisions

### 1. **Embedding Exclusion**
- Embedding vectors (1536 dimensions) excluded from response DTOs
- Large arrays not needed in API responses
- Improves performance and reduces payload size
- Embeddings stored internally for similarity calculations

### 2. **Pagination Defaults**
- Standard defaults: page=1, limit=20, max=100
- Sorting support with sortBy and sortOrder
- Follows REST API best practices

### 3. **Confidence Scores**
- All AI-generated data includes confidence scores (0.0 - 1.0)
- Helps users understand reliability of recommendations
- Transparent AI decision-making

### 4. **Range Estimates**
- Smart defaults include range (low/high) not just single value
- Helps with realistic planning
- Based on statistical analysis of similar projects

### 5. **Structured Formats**
- Lessons learned use STAR format (Situation-Action-Result)
- Clear, actionable knowledge capture
- Easy to search and reference

### 6. **Metadata Fields**
- All entities include optional metadata JSONB field
- Future-proof for custom attributes
- Flexible extensibility

---

## Validation Examples

### Create Project Profile
```typescript
{
  "projectId": "abc-123-def-456",  // UUID ✓
  "organizationId": "org-123",     // UUID ✓
  "projectType": "Commercial",     // String ✓
  "contractValue": 5000000,        // Number, min: 0 ✓
  "squareFootage": 50000,          // Number, min: 0 ✓
  "scopeElements": ["Foundation", "Steel"]  // String[] ✓
}
```

### Find Similar Projects
```typescript
{
  "projectId": "proj-123",       // UUID ✓
  "limit": 5,                    // Int, 1-20 ✓
  "minSimilarityScore": 0.3,     // Number, 0-1 ✓
  "onlyCompleted": true,         // Boolean ✓
  "projectTypes": ["Commercial"] // String[] ✓
}
```

### Get Recommendations
```typescript
{
  "projectId": "proj-123",                           // UUID ✓
  "statuses": ["ACTIVE", "PENDING"],                 // Enum[] ✓
  "priorities": ["HIGH", "CRITICAL"],                // Enum[] ✓
  "actionableOnly": true,                            // Boolean ✓
  "page": 1,                                         // Int, min: 1 ✓
  "limit": 20                                        // Int, 1-100 ✓
}
```

---

## API Response Examples

### Similar Project Match
```json
{
  "profile": { /* ProjectProfileResponseDto */ },
  "similarityScore": 0.85,
  "matchingFactors": {
    "projectType": true,
    "buildingType": true,
    "size": true,
    "contractValue": false,
    "deliveryMethod": true,
    "scopeOverlap": 0.75,
    "location": true
  },
  "similaritiesExplanation": "Both commercial office buildings with similar square footage and structural scope",
  "differencesExplanation": "Different delivery methods (Design-Bid-Build vs Design-Build)",
  "recommendations": [
    "Consider using same HVAC subcontractor",
    "Similar timeline achievable"
  ]
}
```

### Smart Defaults
```json
{
  "budgetEstimate": {
    "value": 5250000,
    "confidence": 0.82,
    "basis": "5 similar projects",
    "range": { "low": 4800000, "high": 5700000 }
  },
  "durationEstimate": {
    "value": 365,
    "confidence": 0.78,
    "basis": "5 similar projects",
    "range": { "low": 330, "high": 400 }
  },
  "expectedRfiCount": { "value": 42, "confidence": 0.70 },
  "sampleSize": 5,
  "supportingProjects": ["proj-456", "proj-789", "proj-012"],
  "riskFactors": [
    "Structural costs tend to run 10% over budget",
    "RFI velocity typically higher in months 3-6"
  ]
}
```

---

## Dependencies Used

All DTOs use:
- `class-validator` - Validation decorators
- `class-transformer` - Transformation decorators
- `@nestjs/swagger` - API documentation decorators

---

## Next Steps: Phase 3 - Core Service

Phase 3 will implement:
- **RecommendationsService** - Core business logic
- **Similarity matching algorithm** - Weighted scoring (8 factors)
- **Pattern calculation** - Statistical aggregation
- **Smart defaults generation** - AI-powered estimates
- **Lesson learned extraction** - Knowledge capture
- **Contextual recommendations** - Action-triggered suggestions

Files to create:
- `recommendations.service.ts` (~800-1000 lines)
- `similarity-matcher.service.ts` (~300 lines)
- `pattern-calculator.service.ts` (~400 lines)

---

**Phase 2 Status:** ✅ COMPLETE
**Files Created:** 13 DTOs + 1 index file
**Ready for:** Phase 3 (Core Service Implementation)
