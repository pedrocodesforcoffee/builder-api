import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ChangeOrderPackage } from './change-order-package.entity';
import { PotentialChangeOrder } from './potential-change-order.entity';
import { OwnerChangeOrder } from './owner-change-order.entity';
import { CommitmentChangeOrder } from './commitment-change-order.entity';

/**
 * ChangeOrderPackageItem Entity
 *
 * Represents a single change order within a package.
 * Polymorphic relationship - can link to PCO, OCO, or CCO.
 *
 * Features:
 * - Polymorphic reference (change_order_type: PCO/OCO/CCO)
 * - Exactly one of pcoId, ocoId, or ccoId must be set
 * - Ordered display within package
 *
 * @entity change_order_package_items
 */
@Entity('change_order_package_items')
@Index('IDX_co_package_item_package', ['packageId'])
@Index('IDX_co_package_item_pco', ['pcoId'])
@Index('IDX_co_package_item_oco', ['ocoId'])
@Index('IDX_co_package_item_cco', ['ccoId'])
export class ChangeOrderPackageItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'package_id', nullable: false })
  packageId!: string;

  // ==================== POLYMORPHIC RELATIONSHIP ====================

  @Column({
    type: 'varchar',
    length: 50,
    name: 'change_order_type',
    nullable: false,
  })
  changeOrderType!: 'PCO' | 'OCO' | 'CCO';

  @Column({ type: 'uuid', name: 'pco_id', nullable: true })
  pcoId?: string;

  @Column({ type: 'uuid', name: 'oco_id', nullable: true })
  ocoId?: string;

  @Column({ type: 'uuid', name: 'cco_id', nullable: true })
  ccoId?: string;

  // ==================== DISPLAY ORDER ====================

  @Column({ type: 'integer', nullable: false, default: 0 })
  order!: number;

  // ==================== TIMESTAMPS ====================

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  // ==================== RELATIONSHIPS ====================

  @ManyToOne(() => ChangeOrderPackage, (pkg) => pkg.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'package_id' })
  package!: ChangeOrderPackage;

  @ManyToOne(() => PotentialChangeOrder, { nullable: true })
  @JoinColumn({ name: 'pco_id' })
  pco?: PotentialChangeOrder;

  @ManyToOne(() => OwnerChangeOrder, { nullable: true })
  @JoinColumn({ name: 'oco_id' })
  oco?: OwnerChangeOrder;

  @ManyToOne(() => CommitmentChangeOrder, { nullable: true })
  @JoinColumn({ name: 'cco_id' })
  cco?: CommitmentChangeOrder;
}
