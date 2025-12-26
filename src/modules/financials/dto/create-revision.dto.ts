import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Create Budget Revision DTO
 *
 * Request to create a new revision (copy) of an existing budget.
 */
export class CreateRevisionDto {
  @ApiProperty({
    description: 'Name for the new revision',
    example: 'Q2 Budget Revision',
  })
  @IsNotEmpty()
  @IsString()
  name!: string;
}

/**
 * Create Revision Response DTO
 *
 * Response after successfully creating a budget revision.
 */
export class CreateRevisionResponseDto {
  @ApiProperty({
    description: 'Whether the revision was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Original budget ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  originalBudgetId!: string;

  @ApiProperty({
    description: 'New revision budget ID',
    example: '123e4567-e89b-12d3-a456-426614174111',
  })
  revisionBudgetId!: string;

  @ApiProperty({
    description: 'Number of line items copied',
    example: 45,
  })
  lineItemsCopied!: number;

  @ApiProperty({
    description: 'Message',
    example: 'Budget revision created successfully',
  })
  message!: string;
}
