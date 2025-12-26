import { ApiProperty } from '@nestjs/swagger';

/**
 * Financial Alert DTO
 *
 * Alert generated based on business rules (budget overruns, low contingency, etc.).
 */
export class FinancialAlertDto {
  @ApiProperty({ description: 'Alert ID', example: 'budget-overrun-project-123' })
  id: string;

  @ApiProperty({ description: 'Alert severity', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], example: 'HIGH' })
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

  @ApiProperty({ description: 'Alert message', example: 'Contingency at 3.5% - Below 5% threshold' })
  message: string;

  @ApiProperty({ description: 'Related entity type', example: 'BUDGET' })
  entityType: string;

  @ApiProperty({ description: 'Related entity ID', example: 'uuid' })
  entityId: string;

  @ApiProperty({ description: 'Alert created date', example: '2024-01-15T10:30:00Z' })
  createdAt: string;
}
