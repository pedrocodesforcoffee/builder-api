import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { QuickBooksAuthService } from './quickbooks-auth.service';
import { QuickBooksConfigService } from './quickbooks-config.service';
import { RateLimiterUtil } from '../utils/rate-limiter.util';
import { RetryUtil } from '../utils/retry.util';

/**
 * QuickBooks API Error Response
 */
interface QBApiError {
  Fault: {
    Error: Array<{
      Message: string;
      Detail: string;
      code: string;
      element?: string;
    }>;
    type: string;
  };
}

/**
 * QuickBooks API Client Service
 *
 * Base HTTP client for making authenticated requests to QuickBooks Online API.
 *
 * Features:
 * - Automatic OAuth authentication
 * - Rate limiting (450 req/min)
 * - Retry with exponential backoff
 * - Error handling and normalization
 * - Request/response logging (redacted)
 * - Minor version handling
 *
 * All QuickBooks API services should use this client.
 */
@Injectable()
export class QuickBooksApiClientService {
  private readonly logger = new Logger(QuickBooksApiClientService.name);
  private readonly httpClient: AxiosInstance;
  private readonly rateLimiter: RateLimiterUtil;
  private readonly minorVersion = '65'; // QuickBooks API minor version (2023)

  constructor(
    private readonly authService: QuickBooksAuthService,
    private readonly configService: QuickBooksConfigService,
  ) {
    // Initialize HTTP client
    this.httpClient = axios.create({
      baseURL: this.configService.getApiBaseUrl(),
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // Initialize rate limiter
    this.rateLimiter = new RateLimiterUtil(
      this.configService.getRateLimitRequests(),
      this.configService.getRateLimitWindowMs(),
    );

    // Add request interceptor for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        this.logger.debug(`QB API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error(`QB API Request Error: ${error.message}`);
        return Promise.reject(error);
      },
    );

    // Add response interceptor for logging
    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.debug(`QB API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        if (error.response) {
          this.logger.error(
            `QB API Error Response: ${error.response.status} ${error.response.config.url}`,
          );
        } else {
          this.logger.error(`QB API Error: ${error.message}`);
        }
        return Promise.reject(error);
      },
    );
  }

  /**
   * Make GET request to QuickBooks API
   *
   * @param organizationId Organization identifier
   * @param realmId QuickBooks Company/Realm ID
   * @param endpoint API endpoint (e.g., '/account/1')
   * @param params Query parameters
   * @returns Response data
   */
  async get<T = any>(
    organizationId: string,
    realmId: string,
    endpoint: string,
    params?: Record<string, any>,
  ): Promise<T> {
    return this.request<T>(organizationId, realmId, {
      method: 'GET',
      url: endpoint,
      params: {
        ...params,
        minorversion: this.minorVersion,
      },
    });
  }

  /**
   * Make POST request to QuickBooks API
   *
   * @param organizationId Organization identifier
   * @param realmId QuickBooks Company/Realm ID
   * @param endpoint API endpoint
   * @param data Request body
   * @returns Response data
   */
  async post<T = any>(
    organizationId: string,
    realmId: string,
    endpoint: string,
    data: any,
  ): Promise<T> {
    return this.request<T>(organizationId, realmId, {
      method: 'POST',
      url: endpoint,
      data,
      params: {
        minorversion: this.minorVersion,
      },
    });
  }

  /**
   * Make PUT request to QuickBooks API
   *
   * Note: QuickBooks uses POST for updates with operation=update parameter
   *
   * @param organizationId Organization identifier
   * @param realmId QuickBooks Company/Realm ID
   * @param endpoint API endpoint
   * @param data Request body
   * @returns Response data
   */
  async put<T = any>(
    organizationId: string,
    realmId: string,
    endpoint: string,
    data: any,
  ): Promise<T> {
    return this.request<T>(organizationId, realmId, {
      method: 'POST',
      url: endpoint,
      data,
      params: {
        operation: 'update',
        minorversion: this.minorVersion,
      },
    });
  }

  /**
   * Make DELETE request to QuickBooks API
   *
   * Note: QuickBooks uses POST for deletes with operation=delete parameter
   *
   * @param organizationId Organization identifier
   * @param realmId QuickBooks Company/Realm ID
   * @param endpoint API endpoint
   * @param data Request body (typically includes Id and SyncToken)
   * @returns Response data
   */
  async delete<T = any>(
    organizationId: string,
    realmId: string,
    endpoint: string,
    data: any,
  ): Promise<T> {
    return this.request<T>(organizationId, realmId, {
      method: 'POST',
      url: endpoint,
      data,
      params: {
        operation: 'delete',
        minorversion: this.minorVersion,
      },
    });
  }

  /**
   * Execute query against QuickBooks API
   *
   * @param organizationId Organization identifier
   * @param realmId QuickBooks Company/Realm ID
   * @param query SQL-like query string (e.g., "SELECT * FROM Account")
   * @returns Query results
   */
  async query<T = any>(
    organizationId: string,
    realmId: string,
    query: string,
  ): Promise<T> {
    return this.get<T>(organizationId, realmId, '/query', { query });
  }

  /**
   * Make authenticated request with rate limiting and retry
   *
   * @param organizationId Organization identifier
   * @param realmId QuickBooks Company/Realm ID
   * @param config Axios request configuration
   * @returns Response data
   */
  private async request<T>(
    organizationId: string,
    realmId: string,
    config: AxiosRequestConfig,
  ): Promise<T> {
    // Wait for rate limiter
    const acquired = await this.rateLimiter.acquire(organizationId, 1, 5000);
    if (!acquired) {
      throw new BadRequestException('Rate limit exceeded. Please try again later.');
    }

    // Execute with retry
    const response = await RetryUtil.execute<AxiosResponse<any>>(
      async () => {
        // Get access token
        const accessToken = await this.authService.getAccessToken(organizationId);

        // Build full URL
        const url = `/v3/company/${realmId}${config.url}`;

        // Make request with authentication
        return await this.httpClient.request({
          ...config,
          url,
          headers: {
            ...config.headers,
            'Authorization': `Bearer ${accessToken}`,
          },
        });
      },
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        onRetry: (error, attempt, delayMs) => {
          this.logger.warn(
            `Retrying request to ${config.url} (attempt ${attempt}/3) after ${Math.round(delayMs)}ms`,
          );
        },
      },
    );

    // Handle QuickBooks error responses
    if (response.data && (response.data as QBApiError).Fault) {
      this.handleQBError(response.data as QBApiError);
    }

    return response.data;
  }

  /**
   * Handle QuickBooks API error responses
   *
   * @param errorData QB error response
   * @throws Appropriate exception based on error code
   */
  private handleQBError(errorData: QBApiError): never {
    const fault = errorData.Fault;
    const error = fault.Error[0];

    const errorMessage = `${error.Message}: ${error.Detail}`;
    const errorCode = error.code;

    this.logger.error(`QB API Error [${errorCode}]: ${errorMessage}`);

    // Map QB error codes to appropriate exceptions
    switch (errorCode) {
      case '3200': // Authentication error
      case '401':
        throw new UnauthorizedException(errorMessage);

      case '400': // Bad request
      case '610': // Object not found
        throw new BadRequestException(errorMessage);

      case '5010': // Stale object error (SyncToken mismatch)
        throw new BadRequestException(
          'Object has been modified by another user. Please refresh and try again.',
        );

      case '429': // Rate limit
        throw new BadRequestException('Rate limit exceeded');

      default:
        throw new InternalServerErrorException(errorMessage);
    }
  }

  /**
   * Get rate limiter stats for organization
   *
   * @param organizationId Organization identifier
   * @returns Remaining tokens
   */
  getRateLimitStatus(organizationId: string): number {
    return this.rateLimiter.getRemainingTokens(organizationId);
  }

  /**
   * Reset rate limiter for organization
   *
   * @param organizationId Organization identifier
   */
  resetRateLimit(organizationId: string): void {
    this.rateLimiter.reset(organizationId);
  }
}
