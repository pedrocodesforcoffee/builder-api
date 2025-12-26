import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { PermissionTargetType, ProjectRole, DocumentAction } from '../enums/permission.enums';

/**
 * Folder Permission Entity
 *
 * Defines permissions at the folder level for roles, users, or companies.
 * Permissions can be inherited by child folders and documents.
 */
@Entity('folder_permissions')
@Index(['folderId', 'targetType'])
@Index(['folderId', 'userId'])
@Index(['folderId', 'role'])
export class FolderPermission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  @Index()
  folderId!: string;

  @Column({
    type: 'enum',
    enum: PermissionTargetType,
  })
  targetType!: PermissionTargetType;

  // One of these will be set based on targetType
  @Column({ type: 'varchar', length: 50, nullable: true })
  role!: ProjectRole | null;

  @Column('uuid', { nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  company!: string | null;

  /**
   * Granted document actions
   */
  @Column({ type: 'simple-array' })
  actions!: DocumentAction[];

  @Column({ type: 'timestamp', nullable: true })
  expiresAt!: Date | null;

  @Column('uuid')
  grantedById!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
