import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TimeEntry } from './time-entry.entity';
import { User } from '../../users/entities/user.entity';
import { EventType, ClockMethod } from '../enums/time-attendance.enum';

/**
 * ClockEvent Entity
 *
 * Stores individual timestamped events (clock in/out, breaks, lunch) with GPS tracking.
 * Each event validates against project geofences and records location accuracy.
 */
@Entity('clock_events')
@Index(['timeEntryId', 'eventType'])
@Index(['eventTime'])
@Index(['eventType'])
export class ClockEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'timeEntryId' })
  timeEntryId: string;

  @Column({ type: 'enum', enum: EventType })
  eventType: EventType;

  @Column({ type: 'timestamp with time zone' })
  eventTime: Date;

  // GPS data
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    comment: 'GPS latitude coordinate'
  })
  latitude: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    comment: 'GPS longitude coordinate'
  })
  longitude: number | null;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
    comment: 'GPS accuracy in meters'
  })
  accuracy: number | null;

  // Clock method
  @Column({ type: 'enum', enum: ClockMethod })
  clockMethod: ClockMethod;

  // Device information (for mobile/kiosk tracking)
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Device metadata: { deviceType, os, appVersion, deviceId, userAgent }'
  })
  deviceInfo: Record<string, any> | null;

  // Geofence validation results
  @Column({ type: 'boolean', default: false, comment: 'Whether location was inside geofence' })
  geofenceValidated: boolean;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: 'Distance from geofence boundary in meters'
  })
  distanceFromGeofence: number | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Geofence that was validated against'
  })
  geofenceName: string | null;

  // Additional metadata
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'IP address of the clock event (for web/kiosk)'
  })
  ipAddress: string | null;

  // Audit fields
  @Column({ type: 'uuid', name: 'createdById' })
  createdById: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => TimeEntry, (entry) => entry.clockEvents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'timeEntryId' })
  timeEntry: TimeEntry;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  /**
   * Check if GPS location is available
   */
  hasLocation(): boolean {
    return this.latitude !== null && this.longitude !== null;
  }

  /**
   * Check if GPS accuracy is acceptable (< 50 meters)
   */
  hasAccurateLocation(): boolean {
    if (!this.hasLocation()) return false;
    if (this.accuracy === null) return false;
    return this.accuracy <= 50; // 50 meters threshold
  }

  /**
   * Check if event was clocked inside geofence
   */
  isInsideGeofence(): boolean {
    return this.geofenceValidated;
  }

  /**
   * Get location as coordinate pair
   */
  getCoordinates(): [number, number] | null {
    if (!this.hasLocation()) return null;
    return [this.longitude!, this.latitude!];
  }

  /**
   * Check if this is a clock-in event
   */
  isClockIn(): boolean {
    return this.eventType === EventType.CLOCK_IN;
  }

  /**
   * Check if this is a clock-out event
   */
  isClockOut(): boolean {
    return this.eventType === EventType.CLOCK_OUT;
  }

  /**
   * Check if this is a break event
   */
  isBreakEvent(): boolean {
    return (
      this.eventType === EventType.BREAK_START ||
      this.eventType === EventType.BREAK_END ||
      this.eventType === EventType.LUNCH_START ||
      this.eventType === EventType.LUNCH_END
    );
  }

  /**
   * Get formatted event description
   */
  getEventDescription(): string {
    const methodStr = this.clockMethod.replace('_', ' ').toLowerCase();
    const typeStr = this.eventType.replace(/_/g, ' ').toLowerCase();
    return `${typeStr} via ${methodStr}`;
  }
}
