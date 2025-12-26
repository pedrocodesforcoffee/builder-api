# Time-Based Expiration System

## Overview

The time-based expiration system provides automatic access revocation for temporary project memberships. This is essential for managing contractors, consultants, and other temporary team members who need time-limited access to projects.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│           Expiration Access Check Flow                  │
└─────────────────────────────────────────────────────────┘

User requests access
         ↓
[1] Check if user has inherited role
    - Inherited? → Grant access (never expires)
    - Explicit? → Continue to expiration check
         ↓
[2] Check if membership has expiration date
    - No expiration? → Grant access
    - Has expiration? → Check if expired
         ↓
[3] Check expiration status
    - Expired? → Deny access
    - Active? → Grant access
         ↓
[4] Permission check continues as normal
```

## Features

### 1. Automatic Expiration

Memberships with an `expiresAt` date automatically lose access when that date is reached:

```typescript
// User loses access on 2025-12-31 at 23:59:59
membership.expiresAt = new Date('2025-12-31T23:59:59Z');
```

### 2. Multi-Stage Notifications

Three-tier notification system to keep users informed:

- **7-day warning**: Sent 7 days before expiration
- **1-day final warning**: Sent 1 day before expiration
- **Expiration notification**: Sent when access expires

### 3. Renewal Workflow

Users can request renewal before or after expiration:

1. User submits renewal request with justification
2. Project admin receives notification
3. Admin approves/denies with optional reason
4. User receives decision notification

### 4. Expiration Extensions

Admins can extend expiration dates without going through renewal workflow:

```typescript
await expirationService.extendExpiration(
  userId,
  projectId,
  newExpiresAt,
  'Extended for phase 2 work',
  adminUserId,
);
```

### 5. Permanent Conversion

Remove expiration to make membership permanent:

```typescript
await expirationService.removeExpiration(
  userId,
  projectId,
  adminUserId,
  'Converted to permanent team member',
);
```

### 6. Inherited Role Exemption

Organization owners and admins with inherited roles never expire, regardless of any expiration settings on their explicit project membership.

## Expiration Workflow

### Setting Up Expiration

When adding a new project member with expiration:

```typescript
const membership = await projectMemberRepo.save({
  userId: 'user-123',
  projectId: 'project-456',
  role: ProjectRole.SUBCONTRACTOR,
  expiresAt: new Date('2025-06-30'),
  expirationReason: '90-day electrical contract',
});
```

### Expiration States

| Status | Days Until Expiration | Description |
|--------|---------------------|-------------|
| `NO_EXPIRATION` | N/A | Membership has no expiration date set |
| `ACTIVE` | > 7 days | Membership is active with expiration in the future |
| `EXPIRING_SOON` | 1-7 days | Approaching expiration, warning sent |
| `EXPIRED` | <= 0 days | Access has expired |

### Automatic Processing

A scheduled job runs daily (9:00 AM by default) to:

1. Find memberships requiring notifications
2. Send appropriate emails (warning, final, or expired)
3. Mark notifications as sent to avoid duplicates
4. Log results for monitoring

```typescript
// Manually trigger processing (for testing)
await schedulerService.triggerExpirationNotifications();
```

## Renewal Workflow

### 1. User Requests Renewal

User can request renewal through the UI or API:

```typescript
await expirationService.requestRenewal(
  userId,
  projectId,
  userId, // requestedBy
  'Need additional time to complete MEP installation',
);
```

This updates the membership:
- `renewalRequested` = true
- `renewalRequestedAt` = current timestamp
- `renewalRequestedBy` = requesting user ID
- `renewalReason` = justification
- `renewalStatus` = 'pending'

### 2. Admin Notification

All project admins receive an email notification with:
- User requesting renewal
- Current role and expiration date
- Renewal reason
- Link to review request

### 3. Admin Processes Request

**Approve Renewal:**

```typescript
await expirationService.processRenewal(
  userId,
  projectId,
  true, // approved
  adminUserId,
  'Approved - phase 2 work confirmed',
  new Date('2025-09-30'), // new expiration date
);
```

**Deny Renewal:**

```typescript
await expirationService.processRenewal(
  userId,
  projectId,
  false, // denied
  adminUserId,
  'Project phase complete, no additional work needed',
);
```

### 4. User Notification

User receives email notification with:
- Decision (approved/denied)
- Admin's reason
- New expiration date (if approved)
- Next steps

## Notification System

### Email Templates

#### 7-Day Warning

```
Subject: Your access to [Project Name] expires in X days

Your access to "[Project Name]" will expire in X days.

Expires: [Date and Time]
Your Role: [Role]

Request renewal: [Link]
```

#### 1-Day Final Warning

```
Subject: URGENT: Your access to [Project Name] expires tomorrow

