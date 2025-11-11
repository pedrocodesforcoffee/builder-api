/**
 * Cascade Deletion DTOs
 */

import { IsString, IsOptional, IsBoolean } from 'class-validator';

/**
 * Base deletion options DTO
 */
export class DeletionOptionsDto {
  @IsString()
  @IsOptional()
  reason?: string;

  @IsBoolean()
  @IsOptional()
  softDelete?: boolean;
}

/**
 * User deletion request DTO
 */
export class DeleteUserDto extends DeletionOptionsDto {}

/**
 * Organization deletion request DTO
 */
export class DeleteOrganizationDto extends DeletionOptionsDto {}

/**
 * Project deletion request DTO
 */
export class DeleteProjectDto extends DeletionOptionsDto {}
