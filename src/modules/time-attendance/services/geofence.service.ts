import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectGeofence } from '../entities/project-geofence.entity';
import { CreateProjectGeofenceDto, UpdateProjectGeofenceDto, ValidateLocationDto, GeofenceValidationResultDto } from '../dto/geofence.dto';
import { GeofenceType } from '../enums/time-attendance.enum';

/**
 * GeofenceService
 *
 * Handles geofence CRUD operations and GPS validation using:
 * - Haversine formula for distance calculations
 * - Ray casting algorithm for point-in-polygon tests
 */
@Injectable()
export class GeofenceService {
  // Earth's radius in meters
  private readonly EARTH_RADIUS_METERS = 6371000;

  // Default tolerance for geofence warnings (meters)
  private readonly WARNING_DISTANCE_METERS = 100;

  constructor(
    @InjectRepository(ProjectGeofence)
    private readonly geofenceRepository: Repository<ProjectGeofence>,
  ) {}

  /**
   * Create a new geofence for a project
   */
  async create(projectId: string, dto: CreateProjectGeofenceDto, userId: string): Promise<ProjectGeofence> {
    // Validate geofence configuration based on type
    this.validateGeofenceDto(dto);

    const geofence = this.geofenceRepository.create({
      projectId,
      name: dto.name,
      type: dto.type,
      centerLatitude: dto.centerLatitude,
      centerLongitude: dto.centerLongitude,
      radiusMeters: dto.radiusMeters,
      polygonCoordinates: dto.polygonCoordinates,
      isActive: dto.isActive ?? true,
      createdById: userId,
    });

    return await this.geofenceRepository.save(geofence);
  }

