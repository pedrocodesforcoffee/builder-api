import { Exclude } from 'class-transformer';

/**
 * User Response DTO
 *
 * Ensures sensitive data (like password) is never exposed in API responses.
 * This is a sanitized version of the User entity for public consumption.
 */
export class UserResponseDto {
  id!: string;
  email!: string;
  firstName!: string;
  lastName!: string;
  phoneNumber?: string;
  role!: string;
  systemRole!: string;
  isActive!: boolean;
  emailVerified!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  /**
   * Password field is explicitly excluded from serialization
   * This provides an additional safety layer beyond entity-level exclusion
   */
  @Exclude()
  password?: string;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
    // Extra safety: delete password if it somehow made it here
    delete this.password;
  }
}
