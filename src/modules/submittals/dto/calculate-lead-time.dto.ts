import {
  IsString,
  IsDateString,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalculateLeadTimeDto {
  @ApiProperty({ description: 'Required on-site date' })
  @IsDateString()
  requiredOnSiteDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specSection?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  submittalType?: string;

  @ApiPropertyOptional({ description: 'Override fabrication days' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fabricationDays?: number;

  @ApiPropertyOptional({ description: 'Override delivery days' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryDays?: number;

  @ApiPropertyOptional({ description: 'Override review days' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reviewDays?: number;
}
