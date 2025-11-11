import { PartialType } from '@nestjs/mapped-types';
import { CreateOrganizationDto } from './create-organization.dto';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO for updating an existing organization
 * All fields from CreateOrganizationDto are optional
 */
export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {
  /**
   * Whether the organization is active
   * Setting to false soft-deletes the organization
   */
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
