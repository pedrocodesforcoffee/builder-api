# Token Refresh - POST /api/auth/refresh

Refresh an expired access token using a valid refresh token. Implements automatic token rotation for enhanced security.

## Endpoint

```http
POST /api/auth/refresh
```

**Authentication Required:** No (requires valid refresh token)

---

## Request

### Headers

```http
Content-Type: application/json
```

### Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `refreshToken` | string | Yes | Valid refresh token from login or previous refresh |

### Request Example

```json
{
  "refreshToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6..."
}
```

**Alternative:** The endpoint can also accept refresh tokens from cookies (for cookie-based authentication):

```http
Cookie: refreshToken=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...
```

---

## Response

### Success Response (200 OK)

Returns new JWT tokens with the old refresh token invalidated.

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890",
    "role": "user",
    "createdAt": "2024-12-08T10:30:00.000Z",
    "updatedAt": "2024-12-08T10:30:00.000Z"
  }
}
```

**Important:** The refresh token in the response is different from the one sent in the request. This is **token rotation** - the old token is invalidated and a new one is issued.

---

## Token Rotation

This endpoint implements **automatic token rotation** for security:

1. **New tokens issued:** Each refresh generates new access and refresh tokens
2. **Old token invalidated:** The refresh token used in the request is marked as used
3. **Family tracking:** All tokens in a "family" are tracked together
4. **Reuse detection:** If a used token is presented again, it triggers a security breach response

### Grace Period

To handle network issues and race conditions, there's a **2-minute grace period**:

- If a refresh token is reused within 2 minutes of being marked as used
- The system assumes it's a legitimate network retry
- Returns new tokens without triggering a security breach

---

## Error Responses

### Validation Error (400 Bad Request)

Missing or invalid refresh token.

```json
{
  "statusCode": 400,
  "message": "Refresh token is required",
  "error": "Bad Request"
}
```

### Invalid Token (401 Unauthorized)

Refresh token is invalid, expired, or not found.

```json
{
  "statusCode": 401,
  "message": "Invalid refresh token",
  "error": "Unauthorized"
}
```

### Token Revoked (401 Unauthorized)

Refresh token has been revoked (e.g., after logout).

```json
{
  "statusCode": 401,
  "message": "Refresh token has been revoked",
  "error": "Unauthorized"
}
```

### Token Reuse Detected (403 Forbidden)

An already-used refresh token was presented outside the grace period. This indicates a potential token theft and triggers automatic revocation of all tokens in the family.

```json
{
  "statusCode": 403,
  "message": "Token reuse detected. All sessions have been terminated.",
  "error": "Forbidden"
}
```

**When this happens:**
- All refresh tokens in the token family are revoked
- All user sessions are terminated
- The user must log in again
- A security event is logged

### Rate Limit Exceeded (429 Too Many Requests)

Too many refresh requests in a short time period.

```json
{
  "statusCode": 429,
  "message": "Too many refresh requests. Please try again later.",
  "error": "Too Many Requests"
}
```

**Rate Limit:** 10 requests per minute per IP address

---

## Security Features

### 1. Token Rotation
- Old refresh token is invalidated immediately
- New refresh token is issued with each request
- Prevents token replay attacks

### 2. Token Families
- All tokens from the same initial login are tracked together
- If any token in the family is compromised, all tokens in the family can be revoked

### 3. Reuse Detection
- Detects when a used token is presented again
- Automatically revokes all tokens in the family
- Forces user to re-authenticate

### 4. Grace Period
- 2-minute window for legitimate network retries
- Prevents false positives from network issues
- Still maintains security for actual breaches

### 5. Rate Limiting
- 10 requests per minute per IP
- Prevents brute force token guessing
- Protects against DoS attacks

### 6. Metadata Tracking
- IP address tracking
- User agent tracking
- Device ID tracking (optional via `X-Device-Id` header)
- Enables security monitoring and analysis

---

## Example Usage

### cURL

```bash
# Store the refresh token from login
REFRESH_TOKEN="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6..."

# Refresh the access token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
```

### JavaScript/TypeScript

```typescript
async function refreshAccessToken(refreshToken: string) {
  const response = await fetch('http://localhost:3000/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const error = await response.json();

    // Handle token reuse detection
    if (response.status === 403) {
      console.error('Security breach detected! All sessions terminated.');
      // Redirect to login page
      window.location.href = '/login';
      return;
    }

    throw new Error(error.message);
  }

  const data = await response.json();

  // Update stored tokens
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);

  return data;
}
```

### Automatic Token Refresh

Implement automatic refresh before access token expires:

```typescript
class TokenManager {
  private accessToken: string;
  private refreshToken: string;
  private tokenExpiresAt: number;

