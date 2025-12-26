import { ApiProperty } from '@nestjs/swagger';

/**
 * Validation Result DTO
 *
 * Result of validating a custom report configuration.
 */
export class ValidationResultDto {
  @ApiProperty({
    description: 'Whether configuration is valid',
    example: true,
  })
  valid!: boolean;

  @ApiProperty({
    description: 'Validation errors (if any)',
    type: [String],
    example: [],
  })
  errors!: string[];

  @ApiProperty({
    description: 'Validation warnings (if any)',
    type: [String],
    example: ['Field "budget.oldField" is deprecated, use "budget.newField" instead'],
  })
  warnings!: string[];
}
