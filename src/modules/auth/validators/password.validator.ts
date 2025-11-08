import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Password validation constraint
 *
 * Enforces strong password requirements:
 * - Minimum 8 characters
 * - Maximum 128 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - No leading or trailing spaces
 */
@ValidatorConstraint({ name: 'IsStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string, args: ValidationArguments): boolean {
    if (!password || typeof password !== 'string') {
      return false;
    }

    // Check length
    if (password.length < 8 || password.length > 128) {
      return false;
    }

    // Check for leading or trailing spaces
    if (password !== password.trim()) {
      return false;
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return false;
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return false;
    }

    // Check for at least one number
    if (!/[0-9]/.test(password)) {
      return false;
    }

    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
      return false;
    }

    // Additional check: password should not contain the email if provided
    const object = args.object as any;
    if (object.email && password.toLowerCase().includes(object.email.toLowerCase())) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const password = args.value as string;

    if (!password) {
      return 'Password is required';
    }

    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }

    if (password.length > 128) {
      return 'Password must not exceed 128 characters';
    }

    if (password !== password.trim()) {
      return 'Password cannot have leading or trailing spaces';
    }

    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }

    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }

    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }

    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
      return 'Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)';
    }

    const object = args.object as any;
    if (object.email && password.toLowerCase().includes(object.email.toLowerCase())) {
      return 'Password cannot contain your email address';
    }

    return 'Password does not meet security requirements';
  }
}

/**
 * Custom decorator for strong password validation
 *
 * @param validationOptions - Optional validation options
 *
 * @example
 * ```typescript
 * class RegisterDto {
 *   @IsStrongPassword()
 *   password: string;
 * }
 * ```
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