URGENT: Your access to "[Project Name]" will expire TOMORROW.

Expires: [Date and Time]
Your Role: [Role]

Request renewal immediately: [Link]
```

#### Expiration Notification

```
Subject: Your access to [Project Name] has expired

Your access to "[Project Name]" has expired.

Expired: [Date and Time]

You may request renewal: [Link]
```

### Notification Tracking

The system tracks sent notifications to avoid duplicates:

| Field | Purpose |
|-------|---------|
| `expirationWarningNotifiedAt` | Timestamp of 7-day warning |
| `expirationFinalNotifiedAt` | Timestamp of 1-day warning |
| `expiredNotifiedAt` | Timestamp of expiration notification |

### Configuring Email Service

The notification service includes placeholder email implementation. To enable actual emails:

1. Install email service (e.g., SendGrid, AWS SES, Nodemailer)
2. Update `ExpirationNotificationService.sendEmail()` method
3. Configure email templates with HTML styling
4. Set `FRONTEND_URL` environment variable for links

## API Reference

### ExpirationService

#### checkExpiration()

Check detailed expiration status for a membership.

```typescript
const result = await expirationService.checkExpiration(
  userId,
  projectId,
);

// Returns:
{
  isExpired: false,
  expiresAt: Date,
  daysUntilExpiration: 15,
  status: ExpirationStatus.ACTIVE
}
```

#### isExpired()

Simple boolean check if membership has expired.

```typescript
const expired = await expirationService.isExpired(userId, projectId);
// Returns: true or false
```

#### isExpiringSoon()

Check if membership expires within specified days.

```typescript
const expiringSoon = await expirationService.isExpiringSoon(
  userId,
  projectId,
  7, // days ahead
);
```

#### extendExpiration()

Extend expiration date for a membership.

```typescript
const membership = await expirationService.extendExpiration(
  userId,
  projectId,
  new Date('2025-12-31'),
  'Extended for additional scope',
  adminUserId,
);
```

#### removeExpiration()

Remove expiration to make membership permanent.

```typescript
const membership = await expirationService.removeExpiration(
  userId,
  projectId,
  adminUserId,
  'Converted to full-time team member',
);
```

#### requestRenewal()

Submit renewal request.

```typescript
const membership = await expirationService.requestRenewal(
  userId,
  projectId,
  userId,
  'Need more time for punch list completion',
);
```

#### processRenewal()

Approve or deny renewal request.

```typescript
const membership = await expirationService.processRenewal(
  userId,
  projectId,
  true, // approved
  adminUserId,
  'Approved - additional work authorized',
  new Date('2026-03-31'),
);
```

#### getExpiringMemberships()

Get memberships expiring within specified days.

```typescript
const expiring = await expirationService.getExpiringMemberships(
  projectId,
  7, // days ahead
);
```

#### getPendingRenewals()

Get all pending renewal requests for a project.

```typescript
const pending = await expirationService.getPendingRenewals(projectId);
```

#### getExpirationStats()

Get comprehensive expiration statistics.

```typescript
const stats = await expirationService.getExpirationStats(projectId);

// Returns:
{
  totalMemberships: 25,
  expiredCount: 2,
  expiringSoonCount: 5,
  activeWithExpirationCount: 8,
  noExpirationCount: 10,
  pendingRenewalsCount: 3,
  approvedRenewalsCount: 7,
  deniedRenewalsCount: 2,
  expiringMemberships: {
    expired: [...],
    expiringSoon7Days: [...],
    expiringSoon1Day: [...]
  },
  renewalRequests: {
    pending: [...],
    recent: [...]
  }
}
```

### ExpirationNotificationService

#### processExpirationNotifications()

Process notifications for a single project.

```typescript
const result = await notificationService.processExpirationNotifications(
  projectId,
);

// Returns:
{
  warningNotifications: 3,
  finalNotifications: 2,
  expiredNotifications: 1,
  errors: []
}
```

#### processAllExpirationNotifications()

Process notifications for all projects (used by scheduled job).

```typescript
const result = await notificationService.processAllExpirationNotifications();
```

#### notifyAdminsOfRenewalRequest()

Notify project admins of renewal request.

```typescript
await notificationService.notifyAdminsOfRenewalRequest(
  userId,
  projectId,
  'Renewal reason...',
);
```

#### notifyUserOfRenewalDecision()

Notify user of renewal decision.

```typescript
await notificationService.notifyUserOfRenewalDecision(
  userId,
  projectId,
  true, // approved
  new Date('2026-06-30'),
  'Extension approved',
);
```

### ExpirationSchedulerService

#### handleExpirationNotifications()

Daily cron job method (automatically called at 9 AM).

```typescript
// Uncomment @Cron decorator after installing @nestjs/schedule
@Cron('0 9 * * *')
async handleExpirationNotifications(): Promise<void>
```

#### triggerExpirationNotifications()

Manually trigger notification processing.

```typescript
const result = await schedulerService.triggerExpirationNotifications();
```

## Examples

### Example 1: 90-Day Contractor

Add contractor with 90-day expiration:

```typescript
const contractEndDate = new Date();
contractEndDate.setDate(contractEndDate.getDate() + 90);

