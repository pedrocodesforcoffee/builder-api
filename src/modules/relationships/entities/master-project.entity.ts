import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity('master_projects')
@Index('IDX_master_projects_project', ['projectId'])
@Index('IDX_master_projects_progress', ['aggregatedProgress'])
export class MasterProject {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'project_id', nullable: false, unique: true })
  projectId!: string;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'aggregated_budget',
    nullable: true,
  })
  aggregatedBudget!: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'aggregated_cost',
    nullable: true,
  })
  aggregatedCost!: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'aggregated_progress',
    nullable: true,
    comment: 'Progress percentage 0-100',
  })
  aggregatedProgress!: number;

  @Column({
    type: 'int',
    name: 'total_sub_projects',
    default: 0,
  })
  totalSubProjects!: number;

  @Column({
    type: 'int',
    name: 'active_sub_projects',
    default: 0,
  })
  activeSubProjects!: number;

  @Column({ type: 'date', name: 'earliest_start', nullable: true })
  earliestStart!: Date;

  @Column({ type: 'date', name: 'latest_end', nullable: true })
  latestEnd!: Date;

  @Column({
    type: 'jsonb',
    name: 'aggregated_metrics',
    default: {},
  })
  aggregatedMetrics!: Record<string, any>;

  @Column({
    type: 'timestamp',
    name: 'last_aggregated_at',
    nullable: true,
  })
  lastAggregatedAt!: Date;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @OneToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;
}