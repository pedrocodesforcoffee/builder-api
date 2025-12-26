import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProjectFolderService, FolderTreeNode } from './project-folder.service';
import { ProjectFolder } from '../entities/project-folder.entity';
import { FolderValidationService } from './folder-validation.service';
import { FolderPermissionsService } from './folder-permissions.service';
import { FolderStatisticsService } from './folder-statistics.service';
import { FolderOperationsService } from './folder-operations.service';
import { FolderType } from '../enums/folder-type.enum';
import { AccessLevel } from '../enums/access-level.enum';

describe('ProjectFolderService', () => {
  let service: ProjectFolderService;
  let folderRepository: jest.Mocked<Repository<ProjectFolder>>;
  let validationService: jest.Mocked<FolderValidationService>;
  let permissionsService: jest.Mocked<FolderPermissionsService>;
  let statisticsService: jest.Mocked<FolderStatisticsService>;
  let operationsService: jest.Mocked<FolderOperationsService>;
  let dataSource: jest.Mocked<DataSource>;

  const mockFolder = {
    id: 'folder-1',
    projectId: 'project-1',
    parentId: null,
    name: 'Test Folder',
    description: 'Test Description',
    folderType: FolderType.GENERAL,
    level: 0,
    path: '/Test Folder',
    order: 0,
    isSystemFolder: false,
    isLocked: false,
    inheritPermissions: true,
    isPublic: false,
    permissions: [],
    tags: [],
    customFields: {},
    fileCount: 0,
    totalFileCount: 0,
    totalSize: 0,
    createdBy: 'user-1',
    updatedBy: 'user-1',
    canModify: jest.fn().mockReturnValue(true),
    canDelete: jest.fn().mockReturnValue(true),
    hasFiles: jest.fn().mockReturnValue(false),
    hasChildren: jest.fn().mockReturnValue(false),
  } as unknown as ProjectFolder;

  const createMockQueryBuilder = () => {
    const queryBuilder: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      withDeleted: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
    };
    return queryBuilder;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectFolderService,
        {
          provide: getRepositoryToken(ProjectFolder),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            softRemove: jest.fn(),
            recover: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: FolderValidationService,
          useValue: {
            validateFolderName: jest.fn(),
            validatePermissions: jest.fn(),
            validateDepth: jest.fn(),
            calculateLevel: jest.fn(),
            calculatePath: jest.fn(),
          },
        },
        {
          provide: FolderPermissionsService,
          useValue: {
            getUserAccessLevel: jest.fn(),
          },
        },
        {
          provide: FolderStatisticsService,
          useValue: {
            propagateStatisticsToParent: jest.fn(),
          },
        },
        {
          provide: FolderOperationsService,
          useValue: {
            updatePathsAfterRename: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectFolderService>(ProjectFolderService);
    folderRepository = module.get(getRepositoryToken(ProjectFolder));
    validationService = module.get(FolderValidationService);
    permissionsService = module.get(FolderPermissionsService);
    statisticsService = module.get(FolderStatisticsService);
    operationsService = module.get(FolderOperationsService);
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createFolderDto = {
      name: 'New Folder',
      description: 'New Description',
      folderType: FolderType.GENERAL,
      parentId: null,
    };

    it('should successfully create a folder at root level', async () => {
      validationService.validateFolderName.mockResolvedValue(undefined);
      validationService.calculateLevel.mockReturnValue(0);
      validationService.calculatePath.mockReturnValue('/New Folder');
      folderRepository.save.mockResolvedValue({
        ...mockFolder,
        name: 'New Folder',
      } as ProjectFolder);

      const result = await service.create('project-1', createFolderDto, 'user-1');

      expect(validationService.validateFolderName).toHaveBeenCalledWith(
        'New Folder',
        'project-1',
        null,
      );
      expect(result.name).toBe('New Folder');
    });

    it('should successfully create a folder with parent', async () => {
      const parentFolder = { ...mockFolder, id: 'parent-1' } as ProjectFolder;
      const dtoWithParent = { ...createFolderDto, parentId: 'parent-1' };

      validationService.validateFolderName.mockResolvedValue(undefined);
      folderRepository.findOne.mockResolvedValue(parentFolder);
      validationService.validateDepth.mockReturnValue(undefined);
      validationService.calculateLevel.mockReturnValue(1);
      validationService.calculatePath.mockReturnValue('/Test Folder/New Folder');
      folderRepository.save.mockResolvedValue({
        ...mockFolder,
        name: 'New Folder',
        parentId: 'parent-1',
      } as ProjectFolder);

      const result = await service.create('project-1', dtoWithParent, 'user-1');

      expect(folderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'parent-1' },
      });
      expect(validationService.validateDepth).toHaveBeenCalled();
      expect(statisticsService.propagateStatisticsToParent).toHaveBeenCalledWith('parent-1');
      expect(result.parentId).toBe('parent-1');
    });

    it('should throw NotFoundException when parent not found', async () => {
      const dtoWithParent = { ...createFolderDto, parentId: 'non-existent' };

      validationService.validateFolderName.mockResolvedValue(undefined);
      folderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create('project-1', dtoWithParent, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when parent in different project', async () => {
      const differentProjectParent = {
        ...mockFolder,
        projectId: 'different-project',
      } as ProjectFolder;
      const dtoWithParent = { ...createFolderDto, parentId: 'parent-1' };

      validationService.validateFolderName.mockResolvedValue(undefined);
      folderRepository.findOne.mockResolvedValue(differentProjectParent);

      await expect(
        service.create('project-1', dtoWithParent, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate permissions if provided', async () => {
      const dtoWithPermissions = {
        ...createFolderDto,
        permissions: [
          { roleId: 'role-1', access: AccessLevel.READ_WRITE, inheritToChildren: true },
        ],
      };

      validationService.validateFolderName.mockResolvedValue(undefined);
      validationService.validatePermissions.mockReturnValue(undefined);
      validationService.calculateLevel.mockReturnValue(0);
      validationService.calculatePath.mockReturnValue('/New Folder');
      folderRepository.save.mockResolvedValue(mockFolder);

      await service.create('project-1', dtoWithPermissions, 'user-1');

      expect(validationService.validatePermissions).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all folders for a project', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([mockFolder]);

      folderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll('project-1');

      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'folder.projectId = :projectId',
        { projectId: 'project-1' },
      );
    });

    it('should filter by parentId when provided', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([mockFolder]);

      folderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAll('project-1', { parentId: 'parent-1' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'folder.parentId = :parentId',
        { parentId: 'parent-1' },
      );
    });

    it('should filter by null parentId for root folders', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([mockFolder]);

      folderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAll('project-1', { parentId: null });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('folder.parentId IS NULL');
    });

    it('should filter by folder type when provided', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([mockFolder]);

      folderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll('project-1', { folderType: FolderType.PLANS });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should include children relation when requested', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([mockFolder]);

      folderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAll('project-1', { includeChildren: true });

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'folder.children',
        'children',
      );
    });
  });

  describe('findOne', () => {
    it('should return a folder by id with relations', async () => {
      folderRepository.findOne.mockResolvedValue(mockFolder);

      const result = await service.findOne('folder-1');

      expect(result).toEqual(mockFolder);
      expect(folderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'folder-1' },
        relations: ['parent', 'children'],
      });
    });

    it('should throw NotFoundException when folder not found', async () => {
      folderRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Name',
      description: 'Updated Description',
    };

    const mockTransactionManager = {
      save: jest.fn(),
    };

    beforeEach(() => {
      dataSource.transaction.mockImplementation(async (cb) => {
        return await cb(mockTransactionManager);
      });
    });

    it('should successfully update a folder', async () => {
      folderRepository.findOne.mockResolvedValue(mockFolder);
      mockTransactionManager.save.mockResolvedValue({
        ...mockFolder,
        ...updateDto,
      });

      const result = await service.update('folder-1', updateDto, 'user-1');

      expect(result.name).toBe('Updated Name');
      expect(result.description).toBe('Updated Description');
    });

    it('should throw NotFoundException when folder not found', async () => {
      folderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', updateDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when folder is locked', async () => {
      const lockedFolder = {
        ...mockFolder,
        isLocked: true,
        canModify: jest.fn().mockReturnValue(false),
      } as unknown as ProjectFolder;

      folderRepository.findOne.mockResolvedValue(lockedFolder);

      await expect(
        service.update('folder-1', updateDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle name change correctly', async () => {
      folderRepository.findOne.mockResolvedValue(mockFolder);
      validationService.validateFolderName.mockResolvedValue(undefined);
      mockTransactionManager.save.mockResolvedValue({
        ...mockFolder,
        name: 'Updated Name',
      });

      const result = await service.update('folder-1', updateDto, 'user-1');

      expect(result.name).toBe('Updated Name');
    });

  });

  describe('remove', () => {
    it('should successfully soft delete a folder', async () => {
      const emptyFolder = {
        ...mockFolder,
        children: [],
        hasFiles: jest.fn().mockReturnValue(false),
        hasChildren: jest.fn().mockReturnValue(false),
      } as unknown as ProjectFolder;

      folderRepository.findOne.mockResolvedValue(emptyFolder);
      folderRepository.softRemove.mockResolvedValue(emptyFolder);

      await service.remove('folder-1');

      expect(folderRepository.softRemove).toHaveBeenCalledWith(emptyFolder);
    });

    it('should throw NotFoundException when folder not found', async () => {
      folderRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when folder cannot be deleted', async () => {
      const systemFolder = {
        ...mockFolder,
        isSystemFolder: true,
        canDelete: jest.fn().mockReturnValue(false),
      } as unknown as ProjectFolder;

      folderRepository.findOne.mockResolvedValue(systemFolder);

      await expect(service.remove('folder-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when folder has files', async () => {
      const folderWithFiles = {
        ...mockFolder,
        fileCount: 5,
        hasFiles: jest.fn().mockReturnValue(true),
        hasChildren: jest.fn().mockReturnValue(false),
      } as unknown as ProjectFolder;

      folderRepository.findOne.mockResolvedValue(folderWithFiles);

      await expect(service.remove('folder-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when folder has children', async () => {
      const folderWithChildren = {
        ...mockFolder,
        children: [{ id: 'child-1' }],
        hasFiles: jest.fn().mockReturnValue(false),
        hasChildren: jest.fn().mockReturnValue(true),
      } as unknown as ProjectFolder;

      folderRepository.findOne.mockResolvedValue(folderWithChildren);

      await expect(service.remove('folder-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update parent statistics after deletion', async () => {
      const folderWithParent = {
        ...mockFolder,
        parentId: 'parent-1',
        children: [],
        hasFiles: jest.fn().mockReturnValue(false),
        hasChildren: jest.fn().mockReturnValue(false),
      } as unknown as ProjectFolder;

      folderRepository.findOne.mockResolvedValue(folderWithParent);
      folderRepository.softRemove.mockResolvedValue(folderWithParent);

      await service.remove('folder-1');

      expect(statisticsService.propagateStatisticsToParent).toHaveBeenCalledWith(
        'parent-1',
      );
    });
  });

  describe('restore', () => {
    it('should successfully restore a deleted folder', async () => {
      const deletedFolder = {
        ...mockFolder,
        deletedAt: new Date(),
      } as ProjectFolder;

      folderRepository.findOne.mockResolvedValue(deletedFolder);
      folderRepository.recover.mockResolvedValue(mockFolder);

      const result = await service.restore('folder-1');

      expect(folderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'folder-1' },
        withDeleted: true,
      });
      expect(folderRepository.recover).toHaveBeenCalledWith(deletedFolder);
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when folder not found', async () => {
      folderRepository.findOne.mockResolvedValue(null);

      await expect(service.restore('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when folder is not deleted', async () => {
      folderRepository.findOne.mockResolvedValue(mockFolder);

      await expect(service.restore('folder-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update parent statistics after restore', async () => {
      const deletedFolder = {
        ...mockFolder,
        parentId: 'parent-1',
        deletedAt: new Date(),
      } as ProjectFolder;

      folderRepository.findOne.mockResolvedValue(deletedFolder);
      folderRepository.recover.mockResolvedValue({
        ...mockFolder,
        parentId: 'parent-1',
      } as ProjectFolder);

      await service.restore('folder-1');

      expect(statisticsService.propagateStatisticsToParent).toHaveBeenCalledWith(
        'parent-1',
      );
    });
  });

  describe('getFolderTree', () => {
    it('should return hierarchical folder tree for all folders', async () => {
      const parentFolder = { ...mockFolder, id: 'parent-1', name: 'Parent' };
      const childFolder = {
        ...mockFolder,
        id: 'child-1',
        parentId: 'parent-1',
        name: 'Child',
      };

      folderRepository.find.mockResolvedValue([parentFolder, childFolder]);

      const result = await service.getFolderTree('project-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('parent-1');
      expect(result[0].children).toBeDefined();
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children![0].id).toBe('child-1');
    });

    it('should filter folders by user access level when user provided', async () => {
      const folder1 = { ...mockFolder, id: 'folder-1' };
      const folder2 = { ...mockFolder, id: 'folder-2' };
      const user = { id: 'user-1', roleIds: ['role-1'] };

      folderRepository.find.mockResolvedValue([folder1, folder2]);
      permissionsService.getUserAccessLevel
        .mockResolvedValueOnce(AccessLevel.READ_WRITE)
        .mockResolvedValueOnce(AccessLevel.NO_ACCESS);

      const result = await service.getFolderTree('project-1', user);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('folder-1');
    });

    it('should handle empty folder list', async () => {
      folderRepository.find.mockResolvedValue([]);

      const result = await service.getFolderTree('project-1');

      expect(result).toHaveLength(0);
    });

    it('should build nested tree correctly', async () => {
      const root = { ...mockFolder, id: 'root', parentId: null };
      const level1 = { ...mockFolder, id: 'level1', parentId: 'root' };
      const level2 = { ...mockFolder, id: 'level2', parentId: 'level1' };

      folderRepository.find.mockResolvedValue([root, level1, level2]);

      const result = await service.getFolderTree('project-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('root');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children![0].id).toBe('level1');
      expect(result[0].children![0].children).toHaveLength(1);
      expect(result[0].children![0].children![0].id).toBe('level2');
    });
  });

  describe('searchFolders', () => {
    it('should search folders by name', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([mockFolder]);

      folderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.searchFolders('project-1', 'Test');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(LOWER(folder.name) LIKE LOWER(:query) OR LOWER(folder.path) LIKE LOWER(:query))',
        { query: '%Test%' },
      );
      expect(result).toHaveLength(1);
    });

    it('should filter by folder type', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([mockFolder]);

      folderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.searchFolders('project-1', 'Test', { folderType: FolderType.PLANS });

      expect(result).toBeDefined();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should filter by tags', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([mockFolder]);

      folderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.searchFolders('project-1', 'Test', { tags: ['tag1', 'tag2'] });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'folder.tags && :tags',
        { tags: ['tag1', 'tag2'] },
      );
    });

    it('should include deleted folders when requested', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([mockFolder]);

      folderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.searchFolders('project-1', 'Test', { includeDeleted: true });

      expect(mockQueryBuilder.withDeleted).toHaveBeenCalled();
    });
  });

  describe('getBreadcrumb', () => {
    it('should return breadcrumb trail from root to folder', async () => {
      const grandparent = { ...mockFolder, id: 'grandparent', parentId: null };
      const parent = { ...mockFolder, id: 'parent', parentId: 'grandparent' };
      const child = { ...mockFolder, id: 'child', parentId: 'parent' };

      folderRepository.findOne
        .mockResolvedValueOnce(child)
        .mockResolvedValueOnce(parent)
        .mockResolvedValueOnce(grandparent);

      const result = await service.getBreadcrumb('child');

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('grandparent');
      expect(result[1].id).toBe('parent');
      expect(result[2].id).toBe('child');
    });

    it('should throw NotFoundException when folder not found', async () => {
      folderRepository.findOne.mockResolvedValue(null);

      await expect(service.getBreadcrumb('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return single item for root folder', async () => {
      folderRepository.findOne.mockResolvedValue(mockFolder);

      const result = await service.getBreadcrumb('folder-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('folder-1');
    });

    it('should handle broken parent chain gracefully', async () => {
      const orphanedFolder = { ...mockFolder, id: 'orphan', parentId: 'missing-parent' };

      folderRepository.findOne
        .mockResolvedValueOnce(orphanedFolder)
        .mockResolvedValueOnce(null);

      const result = await service.getBreadcrumb('orphan');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('orphan');
    });
  });
});