const membership = await projectMemberRepo.save({
  userId: contractorUserId,
  projectId,
  role: ProjectRole.SUBCONTRACTOR,
  expiresAt: contractEndDate,
  expirationReason: '90-day electrical installation contract',
  addedByUserId: adminUserId,
});

// User receives notifications:
// - Day 83: 7-day warning
// - Day 89: 1-day warning
// - Day 90: Expiration notification
// - Day 90+: Access denied
```

### Example 2: Temporary Inspector

Add inspector for specific inspection period:

```typescript
const membership = await projectMemberRepo.save({
  userId: inspectorUserId,
  projectId,
  role: ProjectRole.INSPECTOR,
  expiresAt: new Date('2025-07-15'),
  expirationReason: 'Fire safety inspection - July 1-15',
  addedByUserId: adminUserId,
});
```

### Example 3: Extend Contractor Access

Contractor needs additional time:

```typescript
// Contractor requests renewal
await expirationService.requestRenewal(
  contractorUserId,
  projectId,
  contractorUserId,
  'Electrical rough-in delayed due to weather. Need 30 additional days.',
);

// Admin receives notification and approves
const newExpiresAt = new Date();
newExpiresAt.setDate(newExpiresAt.getDate() + 30);

await expirationService.processRenewal(
  contractorUserId,
  projectId,
  true,
  adminUserId,
  'Approved - weather delay confirmed with schedule',
  newExpiresAt,
);

// Contractor receives approval notification
// Notification timestamps are reset for new expiration
```

### Example 4: Convert to Permanent

Convert contractor to permanent team member:

```typescript
await expirationService.removeExpiration(
  contractorUserId,
  projectId,
  adminUserId,
  'Hired as full-time electrical lead',
);

// Membership now permanent:
// - expiresAt = null
// - expirationReason = null
// - No future expiration notifications
```

### Example 5: Bulk Expiration Report

Get overview of expiring memberships:

```typescript
const stats = await expirationService.getExpirationStats(projectId);

console.log(`Total memberships: ${stats.totalMemberships}`);
console.log(`Expired: ${stats.expiredCount}`);
console.log(`Expiring soon: ${stats.expiringSoonCount}`);
console.log(`Pending renewals: ${stats.pendingRenewalsCount}`);

// Review pending renewals
for (const renewal of stats.renewalRequests.pending) {
  console.log(`${renewal.user.name} - ${renewal.renewalReason}`);
}
```

## Best Practices

### 1. Clear Expiration Reasons

Always provide clear, specific reasons for expiration:

✅ **Good:**
- "90-day HVAC installation contract"
- "Temporary inspection: July 1-15, 2025"
- "Guest access for project kickoff meeting"

❌ **Bad:**
- "Temporary"
- "Short term"
- "TBD"

### 2. Appropriate Expiration Durations

Choose expiration dates based on work scope:

| Work Type | Typical Duration |
|-----------|-----------------|
| Daily inspection | 1 day |
| Weekly inspection | 7 days |
| Short contract | 30-90 days |
| Phase-based work | Project phase duration |
| Long contract | 6-12 months |

### 3. Renewal Lead Time

Set expiration dates with adequate renewal time:

- Allow 2-3 weeks before critical work completes
- Consider approval workflow time
- Account for weekends and holidays

### 4. Monitor Expiration Reports

Regular review expiration statistics:

```typescript
// Weekly review
const stats = await expirationService.getExpirationStats(projectId);

// Check for:
// - Unexpected expirations
// - Pending renewals needing attention
// - Recently expired memberships
```

### 5. Renewal Justification

Require clear justification for renewals:

✅ **Good renewal reasons:**
- "Weather delay pushed rough-in by 2 weeks"
- "Additional scope added: lighting controls installation"
- "QC issues require rework - need 10 additional days"

❌ **Bad renewal reasons:**
- "Need more time"
- "Not done yet"
- "Please extend"

### 6. Inherited Roles Never Expire

Remember that organization-level roles (inherited) never expire:

```typescript
// Org owner has inherited PROJECT_ADMIN role
// Even if explicit membership has expiration, they retain access
const roleResult = await inheritanceService.getEffectiveRole(
  orgOwnerUserId,
  projectId,
);

