import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Project } from './project.entity';
import { FolderType } from '../enums/folder-type.enum';
import { AccessLevel } from '../enums/access-level.enum';

/**
 * Permission Rule Interface
 *
 * Defines access permissions for users or roles on a folder
 */
export interface PermissionRule {
  roleId?: string;
  userId?: string;
  access: AccessLevel;
  inheritToChildren: boolean;
}

/**
 * ProjectFolder Entity
 *
 * Represents a folder in the project's document structure.
 * Supports hierarchical folder organization with parent-child relationships,
 * permission inheritance, and comprehensive access control.
 *
 * @entity project_folders
 */
@Entity('project_folders')
@Index('IDX_project_folders_project', ['projectId'])
@Index('IDX_project_folders_parent', ['parentId'])
@Index('IDX_project_folders_path', ['path'])
@Index('IDX_project_folders_folder_type', ['folderType'])
@Index('IDX_project_folders_project_parent', ['projectId', 'parentId'])
export class ProjectFolder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Core Fields
  @Column({
    type: 'uuid',
    name: 'project_id',
    nullable: false,
  })
  @Index()
  projectId!: string;

  @Column({
    type: 'uuid',
    name: 'parent_id',
    nullable: true,
  })
  @Index()
  parentId?: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  name!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  path?: string;

  // Hierarchy & Organization
  @Column({
    type: 'integer',
    nullable: false,
    default: 0,
  })
  level!: number;

  @Column({
    type: 'integer',
    nullable: false,
    default: 0,
  })
  order!: number;

  @Column({
    type: 'boolean',
    name: 'is_system_folder',
    nullable: false,
    default: false,
  })
  isSystemFolder!: boolean;

  @Column({
    type: 'enum',
    enum: FolderType,
    name: 'folder_type',
    nullable: false,
    default: FolderType.GENERAL,
  })
  folderType!: FolderType;

  // Permissions & Access
  @Column({
    type: 'boolean',
    name: 'inherit_permissions',
    nullable: false,
    default: true,
  })
  inheritPermissions!: boolean;

  @Column({
    type: 'jsonb',
    nullable: false,
    default: [],
  })
  permissions!: PermissionRule[];

  @Column({
    type: 'boolean',
    name: 'is_public',
    nullable: false,
    default: false,
  })
  isPublic!: boolean;

  @Column({
    type: 'boolean',
    name: 'is_locked',
    nullable: false,
    default: false,
  })
  isLocked!: boolean;

  // Metadata & Settings
  @Column({
    type: 'varchar',
    length: 7,
    nullable: true,
  })
  color?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  icon?: string;

  @Column({
    type: 'jsonb',
    nullable: false,
    default: [],
  })
  tags!: string[];

  @Column({
    type: 'jsonb',
    name: 'custom_fields',
    nullable: false,
    default: {},
  })
  customFields!: Record<string, any>;

  // Statistics (calculated/cached)
  @Column({
    type: 'integer',
    name: 'file_count',
    nullable: false,
    default: 0,
  })
  fileCount!: number;

  @Column({
    type: 'integer',
    name: 'total_file_count',
    nullable: false,
    default: 0,
  })
  totalFileCount!: number;

  @Column({
    type: 'bigint',
    name: 'total_size',
    nullable: false,
    default: 0,
  })
  totalSize!: number;

  @Column({
    type: 'timestamp',
    name: 'last_activity_at',
    nullable: true,
  })
  lastActivityAt?: Date;

  // Audit Fields
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
  })
  updatedAt!: Date;

  @Column({
    type: 'uuid',
    name: 'created_by',
    nullable: true,
  })
  createdBy?: string;

  @Column({
    type: 'uuid',
    name: 'updated_by',
    nullable: true,
  })
  updatedBy?: string;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp',
    nullable: true,
  })
  deletedAt?: Date;

  // Relationships
  @ManyToOne(() => Project, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => ProjectFolder, (folder) => folder.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: ProjectFolder;

  @OneToMany(() => ProjectFolder, (folder) => folder.parent)
  children?: ProjectFolder[];

  // Helper methods

  /**
   * Check if this is a root folder (no parent)
   */
  isRootFolder(): boolean {
    return this.parentId === null || this.parentId === undefined;
  }

  /**
   * Get the full path of the folder
   */
  getFullPath(): string {
    if (this.path) {
      return this.path;
    }
    return `/${this.name}`;
  }

  /**
   * Check if folder can be deleted
   */
  canDelete(): boolean {
    return !this.isSystemFolder && !this.isLocked;
  }

  /**
   * Check if folder can be modified
   */
  canModify(): boolean {
    return !this.isLocked;
  }

  /**
   * Check if folder has files
   */
  hasFiles(): boolean {
    return this.fileCount > 0;
  }

  /**
   * Check if folder has subfolders
   */
  hasChildren(): boolean {
    return this.children !== undefined && this.children.length > 0;
  }

  /**
   * Get folder depth in hierarchy
   */
  getDepth(): number {
    return this.level;
  }

  /**
   * Check if folder is empty (no files and no children)
   */
  isEmpty(): boolean {
    return this.fileCount === 0 && !this.hasChildren();
  }
}
