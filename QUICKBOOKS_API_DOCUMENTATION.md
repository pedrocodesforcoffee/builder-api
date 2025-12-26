# QuickBooks Online API - Comprehensive Documentation

## Table of Contents
1. [OAuth 2.0 Flow](#oauth-20-flow)
2. [API Endpoints](#api-endpoints)
3. [Rate Limits](#rate-limits)
4. [Webhooks](#webhooks)
5. [Best Practices](#best-practices)
6. [Code Examples](#code-examples)

---

## 1. OAuth 2.0 Flow

### Authorization Endpoints

**Authorization URL:**
```
https://appcenter.intuit.com/connect/oauth2
```

**Token Endpoint:**
```
https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
```

### Required Scopes

- **Accounting Scope:** `com.intuit.quickbooks.accounting`
  - Provides access to all entities and endpoints in the QuickBooks Online Accounting API
  - Includes vendor, bill, invoice, account, journal entry, and query operations

- **Payment Scope:** `com.intuit.quickbooks.payment`
  - Required for payment processing operations

### Token Expiration

| Token Type | Expiration | Details |
|------------|------------|---------|
| **Access Token** | 1 hour (3600 seconds) | Must be refreshed after expiration |
| **Refresh Token** | 100 days (8,726,400 seconds) | Maximum validity period |

### Token Refresh Behavior

**Important:** The refresh token value can change every 24-26 hours:
- Each day, QuickBooks Online may return a new refresh token when you call the refresh endpoint
- When a new refresh token is returned, the previous one is forced to expire
- **Best Practice:** Always store the latest refresh token from API responses

### Re-authentication Requirements

- If the refresh token is not used for more than 100 days, it expires
- Applications cannot automatically get a new access token after expiration
- Users must reauthorize the connection every 100 days of inactivity

### OAuth 2.0 Flow Steps

1. **Construct Authorization URL** with:
   - Client ID
   - Scope
   - Redirect URI
   - Response type
   - State parameter (for CSRF protection)

2. **Redirect User** to authenticate and authorize your app

3. **Receive Authorization Code** at your redirect URI

4. **Exchange Authorization Code** for tokens via POST request to token endpoint

5. **Store Tokens Securely** and implement refresh logic

---

## 2. API Endpoints

### Base URLs

**Sandbox Environment:**
```
https://sandbox-quickbooks.api.intuit.com/
```

**Production Environment:**
```
https://quickbooks.api.intuit.com/
```

### Endpoint Structure

```
{BASE_URL}/v3/company/{COMPANY_ID}/{resource}
```

### Common Headers

```http
Authorization: Bearer {access_token}
Accept: application/json
Content-Type: application/json
```

### Vendor API

**Create Vendor:**
```http
POST /v3/company/{companyId}/vendor
```

**Request Body Example:**
```json
{
  "DisplayName": "Sample Vendor",
  "PrimaryPhone": {
    "FreeFormNumber": "(555) 555-5555"
  },
  "PrimaryEmailAddr": {
    "Address": "vendor@example.com"
  },
  "WebAddr": {
    "URI": "http://www.example.com"
  },
  "CompanyName": "Vendor Company Name",
  "BillAddr": {
    "Line1": "123 Main Street",
    "City": "Mountain View",
    "CountrySubDivisionCode": "CA",
    "PostalCode": "94042"
  }
}
```

**Update Vendor:**
```http
POST /v3/company/{companyId}/vendor?operation=update
```

**Query Vendors:**
```http
GET /v3/company/{companyId}/query?query=SELECT * FROM Vendor
```

**Get Vendor by ID:**
```http
GET /v3/company/{companyId}/vendor/{vendorId}
```

### Bill API

**Create Bill:**
```http
POST /v3/company/{companyId}/bill
```

**Request Body Example:**
```json
{
  "VendorRef": {
    "value": "42"
  },
  "Line": [
    {
      "DetailType": "AccountBasedExpenseLineDetail",
      "Amount": 100.00,
      "AccountBasedExpenseLineDetail": {
        "AccountRef": {
          "value": "7"
        }
      }
    }
  ],
  "TxnDate": "2025-12-10",
  "DueDate": "2025-12-25"
}
```

**Update Bill:**
```http
POST /v3/company/{companyId}/bill?operation=update
```

**Query Bills:**
```http
GET /v3/company/{companyId}/query?query=SELECT * FROM Bill WHERE VendorRef = '42'
```

### Bill Payment API

**Create Bill Payment:**
```http
POST /v3/company/{companyId}/billpayment
```

**Request Body Example (Check Payment):**
```json
{
  "VendorRef": {
    "value": "1",
    "name": "vendor_name"
  },
  "PayType": "Check",
  "CheckPayment": {
    "BankAccountRef": {
      "value": "1",
      "name": "Test Account"
    }
  },
  "TotalAmt": 100.00,
  "PrivateNote": "Payment for Invoice #12345",
  "TxnDate": "2025-12-10",
  "Line": [
    {
      "Amount": 100.00,
      "LinkedTxn": [
        {
          "TxnId": "1",
          "TxnType": "Bill"
        }
      ]
    }
  ]
}
```

**Response Example:**
```json
{
  "BillPayment": {
    "VendorRef": {
      "value": "290",
      "name": "L"
    },
    "PayType": "Check",
    "CheckPayment": {
      "BankAccountRef": {
        "value": "33",
        "name": "First"
      },
      "PrintStatus": "NotSet"
    },
    "TotalAmt": 100.00,
    "domain": "QBO",
    "sparse": false,
    "Id": "28648",
    "SyncToken": "1",
    "MetaData": {
      "CreateTime": "2021-04-16T13:18:41-07:00",
      "LastUpdatedTime": "2021-04-23T11:48:13-07:00"
    },
    "DocNumber": "FX 632214",
    "TxnDate": "2021-04-14",
    "Line": [
      {
        "Amount": 100.00,
        "LinkedTxn": [
          {
            "TxnId": "27730",
            "TxnType": "Bill"
          }
        ]
      }
    ]
  }
}
```

### Invoice API

**Create Invoice:**
```http
POST /v3/company/{companyId}/invoice
```

**Request Body Example:**
```json
{
  "CustomerRef": {
    "value": "1"
  },
  "Line": [
    {
      "DetailType": "SalesItemLineDetail",
      "Amount": 100.00,
      "SalesItemLineDetail": {
        "ItemRef": {
          "value": "1"
        },
        "Qty": 1,
        "UnitPrice": 100.00
      }
    }
  ],
  "TxnDate": "2025-12-10",
  "DueDate": "2025-12-25"
}
```

**Update Invoice:**
```http
POST /v3/company/{companyId}/invoice?operation=update
```

**Query Invoices:**
```http
GET /v3/company/{companyId}/query?query=SELECT * FROM Invoice WHERE CustomerRef = '1'
```

### Payment API (Invoice Payment)

**Create Payment:**
```http
POST /v3/company/{companyId}/payment
```

**Request Body Example:**
```json
{
  "CustomerRef": {
    "value": "1"
  },
  "TotalAmt": 100.00,
  "Line": [
    {
      "Amount": 100.00,
      "LinkedTxn": [
        {
          "TxnId": "123",
          "TxnType": "Invoice"
        }
      ]
    }
  ]
}
```

### Account API (Chart of Accounts)

**Create Account:**
```http
POST /v3/company/{companyId}/account
```

**Request Body Example:**
```json
{
  "Name": "Office Supplies",
  "AccountType": "Expense",
  "AccountSubType": "SuppliesMaterialsCogs"
}
```

**Query Accounts:**
```http
GET /v3/company/{companyId}/query?query=SELECT * FROM Account WHERE AccountType = 'Expense'
```

**Get Account by ID:**
```http
GET /v3/company/{companyId}/account/{accountId}
```

### Journal Entry API

**Create Journal Entry:**
```http
POST /v3/company/{companyId}/journalentry
```

**Request Body Example:**
```json
{
  "Line": [
    {
      "DetailType": "JournalEntryLineDetail",
      "Amount": 100.00,
      "JournalEntryLineDetail": {
        "PostingType": "Debit",
        "AccountRef": {
          "value": "7"
        }
      }
    },
    {
      "DetailType": "JournalEntryLineDetail",
      "Amount": 100.00,
      "JournalEntryLineDetail": {
        "PostingType": "Credit",
        "AccountRef": {
          "value": "8"
        }
      }
    }
  ],
  "TxnDate": "2025-12-10"
}
```

**Query Journal Entries:**
```http
GET /v3/company/{companyId}/query?query=SELECT * FROM JournalEntry
```

### Query API

**Basic Query Structure:**
```
GET /v3/company/{companyId}/query?query={SQL_LIKE_QUERY}
```

**Query Syntax Examples:**

1. **Select All:**
```sql
SELECT * FROM Customer
```

2. **Select Specific Fields:**
```sql
SELECT Id, DisplayName, Balance FROM Customer
```

3. **Filter with WHERE:**
```sql
SELECT * FROM Invoice WHERE TxnDate > '2025-01-01'
```

4. **Using IN Operator:**
```sql
SELECT * FROM Invoice WHERE DocNumber IN ('INV-001', 'INV-002')
```

5. **Escaping Special Characters:**
```sql
SELECT * FROM Customer WHERE CompanyName = 'Adam\'s Candy Shop'
```

6. **With Ordering:**
```sql
SELECT * FROM Customer WHERE Balance > 0 ORDER BY Balance DESC
```

7. **With Limits:**
```sql
SELECT * FROM Invoice MAXRESULTS 1000
```

**Important Query Limitations:**
- Maximum 1000 results per query (default is 100)
- Only properties marked as "filterable" in documentation can be used in WHERE clauses
- Custom fields are NOT filterable
- Use backslash escaping for special characters like apostrophes

---

## 3. Rate Limits

### Standard Rate Limits (2025)

| Endpoint Type | Requests per Minute | Concurrent Requests |
|---------------|---------------------|---------------------|
| **Standard Endpoints** | 500 per company | 10 maximum |
| **Batch Operations** | 120 (as of Oct 31, 2025) | 10 maximum |
| **Resource-Intensive Endpoints** | 200 | 10 maximum |

**Important Update:** Batch endpoint rate limit was increased from 40 to 120 requests per minute on October 31, 2025.

### Error Response for Rate Limiting

When rate limits are exceeded, you'll receive:
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "Fault": {
    "Error": [
      {
        "Message": "Rate limit exceeded",
        "Detail": "You have exceeded the rate limit",
        "code": "3100"
      }
    ],
    "type": "SERVICE"
  }
}
```

### Best Practices for Rate Limiting

1. **Implement Exponential Backoff:**
   - First retry: Wait 1 second
   - Second retry: Wait 2 seconds
   - Third retry: Wait 4 seconds
   - Continue doubling wait time up to a maximum

2. **Cache Frequently Accessed Data:**
   - Store entity data locally
   - Use webhooks or Change Data Capture to keep cache current
   - Reduce unnecessary API calls

3. **Batch Operations When Possible:**
   - Use batch endpoint for multiple operations
   - Each batch request counts as multiple requests (one per operation in batch)

4. **Monitor Usage:**
   - Track API call patterns
   - Identify optimization opportunities
   - Set up alerts for approaching limits

---

## 4. Webhooks

### Webhook Configuration

Webhooks provide real-time notifications when data changes in QuickBooks Online, eliminating the need for constant polling.

**Webhook Endpoint Requirements:**
- Must respond with HTTP 200 status within 3 seconds
- Must be accessible via HTTPS
- Must handle payload verification

### Webhook Verification

QuickBooks includes an `intuit-signature` header in each webhook payload for verification.

**Verification Process:**
1. Extract the `intuit-signature` header from the request
2. Create an HMAC-SHA256 hash of the payload using your verifier token as the key
3. Convert both the signature and your hash to the same format (base-16)
4. Compare the values - they should match

**Verification Code Example (Pseudocode):**
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, verifierToken) {
  const hash = crypto
    .createHmac('sha256', verifierToken)
    .update(payload)
    .digest('base64');

  return hash === signature;
}
```

### Supported Events

Webhooks notify you about:
- Create operations
- Update operations
- Delete operations
- Merge operations (when entities are combined)

**Supported Entities:**
- Account
- Bill
- BillPayment
- Customer
- Employee
- Estimate
- Invoice
- Item
- JournalEntry
- Payment
- Purchase
- PurchaseOrder
- RefundReceipt
- SalesReceipt
- TimeActivity
- Transfer
- Vendor
- VendorCredit

### Payload Structure Changes (2025)

**IMPORTANT:** Intuit migrated to CloudEvents format. Migration must be completed by May 15, 2026.

**Old Format (Deprecated):**
```json
{
  "eventNotifications": [{
    "realmId": "310687",
    "dataChangeEvent": {
      "entities": [{
        "id": "1234",
        "operation": "Create",
        "name": "Account",
        "lastUpdated": "2025-09-08T20:52:31.657Z"
      }]
    }
  }]
}
```

**New CloudEvents Format:**
```json
[{
  "specversion": "1.0",
  "id": "88cd52aa-33b6-4351-9aa4-47572edbd068",
  "source": "intuit.dsnBgbseACLLRZNxo2dfc4evmEJdxde58xeeYcZliOU=",
  "type": "qbo.account.created.v1",
  "datacontenttype": "application/json",
  "time": "2025-09-10T21:31:25.179851517Z",
  "intuitentityid": "1234",
  "intuitaccountid": "310687",
  "data": {}
}]
```

**Event Type Format:**
- Pattern: `qbo.{entity}.{operation}.v1`
- Examples:
  - `qbo.account.created.v1`
  - `qbo.invoice.updated.v1`
  - `qbo.bill.deleted.v1`

### Webhook Retry Behavior

- QuickBooks retries webhook delivery up to 3 times
- Retries occur if your endpoint doesn't respond with HTTP 200 within 3 seconds
- Use the "Send Test Notification" feature in Developer Portal to verify your endpoint

### Best Practices for Webhooks

1. **Respond Quickly:**
   - Acknowledge receipt immediately with HTTP 200
   - Process webhook asynchronously in background

2. **Verify All Requests:**
   - Always validate the `intuit-signature` header
   - Reject requests with invalid signatures

3. **Handle Duplicates:**
   - Use the event `id` to detect duplicate notifications
   - Implement idempotent processing

4. **Monitor Webhook Health:**
   - Use enhanced webhooks monitoring in Developer Portal
   - Set up alerts for delivery failures

5. **Hybrid Approach:**
   - Combine webhooks with periodic polling for critical data
   - Use webhooks as primary mechanism, polling as fallback

---

## 5. Best Practices

### Optimistic Locking with SyncToken

QuickBooks uses `SyncToken` as a version number for concurrent access control.

**How It Works:**
- Every entity has a `SyncToken` that increments with each update
- Update/Delete operations require the current `SyncToken`
- If the provided `SyncToken` doesn't match, you get a 5010 error

**Error Example:**
```json
{
  "Fault": {
    "Error": [
      {
        "Message": "Stale Object Error",
        "Detail": "You and another user were working on this at the same time. The other user finished before you did, so your work was not saved.",
        "code": "5010"
      }
    ],
    "type": "SERVICE"
  }
}
```

**Best Practices:**

1. **Always Fetch Before Update:**
```javascript
// Get latest version
const invoice = await getInvoice(invoiceId);
const currentSyncToken = invoice.SyncToken;

// Update with current SyncToken
invoice.TotalAmt = 150.00;
invoice.SyncToken = currentSyncToken;
await updateInvoice(invoice);
```

2. **Cache Strategy:**
- Store `Id`, entity type, and `SyncToken` in your database
- Use Change Data Capture or webhooks to keep cache current
- Reduces API calls while maintaining data consistency

3. **Handle Stale Object Errors:**
```javascript
async function updateWithRetry(entity, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await update(entity);
    } catch (error) {
      if (error.code === '5010') {
        // Fetch latest version
        const latest = await getById(entity.Id);
        // Reapply changes to fresh object
        entity = { ...latest, ...entity, SyncToken: latest.SyncToken };
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Error Handling

**Common Error Codes:**

| Code | Type | Description | Resolution |
|------|------|-------------|------------|
| 401 | Unauthorized | Invalid or expired access token | Refresh the access token |
| 400 | Bad Request | Malformed request or invalid data | Validate request payload |
| 429 | Too Many Requests | Rate limit exceeded | Implement backoff and retry |
| 5010 | Stale Object | SyncToken mismatch | Fetch latest version and retry |
| 3200 | Authorization Error | Insufficient permissions | Check OAuth scopes |

**Error Handling Pattern:**
```javascript
async function makeApiRequest(request) {
  try {
    return await request();
  } catch (error) {
    switch (error.statusCode) {
      case 401:
        await refreshAccessToken();
        return await request(); // Retry once

      case 429:
        await exponentialBackoff(error);
        return await request(); // Retry with backoff

      case 400:
        logError('Bad request', error);
        throw error; // Don't retry

      case 5010:
        return await handleStaleObject(request);

      default:
        throw error;
    }
  }
}
```

### Retry Strategies

**Exponential Backoff Implementation:**
```javascript
async function exponentialBackoff(attempt = 0, maxAttempts = 5) {
  if (attempt >= maxAttempts) {
    throw new Error('Max retry attempts exceeded');
  }

  const delay = Math.min(1000 * Math.pow(2, attempt), 32000);
  await sleep(delay);

  try {
    return await apiCall();
  } catch (error) {
    if (error.statusCode === 429 || error.statusCode >= 500) {
      return await exponentialBackoff(attempt + 1, maxAttempts);
    }
    throw error;
  }
}
```

**Jitter for Multiple Clients:**
```javascript
function calculateBackoff(attempt) {
  const baseDelay = 1000 * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(baseDelay + jitter, 32000);
}
```

### Idempotency

QuickBooks supports idempotency through the `requestid` parameter.

**How It Works:**
- Include a unique `requestid` as a query parameter
- If the same `requestid` is sent again, QuickBooks returns the original response
- Prevents duplicate transactions during retries

**Usage Example:**
```javascript
const uuid = require('uuid');

async function createInvoiceIdempotent(invoiceData) {
  const requestId = uuid.v4();
  const url = `${baseUrl}/v3/company/${companyId}/invoice?requestid=${requestId}`;

  // If this request fails and is retried with same requestId,
  // QuickBooks will return the original invoice without creating a duplicate
  return await post(url, invoiceData);
}
```

**Best Practices:**
1. Generate UUIDs for all create operations
2. Store `requestid` with the operation in your database
3. Use the same `requestid` for all retry attempts
4. Don't reuse `requestid` values across different operations

### Change Data Capture (CDC)

Use CDC to efficiently track changes without querying all entities.

**CDC Endpoint:**
```
GET /v3/company/{companyId}/cdc?entities={entity1,entity2}&changedSince={timestamp}
```

**Example:**
```http
GET /v3/company/123/cdc?entities=Invoice,Bill,Payment&changedSince=2025-12-01T00:00:00Z
```

**Response:**
```json
{
  "CDCResponse": [
    {
      "QueryResponse": [
        {
          "Invoice": [
            {
              "Id": "123",
              "SyncToken": "2",
              "MetaData": {
                "LastUpdatedTime": "2025-12-10T10:30:00Z"
              }
            }
          ]
        }
      ]
    }
  ],
  "time": "2025-12-10T12:00:00Z"
}
```

**Benefits:**
- Reduces API calls
- Keeps local cache synchronized
- More efficient than polling individual entities

### Data Validation

1. **Required Fields:**
   - Always validate required fields before API calls
   - Check reference IDs exist (VendorRef, CustomerRef, AccountRef)

2. **Data Types:**
   - Amounts must be decimal with 2 decimal places
   - Dates in format: YYYY-MM-DD
   - Booleans as true/false

3. **Business Rules:**
   - Invoice total must equal sum of line items
   - Journal entries must balance (debits = credits)
   - Bill payments must reference existing bills

### API Version Management

**Current Version Requirements (2025):**
- Minimum supported minor version: 75 (as of July 2025)
- Minor versions 1-74 deprecated as of August 1, 2025

**Specify Minor Version:**
```http
Accept: application/json
minorversion: 75
```

---

## 6. Code Examples

### Complete OAuth 2.0 Flow (Node.js)

```javascript
const express = require('express');
const axios = require('axios');
const app = express();

const CLIENT_ID = 'your_client_id';
const CLIENT_SECRET = 'your_client_secret';
const REDIRECT_URI = 'http://localhost:3000/callback';

// Step 1: Redirect to QuickBooks authorization
app.get('/connect', (req, res) => {
  const authUrl = `https://appcenter.intuit.com/connect/oauth2?` +
    `client_id=${CLIENT_ID}&` +
    `response_type=code&` +
    `scope=com.intuit.quickbooks.accounting&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `state=${generateRandomState()}`;

  res.redirect(authUrl);
});

// Step 2: Handle callback and exchange code for tokens
app.get('/callback', async (req, res) => {
  const { code, state, realmId } = req.query;

  try {
    const tokenResponse = await axios.post(
      'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(
            `${CLIENT_ID}:${CLIENT_SECRET}`
          ).toString('base64')
        }
      }
    );

    const {
      access_token,
      refresh_token,
      expires_in,
      x_refresh_token_expires_in
    } = tokenResponse.data;

    // Store tokens securely (database, encrypted storage, etc.)
    await storeTokens({
      realmId,
      accessToken: access_token,
      refreshToken: refresh_token,
      accessTokenExpiry: Date.now() + (expires_in * 1000),
      refreshTokenExpiry: Date.now() + (x_refresh_token_expires_in * 1000)
    });

    res.send('Connected successfully!');
  } catch (error) {
    console.error('Token exchange failed:', error.response?.data || error.message);
    res.status(500).send('Authentication failed');
  }
});

// Step 3: Refresh access token
async function refreshAccessToken(refreshToken) {
  try {
    const response = await axios.post(
      'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(
            `${CLIENT_ID}:${CLIENT_SECRET}`
          ).toString('base64')
        }
      }
    );

    const {
      access_token,
      refresh_token: new_refresh_token,
      expires_in
    } = response.data;

    // IMPORTANT: Always update both tokens
    await updateTokens({
      accessToken: access_token,
      refreshToken: new_refresh_token || refreshToken,
      accessTokenExpiry: Date.now() + (expires_in * 1000)
    });

    return access_token;
  } catch (error) {
    console.error('Token refresh failed:', error.response?.data || error.message);
    throw error;
  }
}

function generateRandomState() {
  return Math.random().toString(36).substring(2, 15);
}
```

### Create and Pay a Bill

```javascript
const axios = require('axios');

class QuickBooksClient {
  constructor(realmId, accessToken) {
    this.realmId = realmId;
    this.accessToken = accessToken;
    this.baseUrl = 'https://quickbooks.api.intuit.com/v3/company';
  }

  async createVendor(vendorData) {
    const url = `${this.baseUrl}/${this.realmId}/vendor`;
    const response = await axios.post(url, vendorData, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    return response.data.Vendor;
  }

  async createBill(billData) {
    const url = `${this.baseUrl}/${this.realmId}/bill`;
    const response = await axios.post(url, billData, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    return response.data.Bill;
  }

  async createBillPayment(paymentData) {
    const url = `${this.baseUrl}/${this.realmId}/billpayment`;
    const response = await axios.post(url, paymentData, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    return response.data.BillPayment;
  }

  async query(queryString) {
    const url = `${this.baseUrl}/${this.realmId}/query`;
    const response = await axios.get(url, {
      params: { query: queryString },
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json'
      }
    });
    return response.data.QueryResponse;
  }
}

// Usage Example
async function createAndPayBill() {
  const qb = new QuickBooksClient('123456789', 'access_token_here');

  // 1. Create vendor
  const vendor = await qb.createVendor({
    DisplayName: 'Office Supplies Co',
    PrimaryEmailAddr: {
      Address: 'billing@officesupplies.com'
    }
  });
  console.log('Vendor created:', vendor.Id);

  // 2. Create bill
  const bill = await qb.createBill({
    VendorRef: {
      value: vendor.Id
    },
    Line: [
      {
        DetailType: 'AccountBasedExpenseLineDetail',
        Amount: 250.00,
        Description: 'Office supplies order #12345',
        AccountBasedExpenseLineDetail: {
          AccountRef: {
            value: '7' // Expense account ID
          }
        }
      }
    ],
    TxnDate: '2025-12-10',
    DueDate: '2025-12-25'
  });
  console.log('Bill created:', bill.Id);

  // 3. Pay the bill
  const payment = await qb.createBillPayment({
    VendorRef: {
      value: vendor.Id
    },
    PayType: 'Check',
    CheckPayment: {
      BankAccountRef: {
        value: '35' // Bank account ID
      }
    },
    TotalAmt: 250.00,
    Line: [
      {
        Amount: 250.00,
        LinkedTxn: [
          {
            TxnId: bill.Id,
            TxnType: 'Bill'
          }
        ]
      }
    ]
  });
  console.log('Payment created:', payment.Id);

  return { vendor, bill, payment };
}
```

### Webhook Handler with Verification

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());
app.use(express.raw({ type: 'application/json' }));

const VERIFIER_TOKEN = 'your_verifier_token_here';

function verifyWebhookSignature(payload, signature) {
  const hash = crypto
    .createHmac('sha256', VERIFIER_TOKEN)
    .update(payload)
    .digest('base64');

  return hash === signature;
}

app.post('/webhooks/quickbooks', (req, res) => {
  const signature = req.headers['intuit-signature'];
  const payload = req.body;

  // Verify webhook authenticity
  if (!verifyWebhookSignature(JSON.stringify(payload), signature)) {
    console.error('Webhook verification failed');
    return res.status(401).send('Unauthorized');
  }

  // Respond immediately to acknowledge receipt
  res.status(200).send('OK');

  // Process webhook asynchronously (CloudEvents format)
  processWebhookAsync(payload).catch(console.error);
});

async function processWebhookAsync(events) {
  for (const event of events) {
    console.log('Processing event:', {
      id: event.id,
      type: event.type,
      entityId: event.intuitentityid,
      accountId: event.intuitaccountid,
      time: event.time
    });

    // Parse event type
    const [, entity, operation] = event.type.match(/qbo\.(\w+)\.(\w+)\.v1/) || [];

    switch (operation) {
      case 'created':
        await handleEntityCreated(entity, event.intuitentityid);
        break;
      case 'updated':
        await handleEntityUpdated(entity, event.intuitentityid);
        break;
      case 'deleted':
        await handleEntityDeleted(entity, event.intuitentityid);
        break;
    }
  }
}

async function handleEntityCreated(entityType, entityId) {
  console.log(`${entityType} created: ${entityId}`);
  // Fetch full entity data and update local cache
}

async function handleEntityUpdated(entityType, entityId) {
  console.log(`${entityType} updated: ${entityId}`);
  // Fetch updated entity data and refresh local cache
}

async function handleEntityDeleted(entityType, entityId) {
  console.log(`${entityType} deleted: ${entityId}`);
  // Remove from local cache
}

app.listen(3000, () => {
  console.log('Webhook handler listening on port 3000');
});
```

### Query with Pagination

```javascript
async function getAllInvoices(qb) {
  const allInvoices = [];
  let offset = 1;
  const maxResults = 1000;
  let hasMore = true;

  while (hasMore) {
    const query = `SELECT * FROM Invoice STARTPOSITION ${offset} MAXRESULTS ${maxResults}`;
    const response = await qb.query(query);

    const invoices = response.Invoice || [];
    allInvoices.push(...invoices);

    hasMore = invoices.length === maxResults;
    offset += maxResults;
  }

  return allInvoices;
}

// Query with filtering
async function getUnpaidInvoicesForCustomer(qb, customerId) {
  const query = `SELECT * FROM Invoice WHERE CustomerRef = '${customerId}' AND Balance > 0`;
  const response = await qb.query(query);
  return response.Invoice || [];
}

// Query with date range
async function getInvoicesByDateRange(qb, startDate, endDate) {
  const query = `SELECT * FROM Invoice WHERE TxnDate >= '${startDate}' AND TxnDate <= '${endDate}' ORDERBY TxnDate DESC`;
  const response = await qb.query(query);
  return response.Invoice || [];
}
```

### Error Handling with Retry Logic

```javascript
class QuickBooksError extends Error {
  constructor(message, code, statusCode, details) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

async function makeApiCallWithRetry(apiCall, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;

      const statusCode = error.response?.status;
      const errorCode = error.response?.data?.Fault?.Error?.[0]?.code;

      // Handle specific error codes
      if (statusCode === 401) {
        // Access token expired - refresh and retry
        await refreshAccessToken();
        continue;
      }

      if (statusCode === 429) {
        // Rate limit - exponential backoff
        const delay = calculateBackoff(attempt);
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      if (errorCode === '5010') {
        // Stale object - fetch latest and retry
        console.log('Stale object detected. Fetching latest version...');
        // Caller should handle refetching
        throw new QuickBooksError(
          'Stale object - refetch required',
          errorCode,
          statusCode,
          error.response?.data
        );
      }

      if (statusCode === 400) {
        // Bad request - don't retry
        throw new QuickBooksError(
          'Bad request',
          errorCode,
          statusCode,
          error.response?.data
        );
      }

      if (statusCode >= 500) {
        // Server error - retry with backoff
        const delay = calculateBackoff(attempt);
        console.log(`Server error. Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      // Unknown error - don't retry
      throw error;
    }
  }

  throw lastError;
}

function calculateBackoff(attempt) {
  const baseDelay = 1000;
  const maxDelay = 32000;
  const jitter = Math.random() * 1000;
  return Math.min(baseDelay * Math.pow(2, attempt) + jitter, maxDelay);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Idempotent Operations

```javascript
const { v4: uuidv4 } = require('uuid');

class IdempotentQuickBooksClient extends QuickBooksClient {
  async createInvoice(invoiceData) {
    const requestId = uuidv4();
    const url = `${this.baseUrl}/${this.realmId}/invoice?requestid=${requestId}`;

    try {
      const response = await axios.post(url, invoiceData, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      // Store requestId with invoice for future reference
      await this.storeRequestId(response.data.Invoice.Id, requestId);

      return response.data.Invoice;
    } catch (error) {
      // If request fails, we can retry with same requestId
      // QuickBooks will return existing invoice if it was already created
      throw error;
    }
  }

  async updateInvoiceWithOptimisticLocking(invoiceId, updates) {
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        // Fetch latest version
        const invoice = await this.getInvoice(invoiceId);

        // Apply updates
        const updatedInvoice = {
          ...invoice,
          ...updates,
          Id: invoice.Id,
          SyncToken: invoice.SyncToken,
          sparse: true
        };

        // Attempt update
        const url = `${this.baseUrl}/${this.realmId}/invoice`;
        const response = await axios.post(url, updatedInvoice, {
          params: { operation: 'update' },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        return response.data.Invoice;

      } catch (error) {
        const errorCode = error.response?.data?.Fault?.Error?.[0]?.code;

        if (errorCode === '5010' && retries < maxRetries - 1) {
          // Stale object - retry
          retries++;
          console.log(`Stale object detected. Retry ${retries}/${maxRetries}...`);
          await sleep(1000 * retries);
          continue;
        }

        throw error;
      }
    }

    throw new Error('Max retries exceeded for update operation');
  }
}
```

---

## 2025 API Pricing Changes

**Important:** As of 2025, QuickBooks Online API operates under the Intuit App Partner Program with new pricing tiers.

### Free Operations
- **Data-In (Create/Update):** Completely free and unlimited
  - POST requests (create/update invoices, bills, customers, vendors, accounts, payments)
  - All write operations

### Metered Operations
- **Data-Out (Read/Query):** Free up to monthly limits, then charged based on usage
  - GET requests (retrieve accounts, query company info, fetch reports, read invoices)
  - Query operations
  - Report generation

**Note:** Specific pricing tiers and limits vary by partner level. Check the Intuit App Partner Program documentation for current pricing.

---

## Additional Resources

### Official Documentation
- [QuickBooks Online API Reference](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account)
- [OAuth 2.0 Guide](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0)
- [Webhooks Documentation](https://developer.intuit.com/app/developer/qbo/docs/develop/webhooks)
- [Error Codes Reference](https://developer.intuit.com/app/developer/qbo/docs/develop/troubleshooting/error-codes)

### Developer Portal
- [Intuit Developer Portal](https://developer.intuit.com/)
- Create apps and get credentials
- Access sandbox environments
- Monitor webhook health
- View API usage analytics

### Support
- [Intuit Developer Community](https://help.developer.intuit.com/)
- [GitHub SDKs](https://github.com/intuit)
  - Node.js: [node-quickbooks](https://github.com/mcohen01/node-quickbooks)
  - Python: [python-quickbooks](https://github.com/ej2/python-quickbooks)
  - PHP: [QuickBooks-V3-PHP-SDK](https://github.com/intuit/QuickBooks-V3-PHP-SDK)
  - Ruby: [quickbooks-ruby](https://github.com/ruckus/quickbooks-ruby)

---

## Version History

**Last Updated:** December 10, 2025

**Recent Changes:**
- Batch endpoint rate limit increased to 120 requests/minute (Oct 31, 2025)
- Webhooks migrated to CloudEvents format (deadline: May 15, 2026)
- Minimum API minor version now 75 (as of July 2025)
- Custom Fields API introduced (Dec 1, 2025)
- Intuit App Partner Program pricing structure implemented

**Deprecation Notices:**
- Minor versions 1-74 deprecated (August 1, 2025)
- Old webhook payload format (deadline: May 15, 2026)

---

## Quick Reference

### Essential URLs

```
Authorization:     https://appcenter.intuit.com/connect/oauth2
Token:            https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
API Sandbox:      https://sandbox-quickbooks.api.intuit.com/v3/company/{companyId}
API Production:   https://quickbooks.api.intuit.com/v3/company/{companyId}
```

### Key Limits

```
Access Token:      1 hour
Refresh Token:     100 days
Rate Limit:        500 requests/minute
Concurrent:        10 requests
Query Max:         1000 results
Webhook Timeout:   3 seconds
```

### Required Scopes

```
Accounting:        com.intuit.quickbooks.accounting
Payments:          com.intuit.quickbooks.payment
```

---

**End of Documentation**
