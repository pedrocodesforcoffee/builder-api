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
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  IncidentSeverity,
  IncidentType,
  InjuryType,
  BodyPart,
  InvestigationStatus,
} from '../enums/safety.enum';

/**
 * DTO for witness information
 */
export class WitnessDto {
  @ApiPropertyOptional({ description: 'Worker ID if witness is a worker' })
  @IsOptional()
  @IsUUID()
  workerId?: string;

  @ApiProperty({ description: 'Witness name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Company' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ description: 'Contact information' })
  @IsOptional()
  @IsString()
  contactInfo?: string;

  @ApiPropertyOptional({ description: 'Witness statement' })
  @IsOptional()
  @IsString()
  statement?: string;
}

/**
 * DTO for creating a safety incident
 */
export class CreateSafetyIncidentDto {
  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'Severity', enum: IncidentSeverity })
  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @ApiProperty({ description: 'Incident type', enum: IncidentType })
  @IsEnum(IncidentType)
  incidentType: IncidentType;

  @ApiProperty({ description: 'Title', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  title: string;

  @ApiProperty({ description: 'Description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Incident date (YYYY-MM-DD)' })
  @IsString()
  incidentDate: string;

  @ApiProperty({ description: 'Incident time (HH:MM:SS)' })
  @IsString()
  incidentTime: string;

  @ApiProperty({ description: 'Location', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  location: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Injured worker ID' })
  @IsOptional()
  @IsUUID()
  injuredWorkerId?: string;

  @ApiPropertyOptional({ description: 'Injured person name (if not a worker)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  injuredPersonName?: string;

  @ApiPropertyOptional({ description: 'Injured person company' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  injuredPersonCompany?: string;

  @ApiPropertyOptional({ description: 'Injury type', enum: InjuryType })
  @IsOptional()
  @IsEnum(InjuryType)
  injuryType?: InjuryType;

  @ApiPropertyOptional({ description: 'Body part affected', enum: BodyPart })
  @IsOptional()
  @IsEnum(BodyPart)
  bodyPartAffected?: BodyPart;

  @ApiPropertyOptional({ description: 'Injury description' })
  @IsOptional()
  @IsString()
  injuryDescription?: string;

  @ApiPropertyOptional({ description: 'Treatment provided' })
  @IsOptional()
  @IsString()
  treatmentProvided?: string;

  @ApiPropertyOptional({ description: 'Medical facility' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  medicalFacility?: string;

  @ApiPropertyOptional({ description: 'Hospital transport required' })
  @IsOptional()
  @IsBoolean()
  hospitalTransport?: boolean;

  @ApiPropertyOptional({ description: 'Witnesses' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WitnessDto)
  witnesses?: WitnessDto[];

  @ApiPropertyOptional({ description: 'Immediate actions taken' })
  @IsOptional()
  @IsString()
  immediateActions?: string;

  @ApiPropertyOptional({ description: 'Work stopped' })
  @IsOptional()
  @IsBoolean()
  workStopped?: boolean;

  @ApiPropertyOptional({ description: 'Equipment involved' })
  @IsOptional()
  @IsString()
  equipmentInvolved?: string;

  @ApiPropertyOptional({ description: 'Weather conditions' })
  @IsOptional()
  @IsString()
  weatherConditions?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @ApiPropertyOptional({ description: 'Supervisor notified ID' })
  @IsOptional()
  @IsUUID()
  supervisorNotifiedId?: string;
}

/**
 * DTO for updating a safety incident
 */
export class UpdateSafetyIncidentDto extends PartialType(
  CreateSafetyIncidentDto
) {
  @ApiPropertyOptional({ description: 'Days away from work' })
  @IsOptional()
  @IsInt()
  @Min(0)
  daysAwayFromWork?: number;

  @ApiPropertyOptional({ description: 'Days restricted work' })
  @IsOptional()
  @IsInt()
  @Min(0)
  daysRestrictedWork?: number;

  @ApiPropertyOptional({ description: 'Return to work date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  returnToWorkDate?: string;

  @ApiPropertyOptional({ description: 'Is OSHA recordable' })
  @IsOptional()
  @IsBoolean()
  isOshaRecordable?: boolean;

  @ApiPropertyOptional({ description: 'Is OSHA reportable' })
  @IsOptional()
  @IsBoolean()
  isOshaReportable?: boolean;

  @ApiPropertyOptional({ description: 'OSHA reported date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  oshaReportedDate?: string;

  @ApiPropertyOptional({ description: 'OSHA log number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  oshaLogNumber?: string;
}

/**
 * DTO for creating an incident investigation
 */
export class CreateInvestigationDto {
  @ApiProperty({ description: 'Incident ID' })
  @IsUUID()
  incidentId: string;

  @ApiPropertyOptional({ description: 'Investigation start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  investigationStartDate?: string;

  @ApiPropertyOptional({ description: 'Investigator ID' })
  @IsOptional()
  @IsUUID()
  investigatorId?: string;

  @ApiPropertyOptional({ description: 'Investigation team' })
  @IsOptional()
  @IsArray()
  investigationTeam?: Array<{
    userId: string;
    name: string;
    role: string;
  }>;
}

/**
 * DTO for updating an incident investigation
 */
export class UpdateInvestigationDto extends PartialType(CreateInvestigationDto) {
  @ApiPropertyOptional({ description: 'Status', enum: InvestigationStatus })
  @IsOptional()
  @IsEnum(InvestigationStatus)
  status?: InvestigationStatus;

  @ApiPropertyOptional({ description: 'Investigation completed date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  investigationCompletedDate?: string;

  @ApiPropertyOptional({ description: 'Facts summary' })
  @IsOptional()
  @IsString()
  factsSummary?: string;

  @ApiPropertyOptional({ description: 'Sequence of events' })
  @IsOptional()
  @IsString()
  sequenceOfEvents?: string;

  @ApiPropertyOptional({ description: 'Root cause analysis' })
  @IsOptional()
  @IsString()
  rootCauseAnalysis?: string;

  @ApiPropertyOptional({ description: 'Immediate corrective actions' })
  @IsOptional()
  @IsString()
  immediateCorrectiveActions?: string;

  @ApiPropertyOptional({ description: 'Recommendations' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recommendations?: string[];

  @ApiPropertyOptional({ description: 'Prevention strategy' })
  @IsOptional()
  @IsString()
  preventionStrategy?: string;

  @ApiPropertyOptional({ description: 'Findings summary' })
  @IsOptional()
  @IsString()
  findingsSummary?: string;

  @ApiPropertyOptional({ description: 'Conclusion and recommendations' })
  @IsOptional()
  @IsString()
  conclusionRecommendations?: string;

  @ApiPropertyOptional({ description: 'Training required' })
  @IsOptional()
  @IsBoolean()
  trainingRequired?: boolean;

  @ApiPropertyOptional({ description: 'Training description' })
  @IsOptional()
  @IsString()
  trainingDescription?: string;

  @ApiPropertyOptional({ description: 'Policy change required' })
  @IsOptional()
  @IsBoolean()
  policyChangeRequired?: boolean;

  @ApiPropertyOptional({ description: 'Policy change description' })
  @IsOptional()
  @IsString()
  policyChangeDescription?: string;
}

/**
 * DTO for querying incidents
 */
export class QueryIncidentsDto {
  @ApiPropertyOptional({ description: 'Project ID filter' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Severity filter', enum: IncidentSeverity })
  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;

  @ApiPropertyOptional({ description: 'Incident type filter', enum: IncidentType })
  @IsOptional()
  @IsEnum(IncidentType)
  incidentType?: IncidentType;

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'OSHA recordable only' })
  @IsOptional()
  @IsBoolean()
  oshaRecordableOnly?: boolean;

  @ApiPropertyOptional({ description: 'OSHA reportable only' })
  @IsOptional()
  @IsBoolean()
  oshaReportableOnly?: boolean;

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
 * Response DTO for safety incident
 */
export class SafetyIncidentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  incidentNumber: string;

  @ApiProperty()
  projectId: string;

  @ApiPropertyOptional()
  project?: {
    id: string;
    name: string;
    number: string;
  };

  @ApiProperty({ enum: IncidentSeverity })
  severity: IncidentSeverity;

  @ApiProperty({ enum: IncidentType })
  incidentType: IncidentType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  incidentDate: Date;

  @ApiProperty()
  incidentTime: string;

  @ApiProperty()
  location: string;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiPropertyOptional()
  injuredWorkerId?: string;

  @ApiPropertyOptional()
  injuredWorker?: {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    fullName: string;
    trade: string;
  };

  @ApiPropertyOptional()
  injuredPersonName?: string;

  @ApiPropertyOptional()
  injuredPersonCompany?: string;

  @ApiPropertyOptional({ enum: InjuryType })
  injuryType?: InjuryType;

  @ApiPropertyOptional({ enum: BodyPart })
  bodyPartAffected?: BodyPart;

  @ApiPropertyOptional()
  injuryDescription?: string;

  @ApiPropertyOptional()
  treatmentProvided?: string;

  @ApiPropertyOptional()
  medicalFacility?: string;

  @ApiProperty()
  hospitalTransport: boolean;

  @ApiProperty()
  daysAwayFromWork: number;

  @ApiProperty()
  daysRestrictedWork: number;

  @ApiPropertyOptional()
  returnToWorkDate?: Date;

  @ApiProperty()
  isOshaRecordable: boolean;

  @ApiProperty()
  isOshaReportable: boolean;

  @ApiPropertyOptional()
  oshaReportedDate?: Date;

  @ApiPropertyOptional()
  oshaLogNumber?: string;

  @ApiPropertyOptional()
  witnesses?: any[];

  @ApiPropertyOptional()
  immediateActions?: string;

  @ApiProperty()
  workStopped: boolean;

  @ApiPropertyOptional()
  equipmentInvolved?: string;

  @ApiPropertyOptional()
  weatherConditions?: string;

  @ApiPropertyOptional()
  additionalNotes?: string;

  @ApiProperty()
  reportedById: string;

  @ApiPropertyOptional()
  reportedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
  };

  @ApiProperty()
  reportedAt: Date;

  @ApiPropertyOptional()
  supervisorNotifiedId?: string;

  @ApiPropertyOptional()
  supervisorNotified?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };

  @ApiPropertyOptional()
  supervisorNotifiedAt?: Date;

  @ApiPropertyOptional()
  investigation?: InvestigationResponseDto;

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
 * Response DTO for incident investigation
 */
export class InvestigationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  incidentId: string;

  @ApiProperty({ enum: InvestigationStatus })
  status: InvestigationStatus;

  @ApiPropertyOptional()
  investigationStartDate?: Date;

  @ApiPropertyOptional()
  investigationCompletedDate?: Date;

  @ApiPropertyOptional()
  investigatorId?: string;

  @ApiPropertyOptional()
  investigator?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };

  @ApiPropertyOptional()
  investigationTeam?: any[];

  @ApiPropertyOptional()
  factsSummary?: string;

  @ApiPropertyOptional()
  sequenceOfEvents?: string;

  @ApiPropertyOptional()
  rootCauseAnalysis?: string;

  @ApiPropertyOptional()
  immediateCorrectiveActions?: string;

  @ApiPropertyOptional()
  recommendations?: string[];

  @ApiPropertyOptional()
  preventionStrategy?: string;

  @ApiPropertyOptional()
  findingsSummary?: string;

  @ApiPropertyOptional()
  conclusionRecommendations?: string;

  @ApiProperty()
  trainingRequired: boolean;

  @ApiPropertyOptional()
  trainingDescription?: string;

  @ApiProperty()
  policyChangeRequired: boolean;

  @ApiPropertyOptional()
  policyChangeDescription?: string;

  @ApiPropertyOptional()
  reviewedById?: string;

  @ApiPropertyOptional()
  reviewedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };

  @ApiPropertyOptional()
  reviewedAt?: Date;

  @ApiPropertyOptional()
  approvedById?: string;

  @ApiPropertyOptional()
  approvedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };

  @ApiPropertyOptional()
  approvedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
