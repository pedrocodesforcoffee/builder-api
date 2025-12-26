import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateDailyReportDto } from './create-daily-report.dto';

/**
 * Update Daily Report DTO
 * Extends Create DTO but makes all fields optional
 * Omits projectId and reportDate as these cannot be changed
 */
export class UpdateDailyReportDto extends PartialType(
  OmitType(CreateDailyReportDto, ['projectId', 'reportDate'] as const),
) {}
