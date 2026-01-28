import { IsArray, IsUUID } from 'class-validator';

/**
 * Response DTO for user's pinned projects
 */
export class PinnedProjectsResponseDto {
  @IsArray()
  @IsUUID('4', { each: true })
  projectIds!: string[];
}
