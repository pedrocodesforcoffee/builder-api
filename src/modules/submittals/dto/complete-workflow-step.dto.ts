import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsUUID,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalStamp } from '../entities/submittal-response.entity';

export class CompleteWorkflowStepDto {
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
  conditions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  markupAttachmentIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  signatureData?: {
    signatureImage?: string;
    title?: string;
    licenseNumber?: string;
  };

  @ApiPropertyOptional({ description: 'Skip to specific step (for rejections)' })
  @IsOptional()
  @IsUUID()
  skipToStepId?: string;
}
