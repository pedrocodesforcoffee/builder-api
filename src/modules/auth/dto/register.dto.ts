import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsStrongPassword } from '../validators/password.validator';

/**
 * Data Transfer Object for user registration
 *
 * Validates and sanitizes all input fields for the registration endpoint.
 *
 * Security features:
 * - Email normalized to lowercase
 * - Names trimmed of whitespace
 * - Strong password requirements enforced
 * - International phone numbers supported
 */
export class RegisterDto {
  /**
   * User's email address
   * - Must be valid email format
   * - Automatically converted to lowercase
   * - Maximum 255 characters
   * - Will be checked for uniqueness in service layer
   */
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  @Transform(({ value }) => (value ? value.toLowerCase().trim() : value))
  email!: string;

  /**
   * User's password (will be hashed before storage)
   * - Minimum 8 characters
   * - Maximum 128 characters
   * - Must contain uppercase, lowercase, number, and special character
   * - Cannot contain email address
   * - No leading or trailing spaces
   */
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @IsStrongPassword()
  password!: string;

  /**
   * User's first name
   * - Required field
   * - 1-100 characters
   * - Automatically trimmed
   * - Supports Unicode characters for international names
   */
  @IsNotEmpty({ message: 'First name is required' })
  @IsString({ message: 'First name must be a string' })
  @MinLength(1, { message: 'First name must be at least 1 character' })
  @MaxLength(100, { message: 'First name must not exceed 100 characters' })
  @Transform(({ value }) => (value ? value.trim() : value))
  firstName!: string;

  /**
   * User's last name
   * - Required field
   * - 1-100 characters
   * - Automatically trimmed
   * - Supports Unicode characters for international names
   */
  @IsNotEmpty({ message: 'Last name is required' })
  @IsString({ message: 'Last name must be a string' })
  @MinLength(1, { message: 'Last name must be at least 1 character' })
  @MaxLength(100, { message: 'Last name must not exceed 100 characters' })
  @Transform(({ value }) => (value ? value.trim() : value))
  lastName!: string;

  /**
   * User's phone number (optional)
   * - Must match international format if provided
   * - E.164 format recommended (e.g., +1234567890)
   * - Maximum 20 characters
   */
  @IsOptional()
  @IsString({ message: 'Phone number must be a string' })
  @MaxLength(20, { message: 'Phone number must not exceed 20 characters' })
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message:
      'Phone number must be in valid international format (E.164), e.g., +1234567890',
  })
  phoneNumber?: string;
}
