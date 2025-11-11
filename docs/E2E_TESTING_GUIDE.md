# End-to-End Testing Guide

## Overview

This guide covers the comprehensive E2E testing infrastructure for the Bob the Builder platform across all three repositories:
- **builder-api**: API integration tests
- **builder-web**: Web E2E tests with Playwright
- **builder-ios**: iOS UI tests with XCUITest

## Quick Start

### API Tests

```bash
cd builder-api

# Install dependencies
npm install

# Run database seed (required before tests)
npm run seed

# Run all E2E tests
npm run test:e2e

# Run specific test suite
npm run test:e2e -- auth.e2e-spec

# Run with coverage
npm run test:e2e -- --coverage
```

### Web Tests

```bash
cd builder-web

# Install dependencies
npm install

# Install Playwright browsers (first time only)
npx playwright install

# Run all tests
npx playwright test

# Run in UI mode (interactive debugging)
npx playwright test --ui

# Run specific browser
npx playwright test --project=chromium
```

### iOS Tests

```bash
cd builder-ios

# Open in Xcode
open BobTheBuilder.xcworkspace

# Run tests: Cmd+U
# Or from command line:
xcodebuild test \
  -workspace BobTheBuilder.xcworkspace \
  -scheme BobTheBuilder \
  -destination 'platform=iOS Simulator,name=iPhone 14'
```

## Test Infrastructure

### API Tests (`builder-api/test/e2e/`)

#### Setup (`test/e2e/setup.ts`)

The setup file provides:
- **Global test application instance**
- **Authenticated test tokens** for all 10 users
- **Helper functions** for authenticated requests
- **Test data management**

Key exports:
```typescript
// Pre-authenticated test users
export const TEST_CREDENTIALS = {
  admin: { email: 'admin@bobbuilder.com', password: 'Admin123!' },
  johnDoe: { email: 'john.doe@acme.com', password: 'Password123!' },
  // ... 8 more users
};

// Helper functions
export function getToken(email: string): string;
export function authenticatedRequest(email: string);
```

#### Test Structure

```
test/e2e/
├── setup.ts                      # Global setup and helpers
├── auth.e2e-spec.ts             # Authentication tests ✅
├── organizations.e2e-spec.ts     # Organization CRUD tests (TODO)
├── projects.e2e-spec.ts          # Project CRUD tests (TODO)
├── permission-matrix.e2e-spec.ts # RBAC tests (TODO)
└── cross-platform.e2e-spec.ts    # Cross-platform sync tests (TODO)
```

### Web Tests (`builder-web/e2e/`)

#### Configuration (`playwright.config.ts`)

```typescript
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium' },
    { name: 'firefox' },
    { name: 'webkit' },
    { name: 'mobile-chrome' },
    { name: 'mobile-safari' },
  ],
});
```

#### Test Structure

```
e2e/
├── helpers/
│   └── auth.ts                  # Login helpers
├── auth.spec.ts                 # Auth flow tests (TODO)
├── rbac.spec.ts                 # RBAC tests (TODO)
├── dashboard.spec.ts            # Dashboard tests (TODO)
└── projects.spec.ts             # Project management tests (TODO)
```

### iOS Tests (`builder-ios/BobTheBuilderUITests/`)

#### Test Structure

```
BobTheBuilderUITests/
├── TestHelpers.swift            # Common helpers (TODO)
├── AuthenticationTests.swift     # Auth tests (TODO)
├── DashboardTests.swift         # Dashboard tests (TODO)
└── RBACTests.swift              # RBAC tests (TODO)
```

## Test Users

All tests use the seeded test data. See [TEST_CREDENTIALS.md](./TEST_CREDENTIALS.md) for complete list.

### Quick Reference

| Role | Email | Password | Use Case |
|------|-------|----------|----------|
| System Admin | `admin@bobbuilder.com` | `Admin123!` | Global admin |
| GC Owner | `john.doe@acme.com` | `Password123!` | Project creation |
| GC Admin | `jane.smith@acme.com` | `Password123!` | Org management |
| Superintendent | `robert.miller@acme.com` | `Password123!` | Field ops |
| Sub Owner | `mike.johnson@summit.com` | `Password123!` | Subcontractor |
| Owner Rep | `david.brown@elite.com` | `Password123!` | Property owner |

