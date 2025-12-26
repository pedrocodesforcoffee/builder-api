import { IsString, IsUUID, IsEnum, IsNumber, IsOptional, IsDateString, Min, Max, IsObject, IsIP } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClockMethod, EventType } from '../enums/time-attendance.enum';

/**
 * Base DTO for clock events with GPS data
 */
class BaseClockEventDto {
  @ApiProperty({ example: 37.7749 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: -122.4194 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ example: 10, description: 'GPS accuracy in meters' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number;

  @ApiProperty({ enum: ClockMethod, default: ClockMethod.MOBILE_APP })
  @IsEnum(ClockMethod)
  clockMethod: ClockMethod;

  @ApiPropertyOptional({ description: 'Device information (auto-captured from headers)' })
  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'IP address (auto-captured)' })
  @IsOptional()
  @IsIP()
  ipAddress?: string;
}

/**
 * DTO for clocking in
 */
export class ClockInDto extends BaseClockEventDto {
  @ApiProperty({ description: 'Worker profile ID' })
  @IsUUID()
  workerId: string;

  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;
}

/**
 * DTO for clocking out
 */
export class ClockOutDto extends BaseClockEventDto {
  @ApiProperty({ description: 'Worker profile ID' })
  @IsUUID()
  workerId: string;

  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;
}

/**
 * DTO for starting a break
 */
export class BreakStartDto extends BaseClockEventDto {
  @ApiProperty({ description: 'Time entry ID' })
  @IsUUID()
  timeEntryId: string;
}

/**
 * DTO for ending a break
 */
export class BreakEndDto extends BaseClockEventDto {
  @ApiProperty({ description: 'Time entry ID' })
  @IsUUID()
  timeEntryId: string;
}

/**
 * DTO for starting lunch
 */
export class LunchStartDto extends BaseClockEventDto {
  @ApiProperty({ description: 'Time entry ID' })
  @IsUUID()
  timeEntryId: string;
}

/**
 * DTO for ending lunch
 */
export class LunchEndDto extends BaseClockEventDto {
  @ApiProperty({ description: 'Time entry ID' })
  @IsUUID()
  timeEntryId: string;
}

/**
 * DTO for manual clock event entry (by supervisor)
 */
export class ManualClockEventDto {
  @ApiProperty({ description: 'Worker profile ID' })
  @IsUUID()
  workerId: string;

  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ enum: EventType })
  @IsEnum(EventType)
  eventType: EventType;

  @ApiProperty({ example: '2024-12-22T08:00:00Z' })
  @IsDateString()
  eventTime: string;

  @ApiPropertyOptional({ example: 37.7749 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: -122.4194 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({ enum: ClockMethod, default: ClockMethod.MANUAL })
  @IsEnum(ClockMethod)
  clockMethod: ClockMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Response DTO for clock event
 */
export class ClockEventResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  timeEntryId: string;

  @ApiProperty({ enum: EventType })
  eventType: EventType;

  @ApiProperty()
  eventTime: Date;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiPropertyOptional()
  accuracy?: number;

  @ApiProperty({ enum: ClockMethod })
  clockMethod: ClockMethod;

  @ApiPropertyOptional()
  deviceInfo?: Record<string, any>;

  @ApiProperty()
  geofenceValidated: boolean;

  @ApiPropertyOptional()
  distanceFromGeofence?: number;

  @ApiPropertyOptional()
  geofenceName?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  ipAddress?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Warning if clocked outside geofence' })
  warning?: string;
}
