import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PotentialChangeOrder } from '../entities/potential-change-order.entity';
import { PcoCostTier } from '../entities/pco-cost-tier.entity';
import { OwnerChangeOrder } from '../entities/owner-change-order.entity';
import { PrimeContract } from '../entities/prime-contract.entity';
import { Project } from '../../projects/entities/project.entity';
import { PcoStatus } from '../enums/pco-status.enum';
import { OcoStatus } from '../enums/oco-status.enum';
import {
  CreatePotentialChangeOrderDto,
  UpdatePotentialChangeOrderDto,
  PotentialChangeOrderResponseDto,
  ConvertPcoToOcoDto,
} from '../dto';

/**
 * Potential Change Order Service
 *
 * Handles business logic for PCO management including:
 * - CRUD operations
 * - 6-state workflow: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED → CONVERTED
 * - Cost tier management with markup calculations
 * - Conversion to Owner Change Orders
 */
@Injectable()
export class PotentialChangeOrderService {
  private readonly logger = new Logger(PotentialChangeOrderService.name);

  constructor(
    @InjectRepository(PotentialChangeOrder)
    private readonly pcoRepo: Repository<PotentialChangeOrder>,
    @InjectRepository(PcoCostTier)
    private readonly pcoCostTierRepo: Repository<PcoCostTier>,
    @InjectRepository(OwnerChangeOrder)
    private readonly ocoRepo: Repository<OwnerChangeOrder>,
    @InjectRepository(PrimeContract)
    private readonly primeContractRepo: Repository<PrimeContract>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async create(createDto: CreatePotentialChangeOrderDto): Promise<PotentialChangeOrderResponseDto> {
    this.logger.log(`Creating PCO "${createDto.pcoNumber}" for project ${createDto.projectId}`);

    // Validate project exists
    const project = await this.projectRepo.findOne({
      where: { id: createDto.projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${createDto.projectId} not found`);
    }

    // Validate prime contract exists
    const primeContract = await this.primeContractRepo.findOne({
      where: { id: createDto.primeContractId },
    });
    if (!primeContract) {
      throw new NotFoundException(`Prime contract with ID ${createDto.primeContractId} not found`);
    }

    // Check unique PCO number within project
    const existing = await this.pcoRepo.findOne({
      where: { projectId: createDto.projectId, pcoNumber: createDto.pcoNumber },
    });
    if (existing) {
      throw new BadRequestException(`PCO number "${createDto.pcoNumber}" already exists in this project`);
    }

    // Calculate markup amounts
    const directCost = createDto.directCost || 0;
    const overheadPercent = createDto.overheadPercent || 0;
    const profitPercent = createDto.profitPercent || 0;
    const contingencyPercent = createDto.contingencyPercent || 0;

    const overheadAmount = (directCost * overheadPercent) / 100;
    const profitAmount = (directCost * profitPercent) / 100;
    const contingencyAmount = (directCost * contingencyPercent) / 100;
    const totalAmount = directCost + overheadAmount + profitAmount + contingencyAmount;

    const pco = this.pcoRepo.create({
      ...createDto,
      status: PcoStatus.DRAFT,
      directCost,
      overheadPercent,
      overheadAmount,
      profitPercent,
      profitAmount,
      contingencyPercent,
      contingencyAmount,
      totalAmount,
    });

    const saved = await this.pcoRepo.save(pco);
    this.logger.log(`PCO created successfully: ${saved.id}`);

    return this.toResponseDto(saved);
  }

  async findAll(projectId?: string, status?: PcoStatus): Promise<PotentialChangeOrderResponseDto[]> {
    this.logger.log(`Fetching PCOs - projectId: ${projectId}, status: ${status}`);

    const query = this.pcoRepo.createQueryBuilder('pco');

    if (projectId) {
      query.andWhere('pco.project_id = :projectId', { projectId });
    }

    if (status) {
      query.andWhere('pco.status = :status', { status });
    }

    query.orderBy('pco.created_at', 'DESC');

    const pcos = await query.getMany();
    this.logger.log(`Found ${pcos.length} PCOs`);

    return pcos.map((pco) => this.toResponseDto(pco));
  }

  async findOne(id: string): Promise<PotentialChangeOrderResponseDto> {
    this.logger.log(`Fetching PCO by ID: ${id}`);

    const pco = await this.pcoRepo.findOne({
      where: { id },
      relations: ['costTiers'],
    });

    if (!pco) {
      throw new NotFoundException(`PCO with ID ${id} not found`);
    }

    return this.toResponseDto(pco);
  }

  async update(id: string, updateDto: UpdatePotentialChangeOrderDto): Promise<PotentialChangeOrderResponseDto> {
    this.logger.log(`Updating PCO ${id}`);

    const pco = await this.pcoRepo.findOne({ where: { id } });
    if (!pco) {
      throw new NotFoundException(`PCO with ID ${id} not found`);
    }

    // Cannot update if CONVERTED
    if (pco.status === PcoStatus.CONVERTED) {
      throw new BadRequestException('Cannot update a converted PCO');
    }

    // Check unique PCO number if being updated
    if (updateDto.pcoNumber && updateDto.pcoNumber !== pco.pcoNumber) {
      const existing = await this.pcoRepo.findOne({
        where: { projectId: pco.projectId, pcoNumber: updateDto.pcoNumber },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException(`PCO number "${updateDto.pcoNumber}" already exists in this project`);
      }
    }

    // Recalculate if cost-related fields change
    const directCost = updateDto.directCost !== undefined ? updateDto.directCost : pco.directCost;
    const overheadPercent = updateDto.overheadPercent !== undefined ? updateDto.overheadPercent : pco.overheadPercent;
    const profitPercent = updateDto.profitPercent !== undefined ? updateDto.profitPercent : pco.profitPercent;
    const contingencyPercent = updateDto.contingencyPercent !== undefined ? updateDto.contingencyPercent : pco.contingencyPercent;

    const overheadAmount = (directCost * overheadPercent) / 100;
    const profitAmount = (directCost * profitPercent) / 100;
    const contingencyAmount = (directCost * contingencyPercent) / 100;
    const totalAmount = directCost + overheadAmount + profitAmount + contingencyAmount;

    Object.assign(pco, updateDto, {
      directCost,
      overheadPercent,
      overheadAmount,
      profitPercent,
      profitAmount,
      contingencyPercent,
      contingencyAmount,
      totalAmount,
    });

    const updated = await this.pcoRepo.save(pco);
    this.logger.log(`PCO ${id} updated successfully`);

    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Removing PCO ${id}`);

    const pco = await this.pcoRepo.findOne({ where: { id } });
    if (!pco) {
      throw new NotFoundException(`PCO with ID ${id} not found`);
    }

    // Cannot delete if CONVERTED
    if (pco.status === PcoStatus.CONVERTED) {
      throw new BadRequestException('Cannot delete a converted PCO');
    }

    await this.pcoRepo.remove(pco);
    this.logger.log(`PCO ${id} deleted successfully`);
  }

  async submit(id: string, userId: string): Promise<PotentialChangeOrderResponseDto> {
    this.logger.log(`Submitting PCO ${id} by user ${userId}`);

    const pco = await this.pcoRepo.findOne({ where: { id } });
    if (!pco) {
      throw new NotFoundException(`PCO with ID ${id} not found`);
    }

    if (pco.status !== PcoStatus.DRAFT && pco.status !== PcoStatus.REJECTED) {
      throw new BadRequestException(`Can only submit PCOs in DRAFT or REJECTED status. Current: ${pco.status}`);
    }

    pco.status = PcoStatus.SUBMITTED;
    pco.submittedAt = new Date();
    pco.submittedById = userId;

    const updated = await this.pcoRepo.save(pco);
    this.logger.log(`PCO ${id} submitted successfully`);

    return this.toResponseDto(updated);
  }

  async markUnderReview(id: string, userId: string): Promise<PotentialChangeOrderResponseDto> {
    this.logger.log(`Marking PCO ${id} under review by user ${userId}`);

    const pco = await this.pcoRepo.findOne({ where: { id } });
    if (!pco) {
      throw new NotFoundException(`PCO with ID ${id} not found`);
    }

    if (pco.status !== PcoStatus.SUBMITTED) {
      throw new BadRequestException(`Can only review PCOs in SUBMITTED status. Current: ${pco.status}`);
    }

    pco.status = PcoStatus.UNDER_REVIEW;
    pco.reviewedAt = new Date();
    pco.reviewedById = userId;

    const updated = await this.pcoRepo.save(pco);
    this.logger.log(`PCO ${id} marked as under review`);

    return this.toResponseDto(updated);
  }

  async approve(id: string, userId: string): Promise<PotentialChangeOrderResponseDto> {
    this.logger.log(`Approving PCO ${id} by user ${userId}`);

    const pco = await this.pcoRepo.findOne({ where: { id } });
    if (!pco) {
      throw new NotFoundException(`PCO with ID ${id} not found`);
    }

    if (pco.status !== PcoStatus.UNDER_REVIEW) {
      throw new BadRequestException(`Can only approve PCOs in UNDER_REVIEW status. Current: ${pco.status}`);
    }

    pco.status = PcoStatus.APPROVED;
    pco.approvedAt = new Date();
    pco.approvedById = userId;
    pco.rejectedAt = undefined;
    pco.rejectedById = undefined;
    pco.rejectionReason = undefined;

    const updated = await this.pcoRepo.save(pco);
    this.logger.log(`PCO ${id} approved successfully`);

    return this.toResponseDto(updated);
  }

  async reject(id: string, userId: string, reason: string): Promise<PotentialChangeOrderResponseDto> {
    this.logger.log(`Rejecting PCO ${id} by user ${userId}`);

    const pco = await this.pcoRepo.findOne({ where: { id } });
    if (!pco) {
      throw new NotFoundException(`PCO with ID ${id} not found`);
    }

    if (pco.status !== PcoStatus.SUBMITTED && pco.status !== PcoStatus.UNDER_REVIEW) {
      throw new BadRequestException(`Can only reject PCOs in SUBMITTED or UNDER_REVIEW status. Current: ${pco.status}`);
    }

    pco.status = PcoStatus.REJECTED;
    pco.rejectedAt = new Date();
    pco.rejectedById = userId;
    pco.rejectionReason = reason;
    pco.approvedAt = undefined;
    pco.approvedById = undefined;

    const updated = await this.pcoRepo.save(pco);
    this.logger.log(`PCO ${id} rejected successfully`);

    return this.toResponseDto(updated);
  }

  async convertToOco(id: string, convertDto: ConvertPcoToOcoDto, userId: string): Promise<OwnerChangeOrder> {
    this.logger.log(`Converting PCO ${id} to OCO by user ${userId}`);

    const pco = await this.pcoRepo.findOne({
      where: { id },
      relations: ['costTiers'],
    });

    if (!pco) {
      throw new NotFoundException(`PCO with ID ${id} not found`);
    }

    if (pco.status !== PcoStatus.APPROVED) {
      throw new BadRequestException(`Can only convert APPROVED PCOs. Current status: ${pco.status}`);
    }

    // Check unique OCO number
    const existingOco = await this.ocoRepo.findOne({
      where: { projectId: pco.projectId, ocoNumber: convertDto.ocoNumber },
    });
    if (existingOco) {
      throw new BadRequestException(`OCO number "${convertDto.ocoNumber}" already exists in this project`);
    }

    // Create OCO from PCO
    const oco = this.ocoRepo.create({
      projectId: pco.projectId,
      primeContractId: pco.primeContractId,
      pcoId: pco.id,
      ocoNumber: convertDto.ocoNumber,
      title: convertDto.title || pco.title,
      description: convertDto.description || pco.description,
      changeType: convertDto.changeType,
      priority: convertDto.priority || pco.priority,
      amount: pco.totalAmount,
      reason: convertDto.reason,
      scheduleImpactDays: convertDto.scheduleImpactDays,
      status: OcoStatus.DRAFT,
      createdById: userId,
    });

    const savedOco = await this.ocoRepo.save(oco);

    // Mark PCO as converted
    pco.status = PcoStatus.CONVERTED;
    pco.convertedToOcoId = savedOco.id;
    pco.convertedAt = new Date();
    await this.pcoRepo.save(pco);

    this.logger.log(`PCO ${id} converted to OCO ${savedOco.id} successfully`);

    return savedOco;
  }

  async recalculateTotals(id: string): Promise<PotentialChangeOrderResponseDto> {
    this.logger.log(`Recalculating totals for PCO ${id}`);

    const pco = await this.pcoRepo.findOne({
      where: { id },
      relations: ['costTiers'],
    });

    if (!pco) {
      throw new NotFoundException(`PCO with ID ${id} not found`);
    }

    // Sum up direct costs from tiers
    const directCost = pco.costTiers?.reduce((sum, tier) => sum + Number(tier.directCost), 0) || 0;

    // Recalculate markup amounts
    const overheadAmount = (directCost * pco.overheadPercent) / 100;
    const profitAmount = (directCost * pco.profitPercent) / 100;
    const contingencyAmount = (directCost * pco.contingencyPercent) / 100;
    const totalAmount = directCost + overheadAmount + profitAmount + contingencyAmount;

    pco.directCost = directCost;
    pco.overheadAmount = overheadAmount;
    pco.profitAmount = profitAmount;
    pco.contingencyAmount = contingencyAmount;
    pco.totalAmount = totalAmount;

    const updated = await this.pcoRepo.save(pco);
    this.logger.log(`PCO ${id} totals recalculated: ${totalAmount}`);

    return this.toResponseDto(updated);
  }

  private toResponseDto(pco: PotentialChangeOrder): PotentialChangeOrderResponseDto {
    return {
      id: pco.id,
      projectId: pco.projectId,
      primeContractId: pco.primeContractId,
      pcoNumber: pco.pcoNumber,
      title: pco.title,
      description: pco.description,
      status: pco.status,
      priority: pco.priority,
      directCost: Number(pco.directCost),
      overheadAmount: Number(pco.overheadAmount),
      overheadPercent: Number(pco.overheadPercent),
      profitAmount: Number(pco.profitAmount),
      profitPercent: Number(pco.profitPercent),
      contingencyAmount: Number(pco.contingencyAmount),
      contingencyPercent: Number(pco.contingencyPercent),
      totalAmount: Number(pco.totalAmount),
      submittedAt: pco.submittedAt,
      submittedById: pco.submittedById,
      reviewedAt: pco.reviewedAt,
      reviewedById: pco.reviewedById,
      approvedAt: pco.approvedAt,
      approvedById: pco.approvedById,
      rejectedAt: pco.rejectedAt,
      rejectedById: pco.rejectedById,
      rejectionReason: pco.rejectionReason,
      convertedToOcoId: pco.convertedToOcoId,
      convertedAt: pco.convertedAt,
      createdAt: pco.createdAt,
      updatedAt: pco.updatedAt,
      createdById: pco.createdById,
    };
  }
}
