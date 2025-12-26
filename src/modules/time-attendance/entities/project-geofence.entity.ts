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
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { GeofenceType } from '../enums/time-attendance.enum';

/**
 * ProjectGeofence Entity
 *
 * Defines geofence boundaries for job sites to validate worker clock-in/out locations.
 * Supports both circular (center point + radius) and polygon (array of coordinates) geofences.
 */
@Entity('project_geofences')
@Index(['projectId', 'isActive'])
export class ProjectGeofence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'projectId' })
  projectId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'enum', enum: GeofenceType })
  type: GeofenceType;

  // For CIRCULAR geofences
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  centerLatitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  centerLongitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: 'Radius in meters' })
  radiusMeters: number | null;

  // For POLYGON geofences
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Array of [longitude, latitude] pairs defining polygon vertices'
  })
  polygonCoordinates: number[][] | null; // [[lng, lat], [lng, lat], ...]

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Audit fields
  @Column({ type: 'uuid', name: 'createdById' })
  createdById: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  /**
   * Validate if geofence configuration is valid
   */
  isValid(): boolean {
    if (this.type === GeofenceType.CIRCULAR) {
      return (
        this.centerLatitude !== null &&
        this.centerLongitude !== null &&
        this.radiusMeters !== null &&
        this.radiusMeters > 0
      );
    }

    if (this.type === GeofenceType.POLYGON) {
      return (
        this.polygonCoordinates !== null &&
        Array.isArray(this.polygonCoordinates) &&
        this.polygonCoordinates.length >= 3 // Minimum 3 points for polygon
      );
    }

    return false;
  }

  /**
   * Get a human-readable description of the geofence
   */
  getDescription(): string {
    if (this.type === GeofenceType.CIRCULAR) {
      return `Circular geofence with ${this.radiusMeters}m radius`;
    }
    return `Polygon geofence with ${this.polygonCoordinates?.length || 0} vertices`;
  }
}
