import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduleOfValues } from '../entities/schedule-of-values.entity';
import { ScheduleOfValuesItem } from '../entities/schedule-of-values-item.entity';
import { Commitment } from '../entities/commitment.entity';
import { CostCode } from '../entities/cost-code.entity';
import {
  CreateScheduleOfValuesDto,
  ScheduleOfValuesResponseDto,
  ScheduleOfValuesItemResponseDto,
} from '../dto';
import { plainToInstance } from 'class-transformer';

/**
 * Service for managing Schedule of Values (SOV)
 *
 * The SOV breaks down a commitment's contract value into billable line items,
 * each mapped to a cost code for budget tracking.
 */
@Injectable()
export class ScheduleOfValuesService {
  private readonly logger = new Logger(ScheduleOfValuesService.name);

  constructor(
    @InjectRepository(ScheduleOfValues)
    private readonly sovRepository: Repository<ScheduleOfValues>,
    @InjectRepository(ScheduleOfValuesItem)
    private readonly sovItemRepository: Repository<ScheduleOfValuesItem>,
    @InjectRepository(Commitment)
    private readonly commitmentRepository: Repository<Commitment>,
    @InjectRepository(CostCode)
    private readonly costCodeRepository: Repository<CostCode>,
  ) {}

  /**
   * Create a new Schedule of Values
   *
   * Validates:
   * - Commitment exists
   * - Commitment doesn't already have an SOV
   * - Line items sum to commitment current amount
   * - All cost codes exist and belong to the project
   * - Line numbers are unique
   */
  async create(
    projectId: string,
    dto: CreateScheduleOfValuesDto,
    userId: string,
  ): Promise<ScheduleOfValuesResponseDto> {
    this.logger.log(
      `Creating SOV for commitment ${dto.commitmentId} in project ${projectId}`,
    );

    // Validate commitment exists and belongs to project
    const commitment = await this.commitmentRepository.findOne({
      where: { id: dto.commitmentId, projectId },
    });

    if (!commitment) {
      throw new NotFoundException(
        `Commitment ${dto.commitmentId} not found in project ${projectId}`,
      );
    }

    // Check if commitment already has an SOV
    const existingSov = await this.sovRepository.findOne({
      where: { commitmentId: dto.commitmentId },
    });

    if (existingSov) {
      throw new BadRequestException(
        `Commitment ${dto.commitmentId} already has a Schedule of Values`,
      );
    }

    // Validate line numbers are unique
    const lineNumbers = dto.items.map((item) => item.lineNumber);
    const uniqueLineNumbers = new Set(lineNumbers);
    if (lineNumbers.length !== uniqueLineNumbers.size) {
      throw new BadRequestException('Line numbers must be unique');
    }

    // Validate all cost codes exist and belong to project
    const costCodeIds = dto.items.map((item) => item.costCodeId);
    const costCodes = await this.costCodeRepository.find({
      where: costCodeIds.map((id) => ({ id, projectId })),
    });

    if (costCodes.length !== costCodeIds.length) {
      throw new BadRequestException(
        'One or more cost codes not found or do not belong to this project',
      );
    }

    // Calculate total scheduled value
    const totalScheduledValue = dto.items.reduce(
      (sum, item) => sum + item.scheduledValue,
      0,
    );

    // Validate total matches commitment current amount
    const difference = Math.abs(totalScheduledValue - commitment.currentAmount);
    if (difference > 0.01) {
      // Allow for floating point rounding
      throw new BadRequestException(
        `Total scheduled value ($${totalScheduledValue.toFixed(2)}) must equal commitment current amount ($${commitment.currentAmount.toFixed(2)})`,
      );
    }

    // Create SOV
    const sov = this.sovRepository.create({
      commitmentId: dto.commitmentId,
      projectId,
      createdById: userId,
    });

    const savedSov = await this.sovRepository.save(sov);

    // Create SOV items
    const sovItems = dto.items.map((itemDto) =>
      this.sovItemRepository.create({
        sovId: savedSov.id,
        costCodeId: itemDto.costCodeId,
        lineNumber: itemDto.lineNumber,
        description: itemDto.description,
        scheduledValue: itemDto.scheduledValue,
      }),
    );

    const savedItems = await this.sovItemRepository.save(sovItems);

    this.logger.log(
      `Created SOV ${savedSov.id} with ${savedItems.length} line items`,
    );

    return this.toResponseDto(savedSov, savedItems);
  }

