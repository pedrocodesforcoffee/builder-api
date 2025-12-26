import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Commitment } from './commitment.entity';
import { CostCode } from './cost-code.entity';
import { BudgetCategory } from '../enums/budget-category.enum';

/**
 * CommitmentItem Entity
 *
 * Represents a line item within a commitment (subcontract or purchase order).
 * Maps committed costs to specific cost codes and categories.
 *
 * @entity commitment_items
 */
@Entity('commitment_items')
@Index('IDX_commitment_items_commitment', ['commitmentId'])
@Index('IDX_commitment_items_cost_code', ['costCodeId'])
export class CommitmentItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'uuid',
    name: 'commitment_id',
    nullable: false,
  })
  commitmentId!: string;

  @Column({
    type: 'uuid',
    name: 'cost_code_id',
    nullable: false,
  })
  costCodeId!: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  category!: BudgetCategory;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 4,
    nullable: true,
  })
  quantity?: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 4,
    name: 'unit_cost',
    nullable: true,
  })
  unitCost?: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
  })
  amount!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
  })
  updatedAt!: Date;

  @ManyToOne(() => Commitment, (commitment) => commitment.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'commitment_id' })
  commitment!: Commitment;

  @ManyToOne(() => CostCode, { nullable: false })
  @JoinColumn({ name: 'cost_code_id' })
  costCode!: CostCode;
}
