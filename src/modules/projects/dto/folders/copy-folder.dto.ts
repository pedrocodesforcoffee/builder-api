import { IsUUID, IsOptional, IsBoolean, IsNotEmpty } from 'class-validator';

/**
 * Copy Folder DTO
 *
 * Data transfer object for copying a folder (and optionally its contents)
 * to a different location or project.
 *
 * @dto CopyFolderDto
 */
export class CopyFolderDto {
  /**
   * Target project ID
   * UUID of the project where the folder should be copied
   *
   * @required
   * @format uuid
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  @IsUUID()
  @IsNotEmpty()
  targetProjectId!: string;

  /**
   * Target parent folder ID
   * UUID of the parent folder in the target project (null for root)
   *
   * @optional
   * @format uuid
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  @IsUUID()
  @IsOptional()
  targetParentId?: string;

  /**
   * Copy files flag
   * If true, all files within the folder will also be copied
   *
   * @optional
   * @default false
   */
  @IsBoolean()
  @IsOptional()
  copyFiles?: boolean;
}
