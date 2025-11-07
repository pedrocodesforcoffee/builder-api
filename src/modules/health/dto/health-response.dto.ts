export interface HealthStatus {
  status: 'ok' | 'error' | 'degraded';
  timestamp: string;
  uptime: number;
  details: {
    [key: string]: unknown;
  };
  version: string;
  environment: string;
}

export interface HealthCheckDetails {
  status: 'up' | 'degraded' | 'down';
  [key: string]: unknown;
}
