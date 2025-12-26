import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  MaxLength,
  IsObject,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FolderType } from '../../enums/folder-type.enum';
import { AccessLevel } from '../../enums/access-level.enum';

/**
 * Permission Rule DTO
 *
 * Defines access permissions for users or roles on a folder
 */
export class PermissionRuleDto {
  /**
   * Role ID (either roleId or userId must be provided)
   *
   * @optional
   * @format uuid
   */
  @IsUUID()
  @IsOptional()
  roleId?: string;

  /**
   * User ID (either roleId or userId must be provided)
   *
   * @optional
   * @format uuid
   */
  @IsUUID()
  @IsOptional()
  userId?: string;

  /**
   * Access level granted
   *
   * @required
   * @enum AccessLevel
   */
  @IsEnum(AccessLevel)
  @IsNotEmpty()
  access!: AccessLevel;

  /**
   * Whether this permission should be inherited by child folders
   *
   * @required
   * @default true
   */
  @IsBoolean()
  @IsNotEmpty()
  inheritToChildren!: boolean;
}

/**
 * Create Folder DTO
 *
 * Data transfer object for creating a new project folder.
 * Supports hierarchical structure, permissions, and metadata.
 *
 * @dto CreateFolderDto
 */
export class CreateFolderDto {
  /**
   * Folder name
   * Display name shown in the UI
   *
   * @required
   * @maxLength 100
   * @example "Structural Drawings"
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  /**
   * Folder description
   * Additional details about the folder's purpose
   *
   * @optional
   * @example "All structural engineering drawings and calculations"
   */
  @IsString()
  @IsOptional()
  description?: string;

  /**
   * Parent folder ID
   * UUID of the parent folder (null/undefined for root folders)
   *
   * @optional
   * @format uuid
   */
  @IsUUID()
  @IsOptional()
  parentId?: string;

  /**
   * Folder type
   * Categorizes the folder for organization and filtering
   *
   * @required
   * @enum FolderType
   * @default GENERAL
   */
  @IsEnum(FolderType)
  @IsNotEmpty()
  folderType!: FolderType;

  /**
   * Folder color
   * Hex color code for visual identification (e.g., #FF5733)
   *
   * @optional
   * @maxLength 7
   * @example "#3B82F6"
   */
  @IsString()
  @IsOptional()
  @MaxLength(7)
  color?: string;

  /**
   * Folder icon
   * Icon name or identifier for visual representation
   *
   * @optional
   * @maxLength 50
   * @example "folder-drawing"
   */
  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string;

  /**
   * Inherit permissions from parent
   * If true, folder will inherit parent's permissions
   *
   * @optional
   * @default true
   */
  @IsBoolean()
  @IsOptional()
  inheritPermissions?: boolean;

  /**
   * Public folder flag
   * If true, folder is accessible to all project members
   *
   * @optional
   * @default false
   */
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  /**
   * Explicit permissions
   * Array of permission rules for specific users/roles
   *
   * @optional
   * @default []
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionRuleDto)
  @IsOptional()
  permissions?: PermissionRuleDto[];

  /**
   * Tags
   * Array of tag strings for categorization/filtering
   *
   * @optional
   * @example ["important", "client-review"]
   */
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  @IsOptional()
  tags?: string[];

  /**
   * Custom fields
   * Extensible JSON storage for folder-specific data
   *
   * @optional
   * @example { "department": "Engineering", "phase": "Design" }
   */
  @IsObject()
  @IsOptional()
  customFields?: Record<string, any>;

  /**
   * Display order
   * Numeric value for sorting folders within the same parent
   *
   * @optional
   * @min 0
   * @default 0
   */
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
