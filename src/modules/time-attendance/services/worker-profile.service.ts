import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkerProfile } from '../entities/worker-profile.entity';
import { CreateWorkerProfileDto, UpdateWorkerProfileDto, QueryWorkerProfileDto, WorkerProfileResponseDto } from '../dto/worker-profile.dto';

/**
 * WorkerProfileService
 *
 * Handles CRUD operations for worker profiles including:
 * - Linking users to employment information
 * - Managing hourly rates and overtime rules
 * - Tracking union membership and certifications
 */
@Injectable()
export class WorkerProfileService {
  constructor(
    @InjectRepository(WorkerProfile)
    private readonly workerProfileRepository: Repository<WorkerProfile>,
  ) {}

  /**
   * Create a new worker profile
   */
  async create(dto: CreateWorkerProfileDto, userId: string): Promise<WorkerProfile> {
    // Check if worker profile already exists for this user
    const existing = await this.workerProfileRepository.findOne({
      where: { userId: dto.userId },
    });

    if (existing) {
      throw new ConflictException(`Worker profile already exists for user ${dto.userId}`);
    }

    // Validate hourly rate
    if (dto.hourlyRate <= 0) {
      throw new BadRequestException('Hourly rate must be greater than 0');
    }

    // Validate prevailing wage if provided
    if (dto.prevailingWageRate !== undefined && dto.prevailingWageRate < dto.hourlyRate) {
      throw new BadRequestException('Prevailing wage rate cannot be less than hourly rate');
    }

    const workerProfile = this.workerProfileRepository.create({
      ...dto,
      createdById: userId,
    });

    return await this.workerProfileRepository.save(workerProfile);
  }

