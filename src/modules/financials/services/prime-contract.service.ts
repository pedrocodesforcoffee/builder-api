import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrimeContract } from '../entities/prime-contract.entity';
import { Project } from '../../projects/entities/project.entity';
import { PrimeContractStatus } from '../enums/prime-contract-status.enum';
import {
  CreatePrimeContractDto,
  UpdatePrimeContractDto,
  PrimeContractResponseDto,
} from '../dto';

/**
 * PrimeContract Service
 *
 * Handles business logic for prime contract management including:
 * - CRUD operations for prime contracts
 * - Status workflow management (draft → active → complete → closed)
 * - Retention percentage validation (0-100%)
 * - Contract amount tracking (original vs current)
 * - Project and contract validation
 *
 * @service PrimeContractService
 */
@Injectable()
export class PrimeContractService {
  private readonly logger = new Logger(PrimeContractService.name);

  constructor(
    @InjectRepository(PrimeContract)
    private readonly primeContractRepo: Repository<PrimeContract>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  /**
   * Create a new prime contract
   *
   * Validates project exists.
   * Validates retention percentage is between 0 and 100.
   * Ensures contract number is unique within the project.
   *
   * @param createDto - Prime contract creation data
   * @returns Created prime contract
   * @throws NotFoundException if project doesn't exist
   * @throws BadRequestException if validation fails (invalid retention percentage)
   */
  async create(
    createDto: CreatePrimeContractDto,
  ): Promise<PrimeContractResponseDto> {
    this.logger.log(
      `Creating prime contract "${createDto.number}" for project ${createDto.projectId}`,
    );

    // Validate project exists
    const project = await this.projectRepo.findOne({
      where: { id: createDto.projectId },
    });

    if (!project) {
      throw new NotFoundException(
        `Project with ID ${createDto.projectId} not found`,
      );
    }

    // Validate retention percentage
    if (
      createDto.retentionPercentage !== undefined &&
      (createDto.retentionPercentage < 0 || createDto.retentionPercentage > 100)
    ) {
      throw new BadRequestException(
        'Retention percentage must be between 0 and 100',
      );
    }

    // Check if contract number is unique within project
    const existingContract = await this.primeContractRepo.findOne({
      where: {
        projectId: createDto.projectId,
        number: createDto.number,
      },
    });

    if (existingContract) {
      throw new BadRequestException(
        `Prime contract number "${createDto.number}" already exists in this project`,
      );
    }

    // Create prime contract
    const primeContract = this.primeContractRepo.create({
      ...createDto,
      status: createDto.status || PrimeContractStatus.DRAFT,
      retentionPercentage: createDto.retentionPercentage ?? 5.0,
    });

    const savedPrimeContract = await this.primeContractRepo.save(
      primeContract,
    );

    this.logger.log(
      `Prime contract created successfully: ${savedPrimeContract.id}`,
    );

    return this.toResponseDto(savedPrimeContract);
  }

  /**
   * List all prime contracts
   *
   * Optionally filter by:
   * - Project
   * - Status
   *
   * @param projectId - Filter to specific project (optional)
   * @param status - Filter to specific status (optional)
   * @returns Array of prime contracts
   */
  async findAll(
    projectId?: string,
    status?: PrimeContractStatus,
  ): Promise<PrimeContractResponseDto[]> {
    this.logger.log(
      `Fetching prime contracts - projectId: ${projectId}, status: ${status}`,
    );

    const queryBuilder = this.primeContractRepo.createQueryBuilder(
      'prime_contract',
    );

    // Filter by project
    if (projectId) {
      queryBuilder.andWhere('prime_contract.project_id = :projectId', {
        projectId,
      });
    }

    // Filter by status
    if (status) {
      queryBuilder.andWhere('prime_contract.status = :status', { status });
    }

    // Order by most recently created
    queryBuilder.orderBy('prime_contract.created_at', 'DESC');

    const primeContracts = await queryBuilder.getMany();

    this.logger.log(`Found ${primeContracts.length} prime contracts`);

    return primeContracts.map((contract) => this.toResponseDto(contract));
  }

  /**
   * Get prime contract by ID
   *
   * @param id - Prime contract ID
   * @returns Prime contract details
   * @throws NotFoundException if prime contract doesn't exist
   */
  async findOne(id: string): Promise<PrimeContractResponseDto> {
    this.logger.log(`Fetching prime contract by ID: ${id}`);

    const primeContract = await this.primeContractRepo.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!primeContract) {
      throw new NotFoundException(
        `Prime contract with ID ${id} not found`,
      );
    }

    return this.toResponseDto(primeContract);
  }

  /**
   * Get prime contract by number within project
   *
   * @param projectId - Project ID
   * @param number - Contract number
   * @returns Prime contract details
   * @throws NotFoundException if contract doesn't exist
   */
  async findByNumber(
    projectId: string,
    number: string,
  ): Promise<PrimeContractResponseDto> {
    this.logger.log(
      `Fetching prime contract by number: ${number} in project ${projectId}`,
    );

    const primeContract = await this.primeContractRepo.findOne({
      where: {
        projectId,
        number,
      },
      relations: ['project'],
    });

    if (!primeContract) {
      throw new NotFoundException(
        `Prime contract with number "${number}" not found in project ${projectId}`,
      );
    }

    return this.toResponseDto(primeContract);
  }

