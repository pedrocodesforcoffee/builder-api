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
import { Drawing } from './drawing.entity';

/**
 * Specification Drawing Entity
 *
 * Junction table linking specification sections to related drawings.
 * Establishes bidirectional references between specs and drawings.
 *
 * Examples:
 * - "See Drawing A-501 for floor plan details" (spec → drawing)
 * - "Refer to Section 09 91 00 for paint specifications" (drawing → spec)
 *
 * Supports navigation and ensures consistency between docs.
 */
@Entity('specification_drawings')
@Index(['specificationId'])
@Index(['drawingId'])
export class SpecificationDrawing {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  specificationId!: string;

  @ManyToOne(() => Specification, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'specificationId' })
  specification!: Specification;

  @Column('uuid')
  drawingId!: string;

  @ManyToOne(() => Drawing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'drawingId' })
  drawing!: Drawing;

  // Describe the relationship
  @Column({ type: 'varchar', length: 255, nullable: true })
  relationship!: string | null; // "Referenced in Part 3", "See for details", "Detail shown on"

  @Column('uuid')
  createdById!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
