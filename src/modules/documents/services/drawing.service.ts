import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Drawing } from '../entities/drawing.entity';
import { DrawingRevision } from '../entities/drawing-revision.entity';
import { DrawingCrossReference } from '../entities/drawing-cross-reference.entity';
import { DrawingSet } from '../entities/drawing-set.entity';
import { Document } from '../entities/document.entity';
import {
  CreateDrawingDto,
  UpdateDrawingDto,
  AddDrawingRevisionDto,
  CreateCrossReferenceDto,
  DrawingResponseDto,
} from '../dto/drawing-management.dto';
import { DrawingSetService } from './drawing-set.service';

/**
 * Drawing Service
 *
 * Manages construction drawings with industry-standard features.
 * Handles creation, updates, revisions, cross-references, and validation.
 *
 * Key responsibilities:
 * - Create and update drawings
 * - Validate sheet numbering (e.g., A-101, S-201.1)
 * - Manage revision history
 * - Track cross-references between drawings
 * - Integration with drawing sets
 * - Query and filter drawings
 */
@Injectable()
export class DrawingService {
  private readonly logger = new Logger(DrawingService.name);

  constructor(
    @InjectRepository(Drawing)
    private drawingRepository: Repository<Drawing>,
    @InjectRepository(DrawingRevision)
    private revisionRepository: Repository<DrawingRevision>,
    @InjectRepository(DrawingCrossReference)
    private crossReferenceRepository: Repository<DrawingCrossReference>,
    @InjectRepository(DrawingSet)
    private drawingSetRepository: Repository<DrawingSet>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    private drawingSetService: DrawingSetService,
    private dataSource: DataSource,
  ) {}

  /**
   * Create a new drawing
   */
  async create(
    projectId: string,
    userId: string,
    dto: CreateDrawingDto,
  ): Promise<DrawingResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(`Creating drawing ${dto.number} for project ${projectId}`);

      // Verify document exists and belongs to project
      const document = await queryRunner.manager.findOne(Document, {
        where: { id: dto.documentId, projectId },
      });

      if (!document) {
        throw new NotFoundException(
          `Document ${dto.documentId} not found in project`,
        );
      }

      // Check if drawing with same number already exists in project
      const existingDrawing = await queryRunner.manager.findOne(Drawing, {
        where: {
          number: dto.number,
        },
        relations: ['document'],
      });

      if (
        existingDrawing &&
        existingDrawing.document.projectId === projectId
      ) {
        throw new ConflictException(
          `Drawing with number ${dto.number} already exists in this project`,
        );
      }

      // If drawing set specified, verify it exists
      if (dto.drawingSetId) {
        const drawingSet = await queryRunner.manager.findOne(DrawingSet, {
          where: { id: dto.drawingSetId, projectId },
        });

        if (!drawingSet) {
          throw new NotFoundException(
            `Drawing set ${dto.drawingSetId} not found`,
          );
        }
      }

      // Create drawing
      const drawing = queryRunner.manager.create(Drawing, {
        documentId: dto.documentId,
        drawingSetId: dto.drawingSetId,
        number: dto.number,
        title: dto.title,
        discipline: dto.discipline,
        drawingType: dto.drawingType,
        sheetSize: dto.sheetSize,
        pageNumber: dto.pageNumber,
        currentRevision: dto.currentRevision,
        revisionDate: dto.revisionDate,
        gridReference: dto.gridReference,
        area: dto.area,
        zone: dto.zone,
        tags: dto.tags || [],
        customFields: dto.customFields || {},
        revisionHistory: [],
        referencedDrawings: [],
        referencedBy: [],
      });

      const saved = await queryRunner.manager.save(drawing);

      // Update drawing set count if applicable
      if (dto.drawingSetId) {
        await this.drawingSetService.updateDrawingCount(dto.drawingSetId);
      }

      await queryRunner.commitTransaction();

      this.logger.log(`Created drawing ${saved.id} (${dto.number})`);

