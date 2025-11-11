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
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { RelationshipType } from '../enums/relationship-type.enum';

@Entity('project_relationships')
@Unique(['sourceProjectId', 'targetProjectId', 'relationshipType'])
@Index('IDX_project_relationships_source', ['sourceProjectId'])
@Index('IDX_project_relationships_target', ['targetProjectId'])
@Index('IDX_project_relationships_type', ['relationshipType'])
@Index('IDX_project_relationships_source_target', ['sourceProjectId', 'targetProjectId'])
export class ProjectRelationship {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'source_project_id', nullable: false })
  sourceProjectId!: string;

  @Column({ type: 'uuid', name: 'target_project_id', nullable: false })
  targetProjectId!: string;

  @Column({
    type: 'enum',
    enum: RelationshipType,
    name: 'relationship_type',
    nullable: false,
  })
  relationshipType!: RelationshipType;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy!: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_project_id' })
  sourceProject!: Project;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_project_id' })
  targetProject!: Project;
}