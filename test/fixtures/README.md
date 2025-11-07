# Test Fixtures

This directory contains fixture factories for generating test data.

## Usage

### Basic Usage

```typescript
import { healthCheckFixture } from '@test/fixtures/healthcheck.fixture';
import { Repository } from 'typeorm';

// Build an entity (not saved to database)
const healthCheck = healthCheckFixture.build();

// Build with overrides
const customHealthCheck = healthCheckFixture.build({
  status: 'healthy',
});

// Build multiple entities
const healthChecks = healthCheckFixture.buildMany(5);

// Create in database (requires repository)
const repository = dataSource.getRepository(HealthCheck);
const savedHealthCheck = await healthCheckFixture.create(repository);

// Create multiple in database
const savedHealthChecks = await healthCheckFixture.createMany(repository, 5);
```

### Custom Builder Methods

Fixtures can provide custom builder methods for common scenarios:

```typescript
// Build a healthy healthcheck
const healthy = healthCheckFixture.buildHealthy();

// Build an unhealthy healthcheck
const unhealthy = healthCheckFixture.buildUnhealthy();
```

## Creating New Fixtures

To create a new fixture, extend the `BaseFixture` class:

```typescript
import { BaseFixture, fixtures } from './base.fixture';
import { YourEntity } from '@modules/your-module/your-entity.entity';

export class YourEntityFixture extends BaseFixture<YourEntity> {
  protected defaults(): Partial<YourEntity> {
    return {
      id: fixtures.uuid(),
      name: fixtures.name(),
      email: fixtures.email(),
      createdAt: fixtures.pastDate(),
    };
  }

  // Add custom builder methods as needed
  buildActive(overrides?: Partial<YourEntity>): YourEntity {
    return this.build({ status: 'active', ...overrides });
  }
}

// Export singleton instance
export const yourEntityFixture = new YourEntityFixture();
```

## Available Faker Utilities

The `fixtures` object provides convenient faker utilities:

- `fixtures.uuid()` - Generate UUID
- `fixtures.email()` - Generate email
- `fixtures.name()` - Generate full name
- `fixtures.firstName()` - Generate first name
- `fixtures.lastName()` - Generate last name
- `fixtures.username()` - Generate username
- `fixtures.password()` - Generate password
- `fixtures.phone()` - Generate phone number
- `fixtures.address()` - Generate address object
- `fixtures.company()` - Generate company name
- `fixtures.url()` - Generate URL
- `fixtures.sentence()` - Generate sentence
- `fixtures.paragraph()` - Generate paragraph
- `fixtures.number(min, max)` - Generate random number
- `fixtures.boolean()` - Generate boolean
- `fixtures.pastDate(years)` - Generate past date
- `fixtures.futureDate(years)` - Generate future date
- `fixtures.pick(array)` - Pick random element
- And many more...

See `base.fixture.ts` for the complete list.

## Deterministic Test Data

For consistent test data across runs, reset the faker seed:

```typescript
beforeEach(() => {
  yourEntityFixture.resetSeed(); // Uses default seed
  // or
  yourEntityFixture.resetSeed(42); // Use custom seed
});
```
