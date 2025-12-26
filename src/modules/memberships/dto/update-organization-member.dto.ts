import { IsEnum } from 'class-validator';
import { OrganizationRole } from '../../users/enums/organization-role.enum';

/**
 * DTO for updating organization member role
 */
export class UpdateOrganizationMemberDto {
  @IsEnum(OrganizationRole)
  role!: OrganizationRole;
}
