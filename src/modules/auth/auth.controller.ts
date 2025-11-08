import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UseGuards,
  ClassSerializerInterceptor,
  Logger,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { TokenRefreshService } from './token-refresh.service';
import { TokenService } from './token.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshThrottleGuard } from './guards/refresh-throttle.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * Authentication Controller
 *
 * Handles HTTP requests for authentication operations:
 * - POST /auth/register - User registration
 *
 * Security features:
 * - Automatic password exclusion via ClassSerializerInterceptor
 * - Input validation via DTOs
 * - Comprehensive error responses
 * - Request/response logging
 */
@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly tokenRefreshService: TokenRefreshService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Register a new user
   *
   * POST /auth/register
   *
   * @param registerDto - User registration data (validated by DTOs)
   * @returns UserResponseDto - Created user data (without password)
   *
   * @example
   * Request:
   * ```json
   * {
   *   "email": "user@example.com",
   *   "password": "SecurePass123!",
   *   "firstName": "John",
   *   "lastName": "Doe",
   *   "phoneNumber": "+1234567890"
   * }
   * ```
   *
   * Success Response (201):
   * ```json
   * {
   *   "id": "uuid",
   *   "email": "user@example.com",
   *   "firstName": "John",
   *   "lastName": "Doe",
   *   "phoneNumber": "+1234567890",
   *   "role": "user",
   *   "createdAt": "2024-12-08T10:30:00.000Z",
   *   "updatedAt": "2024-12-08T10:30:00.000Z"
   * }
   * ```
   *
   * Error Response (400):
   * ```json
   * {
   *   "statusCode": 400,
   *   "message": ["email must be a valid email", "password is too weak"],
   *   "error": "Bad Request"
   * }
   * ```
   *
   * Error Response (409):
   * ```json
   * {
   *   "statusCode": 409,
   *   "message": "An account with this email address already exists",
   *   "error": "Conflict"
   * }
   * ```
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<UserResponseDto> {
    this.logger.log(
      `Registration request received for email: ${registerDto.email}`,
    );

    const user = await this.authService.register(registerDto);

    this.logger.log(`User registered successfully - ID: ${user.id}`);

    return user;
  }

  /**
   * Login with email and password
   *
   * POST /auth/login
   *
   * @param loginDto - User credentials (validated by DTOs)
   * @param req - Express request object for IP and user agent extraction
   * @returns LoginResponseDto - JWT tokens and user data
   *
   * @example
   * Request:
   * ```json
   * {
   *   "email": "user@example.com",
   *   "password": "SecurePass123@"
   * }
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
   *   "refreshToken": "a1b2c3d4e5f6...",
   *   "tokenType": "Bearer",
   *   "expiresIn": 900,
   *   "user": {
   *     "id": "uuid",
   *     "email": "user@example.com",
   *     "firstName": "John",
   *     "lastName": "Doe",
   *     "role": "user"
   *   }
   * }
   * ```
   *
   * Error Response (401):
   * ```json
   * {
   *   "statusCode": 401,
   *   "message": "Invalid credentials",
   *   "error": "Unauthorized"
   * }
   * ```
   *
   * Error Response (429):
   * ```json
   * {
   *   "statusCode": 429,
   *   "message": "Too many failed login attempts. Please try again in 15 minutes.",
   *   "error": "Too Many Requests"
   * }
   * ```
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
  ): Promise<LoginResponseDto> {
    // Extract IP address and user agent for security tracking
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    this.logger.log(
      `Login request received for email: ${loginDto.email} from IP: ${ipAddress}`,
    );

    const result = await this.authService.login(loginDto, {
      ipAddress,
      userAgent,
    });

    this.logger.log(`User logged in successfully - ID: ${result.user.id}`);

    return result;
  }

  /**
   * Refresh access and refresh tokens
   *
   * POST /auth/refresh
   *
   * Security:
   * - Rate limited to 10 requests per minute per IP
   * - Token rotation on every use
   * - Grace period handling for network reliability
   * - Token reuse detection
   *
   * @param refreshTokenDto - Refresh token from client (or cookies)
   * @param req - Express request object for IP and user agent extraction
   * @returns LoginResponseDto - New JWT tokens and user data
   *
   * @example
   * Request:
   * ```json
   * {
   *   "refreshToken": "a1b2c3d4e5f6..."
   * }
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
   *   "refreshToken": "x9y8z7w6v5u4...",
   *   "tokenType": "Bearer",
   *   "expiresIn": 900,
   *   "user": {
   *     "id": "uuid",
   *     "email": "user@example.com",
   *     "firstName": "John",
   *     "lastName": "Doe",
   *     "role": "user"
   *   }
   * }
   * ```
   *
   * Error Response (401):
   * ```json
   * {
   *   "statusCode": 401,
   *   "message": "Invalid refresh token",
   *   "error": "Unauthorized"
   * }
   * ```
   *
   * Error Response (403):
   * ```json
   * {
   *   "statusCode": 403,
   *   "message": "Token reuse detected. All sessions have been terminated.",
   *   "error": "Forbidden"
   * }
   * ```
   *
   * Error Response (429):
   * ```json
   * {
   *   "statusCode": 429,
   *   "message": "Too many refresh requests. Please try again later.",
   *   "error": "Too Many Requests"
   * }
   * ```
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ refresh: { limit: 10, ttl: 60000 } })
  @UseGuards(RefreshThrottleGuard)
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<LoginResponseDto> {
    // Extract refresh token from body or cookies
    const refreshToken =
      refreshTokenDto.refreshToken || (req.cookies?.refreshToken as string);

    if (!refreshToken) {
      this.logger.warn('Refresh request without token');
      throw new BadRequestException('Refresh token is required');
    }

    // Extract IP address and user agent for security tracking
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];
    const deviceId = req.headers['x-device-id'] as string;

    this.logger.log(`Token refresh request from IP: ${ipAddress}`);

    const result = await this.tokenRefreshService.refreshTokens(refreshToken, {
      ipAddress,
      userAgent,
      deviceId,
    });

    this.logger.log(`Tokens refreshed for user: ${result.user.id}`);

    // Return response - if refreshToken is null (grace period), don't include it
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken || undefined,
      tokenType: 'Bearer',
      expiresIn: 900, // 15 minutes
      user: result.user,
    } as LoginResponseDto;
  }

  /**
   * Logout user and revoke all refresh tokens
   *
   * POST /auth/logout
   *
   * Invalidates all active sessions by revoking all refresh tokens for the user.
   * Client should discard access token after successful logout.
   *
   * Security:
   * - Requires valid JWT access token
   * - Revokes all refresh tokens (all sessions)
   * - Logs security event
   *
   * @returns Success message
   *
   * @example
   * Request:
   * ```
   * POST /auth/logout
   * Authorization: Bearer <access-token>
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "message": "Successfully logged out from all devices"
   * }
   * ```
   *
   * Error Response (401):
   * ```json
   * {
   *   "statusCode": 401,
   *   "message": "Invalid or expired access token",
   *   "error": "Unauthorized"
   * }
   * ```
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request): Promise<{ message: string }> {
    const user = (req as any).user;

    this.logger.log(`Logout request from user: ${user.id}`);

    // Revoke all refresh tokens for this user
    await this.tokenService.revokeAllUserTokens(user.id);

    this.logger.log(`User logged out successfully - ID: ${user.id}`);

    return {
      message: 'Successfully logged out from all devices',
    };
  }
}
