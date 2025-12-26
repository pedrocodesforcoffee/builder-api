import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Specification } from './specification.entity';

/**
 * Specification Product Entity
 *
 * Tracks products and manufacturers referenced in specification sections.
 * Used for:
 * - Approved manufacturer lists
 * - Base bid vs. substitution tracking
 * - Product data submittal requirements
 * - Material procurement reference
 *
 * Example: "Hilti - HIT-HY 200 - Epoxy Anchor" in Section 03 15 00
 */
@Entity('specification_products')
@Index(['specificationId'])
@Index(['manufacturer'])
@Index(['isBaseBid'])
export class SpecificationProduct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  specificationId!: string;

  @ManyToOne(() => Specification, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'specificationId' })
  specification!: Specification;

  // Product details
  @Column({ type: 'varchar', length: 255 })
  manufacturer!: string; // "Hilti", "USG", "Sherwin-Williams"

  @Column({ type: 'varchar', length: 255 })
  productName!: string; // "HIT-HY 200", "Durock Cement Board"

  @Column({ type: 'varchar', length: 100, nullable: true })
  modelNumber!: string | null; // "HIT-HY 200-R", "Model 3000"

  // Classification
  @Column({ default: true })
  isBaseBid!: boolean; // True if this is the base bid product

  @Column({ default: false })
  isSubstitution!: boolean; // True if this is an acceptable substitution

  // Reference within spec (e.g., "2.01.A", "Part 2 - Section 2.03")
  @Column({ type: 'varchar', length: 50, nullable: true })
  specReference!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
