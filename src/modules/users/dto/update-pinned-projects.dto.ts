import { IsArray, IsUUID, ArrayMaxSize } from 'class-validator';

/**
 * DTO for updating user's pinned projects
 */
export class UpdatePinnedProjectsDto {
  @IsArray()
  @ArrayMaxSize(10, { message: 'Cannot pin more than 10 projects' })
  @IsUUID('4', { each: true })
  projectIds!: string[];
}
