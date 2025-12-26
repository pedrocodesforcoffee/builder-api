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
 * Specification RFI Entity
 *
 * Junction table linking specification sections to RFIs (Requests for Information).
 * Tracks which specification sections have been questioned or clarified via RFIs.
 *
 * Common use cases:
 * - Contractor requests clarification on ambiguous spec language
 * - Questions about product substitutions
 * - Clarification of conflicting requirements
 * - Material/method approval requests
 *
 * Note: RFI entity would typically be in a separate module (e.g., communications/rfi module).
 * This stores the relationship between specs and RFIs.
 */
@Entity('specification_rfis')
@Index(['specificationId'])
@Index(['rfiId'])
export class SpecificationRfi {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  specificationId!: string;

  @ManyToOne(() => Specification, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'specificationId' })
  specification!: Specification;

  @Column('uuid')
  rfiId!: string;

  // Note: RFI entity would be in a different module
  // @ManyToOne(() => RFI, { onDelete: 'CASCADE' })
  // @JoinColumn({ name: 'rfiId' })
  // rfi: RFI;

  // Context about the relationship
  @Column({ type: 'text', nullable: true })
  context!: string | null; // "Clarification requested for Section 2.01.B - concrete strength"

  @Column('uuid')
  createdById!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
