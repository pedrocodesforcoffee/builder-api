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

export enum PortfolioViewType {
  STANDARD = 'STANDARD',
  CUSTOM = 'CUSTOM',
  DASHBOARD = 'DASHBOARD',
}

@Entity('portfolio_views')
@Index('IDX_portfolio_views_organization', ['organizationId'])
@Index('IDX_portfolio_views_type', ['viewType'])
@Index('IDX_portfolio_views_created_by', ['createdBy'])
export class PortfolioView {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id', nullable: false })
  organizationId!: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'view_type',
    enum: PortfolioViewType,
    default: PortfolioViewType.STANDARD,
  })
  viewType!: PortfolioViewType;

  @Column({ type: 'jsonb', default: {} })
  filters!: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  columns!: any[];

  @Column({ type: 'jsonb', name: 'sort_order', default: {} })
  sortOrder!: Record<string, any>;

  @Column({ type: 'boolean', name: 'is_default', default: false })
  isDefault!: boolean;

  @Column({ type: 'boolean', name: 'is_public', default: false })
  isPublic!: boolean;

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