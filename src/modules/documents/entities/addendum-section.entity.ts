import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Addendum } from './addendum.entity';
import { Specification } from './specification.entity';
import { Document } from './document.entity';

/**
 * Addendum Change Type Enum
 *
 * Defines the type of modification an addendum makes to a specification section.
 */
export enum AddendumChangeType {
  ADD = 'add', // Add new requirement or content
  MODIFY = 'modify', // Modify existing content
  DELETE = 'delete', // Delete/remove content
  CLARIFY = 'clarify', // Clarify without changing requirements
  SUPERSEDE = 'supersede', // Replace entire section
}

/**
 * Addendum Section Entity
 *
 * Junction table linking addenda to the specification sections they affect.
 * Tracks what type of change was made and provides details about the modification.
 *
 * Each record represents one section affected by one addendum.
 * An addendum can affect multiple sections, and a section can be affected
 * by multiple addenda over time.
 */
@Entity('addendum_sections')
@Index(['addendumId'])
@Index(['specificationId'])
export class AddendumSection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  addendumId!: string;

  @ManyToOne(() => Addendum, (a) => a.affectedSections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'addendumId' })
  addendum!: Addendum;

  @Column('uuid')
  specificationId!: string;

  @ManyToOne(() => Specification, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'specificationId' })
  specification!: Specification;

  @Column({
    type: 'enum',
    enum: AddendumChangeType,
  })
  changeType!: AddendumChangeType;

  @Column({ type: 'text' })
  changeDescription!: string; // "Modify Section 2.01.A - Update concrete strength to 4000 psi"

  // For inline changes (small text modifications)
  @Column({ type: 'text', nullable: true })
  newContent!: string | null;

  // For replacement sections (entire section replaced)
  @Column('uuid', { nullable: true })
  newDocumentId!: string | null;

  @ManyToOne(() => Document, { nullable: true })
  @JoinColumn({ name: 'newDocumentId' })
  newDocument!: Document | null;

  @CreateDateColumn()
  createdAt!: Date;
}