      return this.toResponseDto(saved);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get a drawing by ID
   */
  async findOne(
    projectId: string,
    drawingId: string,
    options?: {
      includeRevisions?: boolean;
      includeCrossReferences?: boolean;
    },
  ): Promise<DrawingResponseDto & { revisions?: DrawingRevision[]; crossReferences?: any }> {
    const drawing = await this.drawingRepository.findOne({
      where: { id: drawingId },
      relations: ['document'],
    });

    if (!drawing || drawing.document.projectId !== projectId) {
      throw new NotFoundException(`Drawing ${drawingId} not found`);
    }

    const response: any = this.toResponseDto(drawing);

    // Optionally include full revision records
    if (options?.includeRevisions) {
      response.revisions = await this.revisionRepository.find({
        where: { drawingId },
        order: { sequenceNumber: 'DESC' },
      });
    }

    // Optionally include cross-references
    if (options?.includeCrossReferences) {
      const outgoing = await this.crossReferenceRepository.find({
        where: { sourceDrawingId: drawingId },
        relations: ['targetDrawing'],
      });

      const incoming = await this.crossReferenceRepository.find({
        where: { targetDrawingId: drawingId },
        relations: ['sourceDrawing'],
      });

      response.crossReferences = {
        outgoing,
        incoming,
      };
    }

    return response;
  }

