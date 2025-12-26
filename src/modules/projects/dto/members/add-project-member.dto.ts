import { IsString, IsEmail, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProjectRole } from '../../../users/enums/project-role.enum';

/**
 * DTO for adding a project member
 * Supports adding by either userId or email
 */
export class AddProjectMemberDto {
  /**
   * User ID (if known)
   * Either userId or email must be provided
   */
  @ApiProperty({
    description: 'User ID to add to the project',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsString()
  @IsOptional()
  userId?: string;

  /**
   * User email (alternative to userId)
   * Will look up the user by email if userId is not provided
   */
  @ApiProperty({
    description: 'Email address of the user to add to the project',
    example: 'user@example.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  /**
   * Role to assign to the project member
   */
  @ApiProperty({
    description: 'Role to assign to the project member',
    enum: ProjectRole,
    example: ProjectRole.VIEWER,
  })
  @IsEnum(ProjectRole)
  role!: ProjectRole;
}
