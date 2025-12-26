# Change Order Approval Workflows

## Overview

The Change Order Approval Service manages approval routing and validation for change orders based on configurable amount thresholds. The system ensures that change orders are reviewed and approved by appropriate personnel based on the financial impact and company policies.

## Approval Threshold Configuration

### Default Thresholds

When a project is created, the system automatically establishes default approval thresholds if none are configured:

| Amount Range | Required Role | Owner Approval Required | Description |
|--------------|---------------|-------------------------|-------------|
| $0 - $10,000 | PROJECT_MANAGER | No | Small changes manageable at project level |
| $10,000 - $50,000 | DIRECTOR | Yes | Moderate changes requiring director oversight |
| $50,000+ | VP | Yes | Large changes requiring VP approval |

### Threshold Entity Structure

```typescript
interface ApprovalThreshold {
  id: string;
  projectId: string;
  minAmount: number;
  maxAmount: number | null;  // null means no upper limit
  requiredRole: string;
  requiresOwnerApproval: boolean;
  sortOrder: number;
  isActive: boolean;
}
```

### Key Concepts

**Required Role**: The minimum organizational role required to approve the change order
- Common roles: PROJECT_MANAGER, DIRECTOR, VP, CEO, COMPANY_OWNER

**Owner Approval**: Indicates whether the change order requires additional approval from the project owner (client)
- `true`: Both internal approval AND owner approval required
- `false`: Only internal approval required

**Amount Ranges**: Thresholds define non-overlapping amount ranges
- Each threshold has a minAmount and maxAmount
- The last threshold typically has maxAmount = null (covers all amounts above minimum)

---

## Managing Approval Thresholds

### Retrieving Current Thresholds

**API Endpoint**: `GET /api/v1/projects/:projectId/co-approval-thresholds`

**Response**:
```json
[
  {
    "id": "threshold-001",
    "projectId": "proj-123",
    "minAmount": 0,
    "maxAmount": 10000,
    "requiredRole": "PROJECT_MANAGER",
    "requiresOwnerApproval": false,
    "sortOrder": 0,
    "isActive": true
  },
  {
    "id": "threshold-002",
    "projectId": "proj-123",
    "minAmount": 10000,
    "maxAmount": 50000,
    "requiredRole": "DIRECTOR",
    "requiresOwnerApproval": true,
    "sortOrder": 1,
    "isActive": true
  },
  {
    "id": "threshold-003",
    "projectId": "proj-123",
    "minAmount": 50000,
    "maxAmount": null,
    "requiredRole": "VP",
    "requiresOwnerApproval": true,
    "sortOrder": 2,
    "isActive": true
  }
]
```

### Updating Thresholds

