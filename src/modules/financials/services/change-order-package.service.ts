import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChangeOrderPackage } from '../entities/change-order-package.entity';
import { ChangeOrderPackageItem } from '../entities/change-order-package-item.entity';
import { PotentialChangeOrder } from '../entities/potential-change-order.entity';
import { OwnerChangeOrder } from '../entities/owner-change-order.entity';
import { CommitmentChangeOrder } from '../entities/commitment-change-order.entity';
import { Project } from '../../projects/entities/project.entity';
import { CoPackageStatus } from '../enums/co-package-status.enum';
import {
  CreateChangeOrderPackageDto,
  UpdateChangeOrderPackageDto,
  ChangeOrderPackageResponseDto,
  AddPackageItemDto,
} from '../dto';

/**
 * Change Order Package Service
 *
 * Handles business logic for package management including:
 * - CRUD operations
 * - 3-state workflow: DRAFT → SUBMITTED → APPROVED
 * - Item management (add/remove PCO/OCO/CCO)
 * - Total amount calculation
 */
@Injectable()
export class ChangeOrderPackageService {
  private readonly logger = new Logger(ChangeOrderPackageService.name);

  constructor(
    @InjectRepository(ChangeOrderPackage)
    private readonly packageRepo: Repository<ChangeOrderPackage>,
    @InjectRepository(ChangeOrderPackageItem)
    private readonly packageItemRepo: Repository<ChangeOrderPackageItem>,
    @InjectRepository(PotentialChangeOrder)
    private readonly pcoRepo: Repository<PotentialChangeOrder>,
    @InjectRepository(OwnerChangeOrder)
    private readonly ocoRepo: Repository<OwnerChangeOrder>,
    @InjectRepository(CommitmentChangeOrder)
    private readonly ccoRepo: Repository<CommitmentChangeOrder>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async create(createDto: CreateChangeOrderPackageDto): Promise<ChangeOrderPackageResponseDto> {
    this.logger.log(`Creating package "${createDto.packageNumber}" for project ${createDto.projectId}`);

    const project = await this.projectRepo.findOne({
      where: { id: createDto.projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${createDto.projectId} not found`);
    }

    const existing = await this.packageRepo.findOne({
      where: { projectId: createDto.projectId, packageNumber: createDto.packageNumber },
    });
    if (existing) {
      throw new BadRequestException(`Package number "${createDto.packageNumber}" already exists in this project`);
    }

    const pkg = this.packageRepo.create({
      ...createDto,
      status: CoPackageStatus.DRAFT,
      totalAmount: 0,
    });

    const saved = await this.packageRepo.save(pkg);
    this.logger.log(`Package created successfully: ${saved.id}`);

    return this.toResponseDto(saved);
  }

  async findAll(projectId?: string, status?: CoPackageStatus): Promise<ChangeOrderPackageResponseDto[]> {
    this.logger.log(`Fetching packages - projectId: ${projectId}, status: ${status}`);

    const query = this.packageRepo.createQueryBuilder('pkg');

    if (projectId) {
      query.andWhere('pkg.project_id = :projectId', { projectId });
    }

    if (status) {
      query.andWhere('pkg.status = :status', { status });
    }

    query.orderBy('pkg.created_at', 'DESC');

    const packages = await query.getMany();
    this.logger.log(`Found ${packages.length} packages`);

    return packages.map((pkg) => this.toResponseDto(pkg));
  }

  async findOne(id: string): Promise<ChangeOrderPackageResponseDto> {
    this.logger.log(`Fetching package by ID: ${id}`);

    const pkg = await this.packageRepo.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!pkg) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }

    return this.toResponseDto(pkg);
  }

  async update(id: string, updateDto: UpdateChangeOrderPackageDto): Promise<ChangeOrderPackageResponseDto> {
    this.logger.log(`Updating package ${id}`);

    const pkg = await this.packageRepo.findOne({ where: { id } });
    if (!pkg) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }

    if (pkg.status === CoPackageStatus.APPROVED) {
      throw new BadRequestException('Cannot update an approved package');
    }

    if (updateDto.packageNumber && updateDto.packageNumber !== pkg.packageNumber) {
      const existing = await this.packageRepo.findOne({
        where: { projectId: pkg.projectId, packageNumber: updateDto.packageNumber },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException(`Package number "${updateDto.packageNumber}" already exists in this project`);
      }
    }

    Object.assign(pkg, updateDto);
    const updated = await this.packageRepo.save(pkg);
    this.logger.log(`Package ${id} updated successfully`);

    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Removing package ${id}`);

    const pkg = await this.packageRepo.findOne({ where: { id } });
    if (!pkg) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }

    if (pkg.status === CoPackageStatus.APPROVED) {
      throw new BadRequestException('Cannot delete an approved package');
    }

    await this.packageRepo.remove(pkg);
    this.logger.log(`Package ${id} deleted successfully`);
  }

  async addItem(addItemDto: AddPackageItemDto): Promise<void> {
    this.logger.log(`Adding ${addItemDto.changeOrderType} to package ${addItemDto.packageId}`);

    const pkg = await this.packageRepo.findOne({ where: { id: addItemDto.packageId } });
    if (!pkg) {
      throw new NotFoundException(`Package with ID ${addItemDto.packageId} not found`);
    }

    if (pkg.status !== CoPackageStatus.DRAFT) {
      throw new BadRequestException('Can only add items to DRAFT packages');
    }

    // Validate the change order exists
    if (addItemDto.changeOrderType === 'PCO' && addItemDto.pcoId) {
      const pco = await this.pcoRepo.findOne({ where: { id: addItemDto.pcoId } });
      if (!pco) {
        throw new NotFoundException(`PCO with ID ${addItemDto.pcoId} not found`);
      }
    } else if (addItemDto.changeOrderType === 'OCO' && addItemDto.ocoId) {
      const oco = await this.ocoRepo.findOne({ where: { id: addItemDto.ocoId } });
      if (!oco) {
        throw new NotFoundException(`OCO with ID ${addItemDto.ocoId} not found`);
      }
    } else if (addItemDto.changeOrderType === 'CCO' && addItemDto.ccoId) {
      const cco = await this.ccoRepo.findOne({ where: { id: addItemDto.ccoId } });
      if (!cco) {
        throw new NotFoundException(`CCO with ID ${addItemDto.ccoId} not found`);
      }
    }

    const item = this.packageItemRepo.create(addItemDto);
    await this.packageItemRepo.save(item);

    await this.recalculateTotal(addItemDto.packageId);
    this.logger.log(`Item added to package ${addItemDto.packageId}`);
  }

  async removeItem(packageId: string, itemId: string): Promise<void> {
    this.logger.log(`Removing item ${itemId} from package ${packageId}`);

    const pkg = await this.packageRepo.findOne({ where: { id: packageId } });
    if (!pkg) {
      throw new NotFoundException(`Package with ID ${packageId} not found`);
    }

    if (pkg.status !== CoPackageStatus.DRAFT) {
      throw new BadRequestException('Can only remove items from DRAFT packages');
    }

    const item = await this.packageItemRepo.findOne({
      where: { id: itemId, packageId },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${itemId} not found in package`);
    }

    await this.packageItemRepo.remove(item);
    await this.recalculateTotal(packageId);
    this.logger.log(`Item ${itemId} removed from package ${packageId}`);
  }

  async submit(id: string): Promise<ChangeOrderPackageResponseDto> {
    this.logger.log(`Submitting package ${id}`);

    const pkg = await this.packageRepo.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!pkg) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }

    if (pkg.status !== CoPackageStatus.DRAFT) {
      throw new BadRequestException(`Can only submit DRAFT packages. Current: ${pkg.status}`);
    }

    if (!pkg.items || pkg.items.length === 0) {
      throw new BadRequestException('Cannot submit an empty package');
    }

    pkg.status = CoPackageStatus.SUBMITTED;
    pkg.submittedAt = new Date();

    const updated = await this.packageRepo.save(pkg);
    this.logger.log(`Package ${id} submitted successfully`);

    return this.toResponseDto(updated);
  }

  async approve(id: string): Promise<ChangeOrderPackageResponseDto> {
    this.logger.log(`Approving package ${id}`);

    const pkg = await this.packageRepo.findOne({ where: { id } });
    if (!pkg) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }

    if (pkg.status !== CoPackageStatus.SUBMITTED) {
      throw new BadRequestException(`Can only approve SUBMITTED packages. Current: ${pkg.status}`);
    }

    pkg.status = CoPackageStatus.APPROVED;
    pkg.approvedAt = new Date();

    const updated = await this.packageRepo.save(pkg);
    this.logger.log(`Package ${id} approved successfully`);

    return this.toResponseDto(updated);
  }

  private async recalculateTotal(packageId: string): Promise<void> {
    const pkg = await this.packageRepo.findOne({
      where: { id: packageId },
      relations: ['items'],
    });

    if (!pkg) return;

    let total = 0;

    for (const item of pkg.items || []) {
      if (item.pcoId) {
        const pco = await this.pcoRepo.findOne({ where: { id: item.pcoId } });
        if (pco) total += Number(pco.totalAmount);
      } else if (item.ocoId) {
        const oco = await this.ocoRepo.findOne({ where: { id: item.ocoId } });
        if (oco) total += Number(oco.amount);
      } else if (item.ccoId) {
        const cco = await this.ccoRepo.findOne({ where: { id: item.ccoId } });
        if (cco) total += Number(cco.amount);
      }
    }

    pkg.totalAmount = total;
    await this.packageRepo.save(pkg);
    this.logger.log(`Package ${packageId} total recalculated: ${total}`);
  }

  private toResponseDto(pkg: ChangeOrderPackage): ChangeOrderPackageResponseDto {
    return {
      id: pkg.id,
      projectId: pkg.projectId,
      packageNumber: pkg.packageNumber,
      title: pkg.title,
      description: pkg.description,
      status: pkg.status,
      totalAmount: Number(pkg.totalAmount),
      submittedAt: pkg.submittedAt,
      approvedAt: pkg.approvedAt,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
      createdById: pkg.createdById,
    };
  }
}
