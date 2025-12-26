import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { FieldNote } from '../entities/field-note.entity';
import { FieldNoteAttachment } from '../entities/field-note-attachment.entity';
import { FieldNoteLink } from '../entities/field-note-link.entity';
import { FieldNoteComment } from '../entities/field-note-comment.entity';
import { FieldNoteHistory } from '../entities/field-note-history.entity';
import { Project } from '../../projects/entities/project.entity';
import {
  CreateFieldNoteDto,
  UpdateFieldNoteDto,
  QueryFieldNotesDto,
  AddAttachmentDto,
  AddLinkDto,
  AddCommentDto,
} from '../dto/field-note.dto';
import { FieldNoteHistoryAction, FieldNoteStatus } from '../enums/field-note.enum';

@Injectable()
export class FieldNoteService {
  constructor(
    @InjectRepository(FieldNote)
    private readonly fieldNoteRepository: Repository<FieldNote>,
    @InjectRepository(FieldNoteAttachment)
    private readonly attachmentRepository: Repository<FieldNoteAttachment>,
    @InjectRepository(FieldNoteLink)
    private readonly linkRepository: Repository<FieldNoteLink>,
    @InjectRepository(FieldNoteComment)
    private readonly commentRepository: Repository<FieldNoteComment>,
    @InjectRepository(FieldNoteHistory)
    private readonly historyRepository: Repository<FieldNoteHistory>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  /**
   * Create a new field note
   */
  async create(
    projectId: string,
    dto: CreateFieldNoteDto,
    userId: string,
  ): Promise<FieldNote> {
    // Verify project exists
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Generate note number
    const noteNumber = await this.generateNoteNumber(projectId);

    // Create field note
    const fieldNote = this.fieldNoteRepository.create({
      ...dto,
      number: noteNumber,
      projectId,
      createdById: userId,
      lastModifiedAt: new Date(),
    });

    const savedNote = await this.fieldNoteRepository.save(fieldNote);

    // Create history entry
    await this.createHistoryEntry(
      savedNote.id,
      FieldNoteHistoryAction.CREATED,
      userId,
      'Field note created',
      null,
    );

    return this.findOne(savedNote.id, userId);
  }

  /**
   * Find all field notes with filtering and pagination
   */
  async findAll(query: QueryFieldNotesDto, userId: string): Promise<{
    data: FieldNote[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.fieldNoteRepository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.createdBy', 'createdBy')
      .leftJoinAndSelect('note.assignedTo', 'assignedTo')
      .leftJoinAndSelect('note.attachments', 'attachments')
      .leftJoinAndSelect('note.links', 'links')
      .leftJoinAndSelect('note.comments', 'comments');

    // Apply filters
    if (query.projectId) {
      qb.andWhere('note.projectId = :projectId', { projectId: query.projectId });
    }

    if (query.noteType) {
      qb.andWhere('note.noteType = :noteType', { noteType: query.noteType });
    }

    if (query.status) {
      qb.andWhere('note.status = :status', { status: query.status });
    }

    if (query.visibility) {
      qb.andWhere('note.visibility = :visibility', { visibility: query.visibility });
    }

    if (query.priority) {
      qb.andWhere('note.priority = :priority', { priority: query.priority });
    }

    if (query.createdById) {
      qb.andWhere('note.createdById = :createdById', {
        createdById: query.createdById,
      });
    }

    if (query.assignedToId) {
      qb.andWhere('note.assignedToId = :assignedToId', {
        assignedToId: query.assignedToId,
      });
    }

    if (query.startDate) {
      qb.andWhere('note.noteDate >= :startDate', { startDate: query.startDate });
    }

    if (query.endDate) {
      qb.andWhere('note.noteDate <= :endDate', { endDate: query.endDate });
    }

    if (query.tags && query.tags.length > 0) {
      qb.andWhere('note.tags && ARRAY[:...tags]::text[]', { tags: query.tags });
    }

    if (query.followUpRequiredOnly) {
      qb.andWhere('note.followUpRequired = :followUpRequired', {
        followUpRequired: true,
      });
    }

    if (query.overdueOnly) {
      qb.andWhere('note.followUpRequired = :followUpRequired', {
        followUpRequired: true,
      })
        .andWhere('note.followUpDueDate < :today', { today: new Date() })
        .andWhere('note.followUpCompletedAt IS NULL');
    }

    if (query.search) {
      qb.andWhere(
        new Brackets((qb) => {
          qb.where('note.title ILIKE :search', {
            search: `%${query.search}%`,
          })
            .orWhere('note.description ILIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('note.number ILIKE :search', {
              search: `%${query.search}%`,
            });
        }),
      );
    }

    if (!query.includeDeleted) {
      qb.andWhere('note.isDeleted = :isDeleted', { isDeleted: false });
    }

    // Sorting
    const sortBy = query.sortBy || 'noteDate';
    const sortOrder = query.sortOrder || 'DESC';
    qb.orderBy(`note.${sortBy}`, sortOrder);

    // Pagination
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find one field note by ID
   */
  async findOne(id: string, userId: string): Promise<FieldNote> {
    const note = await this.fieldNoteRepository.findOne({
      where: { id },
      relations: [
        'createdBy',
        'assignedTo',
        'attachments',
        'attachments.uploadedBy',
        'links',
        'links.createdBy',
        'comments',
        'comments.createdBy',
        'comments.parentComment',
        'history',
        'history.performedBy',
      ],
    });

    if (!note) {
      throw new NotFoundException(`Field note with ID ${id} not found`);
    }

    // TODO: Check visibility permissions

    return note;
  }

  /**
   * Update a field note
   */
  async update(
    id: string,
    dto: UpdateFieldNoteDto,
    userId: string,
  ): Promise<FieldNote> {
    const note = await this.findOne(id, userId);

    if (!note.canEdit()) {
      throw new ForbiddenException('Cannot edit this field note');
    }

    // Track changes for history
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    // Update fields and track changes
    Object.keys(dto).forEach((key) => {
      if (dto[key] !== undefined && note[key] !== dto[key]) {
        changes.push({
          field: key,
          oldValue: note[key],
          newValue: dto[key],
        });
        note[key] = dto[key];
      }
    });

    note.lastModifiedAt = new Date();
    const updatedNote = await this.fieldNoteRepository.save(note);

    // Create history entries for changes
    for (const change of changes) {
      if (change.field === 'status') {
        await this.createHistoryEntry(
          id,
          FieldNoteHistoryAction.STATUS_CHANGED,
          userId,
          `Status changed from ${change.oldValue} to ${change.newValue}`,
          { oldValue: change.oldValue, newValue: change.newValue },
        );
      } else if (change.field === 'visibility') {
        await this.createHistoryEntry(
          id,
          FieldNoteHistoryAction.VISIBILITY_CHANGED,
          userId,
          `Visibility changed from ${change.oldValue} to ${change.newValue}`,
          { oldValue: change.oldValue, newValue: change.newValue },
        );
      } else {
        await this.createHistoryEntry(
          id,
          FieldNoteHistoryAction.UPDATED,
          userId,
          `Updated ${change.field}`,
          { field: change.field, oldValue: change.oldValue, newValue: change.newValue },
        );
      }
    }

    return this.findOne(updatedNote.id, userId);
  }

  /**
   * Soft delete a field note
   */
  async remove(id: string, userId: string): Promise<void> {
    const note = await this.findOne(id, userId);

    note.isDeleted = true;
    note.deletedAt = new Date();
    note.deletedById = userId;

    await this.fieldNoteRepository.save(note);

    await this.createHistoryEntry(
      id,
      FieldNoteHistoryAction.ARCHIVED,
      userId,
      'Field note archived',
      null,
    );
  }

  /**
   * Restore a soft-deleted field note
   */
  async restore(id: string, userId: string): Promise<FieldNote> {
    const note = await this.fieldNoteRepository.findOne({ where: { id } });

    if (!note) {
      throw new NotFoundException(`Field note with ID ${id} not found`);
    }

    note.isDeleted = false;
    note.deletedAt = null;
    note.deletedById = null;

    await this.fieldNoteRepository.save(note);

    await this.createHistoryEntry(
      id,
      FieldNoteHistoryAction.RESTORED,
      userId,
      'Field note restored',
      null,
    );

    return this.findOne(id, userId);
  }

  /**
   * Add an attachment to a field note
   */
  async addAttachment(
    noteId: string,
    dto: AddAttachmentDto,
    userId: string,
  ): Promise<FieldNoteAttachment> {
    const note = await this.findOne(noteId, userId);

    const attachment = this.attachmentRepository.create({
      fieldNoteId: noteId,
      uploadedById: userId,
      attachmentType: dto.attachmentType as any,
      filename: dto.filename,
      url: dto.url,
      thumbnailUrl: dto.thumbnailUrl,
      fileSize: dto.fileSize,
      mimeType: dto.mimeType,
      s3Bucket: dto.s3Bucket,
      s3Key: dto.s3Key,
      caption: dto.caption,
      latitude: dto.latitude,
      longitude: dto.longitude,
      metadata: dto.metadata,
    });

    const savedAttachment = await this.attachmentRepository.save(attachment);

    await this.createHistoryEntry(
      noteId,
      FieldNoteHistoryAction.ATTACHMENT_ADDED,
      userId,
      `Added attachment: ${dto.filename}`,
      { attachmentId: savedAttachment.id, filename: dto.filename },
    );

    return savedAttachment;
  }

  /**
   * Remove an attachment
   */
  async removeAttachment(
    noteId: string,
    attachmentId: string,
    userId: string,
  ): Promise<void> {
    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId, fieldNoteId: noteId },
    });

