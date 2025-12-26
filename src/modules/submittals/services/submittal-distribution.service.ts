import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SubmittalDistribution, DistributionMethod, DistributionStatus } from '../entities/submittal-distribution.entity';
import { Submittal, SubmittalStatus } from '../entities/submittal.entity';
import { ProjectSubmittalSettings } from '../entities/project-submittal-settings.entity';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { DistributeSubmittalDto } from '../dto/distribute-submittal.dto';

export interface DistributionSummary {
  totalRecipients: number;
  internalUsers: number;
  externalRecipients: number;
  distributionMethod: DistributionMethod;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
}

@Injectable()
export class SubmittalDistributionService {
  private readonly logger = new Logger(SubmittalDistributionService.name);

  constructor(
    @InjectRepository(SubmittalDistribution)
    private readonly distributionRepository: Repository<SubmittalDistribution>,
    @InjectRepository(Submittal)
    private readonly submittalRepository: Repository<Submittal>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(ProjectSubmittalSettings)
    private readonly settingsRepository: Repository<ProjectSubmittalSettings>,
  ) {}

  /**
   * Distribute submittal to specified recipients
   */
  async distributeSubmittal(
    submittalId: string,
    dto: DistributeSubmittalDto,
    distributedById: string,
  ): Promise<SubmittalDistribution[]> {
    const submittal = await this.submittalRepository.findOne({
      where: { id: submittalId },
      relations: ['project'],
    });

    if (!submittal) {
      throw new NotFoundException(`Submittal with ID ${submittalId} not found`);
    }

    // Validate submittal is approved
    if (submittal.status !== SubmittalStatus.APPROVED && submittal.status !== SubmittalStatus.APPROVED_AS_NOTED) {
      throw new BadRequestException(
        'Only approved submittals can be distributed',
      );
    }

    const distributions: SubmittalDistribution[] = [];
    const method = dto.method || DistributionMethod.EMAIL;

    // Get documents to distribute
    const documentIds = dto.documentIds || [];

    // Distribute to internal users
    if (dto.recipientIds && dto.recipientIds.length > 0) {
      const users = await this.userRepository.find({
        where: { id: In(dto.recipientIds) },
      });

      for (const user of users) {
        const distribution = await this.createDistribution({
          submittalId,
          recipientId: user.id,
          recipientName: `${user.firstName} ${user.lastName}`,
          recipientEmail: user.email,
          method,
          distributedById,
          includeConditions: dto.includeConditions ?? true,
          includeMarkups: dto.includeMarkups ?? false,
          coverNote: dto.coverNote,
          documentIds,
          revisionNumber: submittal.currentRevision,
        });
        distributions.push(distribution);
      }
    }

    // Distribute to organizations (all members)
    if (dto.recipientOrgIds && dto.recipientOrgIds.length > 0) {
      // TODO: Implement organization member lookup
      // For now, we skip this as Organization entity doesn't have members relation
      this.logger.log(`Organization distribution not yet implemented for ${dto.recipientOrgIds.length} orgs`);
    }

    // Distribute to external recipients
    if (dto.externalRecipients && dto.externalRecipients.length > 0) {
      for (const external of dto.externalRecipients) {
        const distribution = await this.createDistribution({
          submittalId,
          recipientEmail: external.email,
          recipientName: external.name || external.email,
          method,
          distributedById,
          includeConditions: dto.includeConditions ?? true,
          includeMarkups: dto.includeMarkups ?? false,
          coverNote: dto.coverNote,
          documentIds,
          revisionNumber: submittal.currentRevision,
        });
        distributions.push(distribution);
      }
    }

    if (distributions.length === 0) {
      throw new BadRequestException('No valid recipients specified for distribution');
    }

    this.logger.log(
      `Distributed submittal ${submittal.number} to ${distributions.length} recipients`,
    );

    // TODO: Trigger actual email/notification sending
    const sentDistributions = await this.sendDistributions(distributions);

    return sentDistributions;
  }

