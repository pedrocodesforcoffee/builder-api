import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * Create Budget Snapshot DTO
 *
 * Parameters for creating a point-in-time snapshot of a budget.
 */
export class CreateSnapshotDto {
  @ApiProperty({
    description: 'Snapshot name',
    example: 'Month End - January 2024',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'Snapshot description (optional)',
    example: 'Budget snapshot before Change Order #123',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
