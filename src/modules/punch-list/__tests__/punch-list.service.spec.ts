import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PunchListService } from '../services/punch-list.service';
import { ProjectLocation } from '../entities/project-location.entity';
import { PunchList } from '../entities/punch-list.entity';
import { PunchItem } from '../entities/punch-item.entity';
import { PunchItemPhoto } from '../entities/punch-item-photo.entity';
import { PunchItemHistory } from '../entities/punch-item-history.entity';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import {
  PunchItemStatus,
  PunchItemPriority,
  BallInCourt,
} from '../enums/punch-list.enum';

describe('PunchListService', () => {
  let service: PunchListService;
  let locationRepository: any;
  let punchListRepository: any;
  let punchItemRepository: any;
  let photoRepository: any;
  let historyRepository: any;
  let projectRepository: any;
  let userRepository: any;
  let dataSource: any;

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
  };

  const mockLocation = {
    id: 'location-123',
    projectId: 'project-123',
    name: 'Building A',
    code: 'BLDG-A',
    type: 'BUILDING',
    createdById: 'user-123',
  };

  const mockPunchList = {
    id: 'punchlist-123',
    projectId: 'project-123',
    name: 'Pre-Final Walkthrough',
    type: 'PRE_FINAL',
    isActive: true,
    isLocked: false,
    totalItems: 0,
    openItems: 0,
    inProgressItems: 0,
    completedItems: 0,
    createdById: 'user-123',
  };

  const mockPunchItem = {
    id: 'item-123',
    punchListId: 'punchlist-123',
    projectId: 'project-123',
    locationId: 'location-123',
    description: 'Paint touchup required',
    status: PunchItemStatus.OPEN,
    priority: PunchItemPriority.MEDIUM,
    category: 'FINISHES',
    ballInCourt: BallInCourt.SUBCONTRACTOR,
    createdById: 'user-123',
    punchList: mockPunchList,
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PunchListService,
        {
          provide: getRepositoryToken(ProjectLocation),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            findDescendants: jest.fn(),
            findDescendantsTree: jest.fn(),
            findAncestors: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PunchList),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            remove: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PunchItem),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PunchItemPhoto),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PunchItemHistory),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(() => mockQueryRunner),
          },
        },
      ],
    }).compile();

    service = module.get<PunchListService>(PunchListService);
    locationRepository = module.get(getRepositoryToken(ProjectLocation));
    punchListRepository = module.get(getRepositoryToken(PunchList));
    punchItemRepository = module.get(getRepositoryToken(PunchItem));
    photoRepository = module.get(getRepositoryToken(PunchItemPhoto));
    historyRepository = module.get(getRepositoryToken(PunchItemHistory));
    projectRepository = module.get(getRepositoryToken(Project));
    userRepository = module.get(getRepositoryToken(User));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // LOCATION TESTS
  // ============================================================================

  describe('createLocation', () => {
    const createDto = {
      projectId: 'project-123',
      name: 'Building A',
      code: 'BLDG-A',
      type: 'BUILDING' as any,
      sortOrder: 1,
    };

    it('should create a location successfully', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      locationRepository.findOne.mockResolvedValue(null);
      locationRepository.create.mockReturnValue(mockLocation);
      locationRepository.save.mockResolvedValue(mockLocation);

      const result = await service.createLocation(createDto, mockUser as any);

      expect(result).toEqual(mockLocation);
      expect(locationRepository.create).toHaveBeenCalledWith({
        ...createDto,
        parent: null,
        createdById: mockUser.id,
      });
    });

    it('should throw NotFoundException if project not found', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createLocation(createDto, mockUser as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if code already exists', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      locationRepository.findOne.mockResolvedValue(mockLocation);

      await expect(
        service.createLocation(createDto, mockUser as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create location with parent', async () => {
      const parentLocation = { ...mockLocation, id: 'parent-123' };
      const dtoWithParent = { ...createDto, parentId: 'parent-123' };

      projectRepository.findOne.mockResolvedValue(mockProject);
      locationRepository.findOne
        .mockResolvedValueOnce(null) // Check for duplicate
        .mockResolvedValueOnce(parentLocation); // Get parent
      locationRepository.create.mockReturnValue(mockLocation);
      locationRepository.save.mockResolvedValue(mockLocation);

      await service.createLocation(dtoWithParent, mockUser as any);

      expect(locationRepository.create).toHaveBeenCalledWith({
        ...dtoWithParent,
        parent: parentLocation,
        createdById: mockUser.id,
      });
    });
  });

  describe('getLocationTree', () => {
    it('should return location tree for project', async () => {
      const roots = [mockLocation];
      const tree = { ...mockLocation, children: [] };

      locationRepository.find.mockResolvedValue(roots);
      locationRepository.findDescendantsTree.mockResolvedValue(tree);

      const result = await service.getLocationTree('project-123');

      expect(result).toEqual([tree]);
      expect(locationRepository.find).toHaveBeenCalledWith({
        where: expect.objectContaining({ projectId: 'project-123' }),
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    });
  });

  describe('updateLocation', () => {
    it('should update location successfully', async () => {
      const updateDto = { name: 'Building A - Updated' };
      const updatedLocation = { ...mockLocation, ...updateDto };

      locationRepository.findOne.mockResolvedValue(mockLocation);
      locationRepository.findAncestors.mockResolvedValue([mockLocation]);
      locationRepository.save.mockResolvedValue(updatedLocation);
      punchItemRepository.count.mockResolvedValue(0);

      const result = await service.updateLocation(
        'location-123',
        updateDto,
        mockUser as any,
      );

      expect(result).toEqual(updatedLocation);
    });

    it('should prevent circular parent reference', async () => {
      const updateDto = { parentId: 'descendant-123' };
      const descendant = { id: 'descendant-123', name: 'Descendant' };

      locationRepository.findOne
        .mockResolvedValueOnce(mockLocation) // Get location
        .mockResolvedValueOnce(descendant); // Get new parent
      locationRepository.findAncestors.mockResolvedValue([mockLocation]);
      punchItemRepository.count.mockResolvedValue(0);
      locationRepository.findDescendants.mockResolvedValue([
        mockLocation,
        descendant,
      ]);

      await expect(
        service.updateLocation('location-123', updateDto, mockUser as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteLocation', () => {
    it('should delete location successfully', async () => {
      locationRepository.findOne.mockResolvedValue(mockLocation);
      locationRepository.findAncestors.mockResolvedValue([mockLocation]);
      punchItemRepository.count.mockResolvedValue(0);
      locationRepository.findDescendants.mockResolvedValue([mockLocation]);
      locationRepository.remove.mockResolvedValue(mockLocation);

      await service.deleteLocation('location-123');

      expect(locationRepository.remove).toHaveBeenCalledWith(mockLocation);
    });

    it('should throw BadRequestException if location has punch items', async () => {
      locationRepository.findOne.mockResolvedValue(mockLocation);
      locationRepository.findAncestors.mockResolvedValue([mockLocation]);
      punchItemRepository.count.mockResolvedValue(5);

      await expect(service.deleteLocation('location-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if location has children', async () => {
      const child = { id: 'child-123', name: 'Child' };
      locationRepository.findOne.mockResolvedValue(mockLocation);
      locationRepository.findAncestors.mockResolvedValue([mockLocation]);
      punchItemRepository.count.mockResolvedValue(0);
      locationRepository.findDescendants.mockResolvedValue([
        mockLocation,
        child,
      ]);

      await expect(service.deleteLocation('location-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================================
  // PUNCH LIST TESTS
  // ============================================================================

  describe('createPunchList', () => {
    const createDto = {
      projectId: 'project-123',
      name: 'Pre-Final Walkthrough',
      type: 'PRE_FINAL' as any,
      description: 'Items for pre-final inspection',
    };

    it('should create punch list successfully', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      punchListRepository.create.mockReturnValue(mockPunchList);
      punchListRepository.save.mockResolvedValue(mockPunchList);

      const result = await service.createPunchList(createDto, mockUser as any);

      expect(result).toEqual(mockPunchList);
      expect(punchListRepository.create).toHaveBeenCalledWith({
        ...createDto,
        createdById: mockUser.id,
        updatedById: mockUser.id,
      });
    });

    it('should throw NotFoundException if project not found', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createPunchList(createDto, mockUser as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePunchList', () => {
    it('should update punch list successfully', async () => {
      const updateDto = { name: 'Updated Name' };
      const updatedList = { ...mockPunchList, ...updateDto };

      punchListRepository.findOne.mockResolvedValue(mockPunchList);
      punchListRepository.save.mockResolvedValue(updatedList);
      punchItemRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total: '0',
          openItems: '0',
          inProgressItems: '0',
          completedItems: '0',
        }),
      });

      const result = await service.updatePunchList(
        'punchlist-123',
        updateDto,
        mockUser as any,
      );

      expect(punchListRepository.save).toHaveBeenCalled();
    });
  });

  describe('deletePunchList', () => {
    it('should delete punch list successfully', async () => {
      punchListRepository.findOne.mockResolvedValue(mockPunchList);
      punchItemRepository.count.mockResolvedValue(0);
      punchItemRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total: '0',
          openItems: '0',
          inProgressItems: '0',
          completedItems: '0',
        }),
      });
      punchListRepository.remove.mockResolvedValue(mockPunchList);

      await service.deletePunchList('punchlist-123');

      expect(punchListRepository.remove).toHaveBeenCalledWith(mockPunchList);
    });

    it('should throw BadRequestException if punch list is locked', async () => {
      const lockedList = { ...mockPunchList, isLocked: true };
      punchListRepository.findOne.mockResolvedValue(lockedList);
      punchItemRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total: '0',
          openItems: '0',
          inProgressItems: '0',
          completedItems: '0',
        }),
      });

      await expect(service.deletePunchList('punchlist-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if punch list has items', async () => {
      punchListRepository.findOne.mockResolvedValue(mockPunchList);
      punchItemRepository.count.mockResolvedValue(5);
      punchItemRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total: '5',
          openItems: '5',
          inProgressItems: '0',
          completedItems: '0',
        }),
      });

      await expect(service.deletePunchList('punchlist-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================================
  // PUNCH ITEM TESTS
  // ============================================================================

  describe('createPunchItem', () => {
    const createDto = {
      punchListId: 'punchlist-123',
      projectId: 'project-123',
      locationId: 'location-123',
      description: 'Paint touchup required',
      priority: PunchItemPriority.MEDIUM,
      category: 'FINISHES' as any,
    };

    it('should create punch item successfully', async () => {
      punchListRepository.findOne.mockResolvedValue(mockPunchList);
      punchItemRepository.create.mockReturnValue(mockPunchItem);
      mockQueryRunner.manager.save.mockResolvedValue(mockPunchItem);
      historyRepository.create.mockReturnValue({});
      punchItemRepository.findOne.mockResolvedValue({
        ...mockPunchItem,
        punchList: mockPunchList,
        location: mockLocation,
        createdBy: mockUser,
      });
      punchItemRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total: '1',
          openItems: '1',
          inProgressItems: '0',
          completedItems: '0',
        }),
      });

      const result = await service.createPunchItem(createDto, mockUser as any);

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if punch list not found', async () => {
      punchListRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createPunchItem(createDto, mockUser as any),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if punch list is locked', async () => {
      const lockedList = { ...mockPunchList, isLocked: true };
      punchListRepository.findOne.mockResolvedValue(lockedList);

      await expect(
        service.createPunchItem(createDto, mockUser as any),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('changeStatus', () => {
    const statusDto = {
      status: PunchItemStatus.IN_PROGRESS,
      comment: 'Started work',
    };

    it('should change status successfully', async () => {
      const updatedItem = { ...mockPunchItem, status: statusDto.status };
      punchItemRepository.findOne.mockResolvedValue({
        ...mockPunchItem,
        punchList: mockPunchList,
      });
      punchItemRepository.save.mockResolvedValue(updatedItem);
      historyRepository.create.mockReturnValue({});
      historyRepository.save.mockResolvedValue({});
      punchItemRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total: '1',
          openItems: '0',
          inProgressItems: '1',
          completedItems: '0',
        }),
      });

      await service.changeStatus('item-123', statusDto, mockUser as any);

      expect(punchItemRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PunchItemStatus.IN_PROGRESS,
        }),
      );
    });

    it('should set completedDate when status is APPROVED', async () => {
      const approveDto = { status: PunchItemStatus.APPROVED };
      punchItemRepository.findOne.mockResolvedValue({
        ...mockPunchItem,
        punchList: mockPunchList,
      });
      punchItemRepository.save.mockResolvedValue({
        ...mockPunchItem,
        status: PunchItemStatus.APPROVED,
      });
      historyRepository.create.mockReturnValue({});
      historyRepository.save.mockResolvedValue({});
      punchItemRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total: '1',
          openItems: '0',
          inProgressItems: '0',
          completedItems: '1',
        }),
      });

      await service.changeStatus('item-123', approveDto, mockUser as any);

      expect(punchItemRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          completedDate: expect.any(Date),
        }),
      );
    });

    it('should throw BadRequestException if punch list is locked', async () => {
      const lockedList = { ...mockPunchList, isLocked: true };
      punchItemRepository.findOne.mockResolvedValue({
        ...mockPunchItem,
        punchList: lockedList,
      });

      await expect(
        service.changeStatus('item-123', statusDto, mockUser as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('assignPunchItem', () => {
    const assignDto = {
      assignedToId: 'user-456',
      comment: 'Assigning to John',
      dueDate: '2025-12-31',
    };

    it('should assign punch item successfully', async () => {
      const assignedUser = { id: 'user-456', name: 'John Doe' };
      punchItemRepository.findOne.mockResolvedValue({
        ...mockPunchItem,
        punchList: mockPunchList,
      });
      userRepository.findOne.mockResolvedValue(assignedUser);
      punchItemRepository.save.mockResolvedValue({
        ...mockPunchItem,
        assignedToId: 'user-456',
      });
      historyRepository.create.mockReturnValue({});
      historyRepository.save.mockResolvedValue({});

      await service.assignPunchItem('item-123', assignDto, mockUser as any);

      expect(punchItemRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          assignedToId: 'user-456',
          dueDate: expect.any(Date),
        }),
      );
    });

    it('should throw NotFoundException if assigned user not found', async () => {
      punchItemRepository.findOne.mockResolvedValue({
        ...mockPunchItem,
        punchList: mockPunchList,
      });
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assignPunchItem('item-123', assignDto, mockUser as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkUpdatePunchItems', () => {
    const bulkDto = {
      itemIds: ['item-123', 'item-456'],
      status: PunchItemStatus.IN_PROGRESS,
      priority: PunchItemPriority.HIGH,
    };

    it('should bulk update multiple items successfully', async () => {
      punchItemRepository.findOne
        .mockResolvedValueOnce({
          ...mockPunchItem,
          id: 'item-123',
          punchList: mockPunchList,
        })
        .mockResolvedValueOnce({
          ...mockPunchItem,
          id: 'item-456',
          punchList: mockPunchList,
        });
      punchItemRepository.save.mockResolvedValue({});
      historyRepository.create.mockReturnValue({});
      historyRepository.save.mockResolvedValue({});
      punchItemRepository.find.mockResolvedValue([
        { punchListId: 'punchlist-123' },
        { punchListId: 'punchlist-123' },
      ]);
      punchItemRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total: '2',
          openItems: '0',
          inProgressItems: '2',
          completedItems: '0',
        }),
      });

      const result = await service.bulkUpdatePunchItems(
        bulkDto,
        mockUser as any,
      );

      expect(result.updated).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle errors for locked punch lists', async () => {
      const lockedList = { ...mockPunchList, isLocked: true };
      punchItemRepository.findOne
        .mockResolvedValueOnce({
          ...mockPunchItem,
          id: 'item-123',
          punchList: lockedList,
        })
        .mockResolvedValueOnce({
          ...mockPunchItem,
          id: 'item-456',
          punchList: mockPunchList,
        });
      punchItemRepository.save.mockResolvedValue({});
      historyRepository.create.mockReturnValue({});
      historyRepository.save.mockResolvedValue({});
      punchItemRepository.find.mockResolvedValue([
        { punchListId: 'punchlist-123' },
      ]);
      punchItemRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total: '1',
          openItems: '0',
          inProgressItems: '1',
          completedItems: '0',
        }),
      });

      const result = await service.bulkUpdatePunchItems(
        bulkDto,
        mockUser as any,
      );

      expect(result.updated).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Punch list is locked');
    });
  });

  describe('deletePunchItem', () => {
    it('should delete punch item successfully', async () => {
      punchItemRepository.findOne.mockResolvedValue({
        ...mockPunchItem,
        punchList: mockPunchList,
      });
      punchItemRepository.remove.mockResolvedValue(mockPunchItem);
      punchItemRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total: '0',
          openItems: '0',
          inProgressItems: '0',
          completedItems: '0',
        }),
      });

      await service.deletePunchItem('item-123', mockUser as any);

      expect(punchItemRepository.remove).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'item-123' }),
      );
    });

    it('should throw BadRequestException if punch list is locked', async () => {
      const lockedList = { ...mockPunchList, isLocked: true };
      punchItemRepository.findOne.mockResolvedValue({
        ...mockPunchItem,
        punchList: lockedList,
      });

      await expect(
        service.deletePunchItem('item-123', mockUser as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // STATISTICS TESTS
  // ============================================================================

  describe('getPunchItemStats', () => {
    it('should return punch item statistics', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(10),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: 'OPEN', count: '5' },
          { status: 'IN_PROGRESS', count: '3' },
          { status: 'CLOSED', count: '2' },
        ]),
        andWhere: jest.fn().mockReturnThis(),
      };

      punchItemRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getPunchItemStats('project-123');

      expect(result).toBeDefined();
      expect(result.total).toBe(10);
      expect(result.byStatus).toBeDefined();
    });
  });
});
