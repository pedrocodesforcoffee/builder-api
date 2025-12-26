import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { ProgramType } from '../enums/program-type.enum';

@Entity('project_programs')
@Index('IDX_project_programs_organization', ['organizationId'])
@Index('IDX_project_programs_type', ['programType'])
@Index('IDX_project_programs_status', ['status'])
export class ProjectProgram {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id', nullable: false })
  organizationId!: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({
    type: 'enum',
    enum: ProgramType,
    name: 'program_type',
    nullable: false,
  })
  programType!: ProgramType;

  @Column({ type: 'date', name: 'start_date', nullable: true })
  startDate!: Date;

  @Column({ type: 'date', name: 'end_date', nullable: true })
  endDate!: Date;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'target_budget',
    nullable: true,
  })
  targetBudget!: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'actual_cost',
    nullable: true,
  })
  actualCost!: number;

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
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;
}