// roleResult.isInherited = true
// Expiration check returns NO_EXPIRATION
```

## Troubleshooting

### User Claims Access Should Not Be Expired

**Check:**

1. Verify expiration date:
```typescript
const membership = await projectMemberRepo.findOne({
  where: { userId, projectId }
});
console.log('Expires:', membership.expiresAt);
```

2. Check if user has inherited role:
```typescript
const roleResult = await inheritanceService.getEffectiveRole(
  userId,
  projectId,
);
console.log('Inherited:', roleResult.isInherited);
```

3. Verify permission cache is not stale:
```typescript
await permissionService.clearPermissionCache(userId, projectId);
```

### Notifications Not Being Sent

**Check:**

1. Verify scheduled job is running:
```typescript
const isProcessing = schedulerService.isCurrentlyProcessing();
console.log('Processing:', isProcessing);
```

2. Check notification timestamps:
```typescript
const membership = await projectMemberRepo.findOne({
  where: { userId, projectId }
});
console.log('Warning sent:', membership.expirationWarningNotifiedAt);
console.log('Final sent:', membership.expirationFinalNotifiedAt);
console.log('Expired sent:', membership.expiredNotifiedAt);
```

3. Manually trigger notifications:
```typescript
const result = await schedulerService.triggerExpirationNotifications();
console.log('Results:', result);
```

4. Check email configuration:
```typescript
// Verify FRONTEND_URL is set
console.log('Frontend URL:', process.env.FRONTEND_URL);

// Check email service is configured
// (depends on your email provider)
```

### Renewal Request Not Appearing

**Check:**

1. Verify request was created:
```typescript
const membership = await projectMemberRepo.findOne({
  where: { userId, projectId }
});
console.log('Renewal requested:', membership.renewalRequested);
console.log('Renewal status:', membership.renewalStatus);
```

2. Get pending renewals:
```typescript
const pending = await expirationService.getPendingRenewals(projectId);
console.log('Pending count:', pending.length);
```

### Extension Not Taking Effect

**Check:**

1. Verify extension was saved:
```typescript
const membership = await projectMemberRepo.findOne({
  where: { userId, projectId }
});
console.log('New expiration:', membership.expiresAt);
```

2. Clear permission cache:
```typescript
await permissionService.clearPermissionCache(userId, projectId);
```

3. Verify notification timestamps were reset:
```typescript
console.log('Warning reset:', membership.expirationWarningNotifiedAt === null);
console.log('Final reset:', membership.expirationFinalNotifiedAt === null);
```

## Scheduled Job Setup

### Installing @nestjs/schedule

```bash
npm install @nestjs/schedule
```

### Enable Scheduled Job

1. Uncomment imports and decorator in `expiration-scheduler.service.ts`:

```typescript
import { Cron } from '@nestjs/schedule';

@Cron('0 9 * * *', {
  name: 'processExpirationNotifications',
  timeZone: 'America/Los_Angeles',
})
async handleExpirationNotifications(): Promise<void> {
  // ...
}
```

2. Add ScheduleModule to AppModule:

```typescript
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ... other imports
  ],
})
export class AppModule {}
```

3. Customize schedule (optional):

```typescript
// Every day at midnight
@Cron('0 0 * * *')

// Every day at 9 AM and 5 PM
@Cron('0 9,17 * * *')

// Every hour
@Cron('0 * * * *')

// Every Monday at 9 AM
@Cron('0 9 * * 1')
```

## Security Considerations

1. **Inherited Roles Always Bypass**: Organization owners/admins cannot be locked out by expiration
2. **Clear Audit Trail**: All expiration changes are timestamped with actor
3. **Notification Tracking**: Prevents duplicate notifications
4. **Renewal Approval Required**: Users cannot self-extend access
5. **Permission Cache Integration**: Expiration checked on every permission request
6. **Graceful Degradation**: System continues working if email service fails

## Integration with Other Systems

### With Permission System

Expiration is automatically checked in:
- `PermissionService.checkPermission()`
- `PermissionService.hasAnyPermission()`
- `PermissionService.hasAllPermissions()`
- `PermissionService.getUserPermissionMap()`

### With Scope System

Expiration and scope work together:
1. Permission check
2. Expiration check
3. Scope check (if applicable)

Both must pass for access to be granted.

### With Role Inheritance

Inherited roles bypass expiration:
- Organization owners always have access
- Organization admins always have access
- Explicit memberships can expire normally

## Related Documentation

- [Role Inheritance System](./ROLE_INHERITANCE.md)
- [Scope-Limited Access](./SCOPE_ACCESS.md)
- [Permission Matrix](./PERMISSION_MATRIX.md)
- [Multi-Level RBAC](./MULTI_LEVEL_RBAC.md)
