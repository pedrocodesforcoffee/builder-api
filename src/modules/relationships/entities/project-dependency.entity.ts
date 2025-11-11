import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  Check,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { DependencyType } from '../enums/dependency-type.enum';

export enum DependencyImpact {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity('project_dependencies')
@Unique(['predecessorId', 'successorId'])
@Check('"predecessor_id" != "successor_id"')
@Index('IDX_project_dependencies_predecessor', ['predecessorId'])
@Index('IDX_project_dependencies_successor', ['successorId'])
@Index('IDX_project_dependencies_type', ['dependencyType'])
@Index('IDX_project_dependencies_critical', ['isCritical'])
export class ProjectDependency {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'predecessor_id', nullable: false })
  predecessorId!: string;

  @Column({ type: 'uuid', name: 'successor_id', nullable: false })
  successorId!: string;

  @Column({
    type: 'enum',
    enum: DependencyType,
    name: 'dependency_type',
    nullable: false,
  })
  dependencyType!: DependencyType;

  @Column({ type: 'int', name: 'lag_days', default: 0 })
  lagDays!: number;

  @Column({ type: 'boolean', name: 'is_critical', default: false })
  isCritical!: boolean;

  @Column({
    type: 'varchar',
    length: 50,
    enum: DependencyImpact,
    default: DependencyImpact.NONE,
  })
  impact!: DependencyImpact;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'varchar', length: 50, default: 'ACTIVE' })
  status!: string;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy!: string;

  @Column({ type: 'uuid', name: 'updated_by', nullable: true })
  updatedBy!: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'predecessor_id' })
  predecessor!: Project;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'successor_id' })
  successor!: Project;
}