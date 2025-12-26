import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { FieldNoteType } from '../enums/field-note.enum';

/**
 * Field Note Template entity for creating reusable note structures
 * Supports both system-wide templates and organization-specific templates
 */
@Entity('field_note_templates')
@Index(['organizationId', 'noteType'])
@Index(['isSystem', 'isActive'])
export class FieldNoteTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Template name
   */
  @Column({ type: 'varchar', length: 255 })
  name: string;

  /**
   * Template description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Type of field note this template is for
   */
  @Column({ type: 'enum', enum: FieldNoteType })
  noteType: FieldNoteType;

  /**
   * System template flag
   * System templates are predefined and cannot be edited/deleted
   */
  @Column({ type: 'boolean', default: false })
  isSystem: boolean;

  /**
   * Active flag
   */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Template field definitions
   * Stores the structure of fields that should be filled when using this template
   */
  @Column({ type: 'jsonb' })
  templateFields: {
    fields: Array<{
      key: string; // Unique identifier for the field
      label: string; // Display label
      type: 'text' | 'textarea' | 'number' | 'date' | 'time' | 'datetime' | 'select' | 'multiselect' | 'checkbox' | 'radio';
      required: boolean;
      placeholder?: string;
      defaultValue?: any;
      options?: Array<{ label: string; value: string }>; // For select/radio fields
      validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        minLength?: number;
        maxLength?: number;
      };
      helpText?: string;
    }>;
  };

  /**
   * Default values for certain field note properties
   * These will be applied when creating a note from this template
   */
  @Column({ type: 'jsonb', nullable: true })
  defaultValues: {
    priority?: string;
    visibility?: string;
    tags?: string[];
    followUpRequired?: boolean;
  } | null;

  /**
   * Template category for organization
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  /**
   * Display order (for sorting in UI)
   */
  @Column({ type: 'integer', default: 0 })
  displayOrder: number;

  /**
   * Usage count (incremented each time template is used)
   */
  @Column({ type: 'integer', default: 0 })
  usageCount: number;

  /**
   * Organization ID (null for system templates)
   */
  @Column({ type: 'uuid', nullable: true })
  organizationId: string | null;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization | null;

  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ type: 'uuid', nullable: true })
  updatedById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedById' })
  updatedBy: User | null;

  @CreateDateColumn({
    name: 'createdAt',
    type: 'timestamp with time zone',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updatedAt',
    type: 'timestamp with time zone',
  })
  updatedAt: Date;

  // Helper methods

  /**
   * Check if template can be edited
   */
  canEdit(): boolean {
    return !this.isSystem;
  }

  /**
   * Check if template can be deleted
   */
  canDelete(): boolean {
    return !this.isSystem && this.usageCount === 0;
  }

  /**
   * Increment usage count
   */
  incrementUsage(): void {
    this.usageCount += 1;
  }
}
