import {
  IsString,
  IsEmail,
  IsEnum,
  IsArray,
  IsOptional,
  IsBoolean,
  IsInt,
  IsDate,
  IsUUID,
  IsObject,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ProjectRole,
  DocumentAction,
  PermissionTargetType,
} from '../enums/permission.enums';
import { DrawingDiscipline } from '../enums';

/**
 * Project Member DTOs
 */

export class AddProjectMemberDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEmail()
  inviteEmail?: string;

  @IsArray()
  @IsEnum(ProjectRole, { each: true })
  @ArrayMinSize(1)
  roles!: ProjectRole[];

  @IsOptional()
  @IsArray()
  @IsEnum(DrawingDiscipline, { each: true })
  disciplines?: DrawingDiscipline[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  accessExpiresAt?: Date;
}

export class UpdateMemberRolesDto {
  @IsArray()
  @IsEnum(ProjectRole, { each: true })
  @ArrayMinSize(1)
  roles!: ProjectRole[];

  @IsOptional()
  @IsArray()
  @IsEnum(DrawingDiscipline, { each: true })
  disciplines?: DrawingDiscipline[];
}

/**
 * Document Permission DTOs
 */

export class GrantDocumentPermissionDto {
  @IsUUID()
  userId!: string;

  @IsArray()
  @IsEnum(DocumentAction, { each: true })
  @ArrayMinSize(1)
  actions!: DocumentAction[];

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * Folder Permission DTOs
 */

export class GrantFolderPermissionDto {
  @IsEnum(PermissionTargetType)
  targetType!: PermissionTargetType;

  @IsOptional()
  @IsEnum(ProjectRole)
  role?: ProjectRole;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  company?: string;

  @IsArray()
  @IsEnum(DocumentAction, { each: true })
  @ArrayMinSize(1)
  actions!: DocumentAction[];

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;
}

/**
 * Document Restriction DTOs
 */

export class SetDocumentRestrictionsDto {
  @IsOptional()
  @IsBoolean()
  denyDownload?: boolean;

  @IsOptional()
  @IsBoolean()
  denyPrint?: boolean;

  @IsOptional()
  @IsBoolean()
  requireWatermark?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIpRanges?: string[];

  @IsOptional()
  @IsBoolean()
  inheritFromFolder?: boolean;
}

/**
 * Share Link DTOs
 */

export class WatermarkSettingsDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsBoolean()
  includeRecipientEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  includeAccessDate?: boolean;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @Min(0)
  @Max(1)
  opacity?: number;
}

export class CreateShareLinkDto {
  @IsUUID()
  documentId!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsBoolean()
  requireEmail?: boolean;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  allowedEmails?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  maxDownloads?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIpRanges?: string[];

  @IsOptional()
  @IsBoolean()
  allowDownload?: boolean;

  @IsOptional()
  @IsBoolean()
  allowPrint?: boolean;

  @IsOptional()
  @IsBoolean()
  watermarkEnabled?: boolean;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WatermarkSettingsDto)
  watermarkSettings?: WatermarkSettingsDto;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  recipientName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  recipientCompany?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  purpose?: string;

  @IsOptional()
  @IsBoolean()
  notifyOnAccess?: boolean;

  @IsDate()
  @Type(() => Date)
  expiresAt!: Date;
}

export class UpdateShareLinkDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsBoolean()
  requireEmail?: boolean;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  allowedEmails?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  maxDownloads?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIpRanges?: string[];

  @IsOptional()
  @IsBoolean()
  allowDownload?: boolean;

  @IsOptional()
  @IsBoolean()
  allowPrint?: boolean;

  @IsOptional()
  @IsBoolean()
  watermarkEnabled?: boolean;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WatermarkSettingsDto)
  watermarkSettings?: WatermarkSettingsDto;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;

  @IsOptional()
  @IsBoolean()
  notifyOnAccess?: boolean;
}

export class AccessShareLinkDto {
  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

/**
 * Transmittal DTOs
 */

export class CreateTransmittalDto {
  @IsString()
  @MaxLength(255)
  subject!: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsBoolean()
  responseRequired?: boolean;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  responseDueDate?: Date;

  @IsOptional()
  @IsBoolean()
  watermarkDownloads?: boolean;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;

  @IsOptional()
  @IsBoolean()
  includeCoverSheet?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  coverSheetTemplate?: string;
}

export class AddTransmittalDocumentsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  documentIds!: string[];
}

export class ManualRecipientDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  company?: string;
}

export class AddTransmittalRecipientsDto {
  @IsOptional()
  @IsUUID()
  distributionListId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualRecipientDto)
  manualRecipients?: ManualRecipientDto[];
}

export class AcknowledgeTransmittalDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

/**
 * Distribution List DTOs
 */

export class AutoIncludeCriteriaDto {
  @IsOptional()
  @IsArray()
  @IsEnum(ProjectRole, { each: true })
  roles?: ProjectRole[];

  @IsOptional()
  @IsArray()
  @IsEnum(DrawingDiscipline, { each: true })
  disciplines?: DrawingDiscipline[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  companies?: string[];
}

export class CreateDistributionListDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AutoIncludeCriteriaDto)
  autoIncludeCriteria?: AutoIncludeCriteriaDto;
}

export class DistributionListMemberDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  company?: string;
}

export class AddDistributionListMembersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DistributionListMemberDto)
  @ArrayMinSize(1)
  members!: DistributionListMemberDto[];
}

/**
 * Response DTOs
 */

export class ProjectMemberResponseDto {
  id!: string;
  projectId!: string;
  userId?: string;
  inviteEmail?: string;
  roles!: ProjectRole[];
  disciplines?: DrawingDiscipline[];
  company?: string;
  title?: string;
  status!: string;
  accessExpiresAt?: Date;
  joinedAt?: Date;
  createdAt!: Date;
}

export class ShareLinkResponseDto {
  id!: string;
  documentId!: string;
  shortCode!: string;
  requireEmail!: boolean;
  allowedEmails?: string[];
  maxDownloads?: number;
  downloadCount!: number;
  allowDownload!: boolean;
  allowPrint!: boolean;
  watermarkEnabled!: boolean;
  recipientName?: string;
  recipientCompany?: string;
  purpose?: string;
  status!: string;
  expiresAt!: Date;
  accessCount!: number;
  lastAccessedAt?: Date;
  createdAt!: Date;
}

export class ShareLinkStatsResponseDto {
  accessCount!: number;
  downloadCount!: number;
  lastAccessedAt?: Date;
  status!: string;
  daysUntilExpiration!: number;
}

export class TransmittalResponseDto {
  id!: string;
  projectId!: string;
  transmittalNumber!: string;
  subject!: string;
  message?: string;
  status!: string;
  responseRequired!: boolean;
  responseDueDate?: Date;
  watermarkDownloads!: boolean;
  expiresAt?: Date;
  documents!: any[];
  recipients!: any[];
  sentAt?: Date;
  createdAt!: Date;
}

export class DistributionListResponseDto {
  id!: string;
  projectId!: string;
  name!: string;
  description?: string;
  autoIncludeCriteria?: any;
  members!: any[];
  createdAt!: Date;
}
