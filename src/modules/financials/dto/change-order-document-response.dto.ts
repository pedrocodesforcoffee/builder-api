import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CoDocumentType } from '../enums/co-document-type.enum';

/**
 * Change Order Document Response DTO
 *
 * Response DTO for change order document entities.
 * Used for OCO and CCO document attachments.
 */
export class ChangeOrderDocumentResponseDto {
  @ApiProperty({
    description: 'Document ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id!: string;

  @ApiProperty({
    description: 'Change order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  changeOrderId!: string;

  @ApiProperty({
    description: 'Change order type',
    enum: ['OCO', 'CCO'],
    example: 'OCO',
  })
  @Expose()
  changeOrderType!: 'OCO' | 'CCO';

  @ApiProperty({
    description: 'Document type classification',
    enum: CoDocumentType,
    example: CoDocumentType.T_AND_M,
  })
  @Expose()
  documentType!: CoDocumentType;

  @ApiProperty({
    description: 'File name',
    example: 'tm-records-2024-01.pdf',
  })
  @Expose()
  fileName!: string;

  @ApiProperty({
    description: 'File URL (storage location)',
    example: 'https://storage.example.com/documents/tm-records-2024-01.pdf',
  })
  @Expose()
  fileUrl!: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 2048576,
  })
  @Expose()
  fileSize!: number;

  @ApiProperty({
    description: 'MIME type',
    example: 'application/pdf',
  })
  @Expose()
  mimeType!: string;

  @ApiProperty({
    description: 'Optional description of the document',
    example: 'Time and materials records for January 2024',
    required: false,
  })
  @Expose()
  description?: string;

  @ApiProperty({
    description: 'User ID who uploaded the document',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  uploadedBy!: string;

  @ApiProperty({
    description: 'Upload timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  @Expose()
  @Type(() => Date)
  uploadedAt!: Date;

  @ApiProperty({
    description: 'Created timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  @Expose()
  @Type(() => Date)
  updatedAt!: Date;
}