**API Endpoint**: `PUT /api/v1/projects/:projectId/co-approval-thresholds`

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
      "requiredRole": "SENIOR_PM",
      "requiresOwnerApproval": false
    },
    {
      "minAmount": 25000,
      "maxAmount": 100000,
      "requiredRole": "DIRECTOR",
      "requiresOwnerApproval": true
    },
    {
      "minAmount": 100000,
      "maxAmount": null,
      "requiredRole": "VP",
      "requiresOwnerApproval": true
    }
  ]
}
```

**Response**: Returns the newly created thresholds (same format as GET)

**Important Notes**:
- The PUT operation replaces ALL existing thresholds
- Previous thresholds are deactivated (not deleted)
- New thresholds are validated for overlaps and gaps
- Operation is atomic (all or nothing)

### Validation Rules

When updating thresholds, the system validates:

1. **No Overlaps**: Threshold ranges cannot overlap
   ```
   ✓ Valid:   [0-5000], [5000-10000]
   ✗ Invalid: [0-6000], [5000-10000]  // Overlap: 5000-6000
   ```

2. **Proper Ordering**: maxAmount must be >= minAmount
   ```
   ✓ Valid:   minAmount: 1000, maxAmount: 5000
   ✗ Invalid: minAmount: 5000, maxAmount: 1000
   ```

3. **No Gaps**: Ranges should be continuous
   ```
   ✓ Valid:   [0-5000], [5000-10000]
   ✗ Invalid: [0-5000], [7000-10000]  // Gap: 5000-7000
   ```

4. **Specified Max for Non-Final**: All thresholds except the last must have a maxAmount
   ```
   ✓ Valid:   [0-5000], [5000-null]
   ✗ Invalid: [0-null], [5000-10000]
   ```

**Validation Error Example**:
```json
{
  "statusCode": 400,
  "message": "Threshold 2 and 3: ranges overlap (5000-25000 overlaps with 20000-100000)"
}
```

---

## Approval Routing Logic

### Determining the Approval Route

When a change order is submitted for approval, the system determines the appropriate approval route based on the amount:

```typescript
async determineApprovalRoute(
  projectId: string,
  amount: Decimal
): Promise<ApprovalRouteDto>
```

**Process**:
1. Retrieve all active thresholds for the project
2. Find the threshold where `minAmount <= amount < maxAmount`
3. For the last threshold (maxAmount = null), check `amount >= minAmount`
4. Return the matching threshold's approval requirements

**Example**:

Given thresholds:
- $0-$10,000: PROJECT_MANAGER, no owner approval
- $10,000-$50,000: DIRECTOR, owner approval required
- $50,000+: VP, owner approval required

For a change order of $35,000:
- Matches threshold: $10,000-$50,000
- Required role: DIRECTOR
- Owner approval: YES

**Response**:
```json
{
  "thresholdId": "threshold-002",
  "minAmount": 10000,
  "maxAmount": 50000,
  "requiredRole": "DIRECTOR",
  "requiresOwnerApproval": true,
  "changeOrderAmount": 35000,
  "isWithinRange": true
}
```

### Getting Required Approvers

The service can identify users who can approve a specific change order:

```typescript
async getRequiredApprovers(
  projectId: string,
  amount: Decimal
): Promise<User[]>
```

This method:
1. Determines the approval route
2. Queries for active users with the required role
3. Returns the list of eligible approvers

**Example Response**:
```json
[
  {
    "id": "user-123",
    "name": "John Smith",
    "email": "john.smith@company.com",
    "role": "DIRECTOR",
    "isActive": true
  },
  {
    "id": "user-456",
    "name": "Sarah Johnson",
    "email": "sarah.johnson@company.com",
    "role": "DIRECTOR",
    "isActive": true
  }
]
```

---

## User Authorization

### Checking Approval Authority

Before allowing a user to approve a change order, the system validates their authority:

```typescript
async canUserApprove(
  userId: string,
  changeOrderId: string,
  type: 'OCO' | 'CCO'
): Promise<boolean>
```

**Validation Checks**:
1. User has the required role for the change order amount
2. If owner approval is required, user must be an owner
3. User account is active

**Example**:

User Role: DIRECTOR
Change Order: $35,000 (requires DIRECTOR)
Owner Approval Required: YES
User is Owner: NO

**Result**: `false` - User has required role but is not an owner

### Role Hierarchy

The system assumes a role hierarchy for authorization purposes:

```
CEO / COMPANY_OWNER (highest)
    ↓
   VP
    ↓
DIRECTOR
    ↓
SENIOR_PM
    ↓
PROJECT_MANAGER (lowest)
```

**Note**: The exact role hierarchy depends on your organization's structure and should be configured in the User management system.

---

## Approval Workflows

### Standard Workflow (OCO/CCO)

```
┌─────────────┐
│    DRAFT    │ ← Create change order
└──────┬──────┘
       │
       │ Submit for approval
       ↓
┌─────────────────┐
│ PENDING_APPROVAL│ ← Awaiting approval
└────┬────────┬───┘
     │        │
Approve    Reject
     │        │
     ↓        ↓
┌─────────┐  ┌──────────┐
│APPROVED │  │ REJECTED │ → Can revise and resubmit
└────┬────┘  └──────────┘
     │
     │ Execute
     ↓
┌──────────┐
│EXECUTED  │ ← Terminal state
└──────────┘
```

### PCO Workflow

```
┌─────────┐
│  DRAFT  │ ← Create PCO
└────┬────┘
     │
     │ Submit
     ↓
┌───────────┐
│ SUBMITTED │ ← Awaiting review
└────┬──────┘
     │
     │ Mark under review
     ↓
┌──────────────┐
│UNDER_REVIEW  │
└─────┬────┬───┘
      │    │
 Approve  Reject
      │    │
      ↓    ↓
