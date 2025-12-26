import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RfiReferenceType } from '../entities/rfi-reference.entity';

export class CalloutDataDto {
  @IsOptional()
  x?: number;

  @IsOptional()
  y?: number;

  @IsOptional()
  width?: number;

  @IsOptional()
  height?: number;

  @IsOptional()
  shape?: 'rectangle' | 'circle' | 'arrow' | 'cloud';

  @IsOptional()
  color?: string;

  @IsOptional()
  note?: string;
}

export class AddReferenceDto {
  @ApiProperty({ enum: RfiReferenceType })
  @IsEnum(RfiReferenceType)
  referenceType: RfiReferenceType;

  @ApiProperty({ description: 'ID of referenced entity' })
  @IsUUID()
  referenceId: string;

  @ApiProperty({ description: 'Reference number (e.g., A-101)' })
  @IsString()
  @MaxLength(100)
  referenceNumber: string;

  @ApiPropertyOptional({ description: 'Title of referenced item' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  referenceTitle?: string;

  @ApiPropertyOptional({ description: 'Location within reference' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceLocation?: string;

  @ApiPropertyOptional({ description: 'Callout data for markups' })
  @IsOptional()
  @IsObject()
  calloutData?: CalloutDataDto;

  @ApiPropertyOptional({ description: 'Notes about this reference' })
  @IsOptional()
  @IsString()
  notes?: string;
}
