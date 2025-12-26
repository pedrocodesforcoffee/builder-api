# User Login - POST /api/auth/login

Authenticate a user with email and password, returning JWT tokens for API access.

## Endpoint

```http
POST /api/auth/login
```

**Authentication Required:** No

---

## Request

### Headers

```http
Content-Type: application/json
```

### Body Parameters

| Parameter | Type | Required | Description | Validation Rules |
|-----------|------|----------|-------------|------------------|
| `email` | string | Yes | User's email address | Must be a valid email format |
| `password` | string | Yes | User's password | Minimum 8 characters |

### Request Example

```json
{
  "email": "user@example.com",
  "password": "SecurePass123@"
}
```

---

## Response

### Success Response (200 OK)

Returns JWT tokens and user information.

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...",
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

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `accessToken` | string | JWT token for API authentication (15 minutes) |
| `refreshToken` | string | Token for refreshing access tokens (7 days) |
| `tokenType` | string | Token type (always "Bearer") |
| `expiresIn` | number | Access token expiration time in seconds (900 = 15 minutes) |
| `user` | object | User profile information (password excluded) |

**JWT Payload:**
The access token contains:
- `sub`: User ID
- `email`: User email
- `role`: System role (user, admin)
- `jti`: Unique token ID
- `organizations`: Array of organization memberships with roles
- `projects`: Array of project memberships with roles and organization IDs

---

## Error Responses

### Validation Error (400 Bad Request)

Invalid request data or missing required fields.

```json
{
  "statusCode": 400,
  "message": [
    "email must be a valid email",
    "password must be at least 8 characters"
  ],
  "error": "Bad Request"
}
```

### Invalid Credentials (401 Unauthorized)

Email or password is incorrect.

```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

### Rate Limit Exceeded (429 Too Many Requests)

Too many failed login attempts from this IP address.

```json
{
  "statusCode": 429,
  "message": "Too many failed login attempts. Please try again in 15 minutes.",
  "error": "Too Many Requests"
}
```

**Rate Limiting:**
- After 5 failed login attempts from the same IP within 15 minutes
- All login attempts from that IP are blocked for 15 minutes
- Successful login resets the counter

---

## Security Features

1. **Password Hashing:** Passwords are hashed with bcrypt (12 rounds) before validation
2. **Failed Attempt Tracking:** Failed login attempts are tracked by email and IP address
3. **Rate Limiting:** Automatic IP-based rate limiting after multiple failed attempts
4. **Token Security:**
   - Access tokens expire after 15 minutes
   - Refresh tokens expire after 7 days
   - Tokens include unique IDs (jti) for tracking
5. **Audit Logging:** All login attempts are logged with IP address and user agent

---

## Example Usage

### cURL

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123@"
  }'
```

### JavaScript/TypeScript

```typescript
async function login(email: string, password: string) {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const data = await response.json();

  // Store tokens securely
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);

  return data.user;
}
```

### Python

```python
import requests

def login(email, password):
    response = requests.post(
        'http://localhost:3000/api/auth/login',
        json={'email': email, 'password': password}
    )

    if response.status_code == 200:
        data = response.json()
        return data
    else:
        raise Exception(f"Login failed: {response.json()['message']}")

# Usage
user_data = login('user@example.com', 'SecurePass123@')
access_token = user_data['accessToken']
```

---

## Using the Access Token

After successful login, include the access token in the `Authorization` header for protected endpoints:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example:**

```bash
curl http://localhost:3000/api/protected-resource \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## Token Expiration

- **Access Token:** Expires after 15 minutes
- **Refresh Token:** Expires after 7 days

When the access token expires:
1. Use the refresh token to get a new access token
2. See [Token Refresh Documentation](./refresh.md) for details

---

## Related Endpoints

- [User Registration](./registration.md) - Create a new account
- [Token Refresh](./refresh.md) - Refresh expired access tokens
- [User Logout](./logout.md) - Invalidate tokens and end session
- [Password Reset](./password-reset.md) - Reset forgotten password (coming soon)

---

## Notes

- Passwords are never logged or stored in plain text
- Failed login attempts are tracked for security monitoring
- IP addresses and user agents are logged for security auditing
- The refresh token should be stored securely (not in localStorage for web apps)
- Consider using HttpOnly cookies for refresh tokens in web applications
