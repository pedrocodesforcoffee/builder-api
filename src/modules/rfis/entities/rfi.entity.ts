import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { RfiResponse } from './rfi-response.entity';
import { RfiHistory } from './rfi-history.entity';
import { RfiReference } from './rfi-reference.entity';

export enum RfiStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  ANSWERED = 'ANSWERED',
  CLOSED = 'CLOSED',
  VOID = 'VOID',
}

export enum RfiPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum RfiDiscipline {
  ARCHITECTURAL = 'ARCHITECTURAL',
  STRUCTURAL = 'STRUCTURAL',
  MECHANICAL = 'MECHANICAL',
  ELECTRICAL = 'ELECTRICAL',
  PLUMBING = 'PLUMBING',
  FIRE_PROTECTION = 'FIRE_PROTECTION',
  CIVIL = 'CIVIL',
  LANDSCAPE = 'LANDSCAPE',
  GENERAL = 'GENERAL',
  OTHER = 'OTHER',
}

export enum BallInCourt {
  ASSIGNEE = 'ASSIGNEE',
  CREATOR = 'CREATOR',
  MANAGER = 'MANAGER',
}

@Entity('rfis')
@Index(['projectId', 'number'], { unique: true })
@Index(['projectId', 'status'])
@Index(['projectId', 'assignedToId'])
@Index(['projectId', 'dueDate'])
@Index(['projectId', 'discipline'])
export class Rfi {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  // Auto-generated: PROJECT-RFI-0001
  @Column({ type: 'varchar', length: 50 })
  number: string;

  // Sequential number within project
  @Column({ type: 'int' })
  sequenceNumber: number;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  question: string;

  // Rich text/HTML content for detailed questions
  @Column({ type: 'text', nullable: true })
  questionHtml: string;

  @Column({
    type: 'enum',
    enum: RfiStatus,
    default: RfiStatus.DRAFT,
  })
  status: RfiStatus;

  @Column({
    type: 'enum',
    enum: RfiPriority,
    default: RfiPriority.MEDIUM,
  })
  priority: RfiPriority;

  @Column({
    type: 'enum',
    enum: RfiDiscipline,
    default: RfiDiscipline.GENERAL,
  })
  discipline: RfiDiscipline;

  // Location within the project (building, floor, room, grid reference)
  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string;

  // Structured location data
  @Column({ type: 'jsonb', nullable: true })
  locationData: {
    building?: string;
    floor?: string;
    room?: string;
    gridReference?: string;
    coordinates?: { lat: number; lng: number };
  };

  // Due date for response
  @Column({ type: 'timestamp with time zone', nullable: true })
  dueDate: Date;

  // Actual response date
  @Column({ type: 'timestamp with time zone', nullable: true })
  responseDate: Date;

  // Date RFI was officially opened/sent
  @Column({ type: 'timestamp with time zone', nullable: true })
  sentDate: Date;

  // Date RFI was closed
  @Column({ type: 'timestamp with time zone', nullable: true })
  closedDate: Date;

  // Impact tracking
  @Column({ type: 'boolean', default: false })
  hasCostImpact: boolean;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  estimatedCostImpact: number;

  @Column({ type: 'boolean', default: false })
  hasScheduleImpact: boolean;

  @Column({ type: 'int', nullable: true })
  estimatedScheduleImpactDays: number;

  @Column({ type: 'text', nullable: true })
  impactDescription: string;

  // Assignment
  @Column({ type: 'uuid', nullable: true })
  assignedToId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User;

  // Assigned company (for subcontractor RFIs)
  @Column({ type: 'uuid', nullable: true })
  assignedToOrgId: string;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'assignedToOrgId' })
  assignedToOrg: Organization;

  // Ball-in-court tracking
  @Column({
    type: 'enum',
    enum: BallInCourt,
    default: BallInCourt.ASSIGNEE,
  })
  ballInCourt: BallInCourt;

  @Column({ type: 'uuid', nullable: true })
  ballInCourtUserId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'ballInCourtUserId' })
  ballInCourtUser: User;

  // Creator
  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  // Manager who can close
  @Column({ type: 'uuid', nullable: true })
  managerId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'managerId' })
  manager: User;

  // Distribution list (CC'd users)
  @Column({ type: 'uuid', array: true, default: [] })
  distributionList: string[];

  // Spec section reference (e.g., "03 30 00 - Cast-in-Place Concrete")
  @Column({ type: 'varchar', length: 100, nullable: true })
  specSection: string;

  // Drawing references (quick reference, detailed in RfiReference)
  @Column({ type: 'varchar', array: true, default: [] })
  drawingReferences: string[];

  // Official response (final answer)
  @Column({ type: 'text', nullable: true })
  officialResponse: string;

  @Column({ type: 'text', nullable: true })
  officialResponseHtml: string;

  // Response days calculation
  @Column({ type: 'int', nullable: true })
  responseDays: number;

  // SLA tracking
  @Column({ type: 'int', default: 7 })
  slaResponseDays: number;

  @Column({ type: 'boolean', default: false })
  isOverdue: boolean;

  @Column({ type: 'int', nullable: true })
  daysOverdue: number;

  // Private/internal flag
  @Column({ type: 'boolean', default: false })
  isPrivate: boolean;

  // Void reason if voided
  @Column({ type: 'text', nullable: true })
  voidReason: string;

  // Linked change order if cost impact approved
  @Column({ type: 'uuid', nullable: true })
  linkedChangeOrderId: string;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => RfiResponse, (response) => response.rfi)
  responses: RfiResponse[];

  @OneToMany(() => RfiHistory, (history) => history.rfi)
  history: RfiHistory[];

  @OneToMany(() => RfiReference, (reference) => reference.rfi)
  references: RfiReference[];
}
