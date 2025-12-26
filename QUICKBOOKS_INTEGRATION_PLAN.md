# QuickBooks Online Integration - Pre-Implementation Analysis & Plan

## Document Status
**Created:** 2025-12-10
**Status:** APPROVED FOR IMPLEMENTATION
**Task:** 3.6.1.8 - Integration APIs (QuickBooks)

---

## Executive Summary

This document outlines the comprehensive plan for integrating QuickBooks Online with the Builder API construction management platform. The integration enables bidirectional synchronization of financial data including vendors, bills, invoices, payments, and journal entries.

**Key Findings:**
- ✅ Financial module has robust entity structure ready for QB integration
- ✅ Bull queue infrastructure exists for background sync jobs
- ✅ Payment approval workflow has clear hooks for QB triggers
- ❌ No existing OAuth or external API integration patterns
- ❌ No event system for cross-module communication
- ❌ No QB-specific fields on existing entities

**Implementation Approach:**
- New `integrations/quickbooks` module with full isolation
- Extend existing entities with QB reference fields (non-breaking)
- Use Bull queues for async sync operations
- Implement OAuth 2.0 with secure token storage
- Add webhooks for real-time QB → Platform sync

---

## 1. EXISTING CODEBASE ANALYSIS

### 1.1 Financial Module Structure

**Location:** `/src/modules/financials/`

**Key Findings:**
- 37+ entities covering full construction financial lifecycle
- 40+ services with transaction support
- 19 controllers with JWT authentication
- Bull queue implementation for report scheduling
- No external integration infrastructure

**Entity Relationships:**
```
PaymentApplication
  ├─→ Commitment (has vendor info)
  ├─→ Project
  ├─→ PaymentApplicationItems (line items with cost codes)
  └─→ Workflow: DRAFT → SUBMITTED → APPROVED → PAID

Commitment
  ├─→ Project
  ├─→ Vendor fields: vendorName, vendorContact, vendorEmail
  └─→ Financial tracking: originalAmount, invoicedAmount, paidAmount

CostEntry
  ├─→ CostCode (needs QB account mapping)
  ├─→ Budget
  ├─→ Workflow: DRAFT → POSTED → VOID
  └─→ Type: LABOR, MATERIAL, EQUIPMENT, SUBCONTRACT, OTHER

PrimeContract
  ├─→ Project
  ├─→ Owner contract (basis for QB invoices)
  └─→ Financial: originalAmount, currentAmount, retentionPercentage
```

### 1.2 Integration Points Identified

#### A. Payment Application Approval (PRIMARY TRIGGER)
**File:** `/src/modules/financials/services/payment-application.service.ts`
**Method:** `approve()` (lines 254-318)

**Current Behavior:**
```typescript
// In transaction:
1. Update PaymentApplication status → APPROVED
2. Update Commitment.invoicedAmount += currentPaymentDue
3. Update BudgetLineItem.actualCost for each line
4. Commit transaction
```

**Integration Hook:**
```typescript
// AFTER transaction commit, add:
await this.eventEmitter.emit('payment-application.approved', {
  paymentApplicationId: payApp.id,
  organizationId: commitment.project.organizationId
});
// QB service listens to this event → creates Bill
```

#### B. Payment Recording (SECONDARY TRIGGER)
**Method:** `markPaid()` (lines 354-387)

**Current Behavior:**
```typescript
// In transaction:
1. Update PaymentApplication status → PAID
2. Update Commitment.paidAmount += currentPaymentDue
3. Record paidById, paidAt
4. Commit transaction
```

**Integration Hook:**
```typescript
// AFTER transaction commit:
await this.eventEmitter.emit('payment-application.paid', {
  paymentApplicationId: payApp.id,
  organizationId: commitment.project.organizationId
});
// QB service listens → creates BillPayment
```

#### C. Vendor Management
**Current State:**
- Commitment entity stores vendor as STRING fields
- No centralized Vendor entity
- No QB vendor linking

**Integration Approach:**
- Add `qbVendorId` field to Commitment (nullable)
- Create linking service to map Commitment vendors to QB
- Sync vendor on commitment approval (if QB enabled)

#### D. Owner Billing → Invoice
**Current State:**
- No explicit OwnerBilling entity found
- Could use PrimeContract + custom billing records
- Or PaymentApplication in reverse (from owner perspective)

