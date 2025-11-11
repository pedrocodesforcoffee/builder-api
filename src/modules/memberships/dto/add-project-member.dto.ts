import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsDateString,
  IsString,
  IsBoolean,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectRole } from '../../users/enums/project-role.enum';
import { UserScope } from '../../permissions/types/scope.types';

/**
 * DTO for adding project member
 */
export class AddProjectMemberDto {
  @IsUUID()
  userId!: string;

  @IsEnum(ProjectRole)
  role!: ProjectRole;

  @IsObject()
  @IsOptional()
  scope?: UserScope;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @IsOptional()
  expirationReason?: string;

  @IsBoolean()
  @IsOptional()
  sendNotification?: boolean = true;
}
