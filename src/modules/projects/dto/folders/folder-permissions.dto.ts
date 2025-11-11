import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PermissionRuleDto } from './create-folder.dto';

/**
 * Folder Permissions DTO
 *
 * Data transfer object for updating folder permissions.
 * Allows batch permission updates with inheritance control.
 *
 * @dto FolderPermissionsDto
 */
export class FolderPermissionsDto {
  /**
   * Permissions array
   * Array of permission rules for specific users/roles
   *
   * @required
   * @example [{ "userId": "123...", "access": "READ_WRITE", "inheritToChildren": true }]
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionRuleDto)
  @IsNotEmpty()
  permissions!: PermissionRuleDto[];

  /**
   * Inherit permissions from parent
   * If true, folder will also inherit parent's permissions
   *
   * @required
   */
  @IsBoolean()
  @IsNotEmpty()
  inheritPermissions!: boolean;

  /**
   * Apply to children flag
   * If true, permissions will be propagated to all child folders
   *
   * @required
   * @default false
   */
  @IsBoolean()
  @IsNotEmpty()
  applyToChildren!: boolean;
}