┌──────────┐  ┌──────────┐
│APPROVED  │  │REJECTED  │ → Can revise and resubmit
└────┬─────┘  └──────────┘
     │
     │ Convert to OCO
     ↓
┌───────────┐
│CONVERTED  │ ← Terminal state
└───────────┘
```

### Multi-Level Approval Scenario

For change orders requiring multiple approvals:

**Scenario**: $75,000 Change Order

**Threshold Configuration**:
- $50,000+: VP approval required, owner approval required

**Approval Process**:

1. **Internal Approval** (VP):
   - VP reviews and approves
   - Status: PENDING_APPROVAL → APPROVED
   - `approvedById`: VP user ID
   - `approvedAt`: Timestamp

2. **Owner Approval**:
   - Change order documentation sent to owner
   - Owner signs off (external to system)
   - May require additional documentation/evidence
   - Status remains: APPROVED

3. **Execution**:
   - After both approvals received
   - Status: APPROVED → EXECUTED
   - Contract amounts updated

**Important**: The system tracks internal approval. Owner approval is tracked through:
- Document uploads (signed change orders)
- Notes/comments
- External reference numbers
- Manual verification by project team

---

## Approval Validation

### Validating the Approval Chain

Before executing a change order, validate that all required approvals are in place:

```typescript
async validateApprovalChain(
  changeOrderId: string,
  type: 'OCO' | 'CCO'
): Promise<ApprovalValidationDto>
```

**Response**:
```json
{
  "changeOrderId": "oco-123",
  "changeOrderType": "OCO",
  "amount": 75000.00,
  "isValid": true,
  "requiredRole": "VP",
  "requiresOwnerApproval": true,
  "hasRoleApproval": true,
  "hasOwnerApproval": true,
  "approvedById": "user-789",
  "approvedAt": "2025-12-08T15:00:00Z",
  "validationErrors": []
}
```

**Validation Checks**:
1. Change order is in APPROVED status
2. Approver has required role
3. If owner approval required, approver is an owner
4. Approval timestamp is recorded

**Failed Validation Example**:
```json
{
  "changeOrderId": "oco-456",
  "changeOrderType": "OCO",
  "amount": 85000.00,
  "isValid": false,
  "requiredRole": "VP",
  "requiresOwnerApproval": true,
  "hasRoleApproval": true,
  "hasOwnerApproval": false,
  "approvedById": "user-123",
  "approvedAt": "2025-12-08T14:00:00Z",
  "validationErrors": [
    "Owner approval is required but not received"
  ]
}
```

---

## Common Approval Scenarios

### Scenario 1: Small Change Order (Under $10,000)

**Amount**: $7,500
**Required Role**: PROJECT_MANAGER
**Owner Approval**: NO

**Workflow**:
1. Project Manager creates change order
2. Project Manager submits for approval
3. Project Manager (or another PM) approves
4. Change order ready for execution

**Timeline**: Typically same day

---

### Scenario 2: Medium Change Order ($10,000 - $50,000)

**Amount**: $32,000
**Required Role**: DIRECTOR
**Owner Approval**: YES

**Workflow**:
1. Project Manager creates change order
2. PM submits for approval
3. Director reviews and approves internally
4. Change order documentation sent to owner
5. Owner reviews and signs (may take days/weeks)
6. Signed documentation received
7. Change order executed

**Timeline**: 1-3 weeks typical

---

### Scenario 3: Large Change Order (Over $50,000)

**Amount**: $125,000
**Required Role**: VP
**Owner Approval**: YES

**Workflow**:
1. Project Manager creates change order with detailed justification
2. Director reviews and endorses
3. PM submits for approval
4. VP reviews detailed breakdown and approves internally
5. Executive summary prepared for owner
6. Owner's project representative reviews
7. Owner's senior management approval required
8. Contract amendment executed
9. Change order executed in system

**Timeline**: 2-6 weeks typical

---

### Scenario 4: Emergency Change Order

**Amount**: $65,000
**Required Role**: VP
**Owner Approval**: YES
**Context**: Emergency repair needed immediately

**Accelerated Workflow**:
1. PM creates change order marked as emergency
2. PM contacts VP directly
3. VP provides verbal approval (documented in notes)
4. Work proceeds immediately
5. Formal approval workflow completed in parallel
6. Owner notified immediately
7. Owner provides expedited approval
8. Formal documentation completed retroactively

**Timeline**: 1-3 days for formal approvals (work starts day 1)

**Important**: Document the emergency nature and all verbal approvals in the change order notes.

---

## Best Practices

### 1. Configure Appropriate Thresholds

**Considerations**:
- Company size and organizational structure
- Project size and complexity
- Historical change order patterns
- Owner's contractual requirements
- Risk tolerance

**Example Small Company** (5-10 employees):
- $0-$5,000: PROJECT_MANAGER
- $5,000-$25,000: OWNER
- $25,000+: OWNER + owner approval

**Example Large Company** (100+ employees):
- $0-$10,000: PROJECT_MANAGER
- $10,000-$50,000: DIRECTOR
- $50,000-$250,000: VP
- $250,000+: CEO + owner approval

### 2. Document Approval Decisions

Always include detailed notes when approving or rejecting:

```json
{
  "notes": "Approved - pricing verified against market rates. Subcontractor selected through competitive bid. Work aligns with approved scope expansion."
}
```

For rejections, provide clear actionable feedback:

```json
{
  "reason": "Pricing appears high. Please obtain two additional quotes for comparison. Labor hours need detailed breakdown by task. Resubmit with updated documentation."
}
```

### 3. Maintain Owner Communication

For change orders requiring owner approval:
- Notify owner promptly when submitted
- Provide complete documentation
- Include cost breakdown and justification
- Offer to present/discuss if needed
- Follow up on approval status
- Document all communications

### 4. Review Thresholds Periodically

Thresholds should be reviewed:
- **Annually**: As part of business planning
- **Per Project**: For unique project requirements
- **After Major Changes**: Organizational restructuring, policy updates
- **Based on Data**: If many change orders cluster at threshold boundaries

### 5. Use the Approval Log

The change order log provides an audit trail:
- Review approval timelines
- Identify bottlenecks
- Track who approves what
- Support internal/external audits
- Demonstrate compliance

**Access the Log**:
```
GET /api/v1/projects/:projectId/change-orders/log
```

### 6. Handle Delegation Properly

If an approver is unavailable:
- Document the delegation
- Ensure delegate has appropriate authority
- Update user roles if needed
- Note the delegation in approval comments

**Example**:
```json
{
  "notes": "Approved by Jane Smith (Director) acting for John Doe (VP) who is on approved leave. Authority delegated per memo dated 2025-12-01."
}
```

### 7. Train Team on Approval Process

Ensure all team members understand:
- When approval is needed
- Who can approve what amounts
- How to submit for approval
- Expected approval timelines
- How to track approval status
- Escalation procedures

---

## Integration with Other Systems

### Budget System Integration

When a change order is approved:
1. Budget impact is calculated
2. Project budget is updated (if configured)
3. Cost code allocations are adjusted
4. Forecast reports are updated

### Contract Management Integration

When a change order is executed:
1. Prime contract amount is updated (OCO)
2. Commitment amount is updated (CCO)
3. Contract modification is logged
4. Document management is notified

### Notification System Integration

Notifications are triggered for:
- **Submission**: Notify potential approvers
- **Approval**: Notify submitter and project team
- **Rejection**: Notify submitter with reason
- **Owner Approval Needed**: Notify designated owner contact
- **Execution**: Notify project team and accounting

---

## API Usage Examples

### Example 1: Check if User Can Approve

```javascript
// Check if current user can approve a specific change order
const response = await fetch(
  '/api/v1/projects/proj-123/ocos/oco-456/can-approve',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer USER_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: 'user-789'
    })
  }
);

