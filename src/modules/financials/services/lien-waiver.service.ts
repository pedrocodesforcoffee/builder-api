import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LienWaiver } from '../entities/lien-waiver.entity';
import { PaymentApplication } from '../entities/payment-application.entity';
import { LienWaiverType } from '../enums/lien-waiver-type.enum';
import {
  CreateLienWaiverDto,
  LienWaiverResponseDto,
} from '../dto';
import { plainToInstance } from 'class-transformer';

/**
 * Service for managing Lien Waivers
 *
 * Lien waivers protect property owners from future mechanic's liens
 * by documenting that payment has been or will be received.
 *
 * Types:
 * - CONDITIONAL: Effective upon payment clearing
 * - UNCONDITIONAL: Effective immediately (use with caution!)
 */
@Injectable()
export class LienWaiverService {
  private readonly logger = new Logger(LienWaiverService.name);

  constructor(
    @InjectRepository(LienWaiver)
    private readonly lienWaiverRepository: Repository<LienWaiver>,
    @InjectRepository(PaymentApplication)
    private readonly payAppRepository: Repository<PaymentApplication>,
  ) {}

  /**
   * Create a new Lien Waiver
   *
   * Associates with a payment application and updates the hasConditionalWaiver
   * or hasUnconditionalWaiver flags.
   */
  async create(
    projectId: string,
    dto: CreateLienWaiverDto,
    userId: string,
  ): Promise<LienWaiverResponseDto> {
    this.logger.log(
      `Creating ${dto.type} lien waiver for payment application ${dto.paymentApplicationId}`,
    );

    // Validate payment application exists and belongs to project
    const payApp = await this.payAppRepository.findOne({
      where: { id: dto.paymentApplicationId, projectId },
      relations: ['commitment'],
    });

    if (!payApp) {
      throw new NotFoundException(
        `Payment application ${dto.paymentApplicationId} not found in project ${projectId}`,
      );
    }

    // Validate amount doesn't exceed payment application amount
    if (dto.amount > payApp.currentPaymentDue) {
      throw new BadRequestException(
        `Lien waiver amount ($${dto.amount.toFixed(2)}) cannot exceed payment application amount ($${payApp.currentPaymentDue.toFixed(2)})`,
      );
    }

    // Check if this type of waiver already exists for this payment application
    const existingWaiver = await this.lienWaiverRepository.findOne({
      where: {
        paymentApplicationId: dto.paymentApplicationId,
        type: dto.type,
      },
    });

    if (existingWaiver) {
      throw new BadRequestException(
        `${dto.type} lien waiver already exists for payment application ${dto.paymentApplicationId}`,
      );
    }

    // Create lien waiver
    const lienWaiver = this.lienWaiverRepository.create({
      paymentApplicationId: dto.paymentApplicationId,
      commitmentId: payApp.commitmentId,
      projectId,
      type: dto.type,
      amount: dto.amount,
      throughDate: new Date(dto.throughDate),
      documentUrl: dto.documentUrl,
      fileName: dto.fileName,
      fileSize: dto.fileSize,
      mimeType: dto.mimeType,
      notes: dto.notes,
      uploadedById: userId,
      uploadedAt: new Date(),
    });

    const saved = await this.lienWaiverRepository.save(lienWaiver);

    // Update payment application waiver flags
    if (dto.type === LienWaiverType.CONDITIONAL) {
      payApp.hasConditionalWaiver = true;
    } else if (dto.type === LienWaiverType.UNCONDITIONAL) {
      payApp.hasUnconditionalWaiver = true;
    }
    await this.payAppRepository.save(payApp);

    this.logger.log(
      `Created lien waiver ${saved.id} for payment application ${dto.paymentApplicationId}`,
    );

    return this.toResponseDto(saved);
  }

  /**
   * Find lien waiver by ID
   */
  async findOne(
    projectId: string,
    lienWaiverId: string,
  ): Promise<LienWaiverResponseDto> {
    const lienWaiver = await this.lienWaiverRepository.findOne({
      where: { id: lienWaiverId, projectId },
    });

    if (!lienWaiver) {
      throw new NotFoundException(
        `Lien waiver ${lienWaiverId} not found in project ${projectId}`,
      );
    }

    return this.toResponseDto(lienWaiver);
  }

  /**
   * Get all lien waivers for a project
   */
  async findAll(projectId: string): Promise<LienWaiverResponseDto[]> {
    const lienWaivers = await this.lienWaiverRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });

    return lienWaivers.map((lw) => this.toResponseDto(lw));
  }

  /**
   * Get lien waivers for a payment application
   */
  async findByPaymentApplication(
    projectId: string,
    paymentApplicationId: string,
  ): Promise<LienWaiverResponseDto[]> {
    const lienWaivers = await this.lienWaiverRepository.find({
      where: { paymentApplicationId, projectId },
      order: { createdAt: 'ASC' },
    });

    return lienWaivers.map((lw) => this.toResponseDto(lw));
  }

  /**
   * Get lien waivers for a commitment
   */
  async findByCommitment(
    projectId: string,
    commitmentId: string,
  ): Promise<LienWaiverResponseDto[]> {
    const lienWaivers = await this.lienWaiverRepository.find({
      where: { commitmentId, projectId },
      order: { createdAt: 'DESC' },
    });

    return lienWaivers.map((lw) => this.toResponseDto(lw));
  }

  /**
   * Delete lien waiver
   *
   * Updates payment application waiver flags if needed
   */
  async delete(projectId: string, lienWaiverId: string): Promise<void> {
    const lienWaiver = await this.lienWaiverRepository.findOne({
      where: { id: lienWaiverId, projectId },
      relations: ['paymentApplication'],
    });

    if (!lienWaiver) {
      throw new NotFoundException(
        `Lien waiver ${lienWaiverId} not found in project ${projectId}`,
      );
    }

    // Check if there are other waivers of the same type for this payment application
    const otherWaivers = await this.lienWaiverRepository.count({
      where: {
        paymentApplicationId: lienWaiver.paymentApplicationId,
        type: lienWaiver.type,
        id: `NOT ${lienWaiverId}` as any, // Not this one
      },
    });

    // If no other waivers of this type, update the flag
    if (otherWaivers === 0 && lienWaiver.paymentApplication) {
      if (lienWaiver.type === LienWaiverType.CONDITIONAL) {
        lienWaiver.paymentApplication.hasConditionalWaiver = false;
      } else if (lienWaiver.type === LienWaiverType.UNCONDITIONAL) {
        lienWaiver.paymentApplication.hasUnconditionalWaiver = false;
      }
      await this.payAppRepository.save(lienWaiver.paymentApplication);
    }

    await this.lienWaiverRepository.remove(lienWaiver);
    this.logger.log(`Deleted lien waiver ${lienWaiverId}`);
  }

  /**
   * Convert entity to response DTO
   */
  private toResponseDto(lienWaiver: LienWaiver): LienWaiverResponseDto {
    return plainToInstance(LienWaiverResponseDto, lienWaiver, {
      excludeExtraneousValues: true,
    });
  }
}