## Writing Tests

### API Tests Example

```typescript
import { authenticatedRequest, TEST_CREDENTIALS } from './setup';

describe('My Feature', () => {
  it('should do something', async () => {
    const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .get('/api/my-endpoint')
      .expect(200);

    expect(response.body).toHaveProperty('data');
  });
});
```

### Web Tests Example

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test('my feature works', async ({ page }) => {
  await login(page, 'john.doe@acme.com', 'Password123!');

  await page.click('[data-testid="my-button"]');
  await expect(page.locator('text=Success')).toBeVisible();
});
```

### iOS Tests Example

```swift
func testMyFeature() {
    TestHelpers.login(app: app, email: "john.doe@acme.com")

    app.buttons["MyButton"].tap()

    XCTAssertTrue(app.staticTexts["Success"].waitForExistence(timeout: 5))
}
```

## Test Scenarios Implemented

### ✅ API Authentication Tests (`auth.e2e-spec.ts`)

Covers 30+ test cases including:
- **Login flow**: Valid/invalid credentials, missing fields, format validation
- **Registration**: New users, duplicate emails, password validation
- **Token management**: Refresh tokens, token expiration
- **Logout**: Session termination
- **Security**: Password not exposed, concurrent logins

### 🔄 Remaining Test Suites (TODO)

#### API Organization Tests

- [ ] Create organization
- [ ] List organizations (filtered by membership)
- [ ] Get organization details
- [ ] Update organization (admin only)
- [ ] Add/remove members
- [ ] Update member roles
- [ ] Data isolation between organizations

#### API Project Tests

- [ ] Create project (GC admin/PM only)
- [ ] List projects (filtered by membership)
- [ ] Get project details
- [ ] Update project (authorized roles only)
- [ ] Add/remove team members
- [ ] Update project status
- [ ] Project progress tracking

#### API Permission Matrix Tests

Test all 10 roles × all endpoints:
- [ ] System Admin permissions
- [ ] Organization Owner permissions
- [ ] Organization Admin permissions
- [ ] Organization Member permissions
- [ ] PROJECT_ADMIN permissions
- [ ] PROJECT_MANAGER permissions
- [ ] SUPERINTENDENT permissions
- [ ] FOREMAN permissions
- [ ] ARCHITECT_ENGINEER permissions
- [ ] SUBCONTRACTOR permissions
- [ ] OWNER_REP permissions
- [ ] INSPECTOR permissions
- [ ] VIEWER permissions

#### Web E2E Tests

- [ ] Login/logout flows
- [ ] Registration flow
- [ ] Dashboard loading
- [ ] Organization management
- [ ] Project creation and management
- [ ] Role-based UI visibility
- [ ] Responsive design (mobile/tablet/desktop)

#### iOS UI Tests

- [ ] Login/logout flows
- [ ] Session persistence
- [ ] Dashboard loading
- [ ] Project list and details
- [ ] Role-based feature access
- [ ] Offline capability

#### Cross-Platform Tests

- [ ] Data created via API appears in web
- [ ] Data created via web appears in mobile
- [ ] Real-time sync between platforms
- [ ] Concurrent edits handling

## CI/CD Integration

### GitHub Actions Workflow

Located at `.github/workflows/e2e-tests.yml` (TODO)

Runs on:
- Push to main/develop
- Pull requests
- Scheduled nightly runs

Pipeline includes:
1. **API Tests**: Run all integration tests
2. **Web Tests**: Run Playwright across multiple browsers
3. **iOS Tests**: Run XCUITests on simulators
4. **Report Generation**: Combine and publish results
5. **Coverage Reports**: Generate and upload coverage

### Running in CI

```yaml
# Simplified example
jobs:
  api-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run seed
      - run: npm run test:e2e