  /**
   * Find all geofences for a project
   */
  async findAll(projectId: string, activeOnly = true): Promise<ProjectGeofence[]> {
    const query = this.geofenceRepository
      .createQueryBuilder('geofence')
      .where('geofence.projectId = :projectId', { projectId });

    if (activeOnly) {
      query.andWhere('geofence.isActive = :isActive', { isActive: true });
    }

    return await query
      .orderBy('geofence.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Find a geofence by ID
   */
  async findOne(id: string): Promise<ProjectGeofence> {
    const geofence = await this.geofenceRepository.findOne({ where: { id } });

    if (!geofence) {
      throw new NotFoundException(`Geofence with ID ${id} not found`);
    }

    return geofence;
  }

  /**
   * Update a geofence
   */
  async update(id: string, dto: UpdateProjectGeofenceDto): Promise<ProjectGeofence> {
    const geofence = await this.findOne(id);

    // Validate updated configuration
    if (dto.type || dto.centerLatitude || dto.radiusMeters || dto.polygonCoordinates) {
      const mergedDto = { ...geofence, ...dto };
      this.validateGeofenceDto(mergedDto as any);
    }

    Object.assign(geofence, dto);

    return await this.geofenceRepository.save(geofence);
  }

  /**
   * Delete a geofence (soft delete by setting isActive = false)
   */
  async remove(id: string): Promise<void> {
    const geofence = await this.findOne(id);
    geofence.isActive = false;
    await this.geofenceRepository.save(geofence);
  }

  /**
   * Get active geofences for a project
   */
  async getActiveGeofences(projectId: string): Promise<ProjectGeofence[]> {
    return await this.findAll(projectId, true);
  }

  /**
   * Validate a location against all active geofences for a project
   */
  async validateLocation(projectId: string, dto: ValidateLocationDto): Promise<GeofenceValidationResultDto> {
    const geofences = await this.getActiveGeofences(projectId);

    if (geofences.length === 0) {
      // No geofences configured - allow by default with warning
      return {
        isValid: true,
        isInsideGeofence: true,
        validatedAt: new Date(),
        warning: 'No geofences configured for this project',
      };
    }

    // Check each geofence
    let closestGeofence: ProjectGeofence | null = null;
    let shortestDistance = Infinity;
    let isInside = false;

    for (const geofence of geofences) {
      const result = this.checkGeofence(geofence, dto.latitude, dto.longitude);

      if (result.isInside) {
        isInside = true;
        closestGeofence = geofence;
        shortestDistance = 0;
        break; // Inside a geofence, no need to check others
      }

      if (result.distance < shortestDistance) {
        shortestDistance = result.distance;
        closestGeofence = geofence;
      }
    }

    // Determine if location is valid
    const isValid = isInside || shortestDistance <= this.WARNING_DISTANCE_METERS;

    return {
      isValid,
      isInsideGeofence: isInside,
      distanceFromGeofence: Math.round(shortestDistance * 100) / 100,
      geofenceName: closestGeofence?.name,
      geofenceId: closestGeofence?.id,
      validatedAt: new Date(),
      warning: !isInside && isValid
        ? `Location is ${Math.round(shortestDistance)}m outside geofence (within tolerance)`
        : !isValid
        ? `Location is ${Math.round(shortestDistance)}m outside geofence (exceeds tolerance)`
        : undefined,
    };
  }

  /**
   * Check if a point is inside a specific geofence
   */
  private checkGeofence(geofence: ProjectGeofence, latitude: number, longitude: number): { isInside: boolean; distance: number } {
    if (geofence.type === GeofenceType.CIRCULAR) {
      const distance = this.calculateHaversineDistance(
        geofence.centerLatitude!,
        geofence.centerLongitude!,
        latitude,
        longitude
      );

      return {
        isInside: distance <= geofence.radiusMeters!,
        distance: Math.max(0, distance - geofence.radiusMeters!), // Distance outside boundary
      };
    }

    if (geofence.type === GeofenceType.POLYGON) {
      const isInside = this.isPointInPolygon([longitude, latitude], geofence.polygonCoordinates!);

      // For polygons, calculate distance to nearest edge (approximation)
      const distance = isInside ? 0 : this.calculateDistanceToPolygon([longitude, latitude], geofence.polygonCoordinates!);

      return { isInside, distance };
    }

    return { isInside: false, distance: Infinity };
  }

  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   * Returns distance in meters
   */
  private calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    // Convert degrees to radians
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    // Haversine formula
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Distance in meters
    return this.EARTH_RADIUS_METERS * c;
  }

  /**
   * Check if a point is inside a polygon using ray casting algorithm
   * Point format: [longitude, latitude]
   * Polygon format: [[lng, lat], [lng, lat], ...]
   */
  private isPointInPolygon(point: [number, number], polygon: number[][]): boolean {
    const [x, y] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];

      // Ray casting: check if horizontal ray from point intersects edge
      const intersect =
        yi > y !== yj > y && // One vertex above, one below
        x < ((xj - xi) * (y - yi)) / (yj - yi) + xi; // Ray intersects edge

      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Calculate approximate distance from point to polygon (in meters)
   * Uses distance to nearest vertex as approximation
   */
  private calculateDistanceToPolygon(point: [number, number], polygon: number[][]): number {
    const [lng, lat] = point;
    let minDistance = Infinity;

    // Calculate distance to each vertex
    for (const [vertexLng, vertexLat] of polygon) {
      const distance = this.calculateHaversineDistance(lat, lng, vertexLat, vertexLng);
      minDistance = Math.min(minDistance, distance);
    }

    return minDistance;
  }

  /**
   * Validate geofence DTO configuration
   */
  private validateGeofenceDto(dto: CreateProjectGeofenceDto | UpdateProjectGeofenceDto): void {
    if (dto.type === GeofenceType.CIRCULAR) {
      if (dto.centerLatitude === undefined || dto.centerLongitude === undefined || dto.radiusMeters === undefined) {
        throw new BadRequestException('Circular geofence requires centerLatitude, centerLongitude, and radiusMeters');
      }

      if (dto.radiusMeters <= 0) {
        throw new BadRequestException('Radius must be greater than 0');
      }

      if (dto.radiusMeters > 10000) {
        throw new BadRequestException('Radius cannot exceed 10,000 meters');
      }
    }

    if (dto.type === GeofenceType.POLYGON) {
      if (!dto.polygonCoordinates || !Array.isArray(dto.polygonCoordinates)) {
        throw new BadRequestException('Polygon geofence requires polygonCoordinates array');
      }

      if (dto.polygonCoordinates.length < 3) {
        throw new BadRequestException('Polygon must have at least 3 vertices');
      }

      // Validate each coordinate pair
      for (const coord of dto.polygonCoordinates) {
        if (!Array.isArray(coord) || coord.length !== 2) {
          throw new BadRequestException('Each coordinate must be [longitude, latitude]');
        }

        const [lng, lat] = coord;
        if (typeof lng !== 'number' || typeof lat !== 'number') {
          throw new BadRequestException('Coordinates must be numbers');
        }

        if (lat < -90 || lat > 90) {
          throw new BadRequestException('Latitude must be between -90 and 90');
        }

        if (lng < -180 || lng > 180) {
          throw new BadRequestException('Longitude must be between -180 and 180');
        }
      }
    }
  }
}