  /**
   * Get all drawings for a project
   */
  async findAll(
    projectId: string,
    options?: {
      discipline?: string;
      drawingType?: string;
      drawingSetId?: string;
      search?: string;
    },
  ): Promise<DrawingResponseDto[]> {
    const queryBuilder = this.drawingRepository
      .createQueryBuilder('drawing')
      .innerJoin('drawing.document', 'document')
      .where('document.projectId = :projectId', { projectId });

    if (options?.discipline) {
      queryBuilder.andWhere('drawing.discipline = :discipline', {
        discipline: options.discipline,
      });
    }

    if (options?.drawingType) {
      queryBuilder.andWhere('drawing.drawingType = :drawingType', {
        drawingType: options.drawingType,
      });
    }

    if (options?.drawingSetId) {
      queryBuilder.andWhere('drawing.drawingSetId = :drawingSetId', {
        drawingSetId: options.drawingSetId,
      });
    }

    if (options?.search) {
      queryBuilder.andWhere(
        '(drawing.number ILIKE :search OR drawing.title ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    queryBuilder.orderBy('drawing.number', 'ASC');

    const drawings = await queryBuilder.getMany();

    return drawings.map((drawing) => this.toResponseDto(drawing));
  }

  /**
   * Update a drawing
   */
  async update(
    projectId: string,
    drawingId: string,
    dto: UpdateDrawingDto,
  ): Promise<DrawingResponseDto> {
    const drawing = await this.drawingRepository.findOne({
      where: { id: drawingId },
      relations: ['document'],
    });

    if (!drawing || drawing.document.projectId !== projectId) {
      throw new NotFoundException(`Drawing ${drawingId} not found`);
    }

    Object.assign(drawing, {
      ...(dto.title && { title: dto.title }),
      ...(dto.discipline && { discipline: dto.discipline }),
      ...(dto.drawingType && { drawingType: dto.drawingType }),
      ...(dto.sheetSize !== undefined && { sheetSize: dto.sheetSize }),
      ...(dto.pageNumber !== undefined && { pageNumber: dto.pageNumber }),
      ...(dto.currentRevision !== undefined && {
        currentRevision: dto.currentRevision,
      }),
      ...(dto.revisionDate !== undefined && { revisionDate: dto.revisionDate }),
      ...(dto.gridReference !== undefined && {
        gridReference: dto.gridReference,
      }),
      ...(dto.area !== undefined && { area: dto.area }),
      ...(dto.zone !== undefined && { zone: dto.zone }),
      ...(dto.tags && { tags: dto.tags }),
      ...(dto.customFields && {
        customFields: { ...drawing.customFields, ...dto.customFields },
      }),
    });

    const saved = await this.drawingRepository.save(drawing);

    this.logger.log(`Updated drawing ${drawingId}`);

    return this.toResponseDto(saved);
  }

  /**
   * Delete a drawing
   */
  async delete(projectId: string, drawingId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const drawing = await queryRunner.manager.findOne(Drawing, {
        where: { id: drawingId },
        relations: ['document'],
      });

      if (!drawing || drawing.document.projectId !== projectId) {
        throw new NotFoundException(`Drawing ${drawingId} not found`);
      }

      const drawingSetId = drawing.drawingSetId;

      await queryRunner.manager.delete(Drawing, drawingId);

      // Update drawing set count if applicable
      if (drawingSetId) {
        await this.drawingSetService.updateDrawingCount(drawingSetId);
      }

      await queryRunner.commitTransaction();

      this.logger.log(`Deleted drawing ${drawingId}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Add a revision to a drawing
   */
  async addRevision(
    projectId: string,
    drawingId: string,
    userId: string,
    dto: AddDrawingRevisionDto,
  ): Promise<DrawingRevision> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const drawing = await queryRunner.manager.findOne(Drawing, {
        where: { id: drawingId },
        relations: ['document'],
      });

      if (!drawing || drawing.document.projectId !== projectId) {
        throw new NotFoundException(`Drawing ${drawingId} not found`);
      }

      // Check if revision marker already exists
      const existingRevision = await queryRunner.manager.findOne(
        DrawingRevision,
        {
          where: {
            drawingId,
            revisionMarker: dto.revisionMarker,
          },
        },
      );

      if (existingRevision) {
        throw new ConflictException(
          `Revision ${dto.revisionMarker} already exists for this drawing`,
        );
      }

      // Get next sequence number
      const lastRevision = await queryRunner.manager.findOne(DrawingRevision, {
        where: { drawingId },
        order: { sequenceNumber: 'DESC' },
      });

      const sequenceNumber = lastRevision ? lastRevision.sequenceNumber + 1 : 1;

      // Create revision record
      const revision = queryRunner.manager.create(DrawingRevision, {
        drawingId,
        revisionMarker: dto.revisionMarker,
        sequenceNumber,
        issuedDate: dto.issuedDate,
        description: dto.description,
        cloudLocations: dto.cloudLocations || [],
        cloudCoordinates: dto.cloudCoordinates,
        relatedRFIs: dto.relatedRFIs || [],
        relatedASIs: dto.relatedASIs || [],
        relatedChangeOrders: dto.relatedChangeOrders || [],
        relatedAddenda: dto.relatedAddenda || [],
        notes: dto.notes,
        isMajorRevision: dto.isMajorRevision || false,
        revisionReason: dto.revisionReason,
        issuedTo: dto.issuedTo || [],
        transmittalNumber: dto.transmittalNumber,
        status: 'issued',
        createdById: userId,
        createdByName: 'User', // TODO: Get from user context
      });

      const savedRevision = await queryRunner.manager.save(revision);

      // Update drawing's current revision
      drawing.currentRevision = dto.revisionMarker;
      drawing.revisionDate = dto.issuedDate;

      // Add to revision history array (for quick access)
      drawing.revisionHistory = [
        ...drawing.revisionHistory,
        {
          revision: dto.revisionMarker,
          date: dto.issuedDate.toISOString(),
          description: dto.description,
          cloudLocations: dto.cloudLocations,
        },
      ];

      await queryRunner.manager.save(drawing);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Added revision ${dto.revisionMarker} to drawing ${drawingId}`,
      );

      return savedRevision;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get revisions for a drawing
   */
  async getRevisions(
    projectId: string,
    drawingId: string,
  ): Promise<DrawingRevision[]> {
    // Verify drawing exists and belongs to project
    const drawing = await this.drawingRepository.findOne({
      where: { id: drawingId },
      relations: ['document'],
    });

    if (!drawing || drawing.document.projectId !== projectId) {
      throw new NotFoundException(`Drawing ${drawingId} not found`);
    }

    return this.revisionRepository.find({
      where: { drawingId },
      order: { sequenceNumber: 'DESC' },
    });
  }

  /**
   * Create a cross-reference between drawings
   */
  async createCrossReference(
    projectId: string,
    sourceDrawingId: string,
    userId: string,
    dto: CreateCrossReferenceDto,
  ): Promise<DrawingCrossReference> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verify source drawing
      const sourceDrawing = await queryRunner.manager.findOne(Drawing, {
        where: { id: sourceDrawingId },
        relations: ['document'],
      });

      if (!sourceDrawing || sourceDrawing.document.projectId !== projectId) {
        throw new NotFoundException(`Source drawing ${sourceDrawingId} not found`);
      }

      // Verify target drawing
      const targetDrawing = await queryRunner.manager.findOne(Drawing, {
        where: { id: dto.targetDrawingId },
        relations: ['document'],
      });

      if (!targetDrawing || targetDrawing.document.projectId !== projectId) {
        throw new NotFoundException(
          `Target drawing ${dto.targetDrawingId} not found`,
        );
      }

      // Create cross-reference
      const crossReference = queryRunner.manager.create(DrawingCrossReference, {
        sourceDrawingId,
        targetDrawingId: dto.targetDrawingId,
        referenceType: dto.referenceType,
        calloutText: dto.calloutText,
        description: dto.description,
        gridLocation: dto.gridLocation,
        coordinates: dto.coordinates,
        notes: dto.notes,
        isAutoGenerated: false,
        isVerified: true,
        verifiedById: userId,
        verifiedAt: new Date(),
        createdById: userId,
      });

      const saved = await queryRunner.manager.save(crossReference);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Created cross-reference from ${sourceDrawingId} to ${dto.targetDrawingId}`,
      );

      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get cross-references for a drawing
   */
  async getCrossReferences(
    projectId: string,
    drawingId: string,
  ): Promise<{
    outgoing: DrawingCrossReference[];
    incoming: DrawingCrossReference[];
  }> {
    // Verify drawing exists and belongs to project
    const drawing = await this.drawingRepository.findOne({
      where: { id: drawingId },
      relations: ['document'],
    });

    if (!drawing || drawing.document.projectId !== projectId) {
      throw new NotFoundException(`Drawing ${drawingId} not found`);
    }

    const outgoing = await this.crossReferenceRepository.find({
      where: { sourceDrawingId: drawingId },
      relations: ['targetDrawing'],
      order: { createdAt: 'ASC' },
    });

    const incoming = await this.crossReferenceRepository.find({
      where: { targetDrawingId: drawingId },
      relations: ['sourceDrawing'],
      order: { createdAt: 'ASC' },
    });

    return { outgoing, incoming };
  }

  /**
   * Delete a cross-reference
   */
  async deleteCrossReference(
    projectId: string,
    crossReferenceId: string,
  ): Promise<void> {
    const crossReference = await this.crossReferenceRepository.findOne({
      where: { id: crossReferenceId },
      relations: ['sourceDrawing', 'sourceDrawing.document'],
    });

    if (!crossReference) {
      throw new NotFoundException(
        `Cross-reference ${crossReferenceId} not found`,
      );
    }

    if (crossReference.sourceDrawing.document.projectId !== projectId) {
      throw new NotFoundException(
        `Cross-reference ${crossReferenceId} not found in project`,
      );
    }

    await this.crossReferenceRepository.delete(crossReferenceId);

    this.logger.log(`Deleted cross-reference ${crossReferenceId}`);
  }

  /**
   * Validate sheet number format
   */
  validateSheetNumber(sheetNumber: string): boolean {
    // Format: {Discipline}-{Number}[.{Sub}]
    // Examples: A-101, S-201.1, M-301
    const pattern = /^[A-Z]-[0-9]+(\.[0-9]+)?$/;
    return pattern.test(sheetNumber);
  }

  /**
   * Extract discipline from sheet number
   */
  extractDiscipline(sheetNumber: string): string {
    const match = sheetNumber.match(/^([A-Z])-/);
    return match ? match[1] : '';
  }

  /**
   * Convert entity to response DTO
   */
  private toResponseDto(drawing: Drawing): DrawingResponseDto {
    return {
      id: drawing.id,
      documentId: drawing.documentId,
      drawingSetId: drawing.drawingSetId,
      number: drawing.number,
      title: drawing.title,
      discipline: drawing.discipline,
      drawingType: drawing.drawingType,
      sheetSize: drawing.sheetSize,
      pageNumber: drawing.pageNumber,
      currentRevision: drawing.currentRevision,
      revisionDate: drawing.revisionDate,
      revisionHistory: drawing.revisionHistory,
      gridReference: drawing.gridReference,
      area: drawing.area,
      zone: drawing.zone,
      tags: drawing.tags,
      customFields: drawing.customFields,
      createdAt: drawing.createdAt,
      updatedAt: drawing.updatedAt,
    };
  }
}
