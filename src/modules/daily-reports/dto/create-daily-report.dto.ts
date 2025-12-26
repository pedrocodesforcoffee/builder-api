import { Type } from 'class-transformer';
import {
  IsUUID,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DailyReportStatus,
  WeatherCondition,
  WorkImpact,
  DelayType,
  IncidentType,
  IncidentSeverity,
  InspectionResult,
} from '../enums/daily-report.enum';

// ========================================
// Nested DTOs for Child Entities
// ========================================

export class CreateDailyManpowerDto {
  @ApiProperty({ description: 'Trade name (e.g., Electricians, Plumbers)' })
  @IsString()
  @MaxLength(100)
  tradeName: string;

  @ApiProperty({ description: 'Company name' })
  @IsString()
  @MaxLength(255)
  companyName: string;

  @ApiPropertyOptional({ description: 'Subcontractor ID if in system' })
  @IsUUID()
  @IsOptional()
  subcontractorId?: string;

  @ApiProperty({ description: 'Number of workers' })
  @IsInt()
  @Min(0)
  headcount: number;

  @ApiProperty({ description: 'Regular hours worked per person' })
  @IsNumber()
  @Min(0)
  hoursWorked: number;

  @ApiPropertyOptional({ description: 'Overtime hours worked per person' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  overtimeHours?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Cost code for tracking' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  costCode?: string;
}

export class CreateDailyEquipmentDto {
  @ApiProperty({ description: 'Equipment name or description' })
  @IsString()
  @MaxLength(255)
  equipmentName: string;

  @ApiPropertyOptional({ description: 'Equipment ID if tracked in system' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  equipmentId?: string;

  @ApiPropertyOptional({ description: 'Quantity of equipment', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiProperty({ description: 'Hours equipment was in use' })
  @IsNumber()
  @Min(0)
  hoursUsed: number;

  @ApiPropertyOptional({ description: 'Hours equipment was idle' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  idleHours?: number;

  @ApiPropertyOptional({ description: 'Name of equipment operator' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  operatorName?: string;

  @ApiPropertyOptional({ description: 'Rental company if applicable' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  rentalCompany?: string;

  @ApiPropertyOptional({ description: 'Is this rented equipment?' })
  @IsBoolean()
  @IsOptional()
  isRental?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Cost code for tracking' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  costCode?: string;
}

export class CreateDailyWorkDto {
  @ApiProperty({ description: 'Location of work (Building, Floor, Area)' })
  @IsString()
  @MaxLength(255)
  location: string;

  @ApiPropertyOptional({ description: 'CSI spec section' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  specSection?: string;

  @ApiProperty({ description: 'Description of work activity performed' })
  @IsString()
  activity: string;

  @ApiPropertyOptional({ description: 'Percent complete (0-100)' })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  percentComplete?: number;

  @ApiPropertyOptional({ description: 'Issues or problems encountered' })
  @IsString()
  @IsOptional()
  issues?: string;

  @ApiPropertyOptional({ description: 'Trade performing the work' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  tradeName?: string;

  @ApiPropertyOptional({ description: 'Cost code for tracking' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  costCode?: string;

  @ApiPropertyOptional({ description: 'Photo/document IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  photoIds?: string[];
}

export class CreateDailyMaterialDto {
  @ApiProperty({ description: 'Material name or description' })
  @IsString()
  @MaxLength(255)
  materialName: string;

  @ApiProperty({ description: 'Quantity of material' })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ description: 'Unit of measure (CY, LF, SF, EA, etc.)' })
  @IsString()
  @MaxLength(50)
  unit: string;

  @ApiPropertyOptional({ description: 'Supplier name' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  supplier?: string;

  @ApiPropertyOptional({ description: 'Delivery ticket number' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  deliveryTicket?: string;

  @ApiPropertyOptional({ description: 'Was this a delivery?' })
  @IsBoolean()
  @IsOptional()
  isDelivery?: boolean;

  @ApiPropertyOptional({ description: 'Was this material installed today?' })
  @IsBoolean()
  @IsOptional()
  isInstalled?: boolean;

  @ApiPropertyOptional({ description: 'Where material is stored on site' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  storageLocation?: string;

  @ApiPropertyOptional({ description: 'Cost code for tracking' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  costCode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateDailyInspectionDto {
  @ApiProperty({ description: 'Type of inspection (Structural, Electrical, etc.)' })
  @IsString()
  @MaxLength(255)
  inspectionType: string;

  @ApiProperty({ description: 'Name of inspector' })
  @IsString()
  @MaxLength(255)
  inspectorName: string;

  @ApiPropertyOptional({ description: 'Inspector company name' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  inspectorCompany?: string;

  @ApiPropertyOptional({ description: 'Authority Having Jurisdiction (AHJ) name' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  inspectionAgency?: string;

  @ApiPropertyOptional({ enum: InspectionResult, description: 'Inspection result' })
  @IsEnum(InspectionResult)
  @IsOptional()
  result?: InspectionResult;

  @ApiPropertyOptional({ description: 'Permit number if applicable' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  permitNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Items that failed inspection' })
  @IsString()
  @IsOptional()
  failedItems?: string;

  @ApiPropertyOptional({ description: 'Re-inspection date if failed' })
  @IsDateString()
  @IsOptional()
  reinspectionDate?: string;
}

export class CreateDailyIncidentDto {
  @ApiProperty({ enum: IncidentType, description: 'Type of incident' })
  @IsEnum(IncidentType)
  type: IncidentType;

  @ApiProperty({ enum: IncidentSeverity, description: 'Severity of incident' })
  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @ApiProperty({ description: 'Description of what happened' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Time incident occurred (HH:mm format)' })
  @IsString()
  @IsOptional()
  incidentTime?: string;

  @ApiPropertyOptional({ description: 'Location where incident occurred' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'Name of injured party' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  injuredParty?: string;

  @ApiPropertyOptional({ description: 'Description of injury' })
  @IsString()
  @IsOptional()
  injuryDescription?: string;

  @ApiPropertyOptional({ description: 'Medical treatment provided' })
  @IsString()
  @IsOptional()
  medicalTreatment?: string;

  @ApiPropertyOptional({ description: 'Is this OSHA recordable?' })
  @IsBoolean()
  @IsOptional()
  oshaRecordable?: boolean;

  @ApiPropertyOptional({ description: 'Did this result in lost time?' })
  @IsBoolean()
  @IsOptional()
  lostTime?: boolean;

  @ApiPropertyOptional({ description: 'Names of witnesses' })
  @IsString()
  @IsOptional()
  witnesses?: string;

  @ApiPropertyOptional({ description: 'Immediate action taken' })
  @IsString()
  @IsOptional()
  immediateAction?: string;

  @ApiPropertyOptional({ description: 'Who was incident reported to?' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  reportedTo?: string;

  @ApiPropertyOptional({ description: 'Photo/document IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  photoIds?: string[];
}

export class CreateDailyVisitorDto {
  @ApiProperty({ description: 'Visitor name' })
  @IsString()
  @MaxLength(255)
  visitorName: string;

  @ApiPropertyOptional({ description: 'Visitor company' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  company?: string;

  @ApiPropertyOptional({ description: 'Purpose of visit' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  purpose?: string;

  @ApiPropertyOptional({ description: 'Time visitor arrived (HH:mm format)' })
  @IsString()
  @IsOptional()
  timeIn?: string;

  @ApiPropertyOptional({ description: 'Time visitor departed (HH:mm format)' })
  @IsString()
  @IsOptional()
  timeOut?: string;

  @ApiPropertyOptional({ description: 'Did visitor receive safety orientation?' })
  @IsBoolean()
  @IsOptional()
  safetyOrientation?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateDailyDelayDto {
  @ApiProperty({ enum: DelayType, description: 'Type of delay' })
  @IsEnum(DelayType)
  type: DelayType;

  @ApiProperty({ description: 'Description of delay' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Hours of work lost' })
  @IsNumber()
  @Min(0)
  hoursLost: number;

  @ApiProperty({ enum: WorkImpact, description: 'Impact on work' })
  @IsEnum(WorkImpact)
  impact: WorkImpact;

  @ApiPropertyOptional({ description: 'Trades affected by delay' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  affectedTrades?: string[];

  @ApiPropertyOptional({ description: 'Party responsible for delay' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  responsibleParty?: string;

  @ApiPropertyOptional({ description: 'Is this a potential claim?' })
  @IsBoolean()
  @IsOptional()
  potentialClaim?: boolean;

  @ApiPropertyOptional({ description: 'Mitigation actions taken' })
  @IsString()
  @IsOptional()
  mitigation?: string;
}

// ========================================
// Main Create Daily Report DTO
// ========================================

export class CreateDailyReportDto {
  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'Report date (YYYY-MM-DD)' })
  @IsDateString()
  reportDate: string;

  // ========================================
  // Weather Section
  // ========================================
  @ApiPropertyOptional({ enum: WeatherCondition, description: 'Morning weather condition' })
  @IsEnum(WeatherCondition)
  @IsOptional()
  weatherConditionAm?: WeatherCondition;

  @ApiPropertyOptional({ enum: WeatherCondition, description: 'Afternoon weather condition' })
  @IsEnum(WeatherCondition)
  @IsOptional()
  weatherConditionPm?: WeatherCondition;

  @ApiPropertyOptional({ description: 'High temperature in Fahrenheit' })
  @IsNumber()
  @IsOptional()
  temperatureHigh?: number;

  @ApiPropertyOptional({ description: 'Low temperature in Fahrenheit' })
  @IsNumber()
  @IsOptional()
  temperatureLow?: number;

  @ApiPropertyOptional({ description: 'Precipitation in inches' })
  @IsNumber()
  @IsOptional()
  precipitationInches?: number;

  @ApiPropertyOptional({ description: 'Wind speed in mph' })
  @IsNumber()
  @IsOptional()
  windSpeedMph?: number;

  @ApiPropertyOptional({ description: 'Humidity percentage (0-100)' })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  humidity?: number;

  @ApiPropertyOptional({ enum: WorkImpact, description: 'Weather impact on work' })
  @IsEnum(WorkImpact)
  @IsOptional()
  weatherImpact?: WorkImpact;

  @ApiPropertyOptional({ description: 'Additional weather notes' })
  @IsString()
  @IsOptional()
  weatherNotes?: string;

  // ========================================
  // Work Summary Section
  // ========================================
  @ApiPropertyOptional({ description: 'Summary of work performed today' })
  @IsString()
  @IsOptional()
  workSummary?: string;

  @ApiPropertyOptional({ description: 'General notes about the day' })
  @IsString()
  @IsOptional()
  generalNotes?: string;

  @ApiPropertyOptional({ description: 'Plan for tomorrow' })
  @IsString()
  @IsOptional()
  tomorrowPlan?: string;

  // ========================================
  // Nested Arrays
  // ========================================
  @ApiPropertyOptional({ type: [CreateDailyManpowerDto], description: 'Manpower on site' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDailyManpowerDto)
  @IsOptional()
  manpower?: CreateDailyManpowerDto[];

  @ApiPropertyOptional({ type: [CreateDailyEquipmentDto], description: 'Equipment used' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDailyEquipmentDto)
  @IsOptional()
  equipment?: CreateDailyEquipmentDto[];

  @ApiPropertyOptional({ type: [CreateDailyWorkDto], description: 'Work activities performed' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDailyWorkDto)
  @IsOptional()
  workLogs?: CreateDailyWorkDto[];

  @ApiPropertyOptional({ type: [CreateDailyMaterialDto], description: 'Materials delivered/used' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDailyMaterialDto)
  @IsOptional()
  materials?: CreateDailyMaterialDto[];

  @ApiPropertyOptional({ type: [CreateDailyInspectionDto], description: 'Inspections conducted' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDailyInspectionDto)
  @IsOptional()
  inspections?: CreateDailyInspectionDto[];

  @ApiPropertyOptional({ type: [CreateDailyIncidentDto], description: 'Incidents that occurred' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDailyIncidentDto)
  @IsOptional()
  incidents?: CreateDailyIncidentDto[];

  @ApiPropertyOptional({ type: [CreateDailyVisitorDto], description: 'Site visitors' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDailyVisitorDto)
  @IsOptional()
  visitors?: CreateDailyVisitorDto[];

  @ApiPropertyOptional({ type: [CreateDailyDelayDto], description: 'Delays encountered' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDailyDelayDto)
  @IsOptional()
  delays?: CreateDailyDelayDto[];
}
