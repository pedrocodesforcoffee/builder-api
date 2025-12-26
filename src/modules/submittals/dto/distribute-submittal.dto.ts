import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  IsEmail,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DistributionMethod } from '../entities/submittal-distribution.entity';

export class ExternalRecipientDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
}

export class DistributeSubmittalDto {
  @ApiPropertyOptional({ description: 'Internal user IDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  recipientIds?: string[];

  @ApiPropertyOptional({ description: 'Organization IDs (all members)' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  recipientOrgIds?: string[];

  @ApiPropertyOptional({ type: [ExternalRecipientDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalRecipientDto)
  externalRecipients?: ExternalRecipientDto[];

  @ApiPropertyOptional({ enum: DistributionMethod })
  @IsOptional()
  @IsEnum(DistributionMethod)
  method?: DistributionMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeConditions?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeMarkups?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverNote?: string;

  @ApiPropertyOptional({ description: 'Specific document IDs to distribute' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  documentIds?: string[];
}
