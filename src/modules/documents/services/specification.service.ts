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
  Specification,
  SpecificationProduct,
  SpecificationDrawing,
  SpecificationRfi,
  Document,
} from '../entities';
import {
  CreateSpecificationDto,
  UpdateSpecificationDto,
  ListSpecificationsQuery,
  LinkDrawingDto,
  LinkRfiDto,
  AddProductDto,
  SpecificationResponseDto,
} from '../dto/specification-management.dto';
import { SpecificationDivision } from '../enums';

/**
 * Specification Service
 *
 * Manages construction specifications organized by CSI MasterFormat.
 * Handles CRUD operations, linking to drawings/RFIs, and product tracking.
 */
@Injectable()
export class SpecificationService {
  private readonly logger = new Logger(SpecificationService.name);

  // CSI MasterFormat division names
  private readonly DIVISION_NAMES: Record<SpecificationDivision, string> = {
    [SpecificationDivision.DIV_00]: 'Procurement and Contracting Requirements',
    [SpecificationDivision.DIV_01]: 'General Requirements',
    [SpecificationDivision.DIV_02]: 'Existing Conditions',
    [SpecificationDivision.DIV_03]: 'Concrete',
    [SpecificationDivision.DIV_04]: 'Masonry',
    [SpecificationDivision.DIV_05]: 'Metals',
    [SpecificationDivision.DIV_06]: 'Wood, Plastics, and Composites',
    [SpecificationDivision.DIV_07]: 'Thermal and Moisture Protection',
    [SpecificationDivision.DIV_08]: 'Openings',
    [SpecificationDivision.DIV_09]: 'Finishes',
    [SpecificationDivision.DIV_10]: 'Specialties',
    [SpecificationDivision.DIV_11]: 'Equipment',
    [SpecificationDivision.DIV_12]: 'Furnishings',
    [SpecificationDivision.DIV_13]: 'Special Construction',
    [SpecificationDivision.DIV_14]: 'Conveying Equipment',
    [SpecificationDivision.DIV_21]: 'Fire Suppression',
    [SpecificationDivision.DIV_22]: 'Plumbing',
    [SpecificationDivision.DIV_23]: 'HVAC',
    [SpecificationDivision.DIV_25]: 'Integrated Automation',
    [SpecificationDivision.DIV_26]: 'Electrical',
    [SpecificationDivision.DIV_27]: 'Communications',
    [SpecificationDivision.DIV_28]: 'Electronic Safety and Security',
    [SpecificationDivision.DIV_31]: 'Earthwork',
    [SpecificationDivision.DIV_32]: 'Exterior Improvements',
    [SpecificationDivision.DIV_33]: 'Utilities',
    [SpecificationDivision.DIV_34]: 'Transportation',
    [SpecificationDivision.DIV_35]: 'Waterway and Marine Construction',
    [SpecificationDivision.DIV_40]: 'Process Integration',
    [SpecificationDivision.DIV_41]: 'Material Processing Equipment',
    [SpecificationDivision.DIV_42]: 'Process Heating/Cooling Equipment',
    [SpecificationDivision.DIV_43]: 'Process Gas/Liquid Handling',
    [SpecificationDivision.DIV_44]: 'Pollution Control Equipment',
    [SpecificationDivision.DIV_45]: 'Industry-Specific Manufacturing',
    [SpecificationDivision.DIV_46]: 'Water and Wastewater Equipment',
    [SpecificationDivision.DIV_48]: 'Electrical Power Generation',
  };

  constructor(
    @InjectRepository(Specification)
    private specRepository: Repository<Specification>,
    @InjectRepository(SpecificationProduct)
    private productRepository: Repository<SpecificationProduct>,
    @InjectRepository(SpecificationDrawing)
    private specDrawingRepository: Repository<SpecificationDrawing>,
    @InjectRepository(SpecificationRfi)
    private specRfiRepository: Repository<SpecificationRfi>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    private dataSource: DataSource,
  ) {}

  /**
   * Create a new specification section
   */
  async create(
    projectId: string,
    dto: CreateSpecificationDto,
    userId: string,
  ): Promise<SpecificationResponseDto> {
    this.logger.log(`Creating specification ${dto.sectionNumber} for project ${projectId}`);

    // Validate section number format
    this.validateSectionNumber(dto.sectionNumber);

    // Check for duplicate section number
    const existing = await this.specRepository.findOne({
      where: { projectId, sectionNumber: dto.sectionNumber },
    });

    if (existing) {
      throw new ConflictException(
        `Section ${dto.sectionNumber} already exists in this project`,
      );
    }

    // Verify document exists
    const document = await this.documentRepository.findOne({
      where: { id: dto.documentId, projectId },
      relations: ['currentVersion'],
    });

    if (!document) {
      throw new NotFoundException(`Document ${dto.documentId} not found`);
    }

    // Parse and verify division
    const { division } = this.parseSectionNumber(dto.sectionNumber);
    if (dto.division !== division) {
      throw new BadRequestException(
        `Section number ${dto.sectionNumber} does not match division ${dto.division}`,
      );
    }

    // Create specification
    const spec = this.specRepository.create({
      projectId,
      documentId: dto.documentId,
      sectionNumber: dto.sectionNumber,
      sectionTitle: dto.sectionTitle,
      division: dto.division,
      revision: dto.revision,
      publishedDate: dto.publishedDate ? new Date(dto.publishedDate) : null,
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
      scope: dto.scope,
      pageCount: dto.pageCount,
      submittalRequirements: dto.submittalRequirements || [],
      tags: dto.tags || [],
      isApplicable: true,
    });

    await this.specRepository.save(spec);

    this.logger.log(`Created specification ${spec.id}`);

    return this.toResponseDto(spec, document);
  }

