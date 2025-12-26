# Submittal Workflow Engine - Quick Start Guide

## Prerequisites

1. **Database Setup**: Run the migration to create workflow tables
   ```bash
   npm run migration:run
   ```

2. **Seed Data** (Optional): Load sample data
   ```bash
   npm run seed
   ```

3. **Start API Server**:
   ```bash
   npm run start:dev
   ```

## Running the Test Suite

### Step 1: Get Authentication Token

```bash
# Login to get JWT token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }'

# Extract the token from response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Step 2: Get Project ID

```bash
# List projects to get a project ID
curl -X GET http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer $TOKEN"

# Extract a project ID from response
PROJECT_ID="a6074e71-6f3f-40c0-a201-1e87b238df81"
```

### Step 3: Run Full Test Suite

```bash
# Run all workflow tests
TOKEN="$TOKEN" PROJECT_ID="$PROJECT_ID" ./test-submittal-workflow.sh
```

### Step 4: (Optional) Test with Existing Submittal

To test workflow execution, provide an existing submittal ID:

```bash
# Get a submittal ID from your project
curl -X GET "http://localhost:3000/api/v1/projects/$PROJECT_ID/submittals" \
  -H "Authorization: Bearer $TOKEN"

# Run tests with submittal ID
TOKEN="$TOKEN" \
PROJECT_ID="$PROJECT_ID" \
SUBMITTAL_ID="submittal-id-here" \
./test-submittal-workflow.sh
```

## Manual Testing Examples

### 1. Create a Workflow Template

```bash
curl -X POST "http://localhost:3000/api/v1/projects/$PROJECT_ID/submittals/workflow/templates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Standard Product Data Review",
    "description": "3-step review: GC → Architect → Engineer",
    "applicableTypes": ["PRODUCT_DATA", "SHOP_DRAWING"],
    "specSectionPatterns": ["03*", "05*"],
    "totalReviewDays": 21,
    "autoApply": true,
    "priority": 10,
    "steps": [
      {
        "name": "GC Review",
        "stepType": "REVIEW",
        "stepOrder": 1,
        "routingType": "SERIAL",
        "reviewerType": "ROLE",
        "reviewerRole": "PROJECT_MANAGER",
        "allowedDays": 3,
        "canApprove": true,
        "canReject": true
      },
      {
        "name": "Architect Review",
        "stepType": "APPROVAL",
        "stepOrder": 2,
        "routingType": "SERIAL",
        "reviewerType": "ROLE",
        "reviewerRole": "ARCHITECT",
        "allowedDays": 14,
        "canApprove": true,
        "canReject": true
      },
      {
        "name": "Engineer Review",
        "stepType": "APPROVAL",
        "stepOrder": 3,
        "routingType": "SERIAL",
        "reviewerType": "ROLE",
        "reviewerRole": "ENGINEER",
        "allowedDays": 4,
        "canApprove": true,
        "canReject": true
      }
    ]
  }'
```

### 2. Apply Workflow to Submittal

```bash
TEMPLATE_ID="template-id-from-above"
SUBMITTAL_ID="your-submittal-id"

curl -X POST "http://localhost:3000/api/v1/projects/$PROJECT_ID/submittals/workflow/$SUBMITTAL_ID/apply-template/$TEMPLATE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Complete a Workflow Step

```bash
STEP_ID="step-id-from-above"

curl -X POST "http://localhost:3000/api/v1/projects/$PROJECT_ID/submittals/workflow/steps/$STEP_ID/complete" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stamp": "APPROVED",
    "comments": "Submittal package is complete and meets specifications",
    "conditions": "Ensure fire rating labels are visible on all components"
  }'
```

### 4. Calculate Lead Time

```bash
curl -X POST "http://localhost:3000/api/v1/projects/$PROJECT_ID/submittals/workflow/lead-time/calculate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requiredOnSiteDate": "2024-08-01",
    "specSection": "05 50 00",
    "submittalType": "SHOP_DRAWING"
  }'
```

### 5. Distribute Approved Submittal

```bash
curl -X POST "http://localhost:3000/api/v1/projects/$PROJECT_ID/submittals/workflow/$SUBMITTAL_ID/distribute" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientIds": ["user-id-1", "user-id-2"],
    "externalRecipients": [
      {
        "email": "contractor@example.com",
        "name": "John Smith"
      }
    ],
    "method": "EMAIL",
    "includeConditions": true,
    "coverNote": "Please review attached approved shop drawings"
  }'
```

## Common Workflows

### Scenario 1: Simple Sequential Review

1. Create template with 3 sequential steps
2. Apply to submittal
3. Complete step 1 → Step 2 automatically activates
4. Complete step 2 → Step 3 automatically activates
5. Complete step 3 → Submittal finalized and auto-distributed

### Scenario 2: Parallel Review (Multiple Disciplines)

```json
{
  "name": "Multi-Discipline Review",
  "steps": [
    {
      "name": "Structural Review",
      "stepOrder": 1,
      "parallelGroupOrder": 1,
      "routingType": "PARALLEL",
      "reviewerType": "ROLE",
      "reviewerRole": "STRUCTURAL_ENGINEER"
    },
    {
      "name": "MEP Review",
      "stepOrder": 1,
      "parallelGroupOrder": 1,
      "routingType": "PARALLEL",
      "reviewerType": "ROLE",
      "reviewerRole": "MEP_ENGINEER"
    },
    {
      "name": "Architect Final Approval",
      "stepOrder": 2,
      "routingType": "SERIAL",
      "reviewerType": "ROLE",
      "reviewerRole": "ARCHITECT"
    }
  ]
}
```

Both Structural and MEP reviews run in parallel. Once both complete, Architect step activates.

### Scenario 3: Rejection with Revision

