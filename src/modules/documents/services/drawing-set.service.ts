import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { DrawingSet } from '../entities/drawing-set.entity';
import { Drawing } from '../entities/drawing.entity';
import {
  CreateDrawingSetDto,
  UpdateDrawingSetDto,
  IssueDrawingSetDto,
  SupersedeDrawingSetDto,
  DrawingSetResponseDto,
} from '../dto/drawing-management.dto';

/**
 * Drawing Set Service
 *
 * Manages drawing sets - groups of drawings organized by phase/purpose.
 * Handles creation, updates, issuing, and lifecycle management.
 *
 * Key responsibilities:
 * - Create and update drawing sets
 * - Issue drawing sets for distribution
 * - Mark sets as current/superseded
 * - Manage drawing count denormalization
 * - Handle set lifecycle (draft -> issued -> superseded -> archived)
 */
@Injectable()
export class DrawingSetService {
  private readonly logger = new Logger(DrawingSetService.name);

  constructor(
    @InjectRepository(DrawingSet)
    private drawingSetRepository: Repository<DrawingSet>,
    @InjectRepository(Drawing)
    private drawingRepository: Repository<Drawing>,
    private dataSource: DataSource,
  ) {}

  /**
   * Create a new drawing set
   */
  async create(
    projectId: string,
    userId: string,
    dto: CreateDrawingSetDto,
  ): Promise<DrawingSetResponseDto> {
    this.logger.log(`Creating drawing set for project ${projectId}`);

    const drawingSet: DrawingSet = this.drawingSetRepository.create({
      projectId,
      name: dto.name,
      setType: dto.setType as any,
      description: dto.description,
      issueDate: dto.issueDate,
      revisionLabel: dto.revisionLabel,
      metadata: dto.metadata || {},
      status: 'draft',
      drawingCount: 0,
      isCurrent: false,
      createdById: userId,
    });

    const saved: DrawingSet = await this.drawingSetRepository.save(drawingSet);

    this.logger.log(`Created drawing set ${saved.id}`);

    return this.toResponseDto(saved);
  }

  /**
   * Get a drawing set by ID
   */
  async findOne(projectId: string, setId: string): Promise<DrawingSetResponseDto> {
    const drawingSet = await this.drawingSetRepository.findOne({
      where: { id: setId, projectId },
    });

    if (!drawingSet) {
      throw new NotFoundException(`Drawing set ${setId} not found`);
    }

    return this.toResponseDto(drawingSet);
  }

  /**
   * Get all drawing sets for a project
   */
  async findAll(
    projectId: string,
    options?: {
      setType?: string;
      status?: string;
      isCurrent?: boolean;
    },
  ): Promise<DrawingSetResponseDto[]> {
    const where: any = { projectId };

    if (options?.setType) {
      where.setType = options.setType;
    }

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.isCurrent !== undefined) {
      where.isCurrent = options.isCurrent;
    }

    const drawingSets = await this.drawingSetRepository.find({
      where,
      order: {
        issueDate: 'DESC',
        createdAt: 'DESC',
      },
    });

