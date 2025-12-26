import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * QuickBooks Configuration Service
 *
 * Centralized access to QuickBooks Online configuration from environment variables.
 * Provides validated configuration with sensible defaults.
 */
@Injectable()
export class QuickBooksConfigService {
  private readonly logger = new Logger(QuickBooksConfigService.name);

  constructor(private readonly configService: ConfigService) {
    this.validateConfiguration();
  }

  /**
   * Validate required configuration on service initialization
   */
  private validateConfiguration(): void {
    const required = [
      'QB_CLIENT_ID',
      'QB_CLIENT_SECRET',
      'QB_REDIRECT_URI',
      'QB_ENCRYPTION_KEY',
    ];

    const missing = required.filter(
      key => !this.configService.get<string>(key),
    );

    if (missing.length > 0) {
      this.logger.error(
        `Missing required QuickBooks configuration: ${missing.join(', ')}`,
      );
      throw new Error(
        `QuickBooks integration requires: ${missing.join(', ')}`,
      );
    }

    // Validate encryption key format
    const encryptionKey = this.getEncryptionKey();
    if (encryptionKey.length !== 64) {
      throw new Error(
        'QB_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
        'Generate with: openssl rand -hex 32',
      );
    }

    this.logger.log('QuickBooks configuration validated successfully');
  }

  // OAuth Configuration

  getClientId(): string {
    return this.configService.get<string>('QB_CLIENT_ID') || '';
  }

  getClientSecret(): string {
    return this.configService.get<string>('QB_CLIENT_SECRET') || '';
  }

  getRedirectUri(): string {
    return this.configService.get<string>('QB_REDIRECT_URI') || '';
  }

  getEnvironment(): 'sandbox' | 'production' {
    const env = this.configService.get<string>('QB_ENVIRONMENT', 'sandbox');
    return env === 'production' ? 'production' : 'sandbox';
  }

  // API Endpoints

  getAuthBaseUrl(): string {
    return this.configService.get<string>(
      'QB_AUTH_BASE_URL',
      'https://appcenter.intuit.com/connect/oauth2',
    );
  }

  getTokenEndpoint(): string {
    return this.configService.get<string>(
      'QB_TOKEN_ENDPOINT',
      'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    );
  }

  getRevokeEndpoint(): string {
    return this.configService.get<string>(
      'QB_REVOKE_ENDPOINT',
      'https://developer.api.intuit.com/v2/oauth2/tokens/revoke',
    );
  }

  getUserInfoEndpoint(): string {
    return this.configService.get<string>(
      'QB_USER_INFO_ENDPOINT',
      'https://accounts.platform.intuit.com/v1/openid_connect/userinfo',
    );
  }

  getApiBaseUrl(): string {
    const env = this.getEnvironment();
    if (env === 'production') {
      return this.configService.get<string>(
        'QB_API_BASE_URL_PRODUCTION',
        'https://quickbooks.api.intuit.com',
      );
    }
    return this.configService.get<string>(
      'QB_API_BASE_URL_SANDBOX',
      'https://sandbox-quickbooks.api.intuit.com',
    );
  }

  // Webhook Configuration

  getWebhookVerifierToken(): string {
    return this.configService.get<string>('QB_WEBHOOK_VERIFIER_TOKEN', '');
  }

  getWebhookEndpoint(): string {
    return this.configService.get<string>(
      'QB_WEBHOOK_ENDPOINT',
      '/api/v1/integrations/quickbooks/webhooks',
    );
  }

  // Token Encryption

  getEncryptionKey(): string {
    return this.configService.get<string>('QB_ENCRYPTION_KEY') || '';
  }

  // Sync Configuration

  isSyncEnabled(): boolean {
    return this.configService.get<string>('QB_SYNC_ENABLED', 'true') === 'true';
  }

  isAutoSyncVendors(): boolean {
    return this.configService.get<string>('QB_AUTO_SYNC_VENDORS', 'true') === 'true';
  }

  isAutoSyncBills(): boolean {
    return this.configService.get<string>('QB_AUTO_SYNC_BILLS', 'true') === 'true';
  }

  isAutoSyncBillPayments(): boolean {
    return this.configService.get<string>('QB_AUTO_SYNC_BILL_PAYMENTS', 'true') === 'true';
  }

  isAutoSyncInvoices(): boolean {
    return this.configService.get<string>('QB_AUTO_SYNC_INVOICES', 'false') === 'true';
  }

  isAutoSyncJournalEntries(): boolean {
    return this.configService.get<string>('QB_AUTO_SYNC_JOURNAL_ENTRIES', 'false') === 'true';
  }

  getSyncFrequency(): 'REALTIME' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MANUAL' {
    const freq = this.configService.get<string>('QB_SYNC_FREQUENCY', 'REALTIME');
    const valid = ['REALTIME', 'HOURLY', 'DAILY', 'WEEKLY', 'MANUAL'];
    return valid.includes(freq) ? (freq as any) : 'REALTIME';
  }

  // Retry Configuration

  getMaxRetryAttempts(): number {
    return parseInt(
      this.configService.get<string>('QB_MAX_RETRY_ATTEMPTS', '3'),
      10,
    );
  }

  getRetryDelayMinutes(): number {
    return parseInt(
      this.configService.get<string>('QB_RETRY_DELAY_MINUTES', '5'),
      10,
    );
  }

  // Rate Limiting

  getRateLimitRequests(): number {
    return parseInt(
      this.configService.get<string>('QB_RATE_LIMIT_REQUESTS', '450'),
      10,
    );
  }

  getRateLimitWindowMs(): number {
    return parseInt(
      this.configService.get<string>('QB_RATE_LIMIT_WINDOW_MS', '60000'),
      10,
    );
  }

  // Batch Operations

  getBatchSize(): number {
    return parseInt(
      this.configService.get<string>('QB_BATCH_SIZE', '30'),
      10,
    );
  }

  getBatchDelayMs(): number {
    return parseInt(
      this.configService.get<string>('QB_BATCH_DELAY_MS', '1000'),
      10,
    );
  }

  // OAuth Scopes

  getOAuthScopes(): string[] {
    return [
      'com.intuit.quickbooks.accounting',
      'openid',
      'profile',
      'email',
    ];
  }

  // Helper Methods

  isProduction(): boolean {
    return this.getEnvironment() === 'production';
  }

  isSandbox(): boolean {
    return this.getEnvironment() === 'sandbox';
  }

  getAuthorizationUrl(state: string): string {
    const scopes = this.getOAuthScopes().join(' ');
    const params = new URLSearchParams({
      client_id: this.getClientId(),
      response_type: 'code',
      scope: scopes,
      redirect_uri: this.getRedirectUri(),
      state,
    });

    return `${this.getAuthBaseUrl()}?${params.toString()}`;
  }
}
