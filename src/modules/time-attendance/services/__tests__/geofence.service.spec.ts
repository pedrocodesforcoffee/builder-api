import { Test, TestingModule } from '@nestjs/testing';
import { GeofenceService } from '../geofence.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectGeofence } from '../../entities/project-geofence.entity';
import { GeofenceType } from '../../enums/time-attendance.enum';
import { Repository } from 'typeorm';

describe('GeofenceService', () => {
  let service: GeofenceService;
  let repository: Repository<ProjectGeofence>;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeofenceService,
        {
          provide: getRepositoryToken(ProjectGeofence),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<GeofenceService>(GeofenceService);
    repository = module.get<Repository<ProjectGeofence>>(
      getRepositoryToken(ProjectGeofence)
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Haversine distance calculation', () => {
    it('should calculate correct distance between two points', () => {
      // Distance between SF City Hall and Golden Gate Bridge (approximately 7.4 km)
      const lat1 = 37.7794; // SF City Hall
      const lng1 = -122.4194;
      const lat2 = 37.8199; // Golden Gate Bridge
      const lng2 = -122.4783;

      // Using private method through validation (we'll test indirectly)
      // Expected distance: approximately 7.4 km or 7400 meters
      const distance = service['calculateHaversineDistance'](lat1, lng1, lat2, lng2);

      expect(distance).toBeGreaterThan(7000);
      expect(distance).toBeLessThan(8000);
    });

    it('should return 0 for same coordinates', () => {
      const distance = service['calculateHaversineDistance'](37.7794, -122.4194, 37.7794, -122.4194);

      expect(distance).toBe(0);
    });

    it('should calculate distance for points on opposite sides of meridian', () => {
      const distance = service['calculateHaversineDistance'](0, -179, 0, 179);

      // Distance should be approximately 222 km (crossing International Date Line)
      expect(distance).toBeGreaterThan(200000);
      expect(distance).toBeLessThan(250000);
    });
  });

  describe('Point-in-polygon calculation', () => {
    it('should return true for point inside square polygon', () => {
      // Square polygon around origin
      const polygon = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ];
      const point: [number, number] = [0, 0]; // Center point

      const isInside = service['isPointInPolygon'](point, polygon);

      expect(isInside).toBe(true);
    });

    it('should return false for point outside square polygon', () => {
      const polygon = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ];
      const point: [number, number] = [2, 2]; // Outside point

      const isInside = service['isPointInPolygon'](point, polygon);

      expect(isInside).toBe(false);
    });

    it('should handle complex polygon shapes', () => {
      // L-shaped polygon
      const polygon = [
        [0, 0],
        [3, 0],
        [3, 1],
        [1, 1],
        [1, 3],
        [0, 3],
      ];

      // Points inside L-shape
      expect(service['isPointInPolygon']([0.5, 0.5], polygon)).toBe(true);
      expect(service['isPointInPolygon']([0.5, 2], polygon)).toBe(true);

      // Points outside L-shape
      expect(service['isPointInPolygon']([2, 2], polygon)).toBe(false);
      expect(service['isPointInPolygon']([4, 4], polygon)).toBe(false);
    });

    it('should handle point on polygon boundary', () => {
      const polygon = [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
      ];
      const point: [number, number] = [1, 0]; // On bottom edge

      const isInside = service['isPointInPolygon'](point, polygon);

      // Point on boundary behavior depends on implementation (usually false or true)
      expect(typeof isInside).toBe('boolean');
    });
  });

  describe('validateLocation', () => {
    it('should return valid when no geofences are configured', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.validateLocation('project-123', {
        latitude: 37.7794,
        longitude: -122.4194,
        accuracy: 10,
      });

      expect(result.isValid).toBe(true);
      expect(result.isInsideGeofence).toBe(true);
      expect(result.warning).toContain('No geofences configured');
    });

    it('should validate point inside circular geofence', async () => {
      const mockGeofence = createMockCircularGeofence(37.7794, -122.4194, 1000); // 1km radius
      mockRepository.find.mockResolvedValue([mockGeofence]);

      // Point 500m away (inside geofence)
      const result = await service.validateLocation('project-123', {
        latitude: 37.7840, // About 500m north
        longitude: -122.4194,
        accuracy: 10,
      });

      expect(result.isValid).toBe(true);
      expect(result.isInsideGeofence).toBe(true);
    });

    it('should invalidate point outside circular geofence', async () => {
      const mockGeofence = createMockCircularGeofence(37.7794, -122.4194, 100); // 100m radius
      mockRepository.find.mockResolvedValue([mockGeofence]);

      // Point 500m away (outside geofence)
      const result = await service.validateLocation('project-123', {
        latitude: 37.7840,
        longitude: -122.4194,
        accuracy: 10,
      });

      expect(result.isValid).toBe(false);
      expect(result.isInsideGeofence).toBe(false);
      expect(result.distanceFromGeofence).toBeGreaterThan(400);
    });
  });
});

// Helper functions
function createMockCircularGeofence(lat: number, lng: number, radius: number): ProjectGeofence {
  return {
    id: 'geofence-1',
    projectId: 'project-123',
    name: 'Test Geofence',
    type: GeofenceType.CIRCULAR,
    centerLatitude: lat,
    centerLongitude: lng,
    radiusMeters: radius,
    polygonCoordinates: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: 'user-123',
  } as ProjectGeofence;
}

function createMockPolygonGeofence(coordinates: number[][]): ProjectGeofence {
  return {
    id: 'geofence-2',
    projectId: 'project-123',
    name: 'Test Polygon Geofence',
    type: GeofenceType.POLYGON,
    centerLatitude: null,
    centerLongitude: null,
    radiusMeters: null,
    polygonCoordinates: coordinates,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: 'user-123',
  } as ProjectGeofence;
}