**Implementation Decision:**
- Use PrimeContract as basis for owner invoices
- Create billing records (new entity or leverage existing)
- Map to QB Customer + Invoice

#### E. Cost Entry → Journal Entry
**Current State:**
- CostEntry entity with POSTED status
- Links to CostCode (needs QB account mapping)
- Transaction date tracking

**Integration Approach:**
- Batch export CostEntries as Journal Entries
- Map CostCode to QB Account via QBAccountMapping
- Support debit/credit line generation

### 1.3 Job Queue Infrastructure

**Implementation:** Bull queue with Redis backend

**Existing Pattern:**
```typescript
@Processor('report-schedule')
export class ReportScheduleQueueProcessor {
  @Process('generate-report')
  async handleReportGeneration(job: Job<GenerateReportJobDto>) {
    // Process report generation
    // Handle errors, retry logic
    // Update schedule with next run time
  }
}
```

**Reusable for QB:**
- Create `@Processor('quickbooks-sync')` for background sync
- Jobs: `sync-vendors`, `sync-bills`, `sync-invoices`, `retry-failed`
- Scheduled sync at configurable intervals

### 1.4 Missing Infrastructure

**Not Found (Need to Build):**
1. OAuth 2.0 implementation
2. External API client pattern
3. Webhook HTTP receivers
4. Event emitter system
5. Token encryption/decryption
6. Integration configuration
7. Sync status tracking
8. Error recovery mechanisms

---

## 2. QUICKBOOKS API REQUIREMENTS

### 2.1 OAuth 2.0 Flow

**Authorization URL:**
```
https://appcenter.intuit.com/connect/oauth2
  ?client_id={CLIENT_ID}
  &redirect_uri={REDIRECT_URI}
  &response_type=code
  &scope=com.intuit.quickbooks.accounting
  &state={organizationId}
```

**Token Exchange:**
```http
POST https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code={AUTH_CODE}
&redirect_uri={REDIRECT_URI}
&client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
```

**Response:**
```json
{
  "access_token": "xxx",
  "refresh_token": "yyy",
  "expires_in": 3600,
  "x_refresh_token_expires_in": 8726400,
  "token_type": "bearer",
  "realmId": "123456"
}
```

**Token Lifetimes:**
- Access Token: 1 hour (refresh frequently)
- Refresh Token: 100 days (store securely, may rotate)

### 2.2 API Endpoints

**Base URL:**
- Sandbox: `https://sandbox-quickbooks.api.intuit.com/v3/company/{realmId}`
- Production: `https://quickbooks.api.intuit.com/v3/company/{realmId}`

**Key Operations:**
```
GET    /vendor?query=...               # Query vendors
POST   /vendor                         # Create vendor
POST   /vendor?operation=update        # Update vendor
POST   /bill                           # Create bill
POST   /billpayment                    # Record bill payment
POST   /invoice                        # Create invoice
POST   /payment                        # Record invoice payment
GET    /account?query=...              # List accounts
POST   /journalentry                   # Create journal entry
POST   /query?query={SQL}              # SQL-like queries
```

### 2.3 Rate Limits (2025 Updates)

**Limits:**
- Standard: 500 req/min per company
- Batch: 120 req/min (increased Oct 2025)
- Resource-Intensive: 200 req/min
- Concurrent: Max 10 simultaneous

**Error Handling:**
- HTTP 429: Rate limit exceeded
- Retry with exponential backoff
- Use `Retry-After` header if present

### 2.4 Webhooks

**2025 CloudEvents Format (mandatory May 2026):**
```json
{
  "specversion": "1.0",
  "type": "qbo.invoice.updated.v1",
  "source": "quickbooks://realmId/123456",
  "id": "unique-event-id",
  "time": "2025-12-10T10:00:00Z",
  "datacontenttype": "application/json",
  "data": {
    "realmId": "123456",
    "entityName": "Invoice",
    "id": "789",
    "operation": "Update",
    "lastUpdated": "2025-12-10T10:00:00Z"
  }
}
```

**Verification:**
- HMAC-SHA256 signature in `intuit-signature` header
- Must respond HTTP 200 within 3 seconds
- Up to 3 retries if no 200 response

### 2.5 Optimistic Locking