    return drawingSets.map((set) => this.toResponseDto(set));
  }

  /**
   * Update a drawing set
   */
  async update(
    projectId: string,
    setId: string,
    dto: UpdateDrawingSetDto,
  ): Promise<DrawingSetResponseDto> {
    const drawingSet = await this.drawingSetRepository.findOne({
      where: { id: setId, projectId },
    });

    if (!drawingSet) {
      throw new NotFoundException(`Drawing set ${setId} not found`);
    }

    // Cannot update issued or superseded sets without proper workflow
    if (drawingSet.status === 'issued' || drawingSet.status === 'superseded') {
      throw new BadRequestException(
        `Cannot update drawing set in ${drawingSet.status} status. Use proper workflow methods.`,
      );
    }

    Object.assign(drawingSet, {
      ...(dto.name && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.issueDate !== undefined && { issueDate: dto.issueDate }),
      ...(dto.revisionLabel !== undefined && { revisionLabel: dto.revisionLabel }),
      ...(dto.metadata && { metadata: { ...drawingSet.metadata, ...dto.metadata } }),
    });

    const saved = await this.drawingSetRepository.save(drawingSet);

    this.logger.log(`Updated drawing set ${setId}`);

    return this.toResponseDto(saved);
  }

  /**
   * Issue a drawing set (mark as published/distributed)
   */
  async issue(
    projectId: string,
    setId: string,
    dto: IssueDrawingSetDto,
  ): Promise<DrawingSetResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const drawingSet = await queryRunner.manager.findOne(DrawingSet, {
        where: { id: setId, projectId },
      });

      if (!drawingSet) {
        throw new NotFoundException(`Drawing set ${setId} not found`);
      }

      if (drawingSet.status !== 'draft') {
        throw new BadRequestException(
          `Can only issue drawing sets in draft status. Current status: ${drawingSet.status}`,
        );
      }

      // Update set status
      drawingSet.status = 'issued';
      drawingSet.issueDate = dto.issueDate;
      drawingSet.issuedFor = dto.issuePurpose;

      // If specific drawings were selected, update their metadata
      if (dto.drawingIds && dto.drawingIds.length > 0) {
        const drawings = await queryRunner.manager.find(Drawing, {
          where: {
            id: In(dto.drawingIds),
            drawingSetId: setId,
          },
        });

        for (const drawing of drawings) {
          drawing.customFields = {
            ...drawing.customFields,
            lastIssued: dto.issueDate.toISOString(),
            issuedFor: dto.issuePurpose,
          };
          await queryRunner.manager.save(drawing);
        }
      }

      const saved = await queryRunner.manager.save(drawingSet);

      await queryRunner.commitTransaction();

      this.logger.log(`Issued drawing set ${setId} for ${dto.issuePurpose}`);

      return this.toResponseDto(saved);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Mark a drawing set as current (unmark previous current set)
   */
  async markAsCurrent(
    projectId: string,
    setId: string,
  ): Promise<DrawingSetResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const drawingSet = await queryRunner.manager.findOne(DrawingSet, {
        where: { id: setId, projectId },
      });

      if (!drawingSet) {
        throw new NotFoundException(`Drawing set ${setId} not found`);
      }

      if (drawingSet.status !== 'issued') {
        throw new BadRequestException(
          'Only issued drawing sets can be marked as current',
        );
      }

      // Unmark any existing current set
      await queryRunner.manager.update(
        DrawingSet,
        { projectId, isCurrent: true },
        { isCurrent: false },
      );

      // Mark this set as current
      drawingSet.isCurrent = true;
      const saved = await queryRunner.manager.save(drawingSet);

      await queryRunner.commitTransaction();

      this.logger.log(`Marked drawing set ${setId} as current`);

      return this.toResponseDto(saved);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Supersede a drawing set (mark as replaced by a newer set)
   */
  async supersede(
    projectId: string,
    setId: string,
    dto: SupersedeDrawingSetDto,
  ): Promise<DrawingSetResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const drawingSet = await queryRunner.manager.findOne(DrawingSet, {
        where: { id: setId, projectId },
      });

      if (!drawingSet) {
        throw new NotFoundException(`Drawing set ${setId} not found`);
      }

      // Verify the superseding set exists
      const supersedingSet = await queryRunner.manager.findOne(DrawingSet, {
        where: { id: dto.supersededById, projectId },
      });

      if (!supersedingSet) {
        throw new NotFoundException(
          `Superseding drawing set ${dto.supersededById} not found`,
        );
      }

      if (supersedingSet.status !== 'issued') {
        throw new BadRequestException(
          'Superseding set must be in issued status',
        );
      }

      // Update status
      drawingSet.status = 'superseded';
      drawingSet.supersededById = dto.supersededById;
      drawingSet.isCurrent = false;

      // Store reason in metadata
      drawingSet.metadata = {
        ...drawingSet.metadata,
        supersededReason: dto.reason,
        supersededAt: new Date().toISOString(),
      };

      const saved = await queryRunner.manager.save(drawingSet);

      await queryRunner.commitTransaction();

      this.logger.log(`Superseded drawing set ${setId} by ${dto.supersededById}`);

      return this.toResponseDto(saved);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Archive a drawing set (soft delete)
   */
  async archive(projectId: string, setId: string): Promise<void> {
    const drawingSet = await this.drawingSetRepository.findOne({
      where: { id: setId, projectId },
    });

    if (!drawingSet) {
      throw new NotFoundException(`Drawing set ${setId} not found`);
    }

    if (drawingSet.isCurrent) {
      throw new BadRequestException(
        'Cannot archive the current drawing set. Mark another set as current first.',
      );
    }

    drawingSet.status = 'archived';
    await this.drawingSetRepository.save(drawingSet);
    await this.drawingSetRepository.softDelete(setId);

    this.logger.log(`Archived drawing set ${setId}`);
  }

  /**
   * Add drawings to a set
   */
  async addDrawings(
    projectId: string,
    setId: string,
    drawingIds: string[],
  ): Promise<DrawingSetResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const drawingSet = await queryRunner.manager.findOne(DrawingSet, {
        where: { id: setId, projectId },
      });

      if (!drawingSet) {
        throw new NotFoundException(`Drawing set ${setId} not found`);
      }

      // Update drawings
      await queryRunner.manager.update(
        Drawing,
        { id: In(drawingIds) },
        { drawingSetId: setId },
      );

      // Update count
      const count = await queryRunner.manager.count(Drawing, {
        where: { drawingSetId: setId },
      });

      drawingSet.drawingCount = count;
      const saved = await queryRunner.manager.save(drawingSet);

      await queryRunner.commitTransaction();

      this.logger.log(`Added ${drawingIds.length} drawings to set ${setId}`);

      return this.toResponseDto(saved);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Remove drawings from a set
   */
  async removeDrawings(
    projectId: string,
    setId: string,
    drawingIds: string[],
  ): Promise<DrawingSetResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const drawingSet = await queryRunner.manager.findOne(DrawingSet, {
        where: { id: setId, projectId },
      });

      if (!drawingSet) {
        throw new NotFoundException(`Drawing set ${setId} not found`);
      }

      // Remove drawings from set
      await queryRunner.manager.update(
        Drawing,
        { id: In(drawingIds), drawingSetId: setId },
        { drawingSetId: null },
      );

      // Update count
      const count = await queryRunner.manager.count(Drawing, {
        where: { drawingSetId: setId },
      });

      drawingSet.drawingCount = count;
      const saved = await queryRunner.manager.save(drawingSet);

      await queryRunner.commitTransaction();

      this.logger.log(`Removed ${drawingIds.length} drawings from set ${setId}`);

      return this.toResponseDto(saved);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get drawings in a set
   */
  async getDrawings(
    projectId: string,
    setId: string,
  ): Promise<Drawing[]> {
    // Verify set exists and belongs to project
    const drawingSet = await this.drawingSetRepository.findOne({
      where: { id: setId, projectId },
    });

    if (!drawingSet) {
      throw new NotFoundException(`Drawing set ${setId} not found`);
    }

    return this.drawingRepository.find({
      where: { drawingSetId: setId },
      order: {
        pageNumber: 'ASC',
        number: 'ASC',
      },
    });
  }

  /**
   * Get the current drawing set for a project
   */
  async getCurrent(projectId: string): Promise<DrawingSetResponseDto | null> {
    const drawingSet = await this.drawingSetRepository.findOne({
      where: { projectId, isCurrent: true },
    });

    return drawingSet ? this.toResponseDto(drawingSet) : null;
  }

  /**
   * Update drawing count for a set (internal helper)
   */
  async updateDrawingCount(setId: string): Promise<void> {
    const count = await this.drawingRepository.count({
      where: { drawingSetId: setId },
    });

    await this.drawingSetRepository.update(setId, { drawingCount: count });
  }

  /**
   * Convert entity to response DTO
   */
  private toResponseDto(set: DrawingSet): DrawingSetResponseDto {
    return {
      id: set.id,
      projectId: set.projectId,
      name: set.name,
      setType: set.setType,
      description: set.description,
      status: set.status,
      issueDate: set.issueDate,
      revisionLabel: set.revisionLabel,
      drawingCount: set.drawingCount,
      supersededById: set.supersededById,
      metadata: set.metadata,
      createdAt: set.createdAt,
      updatedAt: set.updatedAt,
    };
  }
}
