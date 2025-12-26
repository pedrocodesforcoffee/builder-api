import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Addendum,
  AddendumSection,
  Specification,
  Document,
} from '../entities';
import {
  CreateAddendumDto,
  AddendumResponseDto,
  ListAddendaQuery,
} from '../dto/specification-management.dto';

/**
 * Addendum Service
 *
 * Manages addenda that modify specifications.
 * Handles creation, listing, and tracking of specification changes.
 */
@Injectable()
export class AddendumService {
  private readonly logger = new Logger(AddendumService.name);

  constructor(
    @InjectRepository(Addendum)
    private addendumRepository: Repository<Addendum>,
    @InjectRepository(AddendumSection)
    private addendumSectionRepository: Repository<AddendumSection>,
    @InjectRepository(Specification)
    private specRepository: Repository<Specification>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    private dataSource: DataSource,
  ) {}

  /**
   * Create a new addendum
   */
  async create(
    projectId: string,
    dto: CreateAddendumDto,
    userId: string,
  ): Promise<AddendumResponseDto> {
    this.logger.log(`Creating addendum ${dto.number} for project ${projectId}`);

    // Check for duplicate number
    const existing = await this.addendumRepository.findOne({
      where: { projectId, number: dto.number },
    });

    if (existing) {
      throw new ConflictException(
        `Addendum ${dto.number} already exists for this project`,
      );
    }

    // Verify document if provided
    if (dto.documentId) {
      const document = await this.documentRepository.findOne({
        where: { id: dto.documentId, projectId },
      });

      if (!document) {
        throw new NotFoundException(`Document ${dto.documentId} not found`);
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create addendum
      const addendum = queryRunner.manager.create(Addendum, {
        projectId,
        number: dto.number,
        title: dto.title,
        issueDate: new Date(dto.issueDate),
        description: dto.description,
        documentId: dto.documentId,
        relatedRfiIds: dto.relatedRfis || [],
        createdById: userId,
      });

      await queryRunner.manager.save(addendum);

      // Create affected section records
      for (const section of dto.affectedSections) {
        const spec = await queryRunner.manager.findOne(Specification, {
          where: { id: section.specificationId, projectId },
        });

        if (!spec) {
          throw new NotFoundException(
            `Specification ${section.specificationId} not found`,
          );
        }

        const addendumSection = queryRunner.manager.create(AddendumSection, {
          addendumId: addendum.id,
          specificationId: section.specificationId,
          changeType: section.changeType,
          changeDescription: section.changeDescription,
          newContent: section.newContent,
          newDocumentId: section.newDocumentId,
        });

        await queryRunner.manager.save(addendumSection);
      }

      await queryRunner.commitTransaction();

      this.logger.log(`Created addendum ${addendum.id}`);

      // Fetch with relations for response
      const created = await this.addendumRepository.findOne({
        where: { id: addendum.id },
        relations: ['affectedSections', 'affectedSections.specification', 'document'],
      });

      return this.toResponseDto(created!);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get a single addendum
   */
  async findOne(projectId: string, addendumId: string): Promise<AddendumResponseDto> {
    const addendum = await this.addendumRepository.findOne({
      where: { id: addendumId, projectId },
      relations: ['affectedSections', 'affectedSections.specification', 'document'],
    });

    if (!addendum) {
      throw new NotFoundException(`Addendum ${addendumId} not found`);
    }

    return this.toResponseDto(addendum);
  }

  /**
   * List all addenda for a project
   */
  async findAll(
    projectId: string,
    query: ListAddendaQuery,
  ): Promise<{
    addenda: AddendumResponseDto[];
    summary: any;
  }> {
    const qb = this.addendumRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.affectedSections', 'as')
      .leftJoinAndSelect('as.specification', 's')
      .leftJoinAndSelect('a.document', 'd')
      .where('a.projectId = :projectId', { projectId })
      .andWhere('a.deletedAt IS NULL');

    if (query.affectsSection) {
      qb.andWhere('s.sectionNumber = :sectionNumber', {
        sectionNumber: query.affectsSection,
      });
    }

    if (query.issuedAfter) {
      qb.andWhere('a.issueDate >= :issuedAfter', { issuedAfter: query.issuedAfter });
    }

    if (query.issuedBefore) {
      qb.andWhere('a.issueDate <= :issuedBefore', { issuedBefore: query.issuedBefore });
    }

    qb.orderBy('a.issueDate', (query.sortOrder?.toUpperCase() as 'ASC' | 'DESC') || 'DESC');

    const addenda = await qb.getMany();

    // Calculate summary
    const totalSectionsAffected = new Set(
      addenda.flatMap((a) => a.affectedSections.map((s) => s.specificationId)),
    ).size;

    const latestIssueDate =
      addenda.length > 0 ? addenda[0].issueDate.toISOString() : null;

    return {
      addenda: addenda.map((a) => this.toResponseDto(a)),
      summary: {
        totalAddenda: addenda.length,
        totalSectionsAffected,
        latestIssueDate,
      },
    };
  }

  /**
   * Get addendum history for a specific specification
   */
  async getSpecificationHistory(
    projectId: string,
    specId: string,
  ): Promise<{
    specificationId: string;
    sectionNumber: string;
    sectionTitle: string;
    addendaHistory: any[];
  }> {
    const spec = await this.specRepository.findOne({
      where: { id: specId, projectId },
    });

    if (!spec) {
      throw new NotFoundException(`Specification ${specId} not found`);
    }

    const addendumSections = await this.addendumSectionRepository.find({
      where: { specificationId: specId },
      relations: ['addendum'],
      order: { createdAt: 'ASC' },
    });

    return {
      specificationId: specId,
      sectionNumber: spec.sectionNumber,
      sectionTitle: spec.sectionTitle,
      addendaHistory: addendumSections.map((as) => ({
        addendumId: as.addendum.id,
        addendumNumber: as.addendum.number,
        issueDate: as.addendum.issueDate.toISOString(),
        changeType: as.changeType,
        changeDescription: as.changeDescription,
      })),
    };
  }

  /**
   * Delete an addendum
   */
  async delete(projectId: string, addendumId: string): Promise<void> {
    const addendum = await this.addendumRepository.findOne({
      where: { id: addendumId, projectId },
    });

    if (!addendum) {
      throw new NotFoundException(`Addendum ${addendumId} not found`);
    }

    await this.addendumRepository.softDelete(addendumId);

    this.logger.log(`Deleted addendum ${addendumId}`);
  }

  /**
   * Convert entity to response DTO
   */
  private toResponseDto(addendum: Addendum): AddendumResponseDto {
    return {
      id: addendum.id,
      projectId: addendum.projectId,
      number: addendum.number,
      title: addendum.title,
      issueDate: addendum.issueDate.toISOString(),
      description: addendum.description,
      document: addendum.document
        ? {
            id: addendum.document.id,
            name: addendum.document.name,
          }
        : null,
      affectedSections:
        addendum.affectedSections?.map((as) => ({
          specificationId: as.specificationId,
          sectionNumber: as.specification.sectionNumber,
          sectionTitle: as.specification.sectionTitle,
          changeType: as.changeType,
          changeDescription: as.changeDescription,
        })) || [],
      createdAt: addendum.createdAt.toISOString(),
    };
  }
}