**SyncToken Pattern:**
```typescript
// 1. Fetch latest version
const vendor = await qbClient.get(`/vendor/${id}`);
// SyncToken: "5"

// 2. Update with SyncToken
const updated = await qbClient.post(`/vendor?operation=update`, {
  ...vendor,
  SyncToken: vendor.SyncToken,  // Must match current
  DisplayName: "Updated Name"
});
// Returns new SyncToken: "6"

// 3. If concurrent update (5010 error):
// Refetch, merge changes, retry
```

---

## 3. INTEGRATION ARCHITECTURE

### 3.1 Module Structure

```
src/modules/integrations/
  └── quickbooks/
      ├── quickbooks.module.ts
      ├── controllers/
      │   ├── quickbooks-auth.controller.ts
      │   ├── quickbooks-settings.controller.ts
      │   ├── quickbooks-vendor.controller.ts
      │   ├── quickbooks-bill.controller.ts
      │   ├── quickbooks-invoice.controller.ts
      │   ├── quickbooks-journal-entry.controller.ts
      │   ├── quickbooks-sync.controller.ts
      │   └── quickbooks-webhook.controller.ts
      ├── services/
      │   ├── quickbooks-auth.service.ts
      │   ├── quickbooks-client.service.ts
      │   ├── quickbooks-vendor.service.ts
      │   ├── quickbooks-account.service.ts
      │   ├── quickbooks-bill.service.ts
      │   ├── quickbooks-invoice.service.ts
      │   ├── quickbooks-journal-entry.service.ts
      │   ├── quickbooks-sync.service.ts
      │   └── quickbooks-webhook.service.ts
      ├── entities/
      │   ├── qb-connection.entity.ts
      │   ├── qb-sync-settings.entity.ts
      │   ├── qb-account-mapping.entity.ts
      │   ├── qb-entity-link.entity.ts
      │   ├── qb-sync-history.entity.ts
      │   └── qb-sync-error.entity.ts
      ├── dto/
      │   ├── connection/
      │   ├── settings/
      │   ├── mappings/
      │   ├── vendor/
      │   ├── bill/
      │   ├── invoice/
      │   ├── journal-entry/
      │   ├── sync/
      │   └── webhook/
      ├── enums/
      │   ├── qb-connection-status.enum.ts
      │   ├── qb-sync-direction.enum.ts
      │   ├── qb-sync-frequency.enum.ts
      │   ├── qb-entity-type.enum.ts
      │   └── qb-sync-status.enum.ts
      ├── jobs/
      │   ├── scheduled-sync.processor.ts
      │   └── token-refresh.processor.ts
      └── utils/
          ├── qb-token-encryption.util.ts
          ├── qb-rate-limiter.util.ts
          └── qb-error-handler.util.ts
```

### 3.2 Entity Extensions

#### A. Commitment Entity Extension
**File:** `/src/modules/financials/entities/commitment.entity.ts`

**Add Fields:**
```typescript
@Column({ type: 'varchar', length: 100, nullable: true, name: 'qb_vendor_id' })
qbVendorId?: string;

@Column({ type: 'varchar', length: 50, nullable: true, name: 'qb_sync_status' })
qbSyncStatus?: 'PENDING' | 'SYNCED' | 'FAILED';

@Column({ type: 'timestamp', nullable: true, name: 'qb_last_synced_at' })
qbLastSyncedAt?: Date;
```

**Migration:** Non-breaking (all nullable)

#### B. New QB-Specific Entities

**QBConnection:**
```typescript
{
  id: UUID
  organizationId: UUID (unique)
  realmId: string
  companyName: string
  accessToken: text (encrypted)
  refreshToken: text (encrypted)
  accessTokenExpiresAt: timestamp
  refreshTokenExpiresAt: timestamp
  status: ACTIVE | EXPIRED | DISCONNECTED | ERROR
  connectedAt: timestamp
  lastSyncAt: timestamp (nullable)
}
```

**QBEntityLink:**
```typescript
{
  id: UUID
  organizationId: UUID
  entityType: VENDOR | PAY_APP | INVOICE | COST_ENTRY
  entityId: UUID
  qbEntityType: string ('Vendor', 'Bill', 'Invoice', 'JournalEntry')
  qbEntityId: string
  qbSyncToken: string (for optimistic locking)
  lastSyncedAt: timestamp
  syncDirection: TO_QB | FROM_QB
  syncStatus: SYNCED | PENDING | ERROR
}
```

