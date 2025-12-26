import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FieldNoteTemplate } from '../entities/field-note-template.entity';
import {
  CreateFieldNoteTemplateDto,
  UpdateFieldNoteTemplateDto,
  QueryFieldNoteTemplatesDto,
} from '../dto/field-note-template.dto';

@Injectable()
export class FieldNoteTemplateService {
  constructor(
    @InjectRepository(FieldNoteTemplate)
    private readonly templateRepository: Repository<FieldNoteTemplate>,
  ) {}

  /**
   * Create a new field note template
   */
  async create(
    dto: CreateFieldNoteTemplateDto,
    userId: string,
  ): Promise<FieldNoteTemplate> {
    const template = this.templateRepository.create({
      name: dto.name,
      description: dto.description,
      noteType: dto.noteType,
      templateFields: dto.templateFields as any,
      defaultValues: dto.defaultValues as any,
      category: dto.category,
      displayOrder: dto.displayOrder ?? 0,
      organizationId: dto.organizationId,
      createdById: userId,
      isSystem: false, // Only system can create system templates
      isActive: true,
      usageCount: 0,
    } as any);

    return this.templateRepository.save(template) as any;
  }

  /**
   * Find all field note templates with filtering and pagination
   */
  async findAll(query: QueryFieldNoteTemplatesDto): Promise<{
    data: FieldNoteTemplate[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.templateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.createdBy', 'createdBy')
      .leftJoinAndSelect('template.updatedBy', 'updatedBy');

    // Apply filters
    if (query.organizationId) {
      qb.andWhere('template.organizationId = :organizationId', {
        organizationId: query.organizationId,
      });
    }

    if (query.noteType) {
      qb.andWhere('template.noteType = :noteType', { noteType: query.noteType });
    }

    if (query.category) {
      qb.andWhere('template.category = :category', { category: query.category });
    }

    if (query.activeOnly) {
      qb.andWhere('template.isActive = :isActive', { isActive: true });
    }

    if (query.systemOnly) {
      qb.andWhere('template.isSystem = :isSystem', { isSystem: true });
    }

    if (query.includeSystem !== undefined && !query.includeSystem) {
      qb.andWhere('template.isSystem = :isSystem', { isSystem: false });
    }

    // Default: show system templates and org templates
    if (
      query.organizationId &&
      query.includeSystem !== false &&
      !query.systemOnly
    ) {
      qb.andWhere(
        '(template.organizationId = :orgId OR template.isSystem = :isSystem)',
        { orgId: query.organizationId, isSystem: true },
      );
    }

    // Sorting
    const sortBy = query.sortBy || 'displayOrder';
    const sortOrder = query.sortOrder || 'ASC';
    qb.orderBy(`template.${sortBy}`, sortOrder);

    // Secondary sort by name
    if (sortBy !== 'name') {
      qb.addOrderBy('template.name', 'ASC');
    }

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
   * Find one field note template by ID
   */
  async findOne(id: string): Promise<FieldNoteTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['createdBy', 'updatedBy'],
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  /**
   * Update a field note template
   */
  async update(
    id: string,
    dto: UpdateFieldNoteTemplateDto,
    userId: string,
  ): Promise<FieldNoteTemplate> {
    const template = await this.findOne(id);

    if (!template.canEdit()) {
      throw new ForbiddenException('Cannot edit system templates');
    }

    Object.assign(template, dto);
    template.updatedById = userId;

    return this.templateRepository.save(template);
  }

  /**
   * Delete a field note template
   */
  async remove(id: string): Promise<void> {
    const template = await this.findOne(id);

    if (!template.canDelete()) {
      if (template.isSystem) {
        throw new ForbiddenException('Cannot delete system templates');
      }
      throw new ForbiddenException(
        'Cannot delete templates that are in use. Current usage count: ' +
          template.usageCount,
      );
    }

    await this.templateRepository.remove(template);
  }

  /**
   * Increment usage count when template is used
   */
  async incrementUsage(id: string): Promise<void> {
    const template = await this.findOne(id);
    template.incrementUsage();
    await this.templateRepository.save(template);
  }

  /**
   * Get popular templates (by usage count)
   */
  async getPopular(
    organizationId?: string,
    limit: number = 10,
  ): Promise<FieldNoteTemplate[]> {
    const qb = this.templateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.createdBy', 'createdBy')
      .where('template.isActive = :isActive', { isActive: true })
      .orderBy('template.usageCount', 'DESC')
      .limit(limit);

    if (organizationId) {
      qb.andWhere(
        '(template.organizationId = :orgId OR template.isSystem = :isSystem)',
        { orgId: organizationId, isSystem: true },
      );
    } else {
      qb.andWhere('template.isSystem = :isSystem', { isSystem: true });
    }

    return qb.getMany();
  }

  /**
   * Get templates by category
   */
  async getByCategory(
    category: string,
    organizationId?: string,
  ): Promise<FieldNoteTemplate[]> {
    const qb = this.templateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.createdBy', 'createdBy')
      .where('template.category = :category', { category })
      .andWhere('template.isActive = :isActive', { isActive: true })
      .orderBy('template.displayOrder', 'ASC')
      .addOrderBy('template.name', 'ASC');

    if (organizationId) {
      qb.andWhere(
        '(template.organizationId = :orgId OR template.isSystem = :isSystem)',
        { orgId: organizationId, isSystem: true },
      );
    } else {
      qb.andWhere('template.isSystem = :isSystem', { isSystem: true });
    }

    return qb.getMany();
  }

  /**
   * Get all categories (distinct)
   */
  async getCategories(organizationId?: string): Promise<string[]> {
    const qb = this.templateRepository
      .createQueryBuilder('template')
      .select('DISTINCT template.category', 'category')
      .where('template.category IS NOT NULL')
      .andWhere('template.isActive = :isActive', { isActive: true })
      .orderBy('template.category', 'ASC');

    if (organizationId) {
      qb.andWhere(
        '(template.organizationId = :orgId OR template.isSystem = :isSystem)',
        { orgId: organizationId, isSystem: true },
      );
    } else {
      qb.andWhere('template.isSystem = :isSystem', { isSystem: true });
    }

    const results = await qb.getRawMany();
    return results.map((r) => r.category).filter((c) => c);
  }
}
