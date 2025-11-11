import { IsUUID, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Move Folder DTO
 *
 * Data transfer object for moving a folder to a new parent location.
 * Supports moving to root (newParentId = null) or to another folder.
 *
 * @dto MoveFolderDto
 */
export class MoveFolderDto {
  /**
   * New parent folder ID
   * UUID of the new parent folder, or null to move to root level
   *
   * @required (can be null for root)
   * @format uuid or null
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  @Transform(({ value }) => (value === null || value === 'null' ? null : value))
  @IsUUID(undefined, { message: 'newParentId must be a valid UUID or null' })
  @IsOptional()
  newParentId!: string | null;
}
