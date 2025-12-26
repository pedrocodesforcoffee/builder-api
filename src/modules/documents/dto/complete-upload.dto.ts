import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UploadPartDto {
  @ApiProperty({
    description: 'Part number (1-indexed)',
    example: 1,
  })
  @IsNumber()
  @Min(1)
  partNumber!: number;

  @ApiProperty({
    description: 'ETag returned from S3 for this part',
    example: '"a54357aff0632cce46d942af68356b38"',
  })
  @IsString()
  etag!: string;
}

export class CompleteUploadDto {
  @ApiPropertyOptional({
    description: 'ETag for single uploads (returned from S3 PUT)',
    example: '"a54357aff0632cce46d942af68356b38"',
  })
  @IsOptional()
  @IsString()
  etag?: string;

  @ApiPropertyOptional({
    description: 'Parts array for multipart uploads',
    type: [UploadPartDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UploadPartDto)
  parts?: UploadPartDto[];

  @ApiPropertyOptional({
    description: 'Document name (overrides file name)',
    example: 'Revised Floor Plan - Level 1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  documentName?: string;

  @ApiPropertyOptional({
    description: 'Document number',
    example: 'DOC-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentNumber?: string;

  @ApiPropertyOptional({
    description: 'Initial revision marker',
    example: 'A',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  revision?: string;

  @ApiPropertyOptional({
    description: 'Document description',
    example: 'Updated floor plan with client revisions',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Document tags',
    example: ['floor-plan', 'revised', 'level-1'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
