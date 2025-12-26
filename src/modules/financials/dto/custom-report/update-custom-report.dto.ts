import { PartialType } from '@nestjs/swagger';
import { CreateCustomReportDto } from './create-custom-report.dto';

/**
 * Update Custom Report DTO
 *
 * Request DTO for updating an existing custom report.
 * All fields are optional.
 */
export class UpdateCustomReportDto extends PartialType(CreateCustomReportDto) {}
