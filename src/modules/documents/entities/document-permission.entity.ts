import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { DocumentAction } from '../enums/permission.enums';

/**
 * Document Permission Entity
 *
 * Defines user-specific permissions for individual documents.
 * Overrides folder and role-based permissions.
 */
@Entity('document_permissions')
@Index(['documentId', 'userId'], { unique: true })
@Index(['documentId'])
@Index(['userId'])
export class DocumentPermission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  documentId!: string;

  @Column('uuid')
  userId!: string;

  /**
   * Granted document actions
   */
  @Column({ type: 'simple-array' })
  actions!: DocumentAction[];

  @Column({ type: 'timestamp', nullable: true })
  expiresAt!: Date | null;

  /**
   * Reason for this permission override
   */
  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column('uuid')
  grantedById!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
