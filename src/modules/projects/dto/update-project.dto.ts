import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectDto } from './create-project.dto';

/**
 * Update Project DTO
 *
 * Allows partial updates of project information.
 * All fields from CreateProjectDto are optional.
 * Cannot change organizationId (projects cannot be moved between orgs).
 *
 * @dto UpdateProjectDto
 */
export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  // Explicitly exclude organizationId from updates
  organizationId?: never;
}
