/**
 * Cascade Restoration DTOs
 */

import { IsString, IsOptional } from 'class-validator';

/**
 * Base restoration options DTO
 */
export class RestorationOptionsDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

/**
 * User restoration request DTO
 */
export class RestoreUserDto extends RestorationOptionsDto {}

/**
 * Organization restoration request DTO
 */
export class RestoreOrganizationDto extends RestorationOptionsDto {}

/**
 * Project restoration request DTO
 */
export class RestoreProjectDto extends RestorationOptionsDto {}
