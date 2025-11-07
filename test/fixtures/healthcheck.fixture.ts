import { HealthCheck } from '@modules/database/healthcheck.entity';
import { BaseFixture, fixtures } from './base.fixture';

/**
 * HealthCheck entity fixture
 */
export class HealthCheckFixture extends BaseFixture<HealthCheck> {
  protected defaults(): Partial<HealthCheck> {
    return {
      id: fixtures.uuid(),
      status: fixtures.pick(['healthy', 'degraded', 'unhealthy']),
      checkedAt: fixtures.pastDate(0.1), // Within last ~36 days
    };
  }

  /**
   * Build a healthy healthcheck
   */
  buildHealthy(overrides?: Partial<HealthCheck>): HealthCheck {
    return this.build({ status: 'healthy', ...overrides });
  }

  /**
   * Build an unhealthy healthcheck
   */
  buildUnhealthy(overrides?: Partial<HealthCheck>): HealthCheck {
    return this.build({ status: 'unhealthy', ...overrides });
  }

  /**
   * Build a degraded healthcheck
   */
  buildDegraded(overrides?: Partial<HealthCheck>): HealthCheck {
    return this.build({ status: 'degraded', ...overrides });
  }
}

// Export a singleton instance
export const healthCheckFixture = new HealthCheckFixture();
