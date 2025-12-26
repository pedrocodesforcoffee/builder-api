import { IsString, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CoDocumentType } from '../enums/co-document-type.enum';

/**
 * Add Change Order Document DTO
 *
 * DTO for attaching a document to a change order (OCO or CCO).
 * Used for uploading supporting documentation like proposals, T&M records, photos, etc.
 */
export class AddCODocumentDto {
  @ApiProperty({
    description: 'Document type classification',
    enum: CoDocumentType,
    example: CoDocumentType.T_AND_M,
  })
  @IsEnum(CoDocumentType)
  documentType!: CoDocumentType;

  @ApiProperty({
    description: 'File name',
    example: 'tm-records-2024-01.pdf',
  })
  @IsString()
  fileName!: string;

  @ApiProperty({
    description: 'File URL (storage location)',
    example: 'https://storage.example.com/documents/tm-records-2024-01.pdf',
  })
  @IsString()
  fileUrl!: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 2048576,
  })
  @IsNumber()
  @Min(0)
  fileSize!: number;

  @ApiProperty({
    description: 'MIME type',
    example: 'application/pdf',
  })
  @IsString()
  mimeType!: string;

  @ApiProperty({
    description: 'Optional description of the document',
    example: 'Time and materials records for January 2024',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
