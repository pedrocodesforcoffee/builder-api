import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenRefreshService } from './token-refresh.service';
import { TokenService } from './token.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';

describe('TokenRefreshService', () => {
  let service: TokenRefreshService;
  let refreshTokenRepository: Repository<RefreshToken>;
  let userRepository: Repository<User>;
  let tokenService: TokenService;

  const mockUser = {
    id: 'user-id-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    systemRole: 'user',
    isActive: true,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockRefreshToken = {
    id: 'token-id-123',
    familyId: 'family-id-123',
    userId: 'user-id-123',
    tokenHash: 'hashed-token',
    previousTokenHash: null,
    generation: 1,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    usedAt: null,
    revokedAt: null,
    revokeReason: null,
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    deviceId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockUser,
    isExpired: jest.fn().mockReturnValue(false),
    isRevoked: jest.fn().mockReturnValue(false),
    hasBeenUsed: jest.fn().mockReturnValue(false),
    isWithinGracePeriod: jest.fn().mockReturnValue(false),
  } as any;

  const mockRefreshTokenRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockTokenService = {
    generateAccessToken: jest.fn(),
    hashToken: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenRefreshService,
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
      ],
    }).compile();

    service = module.get<TokenRefreshService>(TokenRefreshService);
    refreshTokenRepository = module.get(getRepositoryToken(RefreshToken));
    userRepository = module.get(getRepositoryToken(User));
    tokenService = module.get<TokenService>(TokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('refreshTokens - Success Flow', () => {
    it('should successfully refresh tokens with valid refresh token', async () => {
      const plainToken = 'plain-refresh-token';
      const metadata = {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        deviceId: 'device-123',
      };

      mockRefreshTokenRepository.findOne.mockResolvedValueOnce(mockRefreshToken);
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser);
      mockTokenService.generateAccessToken.mockResolvedValueOnce('new-access-token');
      mockRefreshTokenRepository.create.mockReturnValue({
        ...mockRefreshToken,
        generation: 2,
      });
      mockRefreshTokenRepository.save.mockResolvedValueOnce({});

      const result = await service.refreshTokens(plainToken, metadata);

      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        mockRefreshToken.id,
        { usedAt: expect.any(Date) },
      );
      expect(mockUserRepository.update).toHaveBeenCalledWith(mockUser.id, {
        lastLoginAt: expect.any(Date),
      });
    });

    it('should rotate refresh token with incremented generation', async () => {
      const plainToken = 'plain-refresh-token';
      const metadata = {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };

      mockRefreshTokenRepository.findOne.mockResolvedValueOnce(mockRefreshToken);
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser);
      mockTokenService.generateAccessToken.mockResolvedValueOnce('new-access-token');

      const newTokenData = {
        familyId: mockRefreshToken.familyId,
        userId: mockRefreshToken.userId,
        generation: 2,
        previousTokenHash: mockRefreshToken.tokenHash,
      };
      mockRefreshTokenRepository.create.mockReturnValue(newTokenData);
      mockRefreshTokenRepository.save.mockResolvedValueOnce(newTokenData);

      await service.refreshTokens(plainToken, metadata);

      expect(mockRefreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          familyId: mockRefreshToken.familyId,
          generation: 2,
          previousTokenHash: mockRefreshToken.tokenHash,
        }),
      );
    });
  });

  describe('refreshTokens - Grace Period', () => {
    it('should handle grace period when token was recently used', async () => {
      const plainToken = 'plain-refresh-token';
      const metadata = {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };

      const usedToken = {
        ...mockRefreshToken,
        usedAt: new Date(),
        hasBeenUsed: jest.fn().mockReturnValue(true),
        isWithinGracePeriod: jest.fn().mockReturnValue(true),
      };

      const nextToken = {
        ...mockRefreshToken,
        generation: 2,
        tokenHash: 'next-token-hash',
      };

      mockRefreshTokenRepository.findOne
        .mockResolvedValueOnce(usedToken)
        .mockResolvedValueOnce(nextToken);
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser);
      mockTokenService.generateAccessToken.mockResolvedValueOnce('new-access-token');

      const result = await service.refreshTokens(plainToken, metadata);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBeNull(); // Grace period returns no new refresh token
    });

    it('should throw ForbiddenException when token reused outside grace period', async () => {
      const plainToken = 'plain-refresh-token';
      const metadata = {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };

      const usedToken = {
        ...mockRefreshToken,
        usedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        hasBeenUsed: jest.fn().mockReturnValue(true),
        isWithinGracePeriod: jest.fn().mockReturnValue(false),
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(usedToken);

      await expect(service.refreshTokens(plainToken, metadata)).rejects.toThrow(
        ForbiddenException,
      );

      // Verify entire family was revoked
      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { familyId: usedToken.familyId },
        {
          revokedAt: expect.any(Date),
          revokeReason: 'token_reuse',
        },
      );
    });
  });

  describe('refreshTokens - Error Cases', () => {
    it('should throw UnauthorizedException when token not found', async () => {
      const plainToken = 'invalid-token';
      const metadata = {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshTokens(plainToken, metadata)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      const plainToken = 'expired-token';
      const metadata = {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };

      const expiredToken = {
        ...mockRefreshToken,
        hasBeenUsed: jest.fn().mockReturnValue(false),
        isExpired: jest.fn().mockReturnValue(true),
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(expiredToken);

      await expect(service.refreshTokens(plainToken, metadata)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is revoked', async () => {
      const plainToken = 'revoked-token';
      const metadata = {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };

      const revokedToken = {
        ...mockRefreshToken,
        revokedAt: new Date(),
        hasBeenUsed: jest.fn().mockReturnValue(false),
        isExpired: jest.fn().mockReturnValue(false),
        isRevoked: jest.fn().mockReturnValue(true),
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(revokedToken);

      await expect(service.refreshTokens(plainToken, metadata)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const plainToken = 'valid-token';
      const metadata = {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };

      const inactiveUser = {
        ...mockUser,
        isActive: false,
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(mockRefreshToken);
      mockUserRepository.findOne.mockResolvedValue(inactiveUser);

      await expect(service.refreshTokens(plainToken, metadata)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const plainToken = 'valid-token';
      const metadata = {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };

      mockRefreshTokenRepository.findOne.mockResolvedValueOnce(mockRefreshToken);
      mockUserRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.refreshTokens(plainToken, metadata)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Token Family Revocation', () => {
    it('should revoke entire token family when reuse detected', async () => {
      const plainToken = 'reused-token';
      const metadata = {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };

      const reusedToken = {
        ...mockRefreshToken,
        usedAt: new Date(Date.now() - 10 * 60 * 1000),
        hasBeenUsed: jest.fn().mockReturnValue(true),
        isWithinGracePeriod: jest.fn().mockReturnValue(false),
      };

      mockRefreshTokenRepository.findOne.mockResolvedValueOnce(reusedToken);

      await expect(service.refreshTokens(plainToken, metadata)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { familyId: reusedToken.familyId },
        {
          revokedAt: expect.any(Date),
          revokeReason: 'token_reuse',
        },
      );
    });
  });

  describe('Metadata Tracking', () => {
    it('should track IP address and user agent in new token', async () => {
      const plainToken = 'plain-refresh-token';
      const metadata = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        deviceId: 'device-abc',
      };

      mockRefreshTokenRepository.findOne.mockResolvedValueOnce(mockRefreshToken);
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser);
      mockTokenService.generateAccessToken.mockResolvedValueOnce('new-access-token');
      mockRefreshTokenRepository.create.mockReturnValue({});
      mockRefreshTokenRepository.save.mockResolvedValueOnce({});

      await service.refreshTokens(plainToken, metadata);

      expect(mockRefreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          deviceId: 'device-abc',
        }),
      );
    });
  });
});
