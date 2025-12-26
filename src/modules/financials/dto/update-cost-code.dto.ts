import { PartialType } from '@nestjs/mapped-types';
import { CreateCostCodeDto } from './create-cost-code.dto';

/**
 * DTO for updating an existing cost code
 *
 * All fields are optional for partial updates.
 * Uses PartialType to make all CreateCostCodeDto fields optional.
 */
export class UpdateCostCodeDto extends PartialType(CreateCostCodeDto) {}
