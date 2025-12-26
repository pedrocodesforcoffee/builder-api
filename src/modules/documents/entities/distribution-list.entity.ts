import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProjectRole } from '../enums/permission.enums';
import { DrawingDiscipline } from '../enums';

/**
 * Distribution List Entity
 *
 * Pre-defined groups of recipients for transmittals.
 * Can include both manual members and auto-computed members based on criteria.
 */
@Entity('distribution_lists')
@Index(['projectId'])
export class DistributionList {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  projectId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /**
   * Auto-include criteria for computed membership
   * Members matching these criteria are automatically included
   */
  @Column({ type: 'jsonb', nullable: true })
  autoIncludeCriteria!: {
    roles?: ProjectRole[];
    disciplines?: DrawingDiscipline[];
    companies?: string[];
  } | null;

  @OneToMany(() => DistributionListMember, m => m.list)
  members!: DistributionListMember[];

  @Column('uuid')
  createdById!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

/**
 * Distribution List Member Entity
 *
 * Individual members of a distribution list.
 * Can be manually added or auto-included based on criteria.
 */
@Entity('distribution_list_members')
@Index(['listId'])
@Index(['userId'])
export class DistributionListMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  listId!: string;

  @ManyToOne(() => DistributionList, l => l.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listId' })
  list!: DistributionList;

  @Column('uuid', { nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  company!: string | null;

  /**
   * Whether this member was added automatically based on criteria
   * vs manually added by a user
   */
  @Column({ default: false })
  isAutoIncluded!: boolean;

  @CreateDateColumn()
  addedAt!: Date;
}