  /**
   * Auto-distribute submittal based on project settings
   */
  async autoDistribute(submittalId: string): Promise<SubmittalDistribution[]> {
    const submittal = await this.submittalRepository.findOne({
      where: { id: submittalId },
      relations: ['project'],
    });

    if (!submittal) {
      throw new NotFoundException(`Submittal with ID ${submittalId} not found`);
    }

    const settings = await this.settingsRepository.findOne({
      where: { projectId: submittal.projectId },
    });

    if (!settings || !settings.autoDistributeOnApproval) {
      this.logger.log(`Auto-distribution disabled for project ${submittal.projectId}`);
      return [];
    }

    // Get distribution list from submittal
    const recipientIds = submittal.distributionList || [];
    if (recipientIds.length === 0) {
      this.logger.log(`No distribution list configured for submittal ${submittal.number}`);
      return [];
    }

    // Distribute to configured recipients
    return await this.distributeSubmittal(
      submittalId,
      {
        recipientIds,
        method: DistributionMethod.EMAIL,
        includeConditions: true,
        includeMarkups: false,
      },
      submittal.submittalManagerId || submittal.createdById,
    );
  }

  /**
   * Create a distribution record
   */
  private async createDistribution(data: {
    submittalId: string;
    recipientId?: string;
    recipientOrgId?: string;
    recipientEmail: string;
    recipientName: string;
    method: DistributionMethod;
    distributedById: string;
    includeConditions: boolean;
    includeMarkups: boolean;
    coverNote?: string;
    documentIds: string[];
    revisionNumber: number;
  }): Promise<SubmittalDistribution> {
    const distribution = this.distributionRepository.create({
      submittalId: data.submittalId,
      recipientId: data.recipientId,
      recipientOrgId: data.recipientOrgId,
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName,
      method: data.method,
      distributedById: data.distributedById,
      status: DistributionStatus.PENDING,
      includeConditions: data.includeConditions,
      includeMarkups: data.includeMarkups,
      coverNote: data.coverNote,
      documentIds: data.documentIds,
      revisionNumber: data.revisionNumber,
    });

    const saved = await this.distributionRepository.save(distribution);
    return saved;
  }

  /**
   * Send distributions (email, notification, etc.)
   */
  private async sendDistributions(
    distributions: SubmittalDistribution[],
  ): Promise<SubmittalDistribution[]> {
    const sent: SubmittalDistribution[] = [];
    for (const distribution of distributions) {
      try {
        // TODO: Integrate with email service
        // TODO: Generate download links if method is DOWNLOAD_LINK
        // TODO: Send in-app notification if method is IN_APP

        distribution.status = DistributionStatus.SENT;
        distribution.distributedAt = new Date();

        const saved = await this.distributionRepository.save(distribution);
        sent.push(saved);

        this.logger.log(
          `Sent distribution ${distribution.id} to ${distribution.recipientEmail}`,
        );
      } catch (error) {
        distribution.status = DistributionStatus.FAILED;
        distribution.errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        const saved = await this.distributionRepository.save(distribution);
        sent.push(saved);

        this.logger.error(
          `Failed to send distribution ${distribution.id}: ${distribution.errorMessage}`,
        );
      }
    }
    return sent;
  }

  /**
   * Mark distribution as acknowledged by recipient
   */
  async acknowledgeDistribution(
    distributionId: string,
    userId?: string,
  ): Promise<SubmittalDistribution> {
    const distribution = await this.distributionRepository.findOne({
      where: { id: distributionId },
    });

    if (!distribution) {
      throw new NotFoundException(`Distribution with ID ${distributionId} not found`);
    }

    // Verify user is the recipient (if userId provided)
    if (userId && distribution.recipientId !== userId) {
      throw new BadRequestException(
        'Only the recipient can acknowledge this distribution',
      );
    }

    distribution.status = DistributionStatus.ACKNOWLEDGED;
    distribution.acknowledgedAt = new Date();

    return await this.distributionRepository.save(distribution);
  }

