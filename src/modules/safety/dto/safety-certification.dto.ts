import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  Min,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CertificationType,
  CertificationStatus,
} from '../enums/safety.enum';

/**
 * DTO for creating a safety certification template
 */
export class CreateSafetyCertificationDto {
  @ApiProperty({ description: 'Certification type', enum: CertificationType })
  @IsEnum(CertificationType)
  certificationType: CertificationType;

  @ApiProperty({ description: 'Certification name', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Issuing organization' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  issuingOrganization?: string;

  @ApiPropertyOptional({ description: 'Validity period in months' })
  @IsOptional()
  @IsInt()
  @Min(1)
  validityPeriodMonths?: number;

  @ApiPropertyOptional({ description: 'Requires renewal' })
  @IsOptional()
  @IsBoolean()
  requiresRenewal?: boolean;

  @ApiPropertyOptional({ description: 'Renewal reminder days before expiration' })
  @IsOptional()
  @IsInt()
  @Min(1)
  renewalReminderDays?: number;

  @ApiPropertyOptional({ description: 'Requirements' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for updating a safety certification template
 */
export class UpdateSafetyCertificationDto extends PartialType(
  CreateSafetyCertificationDto
) {
  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for assigning a certification to a worker
 */
export class AssignCertificationDto {
  @ApiProperty({ description: 'Worker ID' })
  @IsUUID()
  workerId: string;

  @ApiProperty({ description: 'Certification ID' })
  @IsUUID()
  certificationId: string;

  @ApiPropertyOptional({ description: 'Certification number' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  certificationNumber?: string;

  @ApiProperty({ description: 'Issue date (YYYY-MM-DD)' })
  @IsString()
  issueDate: string;

  @ApiPropertyOptional({ description: 'Expiration date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  expirationDate?: string;

  @ApiPropertyOptional({ description: 'Issuing organization' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  issuingOrganization?: string;

  @ApiPropertyOptional({ description: 'Instructor name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  instructorName?: string;

  @ApiPropertyOptional({ description: 'Certificate URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  certificateUrl?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for updating a worker certification
 */
export class UpdateWorkerCertificationDto extends PartialType(
  AssignCertificationDto
) {
  @ApiPropertyOptional({ description: 'Status', enum: CertificationStatus })
  @IsOptional()
  @IsEnum(CertificationStatus)
  status?: CertificationStatus;

  @ApiPropertyOptional({ description: 'Renewal date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  renewalDate?: string;
}

/**
 * DTO for querying certifications
 */
export class QueryCertificationsDto {
  @ApiPropertyOptional({ description: 'Certification type filter', enum: CertificationType })
  @IsOptional()
  @IsEnum(CertificationType)
  certificationType?: CertificationType;

  @ApiPropertyOptional({ description: 'Active only' })
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

/**
 * DTO for querying worker certifications
 */
export class QueryWorkerCertificationsDto {
  @ApiPropertyOptional({ description: 'Worker ID filter' })
  @IsOptional()
  @IsUUID()
  workerId?: string;

  @ApiPropertyOptional({ description: 'Certification ID filter' })
  @IsOptional()
  @IsUUID()
  certificationId?: string;

  @ApiPropertyOptional({ description: 'Certification type filter', enum: CertificationType })
  @IsOptional()
  @IsEnum(CertificationType)
  certificationType?: CertificationType;

  @ApiPropertyOptional({ description: 'Status filter', enum: CertificationStatus })
  @IsOptional()
  @IsEnum(CertificationStatus)
  status?: CertificationStatus;

  @ApiPropertyOptional({ description: 'Expiring soon only (within 30 days)' })
  @IsOptional()
  @IsBoolean()
  expiringSoonOnly?: boolean;

  @ApiPropertyOptional({ description: 'Expired only' })
  @IsOptional()
  @IsBoolean()
  expiredOnly?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

/**
 * Response DTO for safety certification template
 */
export class SafetyCertificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: CertificationType })
  certificationType: CertificationType;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  issuingOrganization?: string;

  @ApiPropertyOptional()
  validityPeriodMonths?: number;

  @ApiProperty()
  requiresRenewal: boolean;

  @ApiPropertyOptional()
  renewalReminderDays?: number;

  @ApiPropertyOptional()
  requirements?: string[];

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  createdById: string;

  @ApiPropertyOptional()
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
  };
}

/**
 * Response DTO for worker certification
 */
export class WorkerCertificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workerId: string;

  @ApiPropertyOptional()
  worker?: {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    fullName: string;
    trade: string;
    email: string;
  };

  @ApiProperty()
  certificationId: string;

  @ApiPropertyOptional()
  certification?: SafetyCertificationResponseDto;

  @ApiPropertyOptional()
  certificationNumber?: string;

  @ApiProperty()
  issueDate: Date;

  @ApiPropertyOptional()
  expirationDate?: Date;

  @ApiProperty({ enum: CertificationStatus })
  status: CertificationStatus;

  @ApiPropertyOptional()
  issuingOrganization?: string;

  @ApiPropertyOptional()
  instructorName?: string;

  @ApiPropertyOptional()
  certificateUrl?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  renewalDate?: Date;

  @ApiProperty()
  renewalNotificationSent: boolean;

  @ApiPropertyOptional()
  renewalNotificationSentAt?: Date;

  @ApiPropertyOptional()
  verifiedById?: string;

  @ApiPropertyOptional()
  verifiedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };

  @ApiPropertyOptional()
  verifiedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  createdById: string;

  @ApiPropertyOptional()
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
  };
}
