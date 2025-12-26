import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, InternalServerErrorException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
import { User } from '../../users/entities/user.entity';
import { RegisterDto } from '../dto/register.dto';

// Mock bcrypt
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;

  // Sample test data
  const mockRegisterDto: RegisterDto = {
    email: 'test@example.com',
    password: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '+1234567890',
  };

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    password: '$2b$12$hashedpassword',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '+1234567890',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    normalizeEmailBeforeInsert: jest.fn(),
    normalizeEmailBeforeUpdate: jest.fn(),
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    },
    toJSON: jest.fn(),
  };

  beforeEach(async () => {
    // Create mock repository
    const mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    describe('successful registration', () => {
      beforeEach(() => {
        userRepository.findOne.mockResolvedValue(null); // Email doesn't exist
        userRepository.create.mockReturnValue(mockUser);
        userRepository.save.mockResolvedValue(mockUser);
        (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashedpassword');
      });

      it('should register a new user successfully', async () => {
        const result = await service.register(mockRegisterDto);

        expect(result).toBeDefined();
        expect(result.email).toBe(mockRegisterDto.email);
        expect(result.firstName).toBe(mockRegisterDto.firstName);
        expect(result.lastName).toBe(mockRegisterDto.lastName);
        expect(result.phoneNumber).toBe(mockRegisterDto.phoneNumber);
        expect(result.role).toBe('user');
        expect(result).not.toHaveProperty('password');
      });

      it('should convert email to lowercase', async () => {
        const dtoWithUppercaseEmail = {
          ...mockRegisterDto,
          email: 'TEST@EXAMPLE.COM',
        };

        await service.register(dtoWithUppercaseEmail);

        expect(userRepository.findOne).toHaveBeenCalledWith({
          where: { email: 'test@example.com' },
        });
      });

      it('should hash password with 12 rounds', async () => {
        await service.register(mockRegisterDto);

        expect(bcrypt.hash).toHaveBeenCalledWith(mockRegisterDto.password, 12);
      });

      it('should trim firstName and lastName', async () => {
        const dtoWithSpaces = {
          ...mockRegisterDto,
          firstName: '  John  ',
          lastName: '  Doe  ',
        };

        userRepository.create.mockReturnValue({
          ...mockUser,
          firstName: 'John',
          lastName: 'Doe',
        });

        await service.register(dtoWithSpaces);

        expect(userRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe',
          }),
        );
      });

      it('should handle registration without phone number', async () => {
        const dtoWithoutPhone = {
          ...mockRegisterDto,
          phoneNumber: undefined,
        };

        const userWithoutPhone = { ...mockUser, phoneNumber: undefined };
        userRepository.create.mockReturnValue(userWithoutPhone);
        userRepository.save.mockResolvedValue(userWithoutPhone);

        const result = await service.register(dtoWithoutPhone);

        expect(result.phoneNumber).toBeUndefined();
      });

      it('should set default role to "user"', async () => {
        await service.register(mockRegisterDto);

        expect(userRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            role: 'user',
          }),
        );
      });

      it('should exclude password from response', async () => {
        const result = await service.register(mockRegisterDto);

        expect(result.password).toBeUndefined();
        expect(Object.keys(result)).not.toContain('password');
      });

      it('should include all required fields in response', async () => {
        const result = await service.register(mockRegisterDto);

        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('email');
        expect(result).toHaveProperty('firstName');
        expect(result).toHaveProperty('lastName');
        expect(result).toHaveProperty('role');
        expect(result).toHaveProperty('createdAt');
        expect(result).toHaveProperty('updatedAt');
      });
    });

    describe('validation and error handling', () => {
      it('should throw ConflictException if email already exists', async () => {
        userRepository.findOne.mockResolvedValue(mockUser);

        await expect(service.register(mockRegisterDto)).rejects.toThrow(
          ConflictException,
        );
        await expect(service.register(mockRegisterDto)).rejects.toThrow(
          'An account with this email address already exists',
        );
      });

      it('should check for existing email case-insensitively', async () => {
        userRepository.findOne.mockResolvedValue(mockUser);

        const dtoWithUppercaseEmail = {
          ...mockRegisterDto,
          email: 'TEST@EXAMPLE.COM',
        };

        await expect(service.register(dtoWithUppercaseEmail)).rejects.toThrow(
          ConflictException,
        );

        expect(userRepository.findOne).toHaveBeenCalledWith({
          where: { email: 'test@example.com' },
        });
      });

      it('should throw InternalServerErrorException if password hashing fails', async () => {
        userRepository.findOne.mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hashing failed'));

        await expect(service.register(mockRegisterDto)).rejects.toThrow(
          InternalServerErrorException,
        );
      });

      it('should throw InternalServerErrorException if database save fails', async () => {
        userRepository.findOne.mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashedpassword');
        userRepository.create.mockReturnValue(mockUser);
        userRepository.save.mockRejectedValue(new Error('Database error'));

        await expect(service.register(mockRegisterDto)).rejects.toThrow(
          InternalServerErrorException,
        );
      });

      it('should handle unexpected errors gracefully', async () => {
        userRepository.findOne.mockRejectedValue(new Error('Unexpected error'));

        await expect(service.register(mockRegisterDto)).rejects.toThrow(
          InternalServerErrorException,
        );
      });
    });

    describe('edge cases', () => {
      beforeEach(() => {
        userRepository.findOne.mockResolvedValue(null);
        userRepository.create.mockReturnValue(mockUser);
        userRepository.save.mockResolvedValue(mockUser);
        (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashedpassword');
      });

      it('should handle unicode characters in names', async () => {
        const dtoWithUnicode = {
          ...mockRegisterDto,
          firstName: 'José',
          lastName: 'Müller',
        };

        const userWithUnicode = {
          ...mockUser,
          firstName: 'José',
          lastName: 'Müller',
        };

        userRepository.create.mockReturnValue(userWithUnicode);
        userRepository.save.mockResolvedValue(userWithUnicode);

        const result = await service.register(dtoWithUnicode);

        expect(result.firstName).toBe('José');
        expect(result.lastName).toBe('Müller');
      });

      it('should handle international phone numbers', async () => {
        const dtoWithIntlPhone = {
          ...mockRegisterDto,
          phoneNumber: '+351123456789',
        };

        const userWithIntlPhone = {
          ...mockUser,
          phoneNumber: '+351123456789',
        };

        userRepository.create.mockReturnValue(userWithIntlPhone);
        userRepository.save.mockResolvedValue(userWithIntlPhone);

        const result = await service.register(dtoWithIntlPhone);

        expect(result.phoneNumber).toBe('+351123456789');
      });

      it('should trim phone number if provided', async () => {
        const dtoWithSpacedPhone = {
          ...mockRegisterDto,
          phoneNumber: '  +1234567890  ',
        };

        await service.register(dtoWithSpacedPhone);

        expect(userRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            phoneNumber: '+1234567890',
          }),
        );
      });
    });
  });

  describe('emailExists', () => {
    it('should return true if email exists', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.emailExists('test@example.com');

      expect(result).toBe(true);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return false if email does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.emailExists('nonexistent@example.com');

      expect(result).toBe(false);
    });

    it('should check email case-insensitively', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await service.emailExists('TEST@EXAMPLE.COM');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });
});
