import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalStamp } from '../entities/submittal-response.entity';

export class RespondSubmittalDto {
  @ApiProperty({ enum: ApprovalStamp })
  @IsEnum(ApprovalStamp)
  stamp: ApprovalStamp;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  commentsHtml?: string;

  @ApiPropertyOptional({ description: 'Conditions for APPROVED_AS_NOTED' })
  @IsOptional()
  @IsString()
  conditions?: string;

  @ApiPropertyOptional({ description: 'Marked-up document IDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  markupAttachmentIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewerTitle?: string;

  @ApiPropertyOptional({ description: 'Digital signature data' })
  @IsOptional()
  @IsObject()
  signatureData?: {
    signatureImage?: string;
  };

  @ApiPropertyOptional({ description: 'Mark as official/final response' })
  @IsOptional()
  @IsBoolean()
  isOfficial?: boolean;
}
