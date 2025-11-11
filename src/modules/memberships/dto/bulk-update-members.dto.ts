import { IsArray, ValidateNested, ArrayMaxSize, ArrayMinSize, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateProjectMemberDto } from './update-project-member.dto';

/**
 * Single member update in bulk operation
 */
export class BulkMemberUpdate extends UpdateProjectMemberDto {
  @IsUUID()
  userId!: string;
}

/**
 * DTO for bulk updating project members
 */
export class BulkUpdateMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => BulkMemberUpdate)
  updates!: BulkMemberUpdate[];
}
