import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProjectRole } from '../../../users/enums/project-role.enum';

/**
 * DTO for updating a project member's role
 */
export class UpdateProjectMemberDto {
  /**
   * New role to assign to the project member
   */
  @ApiProperty({
    description: 'New role to assign to the project member',
    enum: ProjectRole,
    example: ProjectRole.PROJECT_MANAGER,
  })
  @IsEnum(ProjectRole)
  role!: ProjectRole;
}
