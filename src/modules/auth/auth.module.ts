import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { TokenRefreshService } from './token-refresh.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { FailedLoginAttempt } from './entities/failed-login-attempt.entity';
import { OrganizationMember } from '../organizations/entities/organization-member.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';

/**
 * Authentication Module
 *
 * Provides authentication functionality including:
 * - User registration
 * - User login with JWT tokens
 * - Password hashing and validation
 * - Email uniqueness checking
 * - Rate limiting for failed attempts
 * - Refresh token management
 *
 * This module imports the User entity and configures JWT authentication.
 */
@Module({
  imports: [
    // Import TypeORM repositories
    TypeOrmModule.forFeature([
      User,
      RefreshToken,
      FailedLoginAttempt,
      OrganizationMember,
      ProjectMember,
    ]),
    // Configure Passport
    PassportModule,
    // Configure JWT module
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret-key',
      }),
      inject: [ConfigService],
    }),
    // Configure rate limiting for refresh endpoint
    ThrottlerModule.forRoot([
      {
        name: 'refresh',
        ttl: 60000, // 60 seconds
        limit: 10, // 10 requests per minute
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, TokenRefreshService, JwtStrategy],
  exports: [AuthService, TokenService, TokenRefreshService], // Export for use in other modules
})
export class AuthModule {}
