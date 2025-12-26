import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  RelationId,
} from 'typeorm';
import { Rfi } from './rfi.entity';
import { User } from '../../users/entities/user.entity';

export enum RfiResponseType {
  RESPONSE = 'RESPONSE',           // Direct answer
  CLARIFICATION = 'CLARIFICATION', // Request for more info
  COMMENT = 'COMMENT',             // General comment
  FORWARD = 'FORWARD',             // Forwarded to another party
  DELEGATION = 'DELEGATION',       // Delegated response
}

@Entity('rfi_responses')
// Note: Index on (rfiId, createdAt) is defined in migration CreateRfiTables1734460800000
export class RfiResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Rfi, (rfi) => rfi.responses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfiId' })
  rfi: Rfi;

  @RelationId((response: RfiResponse) => response.rfi)
  rfiId: string;

  @Column({
    type: 'enum',
    enum: RfiResponseType,
    default: RfiResponseType.RESPONSE,
  })
  responseType: RfiResponseType;

  @Column({ type: 'text' })
  response: string;

  @Column({ type: 'text', nullable: true })
  responseHtml: string;

  @Column({ type: 'uuid' })
  responderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'responderId' })
  responder: User;

  // Attachments (document IDs from document management system)
  @Column({ type: 'uuid', array: true, default: [] })
  attachmentIds: string[];

  // If this is the official/accepted response
  @Column({ type: 'boolean', default: false })
  isOfficial: boolean;

  // If forwarded, who was it forwarded to
  @Column({ type: 'uuid', nullable: true })
  forwardedToId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'forwardedToId' })
  forwardedTo: User;

  @Column({ type: 'text', nullable: true })
  forwardNote: string;

  // Internal only (not visible to external parties)
  @Column({ type: 'boolean', default: false })
  isInternal: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
