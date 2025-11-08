# User Registration API Documentation

## Overview

The registration endpoint allows new users to create accounts in the Builder API system. This endpoint implements comprehensive validation, secure password hashing, and email uniqueness checking.

---

## Endpoint Details

### POST /api/auth/register

Register a new user account.

**Authentication**: None required (public endpoint)

**Rate Limiting**: 5 requests per 15 minutes per IP (recommended for production)

---

## Request

### Headers

```http
Content-Type: application/json
```

### Body Parameters

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| email | string | Yes | User's email address | Valid email format, max 255 chars, unique |
| password | string | Yes | User's password | 8-128 chars, must include uppercase, lowercase, number, and special character |
| firstName | string | Yes | User's first name | 1-100 characters, supports Unicode |
| lastName | string | Yes | User's last name | 1-100 characters, supports Unicode |
| phoneNumber | string | No | User's phone number | E.164 format (e.g., +1234567890), max 20 chars |

### Request Example

```json
POST /api/auth/register
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "SecurePass123@",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890"
}
```

### Password Requirements

The password must meet the following security requirements:

- ✅ Minimum 8 characters
- ✅ Maximum 128 characters
- ✅ At least one uppercase letter (A-Z)
- ✅ At least one lowercase letter (a-z)
- ✅ At least one number (0-9)
- ✅ At least one special character: `!@#$%^&*()_+-=[]{}|;:,.<>?`
- ❌ No leading or trailing spaces
- ❌ Cannot contain the user's email address

---

## Responses

### Success Response (201 Created)

Returns the created user object with all fields except the password.

```json
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "85fa5c14-3e09-4c9f-9764-00c9f02f6b26",
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "role": "user",
  "createdAt": "2025-11-08T15:39:12.642Z",
  "updatedAt": "2025-11-08T15:39:12.642Z"
}
```

**Response Fields**:
- `id`: Unique user identifier (UUID v4)
- `email`: User's email address (lowercase)
- `firstName`: User's first name
- `lastName`: User's last name
- `phoneNumber`: User's phone number (if provided)
- `role`: System-level role (always "user" for new registrations, maps to `system_role` in database)
- `createdAt`: Account creation timestamp
- `updatedAt`: Last update timestamp

**Note**:
- The password is NEVER included in the response for security reasons
- The API returns `role` in the response but internally uses `systemRole` (system_role in database)

### Error Responses

#### 400 Bad Request - Invalid Email Format

```json
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "message": ["Please provide a valid email address"],
  "error": "Bad Request",
  "statusCode": 400
}
```

#### 400 Bad Request - Weak Password

```json
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "message": [
    "Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

#### 400 Bad Request - Password Too Short

```json
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "message": [
    "Password must be at least 8 characters long"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

#### 400 Bad Request - Missing Required Fields

```json
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "message": [
    "First name is required",
    "First name must be a string",
    "First name must be at least 1 character",
    "First name must not exceed 100 characters"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

#### 409 Conflict - Email Already Exists

```json
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "message": "An account with this email address already exists",
  "error": "Conflict",
  "statusCode": 409
}
```

#### 500 Internal Server Error

```json
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "message": "An error occurred during registration. Please try again.",
  "error": "Internal Server Error",
  "statusCode": 500
}
```

---

## Field Transformations

The API automatically applies the following transformations to input data:

1. **Email**: Converted to lowercase and trimmed
2. **First Name**: Trimmed of leading/trailing whitespace
3. **Last Name**: Trimmed of leading/trailing whitespace
4. **Phone Number**: Trimmed of leading/trailing whitespace (if provided)

---

## Security Features

### Password Security

- ✅ Passwords are hashed using bcrypt with 12 rounds
- ✅ Plain-text passwords are never stored in the database
- ✅ Passwords are never logged or exposed in responses
- ✅ Password field is excluded from all serialization

### Email Security

- ✅ Email uniqueness is enforced at the database level
- ✅ Case-insensitive email checking (john@example.com = JOHN@example.com)
- ✅ Email validation prevents injection attacks

### Input Validation

- ✅ All inputs are validated using class-validator decorators
- ✅ SQL/NoSQL injection prevention through parameterized queries
- ✅ XSS prevention through proper input sanitization
- ✅ Unicode characters supported for international names

---

## Examples

### cURL Examples

#### Successful Registration

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123@",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890"
  }'
```

#### Registration Without Phone Number

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane.smith@example.com",
    "password": "MySecure#Pass456",
    "firstName": "Jane",
    "lastName": "Smith"
  }'
```

#### Registration with International Characters

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jose.mueller@example.com",
    "password": "SecurePass123@",
    "firstName": "José",
    "lastName": "Müller",
    "phoneNumber": "+351123456789"
  }'
```