**QBSyncHistory:**
```typescript
{
  id: UUID
  organizationId: UUID
  syncType: FULL | VENDORS | BILLS | INVOICES | JOURNAL_ENTRIES
  triggerType: MANUAL | SCHEDULED | AUTO | WEBHOOK
  startedAt: timestamp
  completedAt: timestamp (nullable)
  status: RUNNING | COMPLETED | COMPLETED_WITH_ERRORS | FAILED
  itemsProcessed: integer
  itemsSucceeded: integer
  itemsFailed: integer
  errorSummary: text
}
```

### 3.3 Service Layer Architecture

#### Core Services:

**1. QuickBooksAuthService**
- OAuth URL generation
- Token exchange and storage
- Token refresh automation
- Connection status management
- Encryption/decryption of tokens

**2. QuickBooksClientService**
- Low-level HTTP client
- Automatic token refresh on 401
- Rate limiting enforcement
- Error handling and retries
- Request logging

**3. QuickBooksVendorService**
- Commitment → QB Vendor mapping
- Bidirectional sync
- Link/unlink operations
- Conflict detection

**4. QuickBooksBillService**
- PaymentApplication → Bill export
- Bill payment recording
- Status tracking

**5. QuickBooksAccountService**
- Fetch QB chart of accounts
- Manage CostCode → Account mappings
- Auto-mapping suggestions

**6. QuickBooksSyncService**
- Full sync orchestration
- Scheduled sync management
- Sync history tracking
- Error management and retries

**7. QuickBooksWebhookService**
- Signature verification
- Event processing
- Entity update handling

### 3.4 Data Flow Diagrams

#### Flow 1: Payment App Approval → QB Bill
```
User approves PaymentApplication
  ↓
PaymentApplicationService.approve()
  ↓ (transaction)
Update PaymentApplication status
Update Commitment.invoicedAmount
Update Budget actualCost
  ↓ (transaction commit)
Emit event: payment-application.approved
  ↓ (async)
QuickBooksBillService listens
  ↓
Check if QB enabled for org
Check if vendor linked (Commitment.qbVendorId)
Check if accounts mapped (for line items)
  ↓
Create QB Bill via API
  ├─ VendorRef: qbVendorId
  ├─ TxnDate: approvedAt
  ├─ DocNumber: PA-{number}
  └─ Lines: mapped to QB accounts
  ↓
Store QB Bill ID in QBEntityLink
Update PaymentApplication.qbBillId (if field exists)
Record in QBSyncHistory
```

#### Flow 2: Payment Recorded → QB Bill Payment
```
User marks PaymentApplication PAID
  ↓
PaymentApplicationService.markPaid()
  ↓ (transaction)
Update PaymentApplication status
Update Commitment.paidAmount
  ↓ (transaction commit)
Emit event: payment-application.paid
  ↓ (async)
QuickBooksBillService listens
  ↓
Check if Bill exists in QB
Fetch Bill ID from QBEntityLink
  ↓
Create QB BillPayment via API
  ├─ VendorRef: qbVendorId
  ├─ TotalAmt: currentPaymentDue
  ├─ PayType: Check
  └─ LinkedTxn: Bill ID
  ↓
Store BillPayment ID in QBEntityLink
Record in QBSyncHistory
```

#### Flow 3: Webhook → Update Platform
```
QB sends webhook notification
  ↓
POST /api/v1/webhooks/quickbooks
  ↓
Verify HMAC signature
  ↓
Parse CloudEvents payload
  ↓
Determine entity type (Vendor, Bill, Invoice)
  ↓
Find local entity via QBEntityLink
  ↓
Fetch latest from QB API
  ↓
Compare SyncToken (detect concurrent updates)
  ↓
Update local entity (if platform is stale)
OR
Log conflict (if both updated)
  ↓
Record in QBSyncHistory
```

---

## 4. IMPLEMENTATION PHASES

### Phase 1: Foundation (Days 1-2)
**Goal:** Set up basic infrastructure

**Tasks:**
1. Create `integrations` and `quickbooks` module structure
2. Create all entity files (QBConnection, QBSyncSettings, etc.)
3. Create all enum files
4. Set up TypeORM migrations
5. Create basic DTO structure
6. Add environment variables (QB_CLIENT_ID, QB_CLIENT_SECRET, etc.)
7. Install dependencies (`axios`, `crypto`, `@nestjs/event-emitter`)

**Deliverables:**
- Module skeleton compiles
- Entities registered in TypeORM
- Configuration validated

### Phase 2: OAuth Implementation (Days 3-4)
**Goal:** Implement OAuth 2.0 flow

