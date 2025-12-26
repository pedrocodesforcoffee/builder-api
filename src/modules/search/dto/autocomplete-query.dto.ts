import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Autocomplete Query DTO
 */
export class AutocompleteQueryDto {
  /**
   * Field to autocomplete
   */
  @IsString()
  field!: string;

  /**
   * Query string
   */
  @IsString()
  q!: string;

  /**
   * Limit number of suggestions
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}