  /**
   * Find Schedule of Values by ID
   */
  async findOne(
    projectId: string,
    sovId: string,
    includeItems = false,
  ): Promise<ScheduleOfValuesResponseDto> {
    const queryBuilder = this.sovRepository
      .createQueryBuilder('sov')
      .where('sov.id = :sovId', { sovId })
      .andWhere('sov.project_id = :projectId', { projectId });

    if (includeItems) {
      queryBuilder.leftJoinAndSelect('sov.items', 'items');
    }

    const sov = await queryBuilder.getOne();

    if (!sov) {
      throw new NotFoundException(
        `Schedule of Values ${sovId} not found in project ${projectId}`,
      );
    }

    return this.toResponseDto(sov, sov.items);
  }

  /**
   * Find Schedule of Values by commitment ID
   */
  async findByCommitment(
    projectId: string,
    commitmentId: string,
    includeItems = false,
  ): Promise<ScheduleOfValuesResponseDto | null> {
    const queryBuilder = this.sovRepository
      .createQueryBuilder('sov')
      .where('sov.commitment_id = :commitmentId', { commitmentId })
      .andWhere('sov.project_id = :projectId', { projectId });

    if (includeItems) {
      queryBuilder.leftJoinAndSelect('sov.items', 'items');
    }

    const sov = await queryBuilder.getOne();

    if (!sov) {
      return null;
    }

    return this.toResponseDto(sov, sov.items);
  }

  /**
   * Get all Schedule of Values for a project
   */
  async findAll(
    projectId: string,
    includeItems = false,
  ): Promise<ScheduleOfValuesResponseDto[]> {
    const queryBuilder = this.sovRepository
      .createQueryBuilder('sov')
      .where('sov.project_id = :projectId', { projectId })
      .orderBy('sov.created_at', 'DESC');

    if (includeItems) {
      queryBuilder.leftJoinAndSelect('sov.items', 'items');
    }

    const sovs = await queryBuilder.getMany();

    return sovs.map((sov) => this.toResponseDto(sov, sov.items));
  }

  /**
   * Delete Schedule of Values
   *
   * Can only delete if no payment applications exist
   */
  async delete(projectId: string, sovId: string): Promise<void> {
    const sov = await this.sovRepository.findOne({
      where: { id: sovId, projectId },
      relations: ['paymentApplications'],
    });

    if (!sov) {
      throw new NotFoundException(
        `Schedule of Values ${sovId} not found in project ${projectId}`,
      );
    }

    if (sov.paymentApplications && sov.paymentApplications.length > 0) {
      throw new BadRequestException(
        `Cannot delete Schedule of Values with existing payment applications`,
      );
    }

    await this.sovRepository.remove(sov);
    this.logger.log(`Deleted SOV ${sovId}`);
  }

  /**
   * Convert entity to response DTO
   */
  private toResponseDto(
    sov: ScheduleOfValues,
    items?: ScheduleOfValuesItem[],
  ): ScheduleOfValuesResponseDto {
    const dto = plainToInstance(ScheduleOfValuesResponseDto, sov, {
      excludeExtraneousValues: true,
    });

    if (items) {
      dto.items = items.map((item) =>
        plainToInstance(ScheduleOfValuesItemResponseDto, item, {
          excludeExtraneousValues: true,
        }),
      );
    }

    return dto;
  }
}