**Tasks:**
1. Implement `QuickBooksAuthService`
   - getAuthorizationUrl()
   - handleCallback()
   - refreshAccessToken()
   - revokeToken()
2. Implement token encryption utility (AES-256-GCM)
3. Create `QuickBooksAuthController`
   - GET /auth-url
   - GET /callback
   - POST /disconnect
   - GET /status
4. Write unit tests for auth service
5. Test OAuth flow end-to-end with QB sandbox

**Deliverables:**
- Can connect to QB sandbox
- Tokens stored encrypted
- Auto-refresh works
- Disconnect works

### Phase 3: API Client & Error Handling (Days 5-6)
**Goal:** Reliable QB API communication

**Tasks:**
1. Implement `QuickBooksClientService`
   - HTTP methods (get, post, put, delete)
   - Token refresh on 401
   - Rate limiting (429 handling)
   - Error parsing
   - Logging
2. Implement error handler utility
3. Implement rate limiter utility
4. Write comprehensive unit tests
5. Test error scenarios (expired token, rate limit, network error)

**Deliverables:**
- Reliable API client
- Rate limiting works
- Auto-retry works
- All error scenarios handled

### Phase 4: Account Mapping (Days 7-8)
**Goal:** Map CostCodes to QB Accounts

**Tasks:**
1. Implement `QuickBooksAccountService`
   - List QB accounts
   - Create/update/delete mappings
   - Auto-map suggestions (name matching)
   - Resolve account for cost code
2. Create `QuickBooksSettingsController`
   - GET /accounts (list QB accounts)
   - GET /account-mappings
   - PUT /account-mappings
   - POST /account-mappings/auto-map
3. Create mapping DTOs
4. Write unit tests
5. Test with QB sandbox accounts

**Deliverables:**
- Can fetch QB chart of accounts
- Can create mappings
- Auto-map works
- Mappings stored in DB

### Phase 5: Vendor Sync (Days 9-10)
**Goal:** Bidirectional vendor sync

**Tasks:**
1. Extend Commitment entity (add qbVendorId fields)
2. Implement `QuickBooksVendorService`
   - syncAllVendors()
   - syncVendor()
   - linkVendor()
   - createQBVendor()
   - updateQBVendor()
3. Create `QuickBooksVendorController`
4. Write unit tests
5. Test full sync cycle

**Deliverables:**
- Vendors sync TO QuickBooks
- Vendors sync FROM QuickBooks
- Link/unlink works
- Conflicts detected

### Phase 6: Bill Sync (Days 11-13)
**Goal:** Export pay apps as bills

**Tasks:**
1. Implement `QuickBooksBillService`
   - exportPayAppAsBill()
   - recordBillPayment()
   - createBill()
2. Create `QuickBooksBillController`
3. Integrate with PaymentApplicationService (event listeners)
4. Add auto-sync setting
5. Write unit tests
6. Test full workflow (approve → bill, mark paid → payment)

**Deliverables:**
- Approved pay apps create bills
- Paid pay apps record payments
- Bills visible in QB
- Entity links tracked

### Phase 7: Invoice Sync (Days 14-15)
**Goal:** Export owner billings as invoices

**Tasks:**
1. Determine owner billing source (PrimeContract or new entity)
2. Implement `QuickBooksInvoiceService`
3. Create `QuickBooksInvoiceController`
4. Customer management (create QB customer for owner)
5. Write unit tests
6. Test invoice creation and payment

**Deliverables:**
- Owner billings create invoices
- Invoices visible in QB
- Payments recorded

### Phase 8: Journal Entry Export (Days 16-17)
**Goal:** Export cost entries

**Tasks:**
1. Implement `QuickBooksJournalEntryService`
2. Create `QuickBooksJournalEntryController`
3. Cost entry → JE mapping logic
4. Debit/credit line generation
5. Write unit tests
6. Test with various cost entry types

**Deliverables:**
- Cost entries export as JEs
- Accounts mapped correctly
- Debits/credits balanced

### Phase 9: Webhooks (Days 18-19)
**Goal:** Handle QB → Platform sync

**Tasks:**
1. Implement `QuickBooksWebhookService`
   - Signature verification
   - Event processing
   - Entity updates
2. Create `QuickBooksWebhookController`
3. Handle CloudEvents format
4. Write unit tests
5. Test with QB webhook simulator

