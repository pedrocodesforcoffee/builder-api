import { IsArray, ValidateNested, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { AddProjectMemberDto } from './add-project-member.dto';

/**
 * DTO for bulk adding project members
 */
export class BulkAddMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AddProjectMemberDto)
  members!: AddProjectMemberDto[];
}
