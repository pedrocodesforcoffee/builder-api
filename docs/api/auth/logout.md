# User Logout - POST /api/auth/logout

Logout the authenticated user and revoke all active refresh tokens, terminating all sessions across all devices.

## Endpoint

```http
POST /api/auth/logout
```

**Authentication Required:** Yes (JWT Bearer token)

---

## Request

### Headers

```http
Authorization: Bearer <your-jwt-access-token>
```

### Body Parameters

None required. The user is identified from the JWT token in the Authorization header.

### Request Example

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Response

### Success Response (200 OK)

All refresh tokens for the user have been revoked.

```json
{
  "message": "Successfully logged out from all devices"
}
```

**What happens on successful logout:**

1. **All refresh tokens revoked:** Every refresh token associated with the user is marked as revoked
2. **All sessions terminated:** The user is logged out from all devices and browsers
3. **Access tokens unaffected:** Current access tokens remain valid until expiration (15 minutes max)
4. **Security event logged:** Logout event is recorded with timestamp, IP address, and user ID

---

## Error Responses

### Missing Authorization Header (401 Unauthorized)

No Authorization header provided.

```json
{
  "statusCode": 401,
  "message": "Invalid or expired access token",
  "error": "Unauthorized"
}
```

### Invalid Access Token (401 Unauthorized)

Invalid, malformed, or expired JWT token.

```json
{
  "statusCode": 401,
  "message": "Invalid or expired access token",
  "error": "Unauthorized"
}
```

**Common causes:**
- Token has expired (> 15 minutes old)
- Token signature is invalid
- Token is malformed
- Wrong JWT secret used

---

## Security Features

### 1. Global Logout

When a user logs out:
- **All devices:** Not just the current device
- **All sessions:** Every active session is terminated
- **All refresh tokens:** Every refresh token is revoked

This is a security feature to ensure complete session termination. If you need device-specific logout, use the refresh token revocation endpoint (coming soon).

### 2. Access Token Handling

**Important:** Access tokens cannot be revoked and remain valid until expiration:

- Access tokens expire after 15 minutes
- Even after logout, existing access tokens work until they expire
- This is a design trade-off for stateless JWT authentication

**For immediate access revocation:**
- Consider shorter access token lifetimes
- Implement server-side token blacklist (adds state)
- Use session-based authentication instead of JWT

### 3. Audit Logging

Every logout is logged with:
- User ID
- Timestamp
- IP address
- User agent
- Number of sessions terminated

This enables security monitoring and compliance auditing.

---

## Example Usage

### cURL