**Deliverables:**
- Webhooks verified
- Platform updates from QB changes
- Conflicts logged

### Phase 10: Sync Orchestration (Days 20-21)
**Goal:** Full sync and scheduling

**Tasks:**
1. Implement `QuickBooksSyncService`
2. Create sync history tracking
3. Create error tracking and retry
4. Implement scheduled sync jobs
5. Create `QuickBooksSyncController`
6. Write unit tests

**Deliverables:**
- Full sync works
- Scheduled sync works
- Errors tracked
- Retry works

### Phase 11: Testing & Documentation (Days 22-25)
**Goal:** Production readiness

**Tasks:**
1. Comprehensive unit tests (≥80% coverage)
2. Integration tests (E2E)
3. API documentation
4. Setup guide
5. Troubleshooting guide
6. Update CHANGELOG.md
7. Add permissions to docs/permissions.md

**Deliverables:**
- All tests passing
- Documentation complete
- Ready for review

### Phase 12: Production Preparation (Days 26-28)
**Goal:** Deploy to production

**Tasks:**
1. QB production app setup
2. Environment config
3. Security review
4. Performance testing
5. Monitoring setup
6. Rollout plan

**Deliverables:**
- Production QB app approved
- Deployed to staging
- Deployed to production

---

## 5. RISK ANALYSIS

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| OAuth token rotation issues | Medium | High | Implement robust refresh logic, log all token updates |
| Rate limiting during bulk sync | High | Medium | Implement backoff, batch operations, scheduled sync |
| Concurrent update conflicts | Medium | Medium | Use SyncToken, implement conflict resolution UI |
| Webhook signature failures | Low | Medium | Comprehensive signature testing, fallback to polling |
| Network failures during sync | Medium | High | Idempotent operations, transaction rollback, retry queue |
| QB API changes | Low | High | Version locking, monitor QB changelogs, test on sandbox |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Duplicate bills in QB | Medium | High | Check for existing link before create, use DocNumber uniqueness |
| Incorrect account mapping | High | Medium | Validation UI, warning on unmapped accounts, audit trail |
| Data sync lag | Medium | Medium | Set expectations (async), show sync status, manual sync option |
| User confusion on conflicts | Medium | Low | Clear conflict UI, resolution wizard, documentation |

---

## 6. TESTING STRATEGY

### Unit Tests (≥80% Coverage)

**Auth Service:**
- OAuth URL generation
- Token exchange
- Token refresh (expired, rotated)
- Token revocation
- Encryption/decryption

**Client Service:**
- HTTP methods
- Token refresh on 401
- Rate limit handling (429)
- Error parsing
- Retry logic

**Bill Service:**
- Pay app → Bill mapping
- Line item account resolution
- Bill payment creation
- Error handling (unmapped account, unlinked vendor)

**Vendor Service:**
- Commitment → Vendor mapping
- Bidirectional sync
- Conflict detection
- Link/unlink

**Sync Service:**
- Full sync orchestration
- History tracking
- Error tracking
- Retry logic

### Integration Tests

**OAuth Flow:**
- Full flow with mocked QB responses
- Token refresh simulation
- Disconnection

**Sync Operations:**
- Vendor sync (both directions)
- Bill creation and payment
- Invoice creation
- Journal entry export

**Webhook Handling:**
- Signature verification
- Event processing
- Entity updates

### E2E Tests (with QB Sandbox)

**Complete Workflows:**
1. Connect to QB sandbox
2. Map accounts
3. Approve pay app → verify bill in QB
4. Mark paid → verify payment in QB
5. Trigger webhook → verify update in platform
6. Disconnect and reconnect

---

## 7. SUCCESS CRITERIA

### Functional
- ✅ Can connect/disconnect QB
- ✅ Tokens auto-refresh
- ✅ Vendors sync bidirectionally
- ✅ Cost codes mapped to accounts
- ✅ Approved pay apps create bills
- ✅ Paid pay apps record payments
- ✅ Owner billings create invoices
- ✅ Cost entries export as JEs
- ✅ Webhooks process successfully
- ✅ Sync history visible
- ✅ Errors retryable

### Technical
- ✅ Unit test coverage ≥80%
- ✅ All TypeScript types correct
- ✅ No memory leaks
- ✅ Rate limits respected
- ✅ Errors handled gracefully
- ✅ Idempotent operations

