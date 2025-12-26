import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FolderOperationsService } from './folder-operations.service';
import { ProjectFolder } from '../entities/project-folder.entity';
import { FolderValidationService } from './folder-validation.service';
import { FolderStatisticsService } from './folder-statistics.service';
import { FolderType } from '../enums/folder-type.enum';

describe('FolderOperationsService', () => {
  let service: FolderOperationsService;
  let folderRepository: jest.Mocked<Repository<ProjectFolder>>;
  let validationService: jest.Mocked<FolderValidationService>;
  let statisticsService: jest.Mocked<FolderStatisticsService>;
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
    isSystemFolder: false,
    isLocked: false,
    canModify: jest.fn().mockReturnValue(true),
    canDelete: jest.fn().mockReturnValue(true),
  } as unknown as ProjectFolder;

  const mockParentFolder = {
    id: 'parent-1',
    projectId: 'project-1',
    parentId: null,
    name: 'Parent Folder',
    level: 0,
    path: '/Parent Folder',
  } as ProjectFolder;

  const mockTransactionManager = {
    save: jest.fn(),
    findOne: jest.fn(),
    getRepository: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FolderOperationsService,
        {
          provide: getRepositoryToken(ProjectFolder),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: FolderValidationService,
          useValue: {
            validateMove: jest.fn(),
            validateFolderName: jest.fn(),
            calculateLevel: jest.fn(),
            calculatePath: jest.fn(),
          },
        },
        {
          provide: FolderStatisticsService,
          useValue: {
            propagateStatisticsToParent: jest.fn(),
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

    service = module.get<FolderOperationsService>(FolderOperationsService);
    folderRepository = module.get(getRepositoryToken(ProjectFolder));
    validationService = module.get(FolderValidationService);
    statisticsService = module.get(FolderStatisticsService);
    dataSource = module.get(DataSource);

    // Setup default transaction behavior
    dataSource.transaction.mockImplementation(async (cb) => {
      return await cb(mockTransactionManager);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('moveFolder', () => {
    it('should successfully move a folder to a new parent', async () => {
      const folderId = 'folder-1';
      const newParentId = 'parent-1';
      const userId = 'user-1';

      validationService.validateMove.mockResolvedValue(undefined);
      folderRepository.findOne
        .mockResolvedValueOnce(mockFolder)
        .mockResolvedValueOnce(mockParentFolder);
      validationService.calculateLevel.mockReturnValue(1);
      validationService.calculatePath.mockReturnValue('/Parent Folder/Test Folder');
      mockTransactionManager.save.mockResolvedValue({
        ...mockFolder,
        parentId: newParentId,
      });
      mockTransactionManager.getRepository.mockReturnValue({
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(mockFolder),
        save: jest.fn(),
      });

      const result = await service.moveFolder(folderId, newParentId, userId);

      expect(validationService.validateMove).toHaveBeenCalledWith(folderId, newParentId);
      expect(folderRepository.findOne).toHaveBeenCalledWith({ where: { id: folderId } });
      expect(mockTransactionManager.save).toHaveBeenCalled();
      expect(result.parentId).toBe(newParentId);
    });

    it('should successfully move a folder to root (null parent)', async () => {
      const folderId = 'folder-1';
      const newParentId = null;
      const userId = 'user-1';

      validationService.validateMove.mockResolvedValue(undefined);
      folderRepository.findOne.mockResolvedValue(mockFolder);
      validationService.calculateLevel.mockReturnValue(0);
      validationService.calculatePath.mockReturnValue('/Test Folder');
      mockTransactionManager.save.mockResolvedValue({
        ...mockFolder,
        parentId: null,
      });
      mockTransactionManager.getRepository.mockReturnValue({
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(mockFolder),
        save: jest.fn(),
      });

      const result = await service.moveFolder(folderId, newParentId, userId);

      expect(result.parentId).toBeNull();
      expect(validationService.calculateLevel).toHaveBeenCalledWith(null);
    });

    it('should throw NotFoundException when folder not found', async () => {
      const folderId = 'non-existent';
      const newParentId = 'parent-1';
      const userId = 'user-1';

      validationService.validateMove.mockResolvedValue(undefined);
      folderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.moveFolder(folderId, newParentId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when folder is locked', async () => {
      const lockedFolder = {
        ...mockFolder,
        isLocked: true,
        canModify: jest.fn().mockReturnValue(false),
      } as unknown as ProjectFolder;

      validationService.validateMove.mockResolvedValue(undefined);
      folderRepository.findOne.mockResolvedValue(lockedFolder);

      await expect(
        service.moveFolder('folder-1', 'parent-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when new parent not found', async () => {
      validationService.validateMove.mockResolvedValue(undefined);
      folderRepository.findOne
        .mockResolvedValueOnce(mockFolder)
        .mockResolvedValueOnce(null);

      await expect(
        service.moveFolder('folder-1', 'non-existent-parent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when moving to different project', async () => {
      const differentProjectParent = {
        ...mockParentFolder,
        projectId: 'different-project',
      } as ProjectFolder;

      validationService.validateMove.mockResolvedValue(undefined);
      folderRepository.findOne
        .mockResolvedValueOnce(mockFolder)
        .mockResolvedValueOnce(differentProjectParent);

      await expect(
        service.moveFolder('folder-1', 'parent-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update statistics for old and new parent', async () => {
      const folderWithParent = {
        ...mockFolder,
        parentId: 'old-parent-1',
      } as ProjectFolder;

      validationService.validateMove.mockResolvedValue(undefined);
      folderRepository.findOne
        .mockResolvedValueOnce(folderWithParent)
        .mockResolvedValueOnce(mockParentFolder);
      validationService.calculateLevel.mockReturnValue(1);
      validationService.calculatePath.mockReturnValue('/Parent Folder/Test Folder');
      mockTransactionManager.save.mockResolvedValue(folderWithParent);
      mockTransactionManager.getRepository.mockReturnValue({
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(folderWithParent),
        save: jest.fn(),
      });

      await service.moveFolder('folder-1', 'parent-1', 'user-1');

      expect(statisticsService.propagateStatisticsToParent).toHaveBeenCalledWith('old-parent-1');
      expect(statisticsService.propagateStatisticsToParent).toHaveBeenCalledWith('parent-1');
    });
  });

  describe('copyFolder', () => {
    it('should successfully copy a folder to a new location', async () => {
      const folderId = 'folder-1';
      const targetProjectId = 'project-1';
      const targetParentId = 'parent-1';
      const userId = 'user-1';

      folderRepository.findOne
        .mockResolvedValueOnce({ ...mockFolder, children: [] } as ProjectFolder)
        .mockResolvedValueOnce(mockParentFolder);

      validationService.calculateLevel.mockReturnValue(1);
      validationService.calculatePath.mockReturnValue('/Parent Folder/Test Folder');
      mockTransactionManager.findOne.mockResolvedValue(mockParentFolder);
      mockTransactionManager.save.mockResolvedValue({
        ...mockFolder,
        id: 'new-folder-id',
        parentId: targetParentId,
      });

      const result = await service.copyFolder(
        folderId,
        targetProjectId,
        targetParentId,
        false,
        userId,
      );

      expect(folderRepository.findOne).toHaveBeenCalledWith({
        where: { id: folderId },
        relations: ['children'],
      });
      expect(mockTransactionManager.save).toHaveBeenCalled();
      expect(statisticsService.propagateStatisticsToParent).toHaveBeenCalledWith(targetParentId);
    });

    it('should throw NotFoundException when source folder not found', async () => {
      folderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.copyFolder('non-existent', 'project-1', 'parent-1', false, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when target parent not found', async () => {
      folderRepository.findOne
        .mockResolvedValueOnce({ ...mockFolder, children: [] } as ProjectFolder)
        .mockResolvedValueOnce(null);

      await expect(
        service.copyFolder('folder-1', 'project-1', 'non-existent', false, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when target parent in different project', async () => {
      const differentProjectParent = {
        ...mockParentFolder,
        projectId: 'different-project',
      } as ProjectFolder;

      folderRepository.findOne
        .mockResolvedValueOnce({ ...mockFolder, children: [] } as ProjectFolder)
        .mockResolvedValueOnce(differentProjectParent);

      await expect(
        service.copyFolder('folder-1', 'project-1', 'parent-1', false, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should copy folder to root when targetParentId is null', async () => {
      folderRepository.findOne.mockResolvedValue({ ...mockFolder, children: [] } as ProjectFolder);
      validationService.calculateLevel.mockReturnValue(0);
      validationService.calculatePath.mockReturnValue('/Test Folder');
      mockTransactionManager.save.mockResolvedValue({
        ...mockFolder,
        id: 'new-folder-id',
        parentId: null,
      });

      const result = await service.copyFolder(
        'folder-1',
        'project-1',
        null,
        false,
        'user-1',
      );

      expect(validationService.calculateLevel).toHaveBeenCalledWith(null);
    });
  });

  describe('duplicateFolder', () => {
    it('should successfully duplicate a folder with " (Copy)" suffix', async () => {
      folderRepository.findOne.mockResolvedValue(mockFolder);
      validationService.validateFolderName.mockResolvedValue(undefined);

      // Mock copyFolder behavior
      const copiedFolder = {
        ...mockFolder,
        id: 'new-id',
        name: 'Test Folder (Copy)',
      } as ProjectFolder;

      folderRepository.findOne
        .mockResolvedValueOnce(mockFolder)
        .mockResolvedValueOnce({ ...mockFolder, children: [] } as ProjectFolder)
        .mockResolvedValueOnce(null);

      validationService.calculateLevel.mockReturnValue(0);
      validationService.calculatePath.mockReturnValue('/Test Folder (Copy)');
      mockTransactionManager.save.mockResolvedValue(copiedFolder);
      folderRepository.save.mockResolvedValue(copiedFolder);

      const result = await service.duplicateFolder('folder-1', 'user-1');

      expect(validationService.validateFolderName).toHaveBeenCalledWith(
        'Test Folder (Copy)',
        'project-1',
        null,
      );
      expect(result.name).toBe('Test Folder (Copy)');
    });

    it('should throw NotFoundException when source folder not found', async () => {
      folderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.duplicateFolder('non-existent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should generate unique name with counter if name exists', async () => {
      folderRepository.findOne.mockResolvedValue(mockFolder);

      // First two attempts fail validation
      validationService.validateFolderName
        .mockRejectedValueOnce(new Error('Name exists'))
        .mockRejectedValueOnce(new Error('Name exists'))
        .mockResolvedValue(undefined);

      folderRepository.findOne
        .mockResolvedValueOnce(mockFolder)
        .mockResolvedValueOnce({ ...mockFolder, children: [] } as ProjectFolder)
        .mockResolvedValueOnce(null);

      validationService.calculateLevel.mockReturnValue(0);
      validationService.calculatePath.mockReturnValue('/Test Folder (Copy 3)');
      const copiedFolder = {
        ...mockFolder,
        id: 'new-id',
        name: 'Test Folder (Copy 3)',
      } as ProjectFolder;
      mockTransactionManager.save.mockResolvedValue(copiedFolder);
      folderRepository.save.mockResolvedValue(copiedFolder);

      const result = await service.duplicateFolder('folder-1', 'user-1');

      expect(result.name).toBe('Test Folder (Copy 3)');
    });
  });

  describe('bulkMove', () => {
    it('should successfully move multiple folders', async () => {
      const folderIds = ['folder-1', 'folder-2'];
      const newParentId = 'parent-1';
      const userId = 'user-1';

      validationService.validateMove.mockResolvedValue(undefined);
      folderRepository.findOne
        .mockResolvedValueOnce(mockFolder)
        .mockResolvedValueOnce(mockParentFolder)
        .mockResolvedValueOnce(mockFolder)
        .mockResolvedValueOnce(mockParentFolder);

      validationService.calculateLevel.mockReturnValue(1);
      validationService.calculatePath.mockReturnValue('/Parent Folder/Test Folder');
      mockTransactionManager.save.mockResolvedValue(mockFolder);
      mockTransactionManager.getRepository.mockReturnValue({
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(mockFolder),
        save: jest.fn(),
      });

      const result = await service.bulkMove(folderIds, newParentId, userId);

      expect(result).toHaveLength(2);
      expect(validationService.validateMove).toHaveBeenCalledTimes(2);
    });

    it('should continue processing other folders if one fails', async () => {
      const folderIds = ['folder-1', 'invalid-folder', 'folder-2'];

      validationService.validateMove.mockResolvedValue(undefined);
      folderRepository.findOne
        .mockResolvedValueOnce(mockFolder)
        .mockResolvedValueOnce(mockParentFolder)
        .mockResolvedValueOnce(null) // Invalid folder
        .mockResolvedValueOnce(mockFolder)
        .mockResolvedValueOnce(mockParentFolder);

      validationService.calculateLevel.mockReturnValue(1);
      validationService.calculatePath.mockReturnValue('/Parent Folder/Test Folder');
      mockTransactionManager.save.mockResolvedValue(mockFolder);
      mockTransactionManager.getRepository.mockReturnValue({
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(mockFolder),
        save: jest.fn(),
      });

      const result = await service.bulkMove(folderIds, 'parent-1', 'user-1');

      expect(result).toHaveLength(2); // Should have 2 successful moves
    });
  });

  describe('updateDescendantPaths', () => {
    it('should update paths for all child folders recursively', async () => {
      const childFolder1 = {
        id: 'child-1',
        name: 'Child 1',
        level: 0,
        parentId: 'folder-1',
      } as ProjectFolder;

      const childFolder2 = {
        id: 'child-2',
        name: 'Child 2',
        level: 0,
        parentId: 'child-1',
      } as ProjectFolder;

      mockTransactionManager.getRepository.mockReturnValue({
        find: jest.fn()
          .mockResolvedValueOnce([childFolder1])
          .mockResolvedValueOnce([childFolder2])
          .mockResolvedValueOnce([]),
        findOne: jest.fn()
          .mockResolvedValueOnce(mockFolder)
          .mockResolvedValueOnce(childFolder1)
          .mockResolvedValueOnce(childFolder2),
        save: jest.fn(),
      });

      validationService.calculatePath
        .mockReturnValueOnce('/Test Folder/Child 1')
        .mockReturnValueOnce('/Test Folder/Child 1/Child 2');

      await service.updateDescendantPaths('folder-1', mockTransactionManager);

      const repo = mockTransactionManager.getRepository(ProjectFolder);
      expect(repo.save).toHaveBeenCalledTimes(2);
    });

    it('should return early if parent folder not found', async () => {
      mockTransactionManager.getRepository.mockReturnValue({
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn(),
      });

      await service.updateDescendantPaths('non-existent', mockTransactionManager);

      const repo = mockTransactionManager.getRepository(ProjectFolder);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('should work without transaction manager', async () => {
      const childFolder = {
        id: 'child-1',
        name: 'Child 1',
        level: 0,
        parentId: 'folder-1',
      } as ProjectFolder;

      folderRepository.find
        .mockResolvedValueOnce([childFolder])
        .mockResolvedValueOnce([]);
      folderRepository.findOne
        .mockResolvedValueOnce(mockFolder)
        .mockResolvedValueOnce(childFolder);
      validationService.calculatePath.mockReturnValue('/Test Folder/Child 1');

      await service.updateDescendantPaths('folder-1');

      expect(folderRepository.save).toHaveBeenCalled();
    });
  });

  describe('updatePathsAfterRename', () => {
    it('should update path for renamed folder and its descendants', async () => {
      const renamedFolder = {
        ...mockFolder,
        name: 'Renamed Folder',
      } as ProjectFolder;

      mockTransactionManager.getRepository.mockReturnValue({
        findOne: jest.fn()
          .mockResolvedValueOnce(renamedFolder)
          .mockResolvedValueOnce(null), // No parent
        find: jest.fn().mockResolvedValue([]),
        save: jest.fn(),
      });

      validationService.calculatePath.mockReturnValue('/Renamed Folder');

      await service.updatePathsAfterRename('folder-1', mockTransactionManager);

      const repo = mockTransactionManager.getRepository(ProjectFolder);
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
        path: '/Renamed Folder',
      }));
    });

    it('should return early if folder not found', async () => {
      mockTransactionManager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn(),
      });

      await service.updatePathsAfterRename('non-existent', mockTransactionManager);

      const repo = mockTransactionManager.getRepository(ProjectFolder);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('should work without transaction manager', async () => {
      const renamedFolder = {
        ...mockFolder,
        name: 'Renamed Folder',
        parentId: 'parent-1',
      } as ProjectFolder;

      folderRepository.findOne
        .mockResolvedValueOnce(renamedFolder)
        .mockResolvedValueOnce(mockParentFolder);
      folderRepository.find.mockResolvedValue([]);
      validationService.calculatePath.mockReturnValue('/Parent Folder/Renamed Folder');

      await service.updatePathsAfterRename('folder-1');

      expect(folderRepository.save).toHaveBeenCalled();
      expect(validationService.calculatePath).toHaveBeenCalledWith(
        renamedFolder,
        mockParentFolder,
      );
    });
  });
});