```bash
# Store access token from login
ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### JavaScript/TypeScript

```typescript
async function logout(accessToken: string) {
  const response = await fetch('http://localhost:3000/api/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const data = await response.json();

  // Clear stored tokens
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');

  // Redirect to login page
  window.location.href = '/login';

  return data;
}

// Usage
try {
  const accessToken = localStorage.getItem('accessToken');
  await logout(accessToken);
  console.log('Logged out successfully');
} catch (error) {
  console.error('Logout failed:', error.message);
  // Still clear local tokens even if API call fails
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}
```

### React Hook Example

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function useLogout() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const logout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const accessToken = localStorage.getItem('accessToken');

      if (accessToken) {
        const response = await fetch('http://localhost:3000/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message);
        }
      }
    } catch (err) {
      setError(err.message);
      console.error('Logout error:', err);
      // Continue with local cleanup even if API call fails
    } finally {
      // Always clear local storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setIsLoading(false);

      // Redirect to login
      navigate('/login');
    }
  };

  return { logout, isLoading, error };
}

// Usage in component
function Header() {
  const { logout, isLoading } = useLogout();

  return (
    <button onClick={logout} disabled={isLoading}>
      {isLoading ? 'Logging out...' : 'Logout'}
    </button>
  );
}
```

### Python

```python
import requests

def logout(access_token: str) -> dict:
    """
    Logout user and revoke all refresh tokens.

    Args:
        access_token: Valid JWT access token

    Returns:
        Response data from logout endpoint

    Raises:
        Exception: If logout fails
    """
    response = requests.post(
        'http://localhost:3000/api/auth/logout',
        headers={'Authorization': f'Bearer {access_token}'}
    )

    if response.status_code == 200:
        return response.json()
    else:
        error_data = response.json()
        raise Exception(f"Logout failed: {error_data['message']}")

# Usage
try:
    result = logout(access_token)
    print(result['message'])
    # Clear stored tokens
    access_token = None
    refresh_token = None
except Exception as e:
    print(f"Error: {e}")
    # Still clear tokens locally even if API call fails
    access_token = None
    refresh_token = None
```

---

## Client-Side Cleanup

After calling the logout endpoint, make sure to clean up client-side data:

### Required Cleanup

1. **Clear stored tokens:**
   ```javascript
   localStorage.removeItem('accessToken');
   localStorage.removeItem('refreshToken');
   ```

2. **Clear cookies (if using cookie-based auth):**
   ```javascript
   document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
   document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
   ```

3. **Clear application state:**
   ```javascript
   // Clear user data from state management
   store.dispatch(clearUser());
   // Or for Redux
   dispatch({ type: 'CLEAR_USER' });
   ```

4. **Redirect to login page:**
   ```javascript
   window.location.href = '/login';
   ```

### Optional Cleanup

- Clear cached API responses
- Reset application state to initial values
- Clear temporary files or data
- Cancel pending API requests

---

## Best Practices

### 1. Always Clean Up Locally

Even if the logout API call fails, always clean up local tokens:

```typescript
async function logout() {
  try {
    await callLogoutAPI();
  } catch (error) {
    console.error('Logout API failed:', error);
  } finally {
    // Always clean up, regardless of API success
    clearLocalTokens();
    redirectToLogin();
  }
}
```

**Why:** If the API is down or unreachable, you still want to clear local tokens to protect the user.

### 2. Handle Network Errors Gracefully

```typescript
async function logout() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Logout request timed out');
    }
  } finally {
    clearLocalTokens();
    redirectToLogin();
  }
}
```

### 3. Provide User Feedback

```typescript
async function logout() {
  showLoadingSpinner();

  try {
    await callLogoutAPI();
    showSuccessMessage('You have been logged out successfully');
  } catch (error) {
    showErrorMessage('Logout failed, but local session cleared');
  } finally {
    clearLocalTokens();
    hideLoadingSpinner();
    redirectToLogin();
  }
}
```

### 4. Cancel Pending Requests

When logging out, cancel any pending API requests:

```typescript
// Using axios
const cancelTokenSource = axios.CancelToken.source();

async function logout() {
  // Cancel all pending requests
  cancelTokenSource.cancel('User logged out');

  // Proceed with logout
  await callLogoutAPI();
  clearLocalTokens();
  redirectToLogin();
}
```

---

## Security Considerations

### Why Global Logout?

**All devices and sessions are terminated** to ensure maximum security:

1. **Compromise Detection:** If a user suspects their account is compromised, logging out terminates all sessions including the attacker's
2. **Shared Devices:** When logging out from a public or shared computer, ensures all other devices are also logged out
3. **Security Best Practice:** Complete session termination is more secure than partial logout

### Access Token Validity

**Access tokens remain valid after logout** for up to 15 minutes:

- This is a limitation of stateless JWT authentication
- Tokens cannot be revoked without maintaining a blacklist (adds state)
- To mitigate: Use short-lived access tokens (15 minutes)

### When to Implement Token Blacklist

Consider implementing a token blacklist if:
- You need immediate access revocation
- You have strict security requirements
- You can afford the performance overhead
- You're already using Redis or similar caching

---

## Testing

### Test Successful Logout

```bash
# 1. Login
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123@"}')

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.refreshToken')

# 2. Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 3. Verify refresh token is revoked (should return 401)
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
```

### Test Logout Without Token

```bash
# Should return 401 Unauthorized
curl -X POST http://localhost:3000/api/auth/logout
```

### Test Logout With Invalid Token

```bash
# Should return 401 Unauthorized
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer invalid-token"
```

### Test Multiple Device Logout

```bash
# 1. Login from "Device 1"
DEVICE1=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123@"}')

# 2. Login from "Device 2"
DEVICE2=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123@"}')

# 3. Logout from Device 1
ACCESS_TOKEN_1=$(echo $DEVICE1 | jq -r '.accessToken')
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN_1"

# 4. Try to use Device 2's refresh token (should be revoked)
REFRESH_TOKEN_2=$(echo $DEVICE2 | jq -r '.refreshToken')
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN_2\"}"
```

---

## Related Endpoints

- [User Login](./login.md) - Authenticate and get tokens
- [Token Refresh](./refresh.md) - Refresh expired access token
- [User Registration](./registration.md) - Create a new account

---

## Troubleshooting

### Issue: "Access token still works after logout"

**Explanation:** This is expected behavior. JWT access tokens are stateless and cannot be revoked. They remain valid until expiration (15 minutes).

**Solutions:**
1. Accept the 15-minute window (recommended for most applications)
2. Implement a token blacklist with Redis
3. Use shorter access token lifetimes (e.g., 5 minutes)
4. Switch to session-based authentication for immediate revocation

### Issue: "Logout fails but need to clear local tokens"

**Solution:** Always clean up local tokens, even if the API call fails:

```typescript
try {
  await logout();
} catch (error) {
  // API call failed, but still clean up
  console.error(error);
} finally {
  clearLocalTokens();
  redirectToLogin();
}
```

### Issue: "User wants to logout only from current device"

**Solution:** The current implementation logs out from all devices for security. For device-specific logout, you would need to implement a different endpoint that revokes only specific refresh tokens (not all user tokens).

---

## Future Enhancements

Planned features for future versions:

1. **Device-Specific Logout:** Logout from current device only
2. **Session Management UI:** View and revoke specific sessions
3. **Logout from All Other Devices:** Keep current session, revoke others
4. **Token Blacklist:** Immediate access token revocation (optional, adds state)
5. **Logout Events:** Notify other devices when a session is terminated