### Documentation
- ✅ API docs complete
- ✅ Setup guide complete
- ✅ Troubleshooting guide complete
- ✅ CHANGELOG updated
- ✅ Permissions documented

---

## 8. DEPENDENCIES & ENVIRONMENT

### NPM Packages (New)
```json
{
  "axios": "^1.6.0",
  "crypto-js": "^4.2.0",
  "@nestjs/event-emitter": "^2.0.0"
}
```

### Environment Variables (New)
```env
# QuickBooks OAuth
QB_CLIENT_ID=xxx
QB_CLIENT_SECRET=xxx
QB_REDIRECT_URI=https://app.example.com/api/v1/integrations/quickbooks/callback
QB_ENVIRONMENT=sandbox  # or 'production'

# Token Encryption
QB_TOKEN_ENCRYPTION_KEY=xxx  # 32-byte hex string

# Webhook
QB_WEBHOOK_VERIFIER_TOKEN=xxx

# API URLs
QB_BASE_URL_SANDBOX=https://sandbox-quickbooks.api.intuit.com
QB_BASE_URL_PRODUCTION=https://quickbooks.api.intuit.com
QB_AUTH_URL=https://appcenter.intuit.com/connect/oauth2
QB_TOKEN_URL=https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
```

---

## 9. MONITORING & OBSERVABILITY

### Metrics to Track
- OAuth connection status per organization
- Token refresh success/failure rate
- API call success rate by endpoint
- Rate limit hits per minute
- Sync operation duration
- Error rate by error type
- Webhook processing latency

### Logging Requirements
- All QB API calls (request/response, redact tokens)
- All sync operations (start, end, status)
- All errors with full context
- Token refresh events
- Webhook events

### Alerts
- Token refresh failures (indicates disconnection risk)
- Sync failures exceeding threshold (5 failures in 1 hour)
- Rate limit hits exceeding threshold (10 in 1 minute)
- Webhook signature failures (indicates security issue)

---

## 10. SECURITY CONSIDERATIONS

### Token Storage
- Encrypt access and refresh tokens (AES-256-GCM)
- Store encryption key in secure vault (not in code)
- Never log tokens (redact in logs)
- Rotate encryption key periodically

### API Keys
- Store QB client ID/secret in environment variables
- Never commit to git
- Use different keys for sandbox vs production

### Webhook Security
- Verify HMAC signature on all webhooks
- Reject invalid signatures
- Rate limit webhook endpoint
- Log all webhook attempts

### RBAC
- Restrict QB connection to org admins
- Restrict sync operations to project managers+
- Restrict error retry to admins
- Audit all QB-related actions

---

## 11. ROLLOUT PLAN

### Phase 1: Internal Testing (Week 1)
- Deploy to dev environment
- Test with QB sandbox
- Fix critical bugs

### Phase 2: Beta Testing (Week 2-3)
- Deploy to staging
- Invite 3-5 beta users
- Test with real QB companies
- Gather feedback

### Phase 3: Limited Release (Week 4)
- Deploy to production
- Enable for 10% of organizations
- Monitor closely
- Fix issues quickly

### Phase 4: Full Release (Week 5+)
- Enable for all organizations
- Announce feature
- Provide training materials
- Monitor and support

---

## 12. POST-LAUNCH SUPPORT

### User Training
- Setup guide (connecting QB)
- Account mapping tutorial
- Troubleshooting common issues
- Best practices for sync

### Support Documentation
- FAQ for common questions
- Video tutorials for setup
- Troubleshooting decision tree
- Error code reference

### Monitoring
- Daily sync success rate review
- Weekly error analysis
- Monthly performance review
- Quarterly QB API changelog review

---

## CONCLUSION

This integration is complex but well-scoped. The existing financial module provides a solid foundation. The main challenges are:

1. **OAuth complexity**: Requires careful token management
2. **Rate limiting**: Requires intelligent batching and backoff
3. **Concurrent updates**: Requires conflict detection and resolution
4. **Error recovery**: Requires robust retry mechanisms

**Estimated Timeline:** 28 days (4 weeks) for full implementation including testing and documentation.

**Recommended Approach:** Phased rollout starting with OAuth and vendor sync, then progressively adding bill/invoice sync.

**Next Steps:**
1. ✅ Analysis complete
2. → Start Phase 1: Foundation
3. → Implement Phase 2: OAuth

---

**Document Approved By:** Development Team
**Implementation Start Date:** 2025-12-10
