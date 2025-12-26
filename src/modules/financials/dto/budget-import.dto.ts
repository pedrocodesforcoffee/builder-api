import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Budget Import Request DTO
 *
 * Metadata for budget import from Excel/CSV files.
 */
export class BudgetImportDto {
  @ApiProperty({
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  projectId!: string;

  @ApiProperty({
    description: 'Budget name',
    example: 'Q1 2024 Budget',
  })
  @IsNotEmpty()
  @IsString()
  budgetName!: string;
}

/**
 * Budget Import Result DTO
 *
 * Response after importing a budget from Excel/CSV.
 */
export class BudgetImportResultDto {
  @ApiProperty({
    description: 'Whether the import was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Budget ID (if successful)',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174111',
  })
  budgetId?: string;

  @ApiProperty({
    description: 'Number of line items imported',
    example: 45,
  })
  lineItemsImported!: number;

  @ApiProperty({
    description: 'Import errors',
    type: [String],
    example: ['Row 5: Invalid cost code'],
  })
  errors!: string[];

  @ApiProperty({
    description: 'Import warnings',
    type: [String],
    example: ['Row 10: Cost code 1234 not found, skipping'],
  })
  warnings!: string[];
}