  async getValidAccessToken(): Promise<string> {
    // Check if token is expired or will expire soon (30 seconds buffer)
    const now = Date.now();
    const bufferMs = 30 * 1000;

    if (now + bufferMs >= this.tokenExpiresAt) {
      // Token expired or expiring soon, refresh it
      await this.refreshTokens();
    }

    return this.accessToken;
  }

  private async refreshTokens(): Promise<void> {
    const response = await fetch('http://localhost:3000/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (!response.ok) {
      // Handle errors (logout user, redirect to login, etc.)
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    this.tokenExpiresAt = Date.now() + (data.expiresIn * 1000);
  }
}
```

### Python

```python
import requests
from datetime import datetime, timedelta

class TokenManager:
    def __init__(self, access_token, refresh_token):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.expires_at = datetime.now() + timedelta(minutes=15)

    def get_valid_token(self):
        # Refresh if token expires in less than 30 seconds
        if datetime.now() + timedelta(seconds=30) >= self.expires_at:
            self.refresh_tokens()
        return self.access_token

    def refresh_tokens(self):
        response = requests.post(
            'http://localhost:3000/api/auth/refresh',
            json={'refreshToken': self.refresh_token}
        )

        if response.status_code == 200:
            data = response.json()
            self.access_token = data['accessToken']
            self.refresh_token = data['refreshToken']
            self.expires_at = datetime.now() + timedelta(seconds=data['expiresIn'])
        elif response.status_code == 403:
            # Token reuse detected - security breach
            raise Exception('Security breach detected. Please login again.')
        else:
            raise Exception(f'Token refresh failed: {response.json()["message"]}')
```

---

## Token Lifecycle

```
1. Login
   ↓
   Access Token (15 min) + Refresh Token (7 days)
   ↓
2. Access Token Expires
   ↓
3. Use Refresh Token
   ↓
   New Access Token (15 min) + New Refresh Token (7 days)
   Old Refresh Token INVALIDATED
   ↓
4. Repeat step 2-3 until Refresh Token expires
   ↓
5. Refresh Token Expires → Login Required
```

---

## Best Practices

### For Web Applications

1. **Store refresh tokens securely:**
   - Use HttpOnly cookies (not accessible via JavaScript)
   - Enable Secure flag (HTTPS only)
   - Set SameSite attribute (CSRF protection)

2. **Store access tokens in memory:**
   - Don't use localStorage (XSS vulnerable)
   - Keep in memory or secure cookie

3. **Implement automatic refresh:**
   - Refresh access token before it expires
   - Use a 30-second buffer before expiration

### For Mobile Applications

1. **Use secure storage:**
   - iOS: Keychain
   - Android: EncryptedSharedPreferences

2. **Implement token refresh interceptor:**
   - Automatically refresh on 401 responses
   - Retry failed requests with new token

3. **Handle token reuse detection:**
   - Show security alert to user
   - Force logout and redirect to login

### For Server-to-Server

1. **Store tokens securely:**
   - Use environment variables or secret management
   - Rotate tokens regularly

2. **Monitor for anomalies:**
   - Track refresh patterns
   - Alert on unusual activity

---

## Related Endpoints

- [User Login](./login.md) - Initial authentication
- [User Logout](./logout.md) - Invalidate all tokens
- [User Registration](./registration.md) - Create a new account

---

## Security Considerations

### What Happens When Tokens Are Stolen?

1. **Attacker gets refresh token:**
   - Attacker uses token to get access token
   - Original user's token is invalidated
   - Next time user tries to refresh, reuse is detected
   - All tokens revoked, attacker loses access

2. **Attacker gets access token only:**
   - Access limited to 15 minutes
   - No ability to refresh
   - Token expires naturally

### Why Token Rotation?

Traditional refresh tokens can be used indefinitely. Token rotation ensures:
- Each refresh token is single-use
- Stolen tokens are quickly detected
- Compromise window is minimized
- Automatic breach detection

### Grace Period Rationale

Network issues can cause duplicate requests:
- Mobile networks with poor connectivity
- Request retries in client libraries
- Load balancer timeouts

The 2-minute grace period balances security with usability.

---

## Testing

### Test Successful Refresh

```bash
# 1. Login
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123@"}')

REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.refreshToken')

# 2. Refresh token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
```

### Test Token Reuse Detection

```bash
# 1. Login and get refresh token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123@"}')

REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.refreshToken')

# 2. Use refresh token once (succeeds)
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"

# 3. Wait 3 minutes (outside grace period)
sleep 180

# 4. Try to use same token again (fails with 403)
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
```

### Test Rate Limiting

```bash
# Make 11 requests in quick succession
for i in {1..11}; do
  echo "Request $i:"
  curl -s -X POST http://localhost:3000/api/auth/refresh \
    -H "Content-Type: application/json" \
    -d '{"refreshToken":"test-token"}'
  echo ""
done
```

The 11th request should return 429 Too Many Requests.