  /**
   * Find all worker profiles with optional filters
   */
  async findAll(query: QueryWorkerProfileDto): Promise<{ data: WorkerProfile[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const queryBuilder = this.workerProfileRepository
      .createQueryBuilder('workerProfile')
      .leftJoinAndSelect('workerProfile.user', 'user')
      .leftJoinAndSelect('workerProfile.organization', 'organization')
      .leftJoinAndSelect('workerProfile.project', 'project');

    // Apply filters
    if (query.projectId) {
      queryBuilder.andWhere('workerProfile.projectId = :projectId', { projectId: query.projectId });
    }

    if (query.organizationId) {
      queryBuilder.andWhere('workerProfile.organizationId = :organizationId', { organizationId: query.organizationId });
    }

    if (query.employmentType) {
      queryBuilder.andWhere('workerProfile.employmentType = :employmentType', { employmentType: query.employmentType });
    }

    if (query.trade) {
      queryBuilder.andWhere('workerProfile.trade ILIKE :trade', { trade: `%${query.trade}%` });
    }

    if (query.isActive !== undefined) {
      queryBuilder.andWhere('workerProfile.isActive = :isActive', { isActive: query.isActive });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const data = await queryBuilder
      .orderBy('user.lastName', 'ASC')
      .addOrderBy('user.firstName', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find a worker profile by ID
   */
  async findOne(id: string): Promise<WorkerProfile> {
    const workerProfile = await this.workerProfileRepository.findOne({
      where: { id },
      relations: ['user', 'organization', 'project'],
    });

    if (!workerProfile) {
      throw new NotFoundException(`Worker profile with ID ${id} not found`);
    }

    return workerProfile;
  }

  /**
   * Find a worker profile by user ID
   */
  async findByUserId(userId: string): Promise<WorkerProfile | null> {
    return await this.workerProfileRepository.findOne({
      where: { userId },
      relations: ['user', 'organization', 'project'],
    });
  }

  /**
   * Update a worker profile
   */
  async update(id: string, dto: UpdateWorkerProfileDto): Promise<WorkerProfile> {
    const workerProfile = await this.findOne(id);

    // Validate hourly rate if being updated
    if (dto.hourlyRate !== undefined && dto.hourlyRate <= 0) {
      throw new BadRequestException('Hourly rate must be greater than 0');
    }

    // Validate prevailing wage if provided
    if (dto.prevailingWageRate !== undefined) {
      const currentRate = dto.hourlyRate ?? workerProfile.hourlyRate;
      if (dto.prevailingWageRate < currentRate) {
        throw new BadRequestException('Prevailing wage rate cannot be less than hourly rate');
      }
    }

    Object.assign(workerProfile, dto);

    return await this.workerProfileRepository.save(workerProfile);
  }

  /**
   * Deactivate a worker profile (soft delete)
   */
  async remove(id: string): Promise<void> {
    const workerProfile = await this.findOne(id);
    workerProfile.isActive = false;
    workerProfile.terminationDate = new Date();
    await this.workerProfileRepository.save(workerProfile);
  }

  /**
   * Reactivate a worker profile
   */
  async reactivate(id: string): Promise<WorkerProfile> {
    const workerProfile = await this.findOne(id);
    workerProfile.isActive = true;
    workerProfile.terminationDate = null;
    return await this.workerProfileRepository.save(workerProfile);
  }

  /**
   * Get workers for a specific project
   */
  async getProjectWorkers(projectId: string, activeOnly = true): Promise<WorkerProfile[]> {
    const query = this.workerProfileRepository
      .createQueryBuilder('workerProfile')
      .leftJoinAndSelect('workerProfile.user', 'user')
      .where('workerProfile.projectId = :projectId', { projectId });

    if (activeOnly) {
      query.andWhere('workerProfile.isActive = :isActive', { isActive: true });
    }

    return await query
      .orderBy('user.lastName', 'ASC')
      .addOrderBy('user.firstName', 'ASC')
      .getMany();
  }

  /**
   * Get workers for a specific organization
   */
  async getOrganizationWorkers(organizationId: string, activeOnly = true): Promise<WorkerProfile[]> {
    const query = this.workerProfileRepository
      .createQueryBuilder('workerProfile')
      .leftJoinAndSelect('workerProfile.user', 'user')
      .where('workerProfile.organizationId = :organizationId', { organizationId });

    if (activeOnly) {
      query.andWhere('workerProfile.isActive = :isActive', { isActive: true });
    }

    return await query
      .orderBy('user.lastName', 'ASC')
      .addOrderBy('user.firstName', 'ASC')
      .getMany();
  }

  /**
   * Get workers by trade
   */
  async getWorkersByTrade(trade: string, activeOnly = true): Promise<WorkerProfile[]> {
    const query = this.workerProfileRepository
      .createQueryBuilder('workerProfile')
      .leftJoinAndSelect('workerProfile.user', 'user')
      .where('workerProfile.trade ILIKE :trade', { trade: `%${trade}%` });

    if (activeOnly) {
      query.andWhere('workerProfile.isActive = :isActive', { isActive: true });
    }

    return await query
      .orderBy('user.lastName', 'ASC')
      .addOrderBy('user.firstName', 'ASC')
      .getMany();
  }

  /**
   * Map worker profile entity to response DTO
   */
  mapToResponseDto(workerProfile: WorkerProfile): WorkerProfileResponseDto {
    return {
      id: workerProfile.id,
      userId: workerProfile.userId,
      organizationId: workerProfile.organizationId,
      projectId: workerProfile.projectId,
      employmentType: workerProfile.employmentType,
      trade: workerProfile.trade,
      hourlyRate: Number(workerProfile.hourlyRate),
      overtimeRule: workerProfile.overtimeRule,
      isUnion: workerProfile.isUnion,
      unionLocalNumber: workerProfile.unionLocalNumber,
      unionName: workerProfile.unionName,
      certifications: workerProfile.certifications,
      overtimeConfig: workerProfile.overtimeConfig,
      hireDate: workerProfile.hireDate,
      terminationDate: workerProfile.terminationDate,
      prevailingWageRate: workerProfile.prevailingWageRate ? Number(workerProfile.prevailingWageRate) : undefined,
      fringeBenefitsRate: workerProfile.fringeBenefitsRate ? Number(workerProfile.fringeBenefitsRate) : undefined,
      isActive: workerProfile.isActive,
      createdAt: workerProfile.createdAt,
      updatedAt: workerProfile.updatedAt,
      user: workerProfile.user
        ? {
            id: workerProfile.user.id,
            email: workerProfile.user.email,
            firstName: workerProfile.user.firstName,
            lastName: workerProfile.user.lastName,
            fullName: `${workerProfile.user.firstName} ${workerProfile.user.lastName}`,
          }
        : undefined,
      organization: workerProfile.organization
        ? {
            id: workerProfile.organization.id,
            name: workerProfile.organization.name,
            type: workerProfile.organization.type,
          }
        : undefined,
    };
  }
}
