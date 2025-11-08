import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Data Transfer Object for user login
 *
 * Validates and sanitizes input fields for the login endpoint.
 *
 * Security features:
 * - Email normalized to lowercase
 * - Simple validation (no password complexity check on login)
 * - Input sanitization
 */
export class LoginDto {
  /**
   * User's email address
   * - Must be valid email format
   * - Automatically converted to lowercase
   */
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }) => (value ? value.toLowerCase().trim() : value))
  email!: string;

  /**
   * User's password
   * - Required field
   * - No complexity validation on login (validated on registration)
   */
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  password!: string;
}
