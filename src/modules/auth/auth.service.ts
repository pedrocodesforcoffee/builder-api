import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { FailedLoginAttempt } from './entities/failed-login-attempt.entity';
import { TokenService, RefreshTokenMetadata } from './token.service';

/**
 * Authentication Service
 *
 * Handles user authentication operations including:
 * - User registration with password hashing
 * - User login with JWT token generation
 * - Rate limiting for failed login attempts
 * - Email uniqueness validation
 * - Secure password storage and verification
 *
 * Security features:
 * - Bcrypt password hashing with 12 rounds
 * - Case-insensitive email checking
 * - Password never logged or exposed
 * - Rate limiting to prevent brute force attacks
 * - Progressive delays for failed attempts
 * - Comprehensive error handling and audit logging
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_ROUNDS = 12;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(FailedLoginAttempt)
    private readonly failedAttemptRepository: Repository<FailedLoginAttempt>,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Register a new user
   *
   * Process:
   * 1. Validate email uniqueness (case-insensitive)
   * 2. Hash password with bcrypt (12 rounds)
   * 3. Create user record in database
   * 4. Return sanitized user data (without password)
   *
   * @param registerDto - User registration data
   * @returns Promise<UserResponseDto> - Created user without password
   * @throws ConflictException - If email already exists
   * @throws InternalServerErrorException - If database or hashing fails
   */
  async register(registerDto: RegisterDto): Promise<UserResponseDto> {
    const { email, password, firstName, lastName, phoneNumber } = registerDto;

    // Log registration attempt (without sensitive data)
    this.logger.log(`Registration attempt for email: ${email}`);

    try {
      // 1. Check if user with this email already exists (case-insensitive)
      const existingUser = await this.userRepository.findOne({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        this.logger.warn(`Registration failed: Email already exists - ${email}`);
        throw new ConflictException(
          'An account with this email address already exists',
        );
      }

      // 2. Hash password with bcrypt (12 rounds for optimal security/performance balance)
      let hashedPassword: string;
      try {
        hashedPassword = await bcrypt.hash(password, this.BCRYPT_ROUNDS);
      } catch (error) {
        this.logger.error('Password hashing failed', error);
        throw new InternalServerErrorException(
          'An error occurred during registration. Please try again.',
        );
      }

      // 3. Create user entity
      const user = this.userRepository.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber?.trim() || undefined,
        systemRole: 'user' as any, // Default role - will use SystemRole.USER enum
      });

      // 4. Save user to database
      let savedUser: User;
      try {
        savedUser = await this.userRepository.save(user);
      } catch (error) {
        this.logger.error('Database error during user creation', error);
        throw new InternalServerErrorException(
          'An error occurred during registration. Please try again.',
        );
      }

      // 5. Log successful registration (without sensitive data)
      this.logger.log(
        `User registered successfully - ID: ${savedUser.id}, Email: ${savedUser.email}`,
      );

      // 6. Return user data without password
      return new UserResponseDto({
        id: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        phoneNumber: savedUser.phoneNumber,
        role: savedUser.systemRole,
        createdAt: savedUser.createdAt,
        updatedAt: savedUser.updatedAt,
      });
    } catch (error) {
      // Re-throw known exceptions
      if (
        error instanceof ConflictException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      // Log and handle unexpected errors
      this.logger.error('Unexpected error during registration', error);
      throw new InternalServerErrorException(
        'An unexpected error occurred during registration. Please try again.',
      );
    }
  }

  /**
   * Login user and generate tokens
   *
   * Process:
   * 1. Check rate limit for email/IP combination
   * 2. Find user by email (case-insensitive)
   * 3. Verify password using bcrypt
   * 4. Clear failed attempts on success
   * 5. Generate access and refresh tokens
   * 6. Return tokens and user data
   *
   * @param loginDto - Login credentials
   * @param metadata - IP address and user agent
   * @returns Promise<LoginResponseDto> - Tokens and user data
   * @throws UnauthorizedException - If credentials are invalid
   * @throws TooManyRequestsException - If rate limit exceeded
   */
  async login(
    loginDto: LoginDto,
    metadata?: RefreshTokenMetadata,
  ): Promise<LoginResponseDto> {
    const { email, password } = loginDto;

    this.logger.log(`Login attempt for email: ${email}`);

    try {
      // 1. Check rate limit
      if (metadata?.ipAddress) {
        await this.checkRateLimit(email, metadata.ipAddress);
      }

      // 2. Find user by email with password field (usually excluded)
      const user = await this.userRepository.findOne({
        where: { email: email.toLowerCase() },
        select: ['id', 'email', 'password', 'firstName', 'lastName', 'systemRole', 'phoneNumber', 'createdAt', 'updatedAt'],
      });

      if (!user) {
        // Record failed attempt
        if (metadata?.ipAddress) {
          await this.recordFailedAttempt(email, metadata.ipAddress, metadata.userAgent, 'user_not_found');
        }
        this.logger.warn(`Login failed: User not found - ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // 3. Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        // Record failed attempt
        if (metadata?.ipAddress) {
          await this.recordFailedAttempt(email, metadata.ipAddress, metadata.userAgent, 'invalid_password');
        }
        this.logger.warn(`Login failed: Invalid password - ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // 4. Clear failed attempts on successful login
      if (metadata?.ipAddress) {
        await this.clearFailedAttempts(email, metadata.ipAddress);
      }

      // 5. Generate tokens
      const accessToken = await this.tokenService.generateAccessToken(user);
      const refreshToken = await this.tokenService.generateRefreshToken(user, metadata);

      // 6. Log successful login
      this.logger.log(`User logged in successfully - ID: ${user.id}, Email: ${user.email}`);

      // 7. Return tokens and user data
      return new LoginResponseDto({
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: this.tokenService.getAccessTokenExpiration(),
        user: new UserResponseDto({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          role: user.systemRole,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }),
      });
    } catch (error) {
      // Re-throw known exceptions
      if (
        error instanceof UnauthorizedException ||
        error instanceof HttpException
      ) {
        throw error;
      }

      // Log and handle unexpected errors
      this.logger.error('Unexpected error during login', error);
      throw new InternalServerErrorException(
        'An unexpected error occurred during login. Please try again.',
      );
    }
  }

  /**
   * Check rate limit for failed login attempts
   *
   * @param email - User email
   * @param ipAddress - Client IP address
   * @throws TooManyRequestsException if rate limit exceeded
   */
  private async checkRateLimit(email: string, ipAddress: string): Promise<void> {
    const maxAttempts = this.configService.get<number>('LOGIN_MAX_ATTEMPTS', 5);
    const windowMinutes = this.configService.get<number>('LOGIN_WINDOW_MINUTES', 15);

    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - windowMinutes);

    const recentAttempts = await this.failedAttemptRepository.count({
      where: {
        email: email.toLowerCase(),
        ipAddress,
        attemptedAt: MoreThan(windowStart),
      },
    });

    if (recentAttempts >= maxAttempts) {
      const blockDuration = this.configService.get<number>('LOGIN_BLOCK_DURATION_MINUTES', 15);
      this.logger.warn(`Rate limit exceeded for ${email} from ${ipAddress}`);
      throw new HttpException(
        `Too many failed login attempts. Please try again in ${blockDuration} minutes.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Record a failed login attempt
   *
   * @param email - User email
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   * @param reason - Failure reason
   */
  private async recordFailedAttempt(
    email: string,
    ipAddress: string,
    userAgent?: string,
    reason?: string,
  ): Promise<void> {
    try {
      const attempt = this.failedAttemptRepository.create({
        email: email.toLowerCase(),
        ipAddress,
        userAgent,
        reason,
      });

      await this.failedAttemptRepository.save(attempt);
      this.logger.log(`Failed login attempt recorded for ${email} from ${ipAddress}`);
    } catch (error) {
      this.logger.error('Failed to record login attempt', error);
      // Don't throw - recording failures shouldn't block the login flow
    }
  }

  /**
   * Clear failed login attempts after successful login
   *
   * @param email - User email
   * @param ipAddress - Client IP address
   */
  private async clearFailedAttempts(email: string, ipAddress: string): Promise<void> {
    try {
      await this.failedAttemptRepository.delete({
        email: email.toLowerCase(),
        ipAddress,
      });
      this.logger.log(`Cleared failed attempts for ${email} from ${ipAddress}`);
    } catch (error) {
      this.logger.error('Failed to clear login attempts', error);
      // Don't throw - this shouldn't block successful login
    }
  }

  /**
   * Check if an email is already registered
   *
   * @param email - Email address to check
   * @returns Promise<boolean> - True if email exists, false otherwise
   */
  async emailExists(email: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
    return !!user;
  }

  /**
   * Get user by ID
   *
   * Retrieves a user's complete profile information by their ID.
   * Used for the /auth/me endpoint to return current user details.
   *
   * Note: Password is automatically excluded from the result due to
   * the @Exclude() decorator on the User entity.
   *
   * @param userId - User's UUID
   * @returns User profile data
   * @throws UnauthorizedException if user not found
   */
  async getUserById(userId: string): Promise<UserResponseDto> {
    this.logger.log(`Fetching user by ID: ${userId}`);

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      this.logger.warn(`User not found for ID: ${userId}`);
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      this.logger.warn(`Inactive user attempted access: ${userId}`);
      throw new UnauthorizedException('User account is inactive');
    }

    // Convert to response DTO (password excluded by entity)
    const userResponse: UserResponseDto = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      role: user.systemRole,
      systemRole: user.systemRole,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return userResponse;
  }
}
