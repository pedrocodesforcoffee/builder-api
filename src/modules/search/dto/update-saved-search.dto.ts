import { PartialType } from '@nestjs/mapped-types';
import { CreateSavedSearchDto } from './create-saved-search.dto';

/**
 * Update Saved Search DTO
 *
 * All fields from CreateSavedSearchDto as optional
 */
export class UpdateSavedSearchDto extends PartialType(CreateSavedSearchDto) {}