  /**
   * Get all distributions for a submittal
   */
  async getDistributionsBySubmittal(
    submittalId: string,
  ): Promise<SubmittalDistribution[]> {
    return await this.distributionRepository.find({
      where: { submittalId },
      relations: ['recipient', 'recipientOrg', 'distributedBy'],
      order: { distributedAt: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Get distribution summary for a submittal
   */
  async getDistributionSummary(submittalId: string): Promise<DistributionSummary> {
    const distributions = await this.getDistributionsBySubmittal(submittalId);

    const internalUsers = distributions.filter((d) => d.recipientId).length;
    const externalRecipients = distributions.filter((d) => !d.recipientId).length;
    const sentCount = distributions.filter((d) => d.status === DistributionStatus.SENT || d.status === DistributionStatus.DELIVERED || d.status === DistributionStatus.ACKNOWLEDGED).length;
    const deliveredCount = distributions.filter((d) => d.status === DistributionStatus.DELIVERED || d.status === DistributionStatus.ACKNOWLEDGED).length;
    const failedCount = distributions.filter((d) => d.status === DistributionStatus.FAILED).length;

    // Get most common distribution method
    const methodCounts = distributions.reduce((acc, d) => {
      acc[d.method] = (acc[d.method] || 0) + 1;
      return acc;
    }, {} as Record<DistributionMethod, number>);

    const distributionMethod =
      (Object.keys(methodCounts).sort(
        (a, b) => methodCounts[b as DistributionMethod] - methodCounts[a as DistributionMethod],
      )[0] as DistributionMethod) || DistributionMethod.EMAIL;

    return {
      totalRecipients: distributions.length,
      internalUsers,
      externalRecipients,
      distributionMethod,
      sentCount,
      deliveredCount,
      failedCount,
    };
  }

  /**
   * Get distributions for a user
   */
  async getDistributionsByUser(
    userId: string,
    params?: {
      status?: DistributionStatus;
      skip?: number;
      take?: number;
    },
  ): Promise<{ distributions: SubmittalDistribution[]; total: number }> {
    const qb = this.distributionRepository
      .createQueryBuilder('distribution')
      .leftJoinAndSelect('distribution.submittal', 'submittal')
      .leftJoinAndSelect('submittal.project', 'project')
      .leftJoinAndSelect('distribution.distributedBy', 'distributedBy')
      .where('distribution.recipientId = :userId', { userId });

    if (params?.status) {
      qb.andWhere('distribution.status = :status', { status: params.status });
    }

    qb.orderBy('distribution.distributedAt', 'DESC').addOrderBy('distribution.createdAt', 'DESC');

    const total = await qb.getCount();

    if (params?.skip) {
      qb.skip(params.skip);
    }
    if (params?.take) {
      qb.take(params.take);
    }

    const distributions = await qb.getMany();

    return { distributions, total };
  }

  /**
   * Resend a failed distribution
   */
  async resendDistribution(distributionId: string): Promise<SubmittalDistribution> {
    const distribution = await this.distributionRepository.findOne({
      where: { id: distributionId },
    });

    if (!distribution) {
      throw new NotFoundException(`Distribution with ID ${distributionId} not found`);
    }

    // Reset status
    distribution.status = DistributionStatus.PENDING;
    distribution.distributedAt = null as any;
    distribution.errorMessage = null as any;

    await this.distributionRepository.save(distribution);

    // Resend
    const [resent] = await this.sendDistributions([distribution]);

    return resent;
  }

  /**
   * Delete a distribution
   */
  async deleteDistribution(distributionId: string): Promise<void> {
    const result = await this.distributionRepository.delete(distributionId);
    if (result.affected === 0) {
      throw new NotFoundException(`Distribution with ID ${distributionId} not found`);
    }
  }

  /**
   * Get unacknowledged distributions for a project
   */
  async getUnacknowledgedDistributions(
    projectId: string,
  ): Promise<SubmittalDistribution[]> {
    return await this.distributionRepository
      .createQueryBuilder('distribution')
      .leftJoinAndSelect('distribution.submittal', 'submittal')
      .leftJoinAndSelect('distribution.recipient', 'recipient')
      .where('submittal.projectId = :projectId', { projectId })
      .andWhere('distribution.status != :status', {
        status: DistributionStatus.ACKNOWLEDGED,
      })
      .andWhere('distribution.status != :failedStatus', {
        failedStatus: DistributionStatus.FAILED,
      })
      .orderBy('distribution.distributedAt', 'ASC')
      .getMany();
  }

  /**
   * Mark distribution as delivered (webhook from email service)
   */
  async markAsDelivered(distributionId: string): Promise<SubmittalDistribution> {
    const distribution = await this.distributionRepository.findOne({
      where: { id: distributionId },
    });

    if (!distribution) {
      throw new NotFoundException(`Distribution with ID ${distributionId} not found`);
    }

    if (distribution.status === DistributionStatus.SENT) {
      distribution.status = DistributionStatus.DELIVERED;
      return await this.distributionRepository.save(distribution);
    }

    return distribution;
  }
}
