import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsEnum,
  IsObject,
  IsArray,
  MinLength,
  MaxLength,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '../enums';

export class InitiateUploadDto {
  @ApiProperty({
    description: 'Original file name',
    example: 'floor-plan-revised.pdf',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 2048576,
    minimum: 1,
    maximum: 5368709120, // 5GB
  })
  @IsNumber()
  @Min(1)
  @Max(5368709120)
  fileSize!: number;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'application/pdf',
  })
  @IsString()
  @Matches(/^[a-z]+\/[a-z0-9\+\-\.]+$/i, {
    message: 'Invalid MIME type format',
  })
  mimeType!: string;

  @ApiPropertyOptional({
    description: 'Target folder ID (optional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @ApiPropertyOptional({
    description: 'Document type classification',
    enum: DocumentType,
    example: DocumentType.DRAWING,
  })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @ApiPropertyOptional({
    description: 'Document metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: {
    description?: string;
    tags?: string[];
    customFields?: Record<string, any>;
  };
}
