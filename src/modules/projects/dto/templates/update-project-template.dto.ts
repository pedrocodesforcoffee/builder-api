import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectTemplateDto } from './create-project-template.dto';

export class UpdateProjectTemplateDto extends PartialType(CreateProjectTemplateDto) {
  // Explicitly exclude fields that cannot be updated
  organizationId?: never;
  isSystem?: never;
}
