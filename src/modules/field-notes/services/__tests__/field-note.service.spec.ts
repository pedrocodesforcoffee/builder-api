import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { FieldNoteService } from '../field-note.service';
import { FieldNote } from '../../entities/field-note.entity';
import { FieldNoteAttachment } from '../../entities/field-note-attachment.entity';
import { FieldNoteLink } from '../../entities/field-note-link.entity';
import { FieldNoteComment } from '../../entities/field-note-comment.entity';
import { FieldNoteHistory } from '../../entities/field-note-history.entity';
import { Project } from '../../../projects/entities/project.entity';
import {
  FieldNoteType,
  FieldNoteStatus,
  FieldNoteVisibility,
  FieldNotePriority,
} from '../../enums/field-note.enum';

describe('FieldNoteService', () => {
  let service: FieldNoteService;
  let fieldNoteRepository: Repository<FieldNote>;
  let attachmentRepository: Repository<FieldNoteAttachment>;
  let linkRepository: Repository<FieldNoteLink>;
  let commentRepository: Repository<FieldNoteComment>;
  let historyRepository: Repository<FieldNoteHistory>;
  let projectRepository: Repository<Project>;

  const mockFieldNoteRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      select: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    })),
  };

  const mockAttachmentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockLinkRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockCommentRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockHistoryRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockProjectRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FieldNoteService,
        {
          provide: getRepositoryToken(FieldNote),
          useValue: mockFieldNoteRepository,
        },
        {
          provide: getRepositoryToken(FieldNoteAttachment),
          useValue: mockAttachmentRepository,
        },
        {
          provide: getRepositoryToken(FieldNoteLink),
          useValue: mockLinkRepository,
        },
        {
          provide: getRepositoryToken(FieldNoteComment),
          useValue: mockCommentRepository,
        },
        {
          provide: getRepositoryToken(FieldNoteHistory),
          useValue: mockHistoryRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
      ],
    }).compile();

    service = module.get<FieldNoteService>(FieldNoteService);
    fieldNoteRepository = module.get<Repository<FieldNote>>(
      getRepositoryToken(FieldNote),
    );
    attachmentRepository = module.get<Repository<FieldNoteAttachment>>(
      getRepositoryToken(FieldNoteAttachment),
    );
    linkRepository = module.get<Repository<FieldNoteLink>>(
      getRepositoryToken(FieldNoteLink),
    );
    commentRepository = module.get<Repository<FieldNoteComment>>(
      getRepositoryToken(FieldNoteComment),
    );
    historyRepository = module.get<Repository<FieldNoteHistory>>(
      getRepositoryToken(FieldNoteHistory),
    );
    projectRepository = module.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a field note successfully', async () => {
      const projectId = 'project-123';
      const userId = 'user-123';
      const dto = {
        noteType: FieldNoteType.GENERAL,
        title: 'Test Field Note',
        description: 'Test description',
        noteDate: '2025-12-22',
      };

      const mockProject = { id: projectId };
      const mockFieldNote = {
        id: 'note-123',
        number: 'FN-00001',
        ...dto,
        projectId,
        createdById: userId,
      };

      mockProjectRepository.findOne.mockResolvedValue(mockProject);
      mockFieldNoteRepository.count.mockResolvedValue(0);
      mockFieldNoteRepository.create.mockReturnValue(mockFieldNote);
      mockFieldNoteRepository.save.mockResolvedValue(mockFieldNote);
      mockFieldNoteRepository.findOne.mockResolvedValue(mockFieldNote);
      mockHistoryRepository.create.mockReturnValue({});
      mockHistoryRepository.save.mockResolvedValue({});

      const result = await service.create(projectId, dto, userId);

      expect(result).toEqual(mockFieldNote);
      expect(mockProjectRepository.findOne).toHaveBeenCalledWith({
        where: { id: projectId },
      });
      expect(mockFieldNoteRepository.create).toHaveBeenCalled();
      expect(mockFieldNoteRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if project does not exist', async () => {
      const projectId = 'non-existent-project';
      const userId = 'user-123';
      const dto = {
        noteType: FieldNoteType.GENERAL,
        title: 'Test Field Note',
        description: 'Test description',
        noteDate: '2025-12-22',
      };

      mockProjectRepository.findOne.mockResolvedValue(null);

      await expect(service.create(projectId, dto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('should find a field note by ID', async () => {
      const noteId = 'note-123';
      const userId = 'user-123';
      const mockFieldNote = {
        id: noteId,
        title: 'Test Note',
        noteType: FieldNoteType.GENERAL,
        status: FieldNoteStatus.ACTIVE,
      };

      mockFieldNoteRepository.findOne.mockResolvedValue(mockFieldNote);

      const result = await service.findOne(noteId, userId);

      expect(result).toEqual(mockFieldNote);
      expect(mockFieldNoteRepository.findOne).toHaveBeenCalledWith({
        where: { id: noteId },
        relations: expect.any(Array),
      });
    });

    it('should throw NotFoundException if field note does not exist', async () => {
      const noteId = 'non-existent-note';
      const userId = 'user-123';

      mockFieldNoteRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(noteId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a field note successfully', async () => {
      const noteId = 'note-123';
      const userId = 'user-123';
      const dto = {
        title: 'Updated Title',
        description: 'Updated description',
      };

      const mockFieldNote = {
        id: noteId,
        title: 'Original Title',
        description: 'Original description',
        noteType: FieldNoteType.GENERAL,
        status: FieldNoteStatus.ACTIVE,
        isDeleted: false,
        canEdit: () => true,
      };

      const updatedFieldNote = {
        ...mockFieldNote,
        ...dto,
        lastModifiedAt: expect.any(Date),
      };

      mockFieldNoteRepository.findOne.mockResolvedValue(mockFieldNote);
      mockFieldNoteRepository.save.mockResolvedValue(updatedFieldNote);
      mockHistoryRepository.create.mockReturnValue({});
      mockHistoryRepository.save.mockResolvedValue({});

      const result = await service.update(noteId, dto, userId);

      expect(result).toMatchObject({
        ...dto,
        id: noteId,
      });
      expect(mockFieldNoteRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if field note cannot be edited', async () => {
      const noteId = 'note-123';
      const userId = 'user-123';
      const dto = {
        title: 'Updated Title',
      };

      const mockFieldNote = {
        id: noteId,
        title: 'Original Title',
        status: FieldNoteStatus.ARCHIVED,
        isDeleted: false,
        canEdit: () => false,
      };

      mockFieldNoteRepository.findOne.mockResolvedValue(mockFieldNote);

      await expect(service.update(noteId, dto, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a field note', async () => {
      const noteId = 'note-123';
      const userId = 'user-123';

      const mockFieldNote = {
        id: noteId,
        isDeleted: false,
        deletedAt: null,
      };

      mockFieldNoteRepository.findOne.mockResolvedValue(mockFieldNote);
      mockFieldNoteRepository.save.mockResolvedValue({
        ...mockFieldNote,
        isDeleted: true,
        deletedAt: expect.any(Date),
      });
      mockHistoryRepository.create.mockReturnValue({});
      mockHistoryRepository.save.mockResolvedValue({});

      await service.remove(noteId, userId);

      expect(mockFieldNoteRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isDeleted: true,
          deletedAt: expect.any(Date),
          deletedById: userId,
        }),
      );
    });
  });

  describe('restore', () => {
    it('should restore a soft-deleted field note', async () => {
      const noteId = 'note-123';
      const userId = 'user-123';

      const mockFieldNote = {
        id: noteId,
        isDeleted: true,
        deletedAt: new Date(),
      };

      mockFieldNoteRepository.findOne.mockResolvedValue(mockFieldNote);
      mockFieldNoteRepository.save.mockResolvedValue({
        ...mockFieldNote,
        isDeleted: false,
        deletedAt: null,
      });
      mockHistoryRepository.create.mockReturnValue({});
      mockHistoryRepository.save.mockResolvedValue({});

      const result = await service.restore(noteId, userId);

      expect(mockFieldNoteRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isDeleted: false,
          deletedAt: null,
          deletedById: null,
        }),
      );
    });
  });

  describe('addAttachment', () => {
    it('should add an attachment to a field note', async () => {
      const noteId = 'note-123';
      const userId = 'user-123';
      const dto = {
        attachmentType: 'PHOTO',
        filename: 'test.jpg',
        url: 'https://example.com/test.jpg',
      };

      const mockFieldNote = { id: noteId };
      const mockAttachment = {
        id: 'attachment-123',
        ...dto,
        fieldNoteId: noteId,
        uploadedById: userId,
      };

      mockFieldNoteRepository.findOne.mockResolvedValue(mockFieldNote);
      mockAttachmentRepository.create.mockReturnValue(mockAttachment);
      mockAttachmentRepository.save.mockResolvedValue(mockAttachment);
      mockHistoryRepository.create.mockReturnValue({});
      mockHistoryRepository.save.mockResolvedValue({});

      const result = await service.addAttachment(noteId, dto, userId);

      expect(result).toEqual(mockAttachment);
      expect(mockAttachmentRepository.save).toHaveBeenCalled();
    });
  });

  describe('addLink', () => {
    it('should add a link to another entity', async () => {
      const noteId = 'note-123';
      const userId = 'user-123';
      const dto = {
        linkedEntityType: 'RFI',
        linkedEntityId: 'rfi-123',
        linkedEntityTitle: 'Test RFI',
      };

      const mockFieldNote = { id: noteId };
      const mockLink = {
        id: 'link-123',
        ...dto,
        fieldNoteId: noteId,
        createdById: userId,
      };

      mockFieldNoteRepository.findOne.mockResolvedValue(mockFieldNote);
      mockLinkRepository.create.mockReturnValue(mockLink);
      mockLinkRepository.save.mockResolvedValue(mockLink);
      mockHistoryRepository.create.mockReturnValue({});
      mockHistoryRepository.save.mockResolvedValue({});

      const result = await service.addLink(noteId, dto as any, userId);

      expect(result).toEqual(mockLink);
      expect(mockLinkRepository.save).toHaveBeenCalled();
    });
  });

  describe('addComment', () => {
    it('should add a comment to a field note', async () => {
      const noteId = 'note-123';
      const userId = 'user-123';
      const dto = {
        content: 'This is a test comment',
        visibility: 'PUBLIC',
      };

      const mockFieldNote = { id: noteId };
      const mockComment = {
        id: 'comment-123',
        content: dto.content,
        visibility: dto.visibility,
        fieldNoteId: noteId,
        createdById: userId,
      };

      mockFieldNoteRepository.findOne.mockResolvedValue(mockFieldNote);
      mockCommentRepository.create.mockReturnValue(mockComment);
      mockCommentRepository.save.mockResolvedValue(mockComment);
      mockHistoryRepository.create.mockReturnValue({});
      mockHistoryRepository.save.mockResolvedValue({});

      const result = await service.addComment(noteId, dto as any, userId);

      expect(result).toEqual(mockComment);
      expect(mockCommentRepository.save).toHaveBeenCalled();
    });
  });
});
