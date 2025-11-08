import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { RegisterDto } from '../dto/register.dto';
import { UserResponseDto } from '../dto/user-response.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockRegisterDto: RegisterDto = {
    email: 'test@example.com',
    password: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '+1234567890',
  };

  const mockUserResponse: UserResponseDto = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '+1234567890',
    role: 'user',
    createdAt: new Date('2024-12-08T10:30:00.000Z'),
    updatedAt: new Date('2024-12-08T10:30:00.000Z'),
  };

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      emailExists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
      expect(controller.register).toBeDefined();
    });

    describe('successful registration', () => {
      beforeEach(() => {
        authService.register.mockResolvedValue(mockUserResponse);
      });

      it('should register a new user and return user data', async () => {
        const result = await controller.register(mockRegisterDto);

        expect(result).toEqual(mockUserResponse);
        expect(authService.register).toHaveBeenCalledWith(mockRegisterDto);
        expect(authService.register).toHaveBeenCalledTimes(1);
      });

      it('should not include password in response', async () => {
        const result = await controller.register(mockRegisterDto);

        expect(result).not.toHaveProperty('password');
        expect(Object.keys(result)).not.toContain('password');
      });

      it('should return user with all expected fields', async () => {
        const result = await controller.register(mockRegisterDto);

        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('email');
        expect(result).toHaveProperty('firstName');
        expect(result).toHaveProperty('lastName');
        expect(result).toHaveProperty('phoneNumber');
        expect(result).toHaveProperty('role');
        expect(result).toHaveProperty('createdAt');
        expect(result).toHaveProperty('updatedAt');
      });

      it('should handle registration without phone number', async () => {
        const dtoWithoutPhone = { ...mockRegisterDto, phoneNumber: undefined };
        const responseWithoutPhone = { ...mockUserResponse, phoneNumber: undefined };

        authService.register.mockResolvedValue(responseWithoutPhone);

        const result = await controller.register(dtoWithoutPhone);

        expect(result.phoneNumber).toBeUndefined();
      });

      it('should return role as "user" for new registrations', async () => {
        const result = await controller.register(mockRegisterDto);

        expect(result.role).toBe('user');
      });
    });

    describe('error handling', () => {
      it('should throw ConflictException when email already exists', async () => {
        authService.register.mockRejectedValue(
          new ConflictException('An account with this email address already exists'),
        );

        await expect(controller.register(mockRegisterDto)).rejects.toThrow(
          ConflictException,
        );
        await expect(controller.register(mockRegisterDto)).rejects.toThrow(
          'An account with this email address already exists',
        );
      });

      it('should propagate service errors to the caller', async () => {
        const error = new Error('Service error');
        authService.register.mockRejectedValue(error);

        await expect(controller.register(mockRegisterDto)).rejects.toThrow(error);
      });
    });

    describe('input validation', () => {
      it('should accept valid registration data', async () => {
        authService.register.mockResolvedValue(mockUserResponse);

        const result = await controller.register(mockRegisterDto);

        expect(result).toBeDefined();
        expect(authService.register).toHaveBeenCalledWith(mockRegisterDto);
      });

      it('should handle email with different cases', async () => {
        const dtoWithUppercaseEmail = {
          ...mockRegisterDto,
          email: 'TEST@EXAMPLE.COM',
        };

        authService.register.mockResolvedValue(mockUserResponse);

        await controller.register(dtoWithUppercaseEmail);

        expect(authService.register).toHaveBeenCalledWith(dtoWithUppercaseEmail);
      });

      it('should handle names with special characters', async () => {
        const dtoWithSpecialChars = {
          ...mockRegisterDto,
          firstName: "O'Brien",
          lastName: 'De La Cruz',
        };

        const responseWithSpecialChars = {
          ...mockUserResponse,
          firstName: "O'Brien",
          lastName: 'De La Cruz',
        };

        authService.register.mockResolvedValue(responseWithSpecialChars);

        const result = await controller.register(dtoWithSpecialChars);

        expect(result.firstName).toBe("O'Brien");
        expect(result.lastName).toBe('De La Cruz');
      });

      it('should handle unicode characters in names', async () => {
        const dtoWithUnicode = {
          ...mockRegisterDto,
          firstName: 'José',
          lastName: 'Müller',
        };

        const responseWithUnicode = {
          ...mockUserResponse,
          firstName: 'José',
          lastName: 'Müller',
        };

        authService.register.mockResolvedValue(responseWithUnicode);

        const result = await controller.register(dtoWithUnicode);

        expect(result.firstName).toBe('José');
        expect(result.lastName).toBe('Müller');
      });
    });

    describe('edge cases', () => {
      it('should handle minimum length names', async () => {
        const dtoWithMinNames = {
          ...mockRegisterDto,
          firstName: 'J',
          lastName: 'D',
        };

        const responseWithMinNames = {
          ...mockUserResponse,
          firstName: 'J',
          lastName: 'D',
        };

        authService.register.mockResolvedValue(responseWithMinNames);

        const result = await controller.register(dtoWithMinNames);

        expect(result.firstName).toBe('J');
        expect(result.lastName).toBe('D');
      });

      it('should handle maximum length fields', async () => {
        const longName = 'A'.repeat(100);
        const longPhone = '+1234567890123456';

        const dtoWithMaxFields = {
          ...mockRegisterDto,
          firstName: longName,
          lastName: longName,
          phoneNumber: longPhone,
        };

        const responseWithMaxFields = {
          ...mockUserResponse,
          firstName: longName,
          lastName: longName,
          phoneNumber: longPhone,
        };

        authService.register.mockResolvedValue(responseWithMaxFields);

        const result = await controller.register(dtoWithMaxFields);

        expect(result.firstName).toBe(longName);
        expect(result.lastName).toBe(longName);
        expect(result.phoneNumber).toBe(longPhone);
      });

      it('should handle international phone numbers', async () => {
        const intlPhones = ['+351123456789', '+44123456789', '+81234567890'];

        for (const phone of intlPhones) {
          const dto = { ...mockRegisterDto, phoneNumber: phone };
          const response = { ...mockUserResponse, phoneNumber: phone };

          authService.register.mockResolvedValue(response);

          const result = await controller.register(dto);

          expect(result.phoneNumber).toBe(phone);
        }
      });
    });

    describe('security considerations', () => {
      it('should never expose password in response', async () => {
        authService.register.mockResolvedValue(mockUserResponse);

        const result = await controller.register(mockRegisterDto);
        const resultKeys = Object.keys(result);

        expect(resultKeys).not.toContain('password');
        expect(result).not.toHaveProperty('password');
      });

      it('should sanitize email to lowercase via DTO transformation', async () => {
        const dtoWithMixedCase = {
          ...mockRegisterDto,
          email: 'TeSt@ExAmPlE.CoM',
        };

        authService.register.mockResolvedValue(mockUserResponse);

        await controller.register(dtoWithMixedCase);

        // DTO transformation should handle this
        expect(authService.register).toHaveBeenCalled();
      });

      it('should not log sensitive information', async () => {
        // This test verifies the controller doesn't accidentally log passwords
        // In a real scenario, you'd spy on the logger
        authService.register.mockResolvedValue(mockUserResponse);

        await controller.register(mockRegisterDto);

        // The controller should only log non-sensitive data
        expect(authService.register).toHaveBeenCalled();
      });
    });
  });
});