    if (!attachment) {
      throw new NotFoundException(`Attachment with ID ${attachmentId} not found`);
    }

    await this.attachmentRepository.remove(attachment);

    await this.createHistoryEntry(
      noteId,
      FieldNoteHistoryAction.ATTACHMENT_REMOVED,
      userId,
      `Removed attachment: ${attachment.filename}`,
      { attachmentId, filename: attachment.filename },
    );
  }

  /**
   * Add a link to another entity
   */
  async addLink(
    noteId: string,
    dto: AddLinkDto,
    userId: string,
  ): Promise<FieldNoteLink> {
    const note = await this.findOne(noteId, userId);

    const link = this.linkRepository.create({
      ...dto,
      fieldNoteId: noteId,
      createdById: userId,
    });

    const savedLink = await this.linkRepository.save(link);

    await this.createHistoryEntry(
      noteId,
      FieldNoteHistoryAction.LINK_ADDED,
      userId,
      `Added link to ${dto.linkedEntityType}`,
      { linkId: savedLink.id, entityType: dto.linkedEntityType },
    );

    return savedLink;
  }

  /**
   * Remove a link
   */
  async removeLink(
    noteId: string,
    linkId: string,
    userId: string,
  ): Promise<void> {
    const link = await this.linkRepository.findOne({
      where: { id: linkId, fieldNoteId: noteId },
    });

    if (!link) {
      throw new NotFoundException(`Link with ID ${linkId} not found`);
    }

    await this.linkRepository.remove(link);

    await this.createHistoryEntry(
      noteId,
      FieldNoteHistoryAction.LINK_REMOVED,
      userId,
      `Removed link to ${link.linkedEntityType}`,
      { linkId, entityType: link.linkedEntityType },
    );
  }

  /**
   * Add a comment to a field note
   */
  async addComment(
    noteId: string,
    dto: AddCommentDto,
    userId: string,
  ): Promise<FieldNoteComment> {
    const note = await this.findOne(noteId, userId);

    const comment = this.commentRepository.create({
      fieldNoteId: noteId,
      createdById: userId,
      content: dto.content,
      visibility: dto.visibility as any,
      parentCommentId: dto.parentCommentId,
      mentionedUserIds: dto.mentionedUserIds || [],
      attachments: dto.attachments,
    });

    const savedComment = await this.commentRepository.save(comment);

    await this.createHistoryEntry(
      noteId,
      FieldNoteHistoryAction.COMMENT_ADDED,
      userId,
      'Added a comment',
      { commentId: savedComment.id },
    );

    return savedComment;
  }

  /**
   * Complete follow-up for a field note
   */
  async completeFollowUp(
    id: string,
    notes: string,
    userId: string,
  ): Promise<FieldNote> {
    const note = await this.findOne(id, userId);

    if (!note.followUpRequired) {
      throw new BadRequestException('This field note does not require follow-up');
    }

    note.followUpCompletedAt = new Date();
    note.followUpNotes = notes;
    note.status = FieldNoteStatus.RESOLVED;

    await this.fieldNoteRepository.save(note);

    await this.createHistoryEntry(
      id,
      FieldNoteHistoryAction.FOLLOW_UP_COMPLETED,
      userId,
      'Follow-up completed',
      { notes },
    );

    return this.findOne(id, userId);
  }

  /**
   * Get tag suggestions based on existing tags
   */
  async getTagSuggestions(projectId: string, search?: string): Promise<string[]> {
    const qb = this.fieldNoteRepository
      .createQueryBuilder('note')
      .select('DISTINCT unnest(note.tags)', 'tag')
      .where('note.projectId = :projectId', { projectId })
      .andWhere('note.isDeleted = :isDeleted', { isDeleted: false });

    if (search) {
      qb.andWhere('unnest(note.tags) ILIKE :search', { search: `%${search}%` });
    }

    qb.orderBy('tag', 'ASC').limit(20);

    const results = await qb.getRawMany();
    return results.map((r) => r.tag);
  }

  /**
   * Generate a unique note number for the project
   */
  private async generateNoteNumber(projectId: string): Promise<string> {
    const count = await this.fieldNoteRepository.count({
      where: { projectId },
    });

    const nextNumber = count + 1;
    return `FN-${String(nextNumber).padStart(5, '0')}`;
  }

  /**
   * Create a history entry
   */
  private async createHistoryEntry(
    fieldNoteId: string,
    action: FieldNoteHistoryAction,
    userId: string,
    description: string,
    metadata: any,
  ): Promise<void> {
    const history = this.historyRepository.create({
      fieldNoteId,
      action,
      description,
      metadata,
      performedById: userId,
    });

    await this.historyRepository.save(history);
  }
}
