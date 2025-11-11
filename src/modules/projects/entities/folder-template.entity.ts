import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { FolderType } from '../enums/folder-type.enum';

/**
 * Folder Definition Interface
 *
 * Defines structure of a single folder in a template
 */
export interface FolderDefinition {
  name: string;
  description?: string;
  folderType: FolderType;
  icon?: string;
  color?: string;
  order?: number;
  children?: FolderDefinition[];
}

/**
 * FolderTemplate Entity
 *
 * Represents a reusable folder structure template that can be applied to projects.
 * Templates define standard folder hierarchies for different project types.
 *
 * @entity folder_templates
 */
@Entity('folder_templates')
@Index('IDX_folder_templates_project_type', ['projectType'])
@Index('IDX_folder_templates_organization', ['organizationId'])
export class FolderTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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
    length: 50,
    name: 'project_type',
    nullable: true,
  })
  projectType?: string;

  @Column({
    type: 'jsonb',
    name: 'folder_structure',
    nullable: false,
  })
  folderStructure!: FolderDefinition[];

  @Column({
    type: 'uuid',
    name: 'organization_id',
    nullable: true,
  })
  organizationId?: string;

  @Column({
    type: 'boolean',
    name: 'is_system',
    nullable: false,
    default: false,
  })
  isSystem!: boolean;

  @Column({
    type: 'boolean',
    name: 'is_active',
    nullable: false,
    default: true,
  })
  isActive!: boolean;

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

  // Helper methods

  /**
   * Get total number of folders in template
   */
  getTotalFolderCount(): number {
    const countFolders = (folders: FolderDefinition[]): number => {
      let count = folders.length;
      for (const folder of folders) {
        if (folder.children && folder.children.length > 0) {
          count += countFolders(folder.children);
        }
      }
      return count;
    };

    return countFolders(this.folderStructure);
  }

  /**
   * Get maximum depth of folder hierarchy
   */
  getMaxDepth(): number {
    const getDepth = (folders: FolderDefinition[], currentDepth = 0): number => {
      if (folders.length === 0) return currentDepth;

      let maxDepth = currentDepth + 1;
      for (const folder of folders) {
        if (folder.children && folder.children.length > 0) {
          const childDepth = getDepth(folder.children, currentDepth + 1);
          maxDepth = Math.max(maxDepth, childDepth);
        }
      }
      return maxDepth;
    };

    return getDepth(this.folderStructure);
  }

  /**
   * Check if template is custom (organization-specific)
   */
  isCustomTemplate(): boolean {
    return this.organizationId !== null && this.organizationId !== undefined;
  }
}