1. Reviewer completes step with `REVISE_AND_RESUBMIT` stamp
2. Workflow resets to Step 1
3. Submitter revises and resubmits
4. Workflow starts again from beginning

## Troubleshooting

### Issue: "Template not found"

**Solution**: Ensure you're using the correct template ID returned from the create template endpoint.

```bash
# List all templates to find the ID
curl -X GET "http://localhost:3000/api/v1/projects/$PROJECT_ID/submittals/workflow/templates" \
  -H "Authorization: Bearer $TOKEN"
```

### Issue: "User not authorized to complete step"

**Solution**: Only the assigned reviewer can complete a step. Check `assignedToId` field.

```bash
# Get step details to see who's assigned
curl -X GET "http://localhost:3000/api/v1/projects/$PROJECT_ID/submittals/workflow/steps/$STEP_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### Issue: "Step cannot be completed"

**Solution**: Step must be in `ACTIVE` or `IN_PROGRESS` status. Check step status.

```bash
# Get workflow summary
curl -X GET "http://localhost:3000/api/v1/projects/$PROJECT_ID/submittals/workflow/$SUBMITTAL_ID/summary" \
  -H "Authorization: Bearer $TOKEN"
```

### Issue: "Submittal not approved for distribution"

**Solution**: Submittal must have status `APPROVED` or `APPROVED_AS_NOTED` before distribution.

```bash
# Check submittal status
curl -X GET "http://localhost:3000/api/v1/projects/$PROJECT_ID/submittals/$SUBMITTAL_ID" \
  -H "Authorization: Bearer $TOKEN"
```

## Development Tips

### Enable Debug Logging

Set environment variable for detailed logs:

```bash
export LOG_LEVEL=debug
npm run start:dev
```

### View Scheduled Task Status

Check cron job execution in logs:

```bash
# Look for these log patterns
grep "Running scheduled task" logs/app.log
grep "Completed overdue steps check" logs/app.log
grep "Sent lead time warning" logs/app.log
```

### Manually Trigger Scheduled Tasks

```bash
# Trigger overdue check
curl -X POST "http://localhost:3000/api/v1/projects/$PROJECT_ID/submittals/workflow/scheduler/check-overdue" \
  -H "Authorization: Bearer $TOKEN"

# Trigger lead time warnings
curl -X POST "http://localhost:3000/api/v1/projects/$PROJECT_ID/submittals/workflow/scheduler/check-lead-time" \
  -H "Authorization: Bearer $TOKEN"
```

### Database Queries

Useful queries for debugging:

```sql
-- Check workflow templates
SELECT id, name, "isActive", "autoApply", priority
FROM submittal_workflow_templates
WHERE "projectId" = 'your-project-id';

-- Check active workflow steps
SELECT s.id, s.name, s.status, s."assignedToId", s."dueDate"
FROM submittal_workflow_steps s
WHERE s."submittalId" = 'your-submittal-id'
ORDER BY s."stepOrder";

-- Check lead time warnings
SELECT s.number, s."requiredOnSiteDate", s.status
FROM submittals s
WHERE s."projectId" = 'your-project-id'
  AND s."requiredOnSiteDate" IS NOT NULL
  AND s.status NOT IN ('APPROVED', 'CLOSED');

-- Check distributions
SELECT d.id, d."recipientEmail", d.status, d."distributedAt"
FROM submittal_distributions d
WHERE d."submittalId" = 'your-submittal-id';

-- Check notifications
SELECT n."notificationType", n.subject, n.status, n."createdAt"
FROM submittal_notifications n
WHERE n."userId" = 'your-user-id'
ORDER BY n."createdAt" DESC
LIMIT 10;
```

## Performance Benchmarks

Expected response times:

| Operation | Expected Time |
|-----------|--------------|
| Create template | <500ms |
| Apply workflow | <1s |
| Complete step | <800ms |
| Calculate lead time | <200ms |
| Distribute (10 recipients) | <2s |
| Get workflow summary | <300ms |

If you're seeing slower times, check:
1. Database indexes (should be created by migration)
2. Database connection pool size
3. Network latency
4. Transaction overhead

## Next Steps

1. **Read Full Documentation**: See `docs/SUBMITTAL_WORKFLOW_ENGINE.md` for comprehensive guide
2. **Review Entity Schema**: Understand the data model in the entities folder
3. **Customize Templates**: Create templates that match your workflow processes
4. **Configure Lead Times**: Set appropriate lead times for your project types
5. **Setup Notifications**: Configure SMTP for email notifications
6. **Monitor Performance**: Use application metrics to track workflow efficiency

## Support

- **Documentation**: `/docs/SUBMITTAL_WORKFLOW_ENGINE.md`
- **Testing Script**: `/test-submittal-workflow.sh`
- **Migration**: `/src/migrations/1734471000000-CreateSubmittalWorkflowTables.ts`
- **API Reference**: Swagger UI at `http://localhost:3000/api`

---

**Quick Reference Card**

```bash
# Essential Environment Variables
export TOKEN="your-jwt-token"
export PROJECT_ID="your-project-id"
export SUBMITTAL_ID="your-submittal-id"  # Optional

# Run full test suite
./test-submittal-workflow.sh

# List all templates
curl -X GET "$API_URL/projects/$PROJECT_ID/submittals/workflow/templates" \
  -H "Authorization: Bearer $TOKEN"

# Get workflow summary
curl -X GET "$API_URL/projects/$PROJECT_ID/submittals/workflow/$SUBMITTAL_ID/summary" \
  -H "Authorization: Bearer $TOKEN"

# Calculate lead time
curl -X POST "$API_URL/projects/$PROJECT_ID/submittals/workflow/lead-time/calculate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"requiredOnSiteDate":"2024-08-01"}'
```

---

**Last Updated**: December 17, 2024