const result = await response.json();

if (result.canApprove) {
  // Show approve button
  console.log('User can approve this change order');
} else {
  console.log('User cannot approve:', result.reason);
}
```

### Example 2: Get Approval Requirements

```javascript
// Get approval requirements before submitting
const amount = 42000.00;

const response = await fetch(
  `/api/v1/projects/proj-123/approval-route?amount=${amount}`,
  {
    headers: {
      'Authorization': 'Bearer USER_TOKEN'
    }
  }
);

const route = await response.json();

console.log(`This change order requires ${route.requiredRole} approval`);
if (route.requiresOwnerApproval) {
  console.log('Owner approval will also be required');
}
```

### Example 3: Configure Custom Thresholds

```javascript
// Configure project-specific thresholds
const response = await fetch(
  '/api/v1/projects/proj-123/co-approval-thresholds',
  {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer ADMIN_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      thresholds: [
        {
          minAmount: 0,
          maxAmount: 15000,
          requiredRole: 'PROJECT_MANAGER',
          requiresOwnerApproval: false
        },
        {
          minAmount: 15000,
          maxAmount: 75000,
          requiredRole: 'DIRECTOR',
          requiresOwnerApproval: true
        },
        {
          minAmount: 75000,
          maxAmount: null,
          requiredRole: 'VP',
          requiresOwnerApproval: true
        }
      ]
    })
  }
);

