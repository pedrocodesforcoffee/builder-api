import { IsEmail, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { OrganizationRole } from '../../users/enums/organization-role.enum';

/**
 * DTO for adding organization member
 */
export class AddOrganizationMemberDto {
  @IsEmail()
  email!: string;

  @IsEnum(OrganizationRole)
  role!: OrganizationRole;

  @IsBoolean()
  @IsOptional()
  sendInvite?: boolean = true;
}
