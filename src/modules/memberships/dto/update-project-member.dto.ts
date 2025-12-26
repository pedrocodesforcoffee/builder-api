import {
  IsEnum,
  IsOptional,
  IsDateString,
  IsString,
  IsObject,
} from 'class-validator';
import { ProjectRole } from '../../users/enums/project-role.enum';
import { UserScope } from '../../permissions/types/scope.types';

/**
 * DTO for updating project member
 */
export class UpdateProjectMemberDto {
  @IsEnum(ProjectRole)
  @IsOptional()
  role?: ProjectRole;

  @IsObject()
  @IsOptional()
  scope?: UserScope | null;

  @IsDateString()
  @IsOptional()
  expiresAt?: string | null;

  @IsString()
  @IsOptional()
  expirationReason?: string | null;
}