const newThresholds = await response.json();
console.log('Thresholds updated:', newThresholds);
```

---

## Troubleshooting

### Issue: User Cannot Approve Despite Having Role

**Symptoms**: User with correct role cannot approve change order

**Common Causes**:
1. Owner approval required but user is not an owner
2. User account is inactive
3. Change order not in PENDING_APPROVAL status
4. User role data not synchronized

**Solution**:
```javascript
// Check user permissions
const validation = await calculationService.canUserApprove(
  userId,
  changeOrderId,
  'OCO'
);

if (!validation) {
  // Check specific issues
  const user = await userService.findOne(userId);
  const co = await ocoService.findOne(changeOrderId);
  const route = await approvalService.determineApprovalRoute(
    projectId,
    co.amount
  );

  console.log('User role:', user.role);
  console.log('Required role:', route.requiredRole);
  console.log('Is owner:', user.isOwner);
  console.log('Requires owner:', route.requiresOwnerApproval);
}
```

### Issue: Threshold Update Fails

**Symptoms**: Cannot update approval thresholds

**Common Causes**:
1. Overlapping ranges
2. Gaps in coverage
3. Invalid min/max values

**Solution**:
Sort and validate thresholds before submission:

```javascript
function validateThresholds(thresholds) {
  // Sort by minAmount
  const sorted = [...thresholds].sort((a, b) => a.minAmount - b.minAmount);

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    // Check max >= min
    if (current.maxAmount !== null && current.maxAmount < current.minAmount) {
      throw new Error(`Threshold ${i + 1}: max must be >= min`);
    }

    // Check no gaps
    if (next && current.maxAmount !== null && current.maxAmount !== next.minAmount) {
      throw new Error(`Gap between threshold ${i + 1} and ${i + 2}`);
    }
  }

  return sorted;
}
```

### Issue: Owner Approval Not Clear

**Symptoms**: Confusion about whether owner has approved

**Common Causes**:
1. Owner approval process is external to system
2. Documentation not uploaded
3. Status not updated

**Solution**:
Implement clear owner approval workflow:

```javascript
// After internal approval
async function requestOwnerApproval(changeOrderId) {
  // 1. Generate change order document
  const document = await generateCODocument(changeOrderId);

  // 2. Send to owner
  await sendToOwner(document);

  // 3. Add tracking note
  await addNote(changeOrderId, {
    note: 'Change order documentation sent to owner for approval on ' +
          new Date().toISOString() +
          '. Awaiting signed approval.'
  });

  // 4. Set reminder
  await setReminder(changeOrderId, {
    daysFromNow: 7,
    message: 'Follow up on owner approval for CO'
  });
}

// When owner approval received
async function recordOwnerApproval(changeOrderId, signedDocument) {
  // 1. Upload signed document
  await uploadDocument(changeOrderId, signedDocument);

  // 2. Add note
  await addNote(changeOrderId, {
    note: 'Owner approval received on ' +
          new Date().toISOString() +
          '. Signed change order uploaded.'
  });

  // 3. Ready for execution
  return true;
}
```

---

## Summary

The Change Order Approval Service provides:

- **Flexible Configuration**: Customizable thresholds per project
- **Clear Routing**: Automatic approval routing based on amount
- **Role-Based Authorization**: Ensures proper approval authority
- **Validation**: Comprehensive approval chain validation
- **Audit Trail**: Complete history of approval decisions
- **Integration**: Seamless integration with budget and contract systems

By following the workflows and best practices outlined in this document, you can ensure proper oversight and authorization for all change orders while maintaining efficient project operations.