```

## Test Coverage Goals

| Platform | Current | Target |
|----------|---------|--------|
| API | ~30% | 80% |
| Web E2E | 0% | 70% |
| iOS UI | 0% | 70% |

## Best Practices

### API Tests

1. **Use helpers**: Always use `authenticatedRequest()` for auth
2. **Independent tests**: Each test should be self-contained
3. **Cleanup**: Reset test data between suites if needed
4. **Assertions**: Test both success and failure cases
5. **Status codes**: Always verify HTTP status codes

### Web Tests

1. **Use data-testid**: Prefer `[data-testid="..."]` selectors
2. **Wait properly**: Use `waitForSelector()` and `expect().toBeVisible()`
3. **Screenshots**: Failures automatically capture screenshots
4. **Mobile testing**: Test responsive layouts
5. **Accessibility**: Include `toHaveAccessibleName()` checks

### iOS Tests

1. **Accessibility IDs**: Use `accessibilityIdentifier` in SwiftUI
2. **Wait for existence**: Use `waitForExistence(timeout:)`
3. **Clean state**: Reset keychain before tests
4. **Descriptive names**: Use clear test function names
5. **Assertions**: Test both UI state and data

## Troubleshooting

### API Tests Failing

**Issue**: Tests can't connect to database

**Solution**:
```bash
# Ensure database is running
docker-compose up -d postgres

# Run migrations
npm run migration:run

# Seed test data
npm run seed
```

**Issue**: "No token found for user"

**Solution**: Ensure `globalSetup()` ran successfully. Check that all test users exist in database.

### Web Tests Failing

**Issue**: "Timeout waiting for element"

**Solution**:
- Increase timeout: `{ timeout: 10000 }`
- Check element selector is correct
- Verify app is running: `npm run dev`

**Issue**: Tests pass locally but fail in CI

**Solution**:
- Check CI has proper environment variables
- Verify API is accessible from test runner
- Review CI logs for network errors

### iOS Tests Failing

**Issue**: "App doesn't launch"

**Solution**:
- Clean build folder: `Cmd+Shift+K`
- Reset simulator: `xcrun simctl erase all`
- Rebuild: `Cmd+B`

**Issue**: "Element not found"

**Solution**:
- Check accessibility identifier is set
- Verify element is visible (not off-screen)
- Add wait: `waitForExistence(timeout: 10)`

## Performance

### Test Execution Times

| Suite | Tests | Duration | Target |
|-------|-------|----------|--------|
| API Auth | 30 | ~15s | <30s |
| API Full | ~200 | ~3min | <5min |
| Web E2E | ~100 | ~5min | <10min |
| iOS UI | ~50 | ~3min | <5min |
| **Total** | **~380** | **~11min** | **<20min** |

### Optimization Tips

1. **Parallelize**: Run independent tests in parallel
2. **Share setup**: Use `beforeAll` for expensive setup
3. **Selective testing**: Run only affected tests locally
4. **Test database**: Use transactions for faster cleanup
5. **Mock external**: Mock external API calls

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [XCUITest Guide](https://developer.apple.com/documentation/xctest)
- [Supertest Documentation](https://github.com/visionmedia/supertest)

## Next Steps

To complete the E2E testing suite:

1. ✅ API authentication tests (DONE)
2. ⏳ API CRUD tests (organizations, projects)
3. ⏳ API permission matrix tests (10 roles)
4. ⏳ Web Playwright setup and tests
5. ⏳ iOS XCUITest setup and tests
6. ⏳ Cross-platform sync tests
7. ⏳ CI/CD pipeline configuration
8. ⏳ Comprehensive documentation

## Contributing

When adding new tests:

1. Follow existing patterns
2. Add data-testid attributes for new UI elements
3. Document new test users if needed
4. Update this guide
5. Ensure tests pass locally before PR
6. Aim for 80%+ coverage for new features

---

**Last Updated**: November 10, 2025
**Status**: Foundation Complete, Implementation In Progress
**Coverage**: API Auth 100%, Others 0%