  /**
   * Get a single specification
   */
  async findOne(projectId: string, specId: string): Promise<SpecificationResponseDto> {
    const spec = await this.specRepository.findOne({
      where: { id: specId, projectId },
      relations: ['document', 'document.currentVersion'],
    });

    if (!spec) {
      throw new NotFoundException(`Specification ${specId} not found`);
    }

    return this.toResponseDto(spec, spec.document);
  }

  /**
   * List specifications with filtering
   */
  async findAll(
    projectId: string,
    query: ListSpecificationsQuery,
  ): Promise<{
    specifications: SpecificationResponseDto[];
    summary: any;
    pagination: any;
  }> {
    const qb = this.specRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.document', 'd')
      .leftJoinAndSelect('d.currentVersion', 'cv')
      .where('s.projectId = :projectId', { projectId });

    // Filters
    if (query.division) {
      const divisions = Array.isArray(query.division) ? query.division : [query.division];
      qb.andWhere('s.division IN (:...divisions)', { divisions });
    }

    if (query.isApplicable !== undefined) {
      qb.andWhere('s.isApplicable = :isApplicable', { isApplicable: query.isApplicable });
    }

    if (query.publishedAfter) {
      qb.andWhere('s.publishedDate >= :publishedAfter', {
        publishedAfter: query.publishedAfter,
      });
    }

    if (query.search) {
      qb.andWhere(
        '(s.sectionNumber ILIKE :search OR s.sectionTitle ILIKE :search OR s.scope ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    // Sorting
    const sortField = query.sortBy || 'sectionNumber';
    const sortOrder = (query.sortOrder?.toUpperCase() as 'ASC' | 'DESC') || 'ASC';
    qb.orderBy(`s.${sortField}`, sortOrder);

    // Pagination
    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 200);

    const [specs, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Format responses
    const formattedSpecs = specs.map((s) => this.toResponseDto(s, s.document));

    // Get summary
    const summary = await this.getProjectSummary(projectId);

    return {
      specifications: formattedSpecs,
      summary,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a specification
   */
  async update(
    projectId: string,
    specId: string,
    dto: UpdateSpecificationDto,
  ): Promise<SpecificationResponseDto> {
    const spec = await this.specRepository.findOne({
      where: { id: specId, projectId },
      relations: ['document', 'document.currentVersion'],
    });

    if (!spec) {
      throw new NotFoundException(`Specification ${specId} not found`);
    }

    Object.assign(spec, {
      ...(dto.sectionTitle && { sectionTitle: dto.sectionTitle }),
      ...(dto.revision !== undefined && { revision: dto.revision }),
      ...(dto.publishedDate !== undefined && {
        publishedDate: dto.publishedDate ? new Date(dto.publishedDate) : null,
      }),
      ...(dto.effectiveDate !== undefined && {
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
      }),
      ...(dto.scope !== undefined && { scope: dto.scope }),
      ...(dto.pageCount !== undefined && { pageCount: dto.pageCount }),
      ...(dto.isApplicable !== undefined && { isApplicable: dto.isApplicable }),
      ...(dto.tags && { tags: dto.tags }),
    });

    await this.specRepository.save(spec);

    this.logger.log(`Updated specification ${specId}`);

    return this.toResponseDto(spec, spec.document);
  }

  /**
   * Delete a specification
   */
  async delete(projectId: string, specId: string): Promise<void> {
    const spec = await this.specRepository.findOne({
      where: { id: specId, projectId },
    });

    if (!spec) {
      throw new NotFoundException(`Specification ${specId} not found`);
    }

    await this.specRepository.remove(spec);

    this.logger.log(`Deleted specification ${specId}`);
  }

  /**
   * Add a product to a specification
   */
  async addProduct(
    projectId: string,
    specId: string,
    dto: AddProductDto,
  ): Promise<void> {
    const spec = await this.specRepository.findOne({
      where: { id: specId, projectId },
    });

    if (!spec) {
      throw new NotFoundException(`Specification ${specId} not found`);
    }

    const product = this.productRepository.create({
      specificationId: specId,
      manufacturer: dto.manufacturer,
      productName: dto.productName,
      modelNumber: dto.modelNumber,
      isBaseBid: dto.isBaseBid,
      isSubstitution: dto.isSubstitution,
      specReference: dto.specReference,
    });

    await this.productRepository.save(product);

    this.logger.log(`Added product to specification ${specId}`);
  }

  /**
   * Link a drawing to a specification
   */
  async linkDrawing(
    projectId: string,
    specId: string,
    dto: LinkDrawingDto,
    userId: string,
  ): Promise<void> {
    const spec = await this.specRepository.findOne({
      where: { id: specId, projectId },
    });

    if (!spec) {
      throw new NotFoundException(`Specification ${specId} not found`);
    }

    // Check for existing link
    const existing = await this.specDrawingRepository.findOne({
      where: { specificationId: specId, drawingId: dto.drawingId },
    });

    if (existing) {
      throw new ConflictException('Drawing already linked to this specification');
    }

    const link = this.specDrawingRepository.create({
      specificationId: specId,
      drawingId: dto.drawingId,
      relationship: dto.relationship,
      createdById: userId,
    });

    await this.specDrawingRepository.save(link);

    this.logger.log(`Linked drawing to specification ${specId}`);
  }

  /**
   * Link an RFI to a specification
   */
  async linkRfi(
    projectId: string,
    specId: string,
    dto: LinkRfiDto,
    userId: string,
  ): Promise<void> {
    const spec = await this.specRepository.findOne({
      where: { id: specId, projectId },
    });

    if (!spec) {
      throw new NotFoundException(`Specification ${specId} not found`);
    }

    const link = this.specRfiRepository.create({
      specificationId: specId,
      rfiId: dto.rfiId,
      context: dto.context,
      createdById: userId,
    });

    await this.specRfiRepository.save(link);

    this.logger.log(`Linked RFI to specification ${specId}`);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Validate section number format (XX YY ZZ)
   */
  private validateSectionNumber(sectionNumber: string): void {
    const pattern = /^\d{2} \d{2} \d{2}$/;

    if (!pattern.test(sectionNumber)) {
      throw new BadRequestException(
        `Invalid section number format: ${sectionNumber}. Expected format: XX YY ZZ (e.g., "03 30 00")`,
      );
    }

    const [div] = sectionNumber.split(' ');
    const validDivisions = [
      '00',
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
      '09',
      '10',
      '11',
      '12',
      '13',
      '14',
      '21',
      '22',
      '23',
      '25',
      '26',
      '27',
      '28',
      '31',
      '32',
      '33',
      '34',
      '35',
      '40',
      '41',
      '42',
      '43',
      '44',
      '45',
      '46',
      '48',
    ];

    if (!validDivisions.includes(div)) {
      throw new BadRequestException(
        `Invalid division: ${div}. Must be a valid CSI MasterFormat division.`,
      );
    }
  }

  /**
   * Parse section number into components
   */
  private parseSectionNumber(sectionNumber: string): {
    division: SpecificationDivision;
    level2: string;
    level3: string;
  } {
    const parts = sectionNumber.split(' ');
    const divCode = `DIV_${parts[0]}` as SpecificationDivision;

    return {
      division: divCode,
      level2: parts[1],
      level3: parts[2],
    };
  }

  /**
   * Get project summary
   */
  private async getProjectSummary(projectId: string) {
    const specs = await this.specRepository.find({
      where: { projectId },
      select: ['division', 'publishedDate', 'isApplicable'],
    });

    const byDivision: Record<string, number> = {};
    let latestPublishDate: string | null = null;
    let notApplicable = 0;

    for (const s of specs) {
      byDivision[s.division] = (byDivision[s.division] || 0) + 1;

      if (!s.isApplicable) {
        notApplicable++;
      }

      if (s.publishedDate) {
        const dateStr = s.publishedDate.toISOString();
        if (!latestPublishDate || dateStr > latestPublishDate) {
          latestPublishDate = dateStr;
        }
      }
    }

    return {
      totalSections: specs.length,
      byDivision,
      notApplicableSections: notApplicable,
      latestPublishDate,
    };
  }

  /**
   * Convert entity to response DTO
   */
  private toResponseDto(spec: Specification, document: Document): SpecificationResponseDto {
    const { level2, level3 } = this.parseSectionNumber(spec.sectionNumber);

    return {
      id: spec.id,
      projectId: spec.projectId,
      documentId: spec.documentId,
      sectionNumber: spec.sectionNumber,
      sectionTitle: spec.sectionTitle,
      division: spec.division,
      divisionName: this.DIVISION_NAMES[spec.division],
      revision: spec.revision,
      publishedDate: spec.publishedDate?.toISOString() || null,
      effectiveDate: spec.effectiveDate?.toISOString() || null,
      scope: spec.scope,
      pageCount: spec.pageCount,
      isApplicable: spec.isApplicable,
      tags: spec.tags || [],
      document: {
        id: document.id,
        name: document.name,
        currentVersionId: document.currentVersionId || '',
        status: document.status,
        thumbnailUrl: null, // Would need S3Service to generate presigned URL
      },
      createdAt: spec.createdAt.toISOString(),
      updatedAt: spec.updatedAt.toISOString(),
    };
  }
}
