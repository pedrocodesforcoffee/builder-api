import { IsString, IsEnum, IsNumber, IsBoolean, IsOptional, IsArray, ValidateIf, Min, Max, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { GeofenceType } from '../enums/time-attendance.enum';

/**
 * DTO for creating a project geofence
 */
export class CreateProjectGeofenceDto {
  @ApiProperty({ example: 'Main Job Site Boundary' })
  @IsString()
  name: string;

  @ApiProperty({ enum: GeofenceType })
  @IsEnum(GeofenceType)
  type: GeofenceType;

  // For CIRCULAR geofences
  @ApiPropertyOptional({ example: 37.7749 })
  @ValidateIf(o => o.type === GeofenceType.CIRCULAR)
  @IsNumber()
  @Min(-90)
  @Max(90)
  centerLatitude?: number;

  @ApiPropertyOptional({ example: -122.4194 })
  @ValidateIf(o => o.type === GeofenceType.CIRCULAR)
  @IsNumber()
  @Min(-180)
  @Max(180)
  centerLongitude?: number;

  @ApiPropertyOptional({ example: 500, description: 'Radius in meters' })
  @ValidateIf(o => o.type === GeofenceType.CIRCULAR)
  @IsNumber()
  @Min(10)
  @Max(10000)
  radiusMeters?: number;

  // For POLYGON geofences
  @ApiPropertyOptional({
    example: [[-122.4194, 37.7749], [-122.4184, 37.7749], [-122.4184, 37.7739], [-122.4194, 37.7739]],
    description: 'Array of [longitude, latitude] pairs'
  })
  @ValidateIf(o => o.type === GeofenceType.POLYGON)
  @IsArray()
  @ArrayMinSize(3, { message: 'Polygon must have at least 3 vertices' })
  polygonCoordinates?: number[][];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for updating a project geofence
 */
export class UpdateProjectGeofenceDto extends PartialType(CreateProjectGeofenceDto) {}

/**
 * DTO for validating a location against geofences
 */
export class ValidateLocationDto {
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
}

/**
 * Response DTO for geofence validation
 */
export class GeofenceValidationResultDto {
  @ApiProperty()
  isValid: boolean;

  @ApiProperty()
  isInsideGeofence: boolean;

  @ApiPropertyOptional()
  distanceFromGeofence?: number;

  @ApiPropertyOptional()
  geofenceName?: string;

  @ApiPropertyOptional()
  geofenceId?: string;

  @ApiProperty()
  validatedAt: Date;

  @ApiPropertyOptional({ description: 'Warning message if outside geofence but within tolerance' })
  warning?: string;
}
