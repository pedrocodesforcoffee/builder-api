import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Document Project Member Entity
 *
 * NOTE: This is a separate entity from the projects module's ProjectMember
 * Uses table name 'document_project_members' to avoid conflicts
 */
@Entity('document_project_members')
@Index(['projectId', 'userId'], { unique: true, where: '"userId" IS NOT NULL' })
@Index(['projectId', 'inviteEmail'], { unique: true, where: '"inviteEmail" IS NOT NULL' })
export class ProjectMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  @Index()
  projectId!: string;

  @Column('uuid', { nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  inviteEmail!: string | null;

  @Column({ type: 'simple-array' })
  roles!: string[];

  @Column({ type: 'simple-array', nullable: true })
  disciplines!: string[] | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  company!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title!: string | null;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status!: string;

  @Column({ type: 'timestamp', nullable: true })
  accessExpiresAt!: Date | null;

  @Column('uuid')
  invitedById!: string;

  @Column({ type: 'timestamp', nullable: true })
  joinedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
