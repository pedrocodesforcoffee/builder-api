import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Document } from './document.entity';
import { AddendumSection } from './addendum-section.entity';

/**
 * Addendum Entity
 *
 * Represents addenda that modify specifications.
 * Addenda are post-issuance changes to specifications, typically issued
 * during bidding or construction to clarify, modify, or supersede spec content.
 *
 * Key features:
 * - Sequential numbering (1, 2, 3 or A, B, C)
 * - Issue date tracking
 * - Links to affected specification sections
 * - Optional full addendum document attachment
 * - RFI/ASI tracking (changes triggered by clarification requests)
 */
@Entity('addenda')
@Index(['projectId', 'number'], { unique: true })
@Index(['projectId', 'issueDate'])
export class Addendum {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  projectId!: string;

  // Identity
  @Column({ type: 'varchar', length: 20 })
  number!: string; // "1", "A", "01", "Addendum 1"

  @Column({ type: 'varchar', length: 255 })
  title!: string; // "Addendum No. 1 - Concrete Clarifications"

  @Column({ type: 'date' })
  issueDate!: Date;

  @Column({ type: 'text' })
  description!: string; // Summary of changes

  // Linked document (full addendum PDF)
  @Column('uuid', { nullable: true })
  documentId!: string | null;

  @ManyToOne(() => Document, { nullable: true })
  @JoinColumn({ name: 'documentId' })
  document!: Document | null;

  // Affected sections (stored in junction table)
  @OneToMany(() => AddendumSection, (as) => as.addendum)
  affectedSections!: AddendumSection[];

  // Related RFIs addressed by this addendum
  @Column({ type: 'simple-array', default: '' })
  relatedRfiIds!: string[];

  // Related submittals affected
  @Column({ type: 'simple-array', default: '' })
  relatedSubmittalIds!: string[];

  // Audit
  @Column('uuid')
  createdById!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt!: Date | null;
}