### JavaScript/TypeScript Example

```typescript
const response = await fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'john.doe@example.com',
    password: 'SecurePass123@',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '+1234567890',
  }),
});

if (response.ok) {
  const user = await response.json();
  console.log('User registered:', user);
} else {
  const error = await response.json();
  console.error('Registration failed:', error);
}
```

### Python Example

```python
import requests

url = 'http://localhost:3000/api/auth/register'
payload = {
    'email': 'john.doe@example.com',
    'password': 'SecurePass123@',
    'firstName': 'John',
    'lastName': 'Doe',
    'phoneNumber': '+1234567890'
}
headers = {'Content-Type': 'application/json'}

response = requests.post(url, json=payload, headers=headers)

if response.status_code == 201:
    user = response.json()
    print('User registered:', user)
else:
    error = response.json()
    print('Registration failed:', error)
```

---

## Business Logic

### Default Values

- **systemRole**: Automatically set to `"user"` for all new registrations (system-level role)
- **isActive**: Automatically set to `true` (account is active by default)
- **emailVerified**: Automatically set to `false` (email verification required)
- **createdAt**: Automatically set to current timestamp
- **updatedAt**: Automatically set to current timestamp

### Permission System

The Builder API uses a multi-level permission system:

1. **System Level** (systemRole): Platform-wide access
   - `user`: Default role for all registrations
   - `system_admin`: Full platform access (granted manually by admins)

2. **Organization Level**: Users can belong to multiple organizations with different roles (owner, org_admin, org_member, guest)

3. **Project Level**: Users can be assigned to projects with construction-specific roles (project_admin, project_manager, superintendent, etc.)

See the [Database Schema Documentation](../../schemas/database-schema.md) for complete permission hierarchy details.

### Email Handling

- All emails are stored in lowercase for consistency
- Email uniqueness is case-insensitive
- Email format validation follows RFC 5322 standards

### Phone Number Format

- Optional field (can be omitted)
- Supports international formats (E.164 recommended)
- Format: `+[country code][number]` (e.g., `+1234567890`)
- No spaces or special characters except leading `+`

---

## Testing

### Test Scenarios

1. ✅ **Valid Registration**: All required fields with valid data
2. ✅ **Registration Without Phone**: Omit optional phone number
3. ✅ **Duplicate Email**: Attempt to register with existing email (409)
4. ✅ **Invalid Email**: Provide malformed email address (400)
5. ✅ **Weak Password**: Password missing required complexity (400)
6. ✅ **Missing Fields**: Omit required fields (400)
7. ✅ **Unicode Names**: Names with special characters (José, Müller)
8. ✅ **International Phones**: Various country codes

### Database Verification

After successful registration, verify in the database:

```sql
SELECT id, email, password, first_name, last_name, system_role,
       is_active, email_verified, phone_number, created_at, updated_at
FROM users
WHERE email = 'john.doe@example.com';
```

Expected:
- `password`: Bcrypt hash starting with `$2b$12$`
- `email`: Lowercase version of input
- `first_name`, `last_name`: Trimmed versions of input
- `system_role`: Set to `'user'`
- `is_active`: Set to `true`
- `email_verified`: Set to `false`
- `phone_number`: Trimmed version of input (or NULL)
- `created_at`, `updated_at`: Current timestamp

---

## Performance

- **Average Response Time**: < 500ms (including bcrypt hashing)
- **Bcrypt Rounds**: 12 (balances security and performance)
- **Database Queries**: 2 (1 SELECT for uniqueness check, 1 INSERT for user creation)

---

## Future Enhancements

Planned features for future versions:

- ✅ Multi-level permission system (implemented v2.0.0)
- Email verification flow (send verification link)
- CAPTCHA integration for bot prevention
- Social OAuth registration (Google, GitHub, etc.)
- Password strength meter in UI
- Terms of service acceptance
- GDPR compliance fields
- Two-factor authentication (2FA)

---

## Related Endpoints

- ✅ `POST /api/auth/login` - User login with JWT tokens
- `POST /api/auth/logout` - User logout (coming soon)
- `POST /api/auth/refresh` - Refresh access token (coming soon)
- `POST /api/auth/forgot-password` - Password reset (coming soon)
- `GET /api/auth/me` - Get current user profile (coming soon)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-12-08 | Initial registration endpoint implementation |
| 2.0.0 | 2025-11-08 | Multi-level permission system: systemRole, isActive, emailVerified fields |

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/bobthebuilder/builder-api/issues
- Email: support@bobthebuilder.com
- Documentation: https://docs.bobthebuilder.com
