import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Review Action Enum
 * Actions that can be taken when reviewing a submitted report
 */
export enum ReviewAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

/**
 * Review Daily Report DTO
 * Used when a project manager approves or rejects a submitted report
 */
export class ReviewDailyReportDto {
  @ApiProperty({ enum: ReviewAction, description: 'Review action (approve or reject)' })
  @IsEnum(ReviewAction)
  action: ReviewAction;

  @ApiPropertyOptional({ description: 'Reason for rejection (required if rejecting)' })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
