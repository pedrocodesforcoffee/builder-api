import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * Apply Template DTO
 *
 * Data transfer object for applying a folder structure template to a project.
 * Templates create a predefined folder hierarchy based on project type.
 *
 * @dto ApplyTemplateDto
 */
export class ApplyTemplateDto {
  /**
   * Template name
   * Name of the template to apply (e.g., "Commercial Construction Standard")
   *
   * @required
   * @maxLength 100
   * @example "Commercial Construction Standard"
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  templateName!: string;
}
