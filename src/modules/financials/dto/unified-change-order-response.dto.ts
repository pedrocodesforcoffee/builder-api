import { ApiProperty } from '@nestjs/swagger';
import { PotentialChangeOrderResponseDto } from './potential-change-order-response.dto';
import { OwnerChangeOrderResponseDto } from './owner-change-order-response.dto';
import { CommitmentChangeOrderResponseDto } from './commitment-change-order-response.dto';

/**
 * Unified Change Order Response DTO
 *
 * Response DTO for unified change order queries.
 * Returns all types of change orders for a project in a single response.
 */
export class UnifiedChangeOrderResponseDto {
  @ApiProperty({
    description: 'Potential Change Orders',
    type: [PotentialChangeOrderResponseDto],
    example: [],
  })
  pcos!: PotentialChangeOrderResponseDto[];

  @ApiProperty({
    description: 'Owner Change Orders',
    type: [OwnerChangeOrderResponseDto],
    example: [],
  })
  ocos!: OwnerChangeOrderResponseDto[];

  @ApiProperty({
    description: 'Commitment Change Orders',
    type: [CommitmentChangeOrderResponseDto],
    example: [],
  })
  ccos!: CommitmentChangeOrderResponseDto[];

  @ApiProperty({
    description: 'Total count of all change orders',
    example: 42,
  })
  totalCount!: number;

  @ApiProperty({
    description: 'Total amount across all change orders',
    example: 250000,
  })
  totalAmount!: number;
}