  /**
   * Update prime contract
   *
   * Validates retention percentage if being updated.
   * Validates status transition if status is being updated.
   *
   * @param id - Prime contract ID
   * @param updateDto - Update data
   * @returns Updated prime contract
   * @throws NotFoundException if prime contract doesn't exist
   * @throws BadRequestException if validation fails
   */
  async update(
    id: string,
    updateDto: UpdatePrimeContractDto,
  ): Promise<PrimeContractResponseDto> {
    this.logger.log(`Updating prime contract ${id}`);

    const primeContract = await this.primeContractRepo.findOne({
      where: { id },
    });

    if (!primeContract) {
      throw new NotFoundException(
        `Prime contract with ID ${id} not found`,
      );
    }

    // Validate retention percentage if being updated
    if (
      updateDto.retentionPercentage !== undefined &&
      (updateDto.retentionPercentage < 0 || updateDto.retentionPercentage > 100)
    ) {
      throw new BadRequestException(
        'Retention percentage must be between 0 and 100',
      );
    }

    // Validate status transition if status is being updated
    if (updateDto.status && updateDto.status !== primeContract.status) {
      this.validateStatusTransition(primeContract.status, updateDto.status);
    }

    // Check if contract number would conflict with another contract in same project
    if (
      updateDto.number &&
      updateDto.number !== primeContract.number
    ) {
      const existingContract = await this.primeContractRepo.findOne({
        where: {
          projectId: primeContract.projectId,
          number: updateDto.number,
        },
      });

      if (existingContract && existingContract.id !== id) {
        throw new BadRequestException(
          `Prime contract number "${updateDto.number}" already exists in this project`,
        );
      }
    }

    // Apply updates
    Object.assign(primeContract, updateDto);

    const updatedPrimeContract = await this.primeContractRepo.save(
      primeContract,
    );

    this.logger.log(`Prime contract ${id} updated successfully`);

    return this.toResponseDto(updatedPrimeContract);
  }

  /**
   * Update prime contract status
   *
   * Convenience method for status transitions.
   *
   * @param id - Prime contract ID
   * @param status - New status
   * @returns Updated prime contract
   * @throws BadRequestException if invalid status transition
   */
  async updateStatus(
    id: string,
    status: PrimeContractStatus,
  ): Promise<PrimeContractResponseDto> {
    this.logger.log(`Updating prime contract ${id} status to ${status}`);
    return this.update(id, { status });
  }

  /**
   * Delete prime contract
   *
   * Permanently removes the prime contract.
   * Cannot delete a contract that is ACTIVE, COMPLETE, or CLOSED.
   *
   * @param id - Prime contract ID
   * @throws NotFoundException if prime contract doesn't exist
   * @throws BadRequestException if contract cannot be deleted
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Removing prime contract ${id}`);

    const primeContract = await this.primeContractRepo.findOne({
      where: { id },
    });

    if (!primeContract) {
      throw new NotFoundException(
        `Prime contract with ID ${id} not found`,
      );
    }

    // Cannot delete active, complete, or closed contracts
    if (primeContract.status === PrimeContractStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot delete an active prime contract. Change status first.',
      );
    }

    if (primeContract.status === PrimeContractStatus.COMPLETE) {
      throw new BadRequestException(
        'Cannot delete a completed prime contract. Change status to DRAFT first.',
      );
    }

    if (primeContract.status === PrimeContractStatus.CLOSED) {
      throw new BadRequestException(
        'Cannot delete a closed prime contract.',
      );
    }

    await this.primeContractRepo.remove(primeContract);

    this.logger.log(`Prime contract ${id} deleted successfully`);
  }

  /**
   * Validate status transition
   *
   * Enforces valid status workflow:
   * - DRAFT → ACTIVE
   * - ACTIVE → COMPLETE
   * - COMPLETE → CLOSED
   * - Any status → DRAFT (reverting back)
   *
   * @param currentStatus - Current status
   * @param newStatus - Proposed new status
   * @throws BadRequestException if transition is invalid
   */
  private validateStatusTransition(
    currentStatus: PrimeContractStatus,
    newStatus: PrimeContractStatus,
  ): void {
    const validTransitions: Record<
      PrimeContractStatus,
      PrimeContractStatus[]
    > = {
      [PrimeContractStatus.DRAFT]: [PrimeContractStatus.ACTIVE],
      [PrimeContractStatus.ACTIVE]: [
        PrimeContractStatus.COMPLETE,
        PrimeContractStatus.DRAFT,
      ],
      [PrimeContractStatus.COMPLETE]: [
        PrimeContractStatus.CLOSED,
        PrimeContractStatus.ACTIVE,
      ],
      [PrimeContractStatus.CLOSED]: [], // Cannot transition from closed
    };

    const allowedStatuses = validTransitions[currentStatus] || [];

    if (!allowedStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedStatuses.join(', ') || 'none'}`,
      );
    }
  }

  /**
   * Convert entity to response DTO
   *
   * @param primeContract - PrimeContract entity
   * @returns Response DTO
   */
  private toResponseDto(
    primeContract: PrimeContract,
  ): PrimeContractResponseDto {
    return {
      id: primeContract.id,
      projectId: primeContract.projectId,
      number: primeContract.number,
      title: primeContract.title,
      description: primeContract.description,
      status: primeContract.status,
      originalAmount: primeContract.originalAmount,
      currentAmount: primeContract.currentAmount,
      retentionPercentage: primeContract.retentionPercentage,
      startDate: primeContract.startDate,
      endDate: primeContract.endDate,
      completionDate: primeContract.completionDate,
      createdAt: primeContract.createdAt,
      updatedAt: primeContract.updatedAt,
    };
  }
}
