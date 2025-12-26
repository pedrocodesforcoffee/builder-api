import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import Decimal from 'decimal.js';
import { ApprovalThreshold } from '../entities/approval-threshold.entity';
import { OwnerChangeOrder } from '../entities/owner-change-order.entity';
import { CommitmentChangeOrder } from '../entities/commitment-change-order.entity';
import { User } from '../../users/entities/user.entity';
import {
  ApprovalRouteDto,
  ApprovalValidationDto,
  UpdateThresholdsDto,
} from '../dto';

/**
 * Default approval thresholds
 *
 * Applied when no project-specific thresholds exist.
 */
const DEFAULT_THRESHOLDS = [
  {
    minAmount: 0,
    maxAmount: 10000,
    requiredRole: 'PROJECT_MANAGER',
    requiresOwnerApproval: false,
    sortOrder: 0,
  },
  {
    minAmount: 10000,
    maxAmount: 50000,
    requiredRole: 'DIRECTOR',
    requiresOwnerApproval: true,
    sortOrder: 1,
  },
  {
    minAmount: 50000,
    maxAmount: null,
    requiredRole: 'VP',
    requiresOwnerApproval: true,
    sortOrder: 2,
  },
];

/**
 * Change Order Approval Service
 *
 * Manages approval routing and validation for change orders based on amount thresholds.
 *
 * Features:
 * - Configurable approval thresholds per project
 * - Amount-based approval routing
 * - Role-based authorization checks
 * - Owner approval requirements
 * - Approval chain validation
 */
@Injectable()
export class ChangeOrderApprovalService {
  private readonly logger = new Logger(ChangeOrderApprovalService.name);

  constructor(
    @InjectRepository(ApprovalThreshold)
    private readonly thresholdRepo: Repository<ApprovalThreshold>,
    @InjectRepository(OwnerChangeOrder)
    private readonly ocoRepo: Repository<OwnerChangeOrder>,
    @InjectRepository(CommitmentChangeOrder)
    private readonly ccoRepo: Repository<CommitmentChangeOrder>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get approval thresholds for a project
   *
   * Returns thresholds sorted by minAmount (ascending).
   * Creates default thresholds if none exist.
   *
   * @param projectId - Project ID
   * @returns Array of approval thresholds
   */
  async getThresholds(projectId: string): Promise<ApprovalThreshold[]> {
    this.logger.debug(`Fetching thresholds for project ${projectId}`);

    let thresholds = await this.thresholdRepo.find({
      where: { projectId, isActive: true },
      order: { minAmount: 'ASC', sortOrder: 'ASC' },
    });

    // Create defaults if none exist
    if (thresholds.length === 0) {
      this.logger.log(`No thresholds found for project ${projectId}, creating defaults`);
      thresholds = await this.createDefaultThresholds(projectId);
    }

    return thresholds;
  }

  /**
   * Create default approval thresholds for a project
   *
   * @param projectId - Project ID
   * @returns Created thresholds
   */
  private async createDefaultThresholds(projectId: string): Promise<ApprovalThreshold[]> {
    const thresholds: ApprovalThreshold[] = [];

    for (const defaultThreshold of DEFAULT_THRESHOLDS) {
      const threshold = this.thresholdRepo.create({
        projectId,
        minAmount: defaultThreshold.minAmount,
        maxAmount: defaultThreshold.maxAmount !== null ? defaultThreshold.maxAmount : undefined,
        requiredRole: defaultThreshold.requiredRole,
        requiresOwnerApproval: defaultThreshold.requiresOwnerApproval,
        sortOrder: defaultThreshold.sortOrder,
        isActive: true,
      });
      thresholds.push(threshold);
    }

    return await this.thresholdRepo.save(thresholds);
  }

  /**
   * Update approval thresholds for a project
   *
   * Replaces all existing thresholds with new configuration.
   * Uses a transaction to ensure atomicity.
   *
   * @param projectId - Project ID
   * @param dto - Update thresholds DTO
   * @returns Updated thresholds
   */
  async updateThresholds(
    projectId: string,
    dto: UpdateThresholdsDto,
  ): Promise<ApprovalThreshold[]> {
    this.logger.log(`Updating thresholds for project ${projectId}`);

    // Validate threshold ranges don't overlap
    this.validateThresholdRanges(dto.thresholds);

    return await this.dataSource.transaction(async (manager) => {
      // Deactivate existing thresholds
      await manager.update(
        ApprovalThreshold,
        { projectId, isActive: true },
        { isActive: false },
      );

      // Create new thresholds
      const newThresholds: ApprovalThreshold[] = [];
      for (let i = 0; i < dto.thresholds.length; i++) {
        const thresholdDto = dto.thresholds[i];
        const threshold = manager.create(ApprovalThreshold, {
          projectId,
          minAmount: thresholdDto.minAmount,
          maxAmount: thresholdDto.maxAmount !== null && thresholdDto.maxAmount !== undefined ? thresholdDto.maxAmount : undefined,
          requiredRole: thresholdDto.requiredRole,
          requiresOwnerApproval: thresholdDto.requiresOwnerApproval,
          sortOrder: i,
          isActive: true,
        });
        newThresholds.push(threshold);
      }

      const saved = await manager.save(ApprovalThreshold, newThresholds);
      this.logger.log(`Created ${saved.length} new thresholds for project ${projectId}`);

      return saved;
    });
  }

  /**
   * Validate threshold ranges
   *
   * Ensures ranges don't overlap and are properly ordered.
   *
   * @param thresholds - Threshold configurations
   */
  private validateThresholdRanges(
    thresholds: Array<{
      minAmount: number;
      maxAmount?: number | null;
      requiredRole: string;
      requiresOwnerApproval: boolean;
    }>,
  ): void {
    // Sort by minAmount
    const sorted = [...thresholds].sort((a, b) => a.minAmount - b.minAmount);

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      // Check that maxAmount >= minAmount (if maxAmount exists)
      if (current.maxAmount !== null && current.maxAmount !== undefined) {
        if (current.maxAmount < current.minAmount) {
          throw new BadRequestException(
            `Threshold ${i + 1}: maxAmount (${current.maxAmount}) must be >= minAmount (${current.minAmount})`,
          );
        }
      }

      // Check for gaps or overlaps with next threshold
      if (next) {
        if (current.maxAmount === null || current.maxAmount === undefined) {
          throw new BadRequestException(
            `Threshold ${i + 1}: maxAmount must be specified when not the last threshold`,
          );
        }

        if (current.maxAmount >= next.minAmount) {
          throw new BadRequestException(
            `Threshold ${i + 1} and ${i + 2}: ranges overlap (${current.minAmount}-${current.maxAmount} overlaps with ${next.minAmount}-${next.maxAmount})`,
          );
        }
      }
    }
  }

  /**
   * Determine approval route for a change order
   *
   * Finds the appropriate threshold based on amount.
   *
   * @param projectId - Project ID
   * @param amount - Change order amount
   * @returns Approval route details
   */
  async determineApprovalRoute(
    projectId: string,
    amount: Decimal,
  ): Promise<ApprovalRouteDto> {
    this.logger.debug(`Determining approval route for project ${projectId}, amount ${amount.toFixed(2)}`);

    const thresholds = await this.getThresholds(projectId);
    const amountNumber = amount.toNumber();

    // Find matching threshold
    const matchingThreshold = thresholds.find((threshold) => {
      const minAmount = Number(threshold.minAmount);
      const maxAmount = threshold.maxAmount ? Number(threshold.maxAmount) : null;

      if (maxAmount === null) {
        // No upper limit
        return amountNumber >= minAmount;
      } else {
        // Within range
        return amountNumber >= minAmount && amountNumber < maxAmount;
      }
    });

    if (!matchingThreshold) {
      throw new NotFoundException(
        `No approval threshold found for amount ${amount.toFixed(2)} in project ${projectId}`,
      );
    }

    return {
      thresholdId: matchingThreshold.id,
      minAmount: Number(matchingThreshold.minAmount),
      maxAmount: matchingThreshold.maxAmount ? Number(matchingThreshold.maxAmount) : null,
      requiredRole: matchingThreshold.requiredRole,
      requiresOwnerApproval: matchingThreshold.requiresOwnerApproval,
      changeOrderAmount: amountNumber,
      isWithinRange: true,
    };
  }

  /**
   * Get required approvers for a change order
   *
   * Returns users who have the required role for the change order amount.
   *
   * @param projectId - Project ID
   * @param amount - Change order amount
   * @returns Array of users who can approve
   */
  async getRequiredApprovers(projectId: string, amount: Decimal): Promise<User[]> {
    this.logger.debug(`Getting required approvers for project ${projectId}, amount ${amount.toFixed(2)}`);

    const approvalRoute = await this.determineApprovalRoute(projectId, amount);

    // Query users with required role
    // Note: This assumes User entity has a 'role' field
    // Adjust the query based on your actual User entity structure
    const users = await this.userRepo
      .createQueryBuilder('user')
      .where('user.role = :role', { role: approvalRoute.requiredRole })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getMany();

    this.logger.debug(`Found ${users.length} users with role ${approvalRoute.requiredRole}`);

    return users;
  }

  /**
   * Check if user can approve a change order
   *
   * Validates user has appropriate role and authority.
   *
   * @param userId - User ID
   * @param changeOrderId - Change order ID
   * @param type - Change order type ('OCO' or 'CCO')
   * @returns True if user can approve
   */
  async canUserApprove(
    userId: string,
    changeOrderId: string,
    type: 'OCO' | 'CCO',
  ): Promise<boolean> {
    this.logger.debug(`Checking if user ${userId} can approve ${type} ${changeOrderId}`);

    // Get user
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Get change order
    let projectId: string;
    let amount: number;

    if (type === 'OCO') {
      const oco = await this.ocoRepo.findOne({ where: { id: changeOrderId } });
      if (!oco) {
        throw new NotFoundException(`OCO with ID ${changeOrderId} not found`);
      }
      projectId = oco.projectId;
      amount = Number(oco.amount);
    } else {
      const cco = await this.ccoRepo.findOne({ where: { id: changeOrderId } });
      if (!cco) {
        throw new NotFoundException(`CCO with ID ${changeOrderId} not found`);
      }
      projectId = cco.projectId;
      amount = Number(cco.amount);
    }

    // Get approval route
    const approvalRoute = await this.determineApprovalRoute(projectId, new Decimal(amount));

    // Check if user has required role
    // Note: Adjust this based on your actual User entity structure
    const hasRequiredRole = (user as any).role === approvalRoute.requiredRole;

    // Check if user is owner (if required)
    const isOwner = (user as any).role === 'COMPANY_OWNER' || (user as any).isOwner === true;
    const meetsOwnerRequirement = !approvalRoute.requiresOwnerApproval || isOwner;

    const canApprove = hasRequiredRole && meetsOwnerRequirement;

    this.logger.debug(`User ${userId} can approve: ${canApprove}`);

    return canApprove;
  }

  /**
   * Validate approval chain for a change order
   *
   * Checks if all required approvals have been received.
   *
   * @param changeOrderId - Change order ID
   * @param type - Change order type ('OCO' or 'CCO')
   * @returns Approval validation result
   */
  async validateApprovalChain(
    changeOrderId: string,
    type: 'OCO' | 'CCO',
  ): Promise<ApprovalValidationDto> {
    this.logger.debug(`Validating approval chain for ${type} ${changeOrderId}`);

    // Get change order
    let projectId: string;
    let amount: number;
    let approvedById: string | null = null;
    let approvedAt: Date | null = null;
    let status: string;

    if (type === 'OCO') {
      const oco = await this.ocoRepo.findOne({ where: { id: changeOrderId } });
      if (!oco) {
        throw new NotFoundException(`OCO with ID ${changeOrderId} not found`);
      }
      projectId = oco.projectId;
      amount = Number(oco.amount);
      approvedById = oco.approvedById || null;
      approvedAt = oco.approvedAt || null;
      status = oco.status;
    } else {
      const cco = await this.ccoRepo.findOne({ where: { id: changeOrderId } });
      if (!cco) {
        throw new NotFoundException(`CCO with ID ${changeOrderId} not found`);
      }
      projectId = cco.projectId;
      amount = Number(cco.amount);
      approvedById = cco.approvedById || null;
      approvedAt = cco.approvedAt || null;
      status = cco.status;
    }

    // Get approval route
    const approvalRoute = await this.determineApprovalRoute(projectId, new Decimal(amount));

    // Check if approved
    const hasApproval = status === 'APPROVED' && approvedById !== null;

    // Validation errors
    const validationErrors: string[] = [];

    // Check role approval
    let hasRoleApproval = false;
    if (hasApproval && approvedById) {
      const approver = await this.userRepo.findOne({ where: { id: approvedById } });
      if (approver) {
        hasRoleApproval = (approver as any).role === approvalRoute.requiredRole;
        if (!hasRoleApproval) {
          validationErrors.push(
            `Approver does not have required role: ${approvalRoute.requiredRole}`,
          );
        }
      }
    } else {
      validationErrors.push('Change order has not been approved');
    }

    // Check owner approval
    let hasOwnerApproval = true;
    if (approvalRoute.requiresOwnerApproval && hasApproval && approvedById) {
      const approver = await this.userRepo.findOne({ where: { id: approvedById } });
      if (approver) {
        hasOwnerApproval =
          (approver as any).role === 'COMPANY_OWNER' || (approver as any).isOwner === true;
        if (!hasOwnerApproval) {
          validationErrors.push('Owner approval is required but not received');
        }
      }
    } else if (approvalRoute.requiresOwnerApproval) {
      hasOwnerApproval = false;
      validationErrors.push('Owner approval is required but not received');
    }

    const isValid = validationErrors.length === 0;

    return {
      changeOrderId,
      changeOrderType: type,
      amount,
      isValid,
      requiredRole: approvalRoute.requiredRole,
      requiresOwnerApproval: approvalRoute.requiresOwnerApproval,
      hasRoleApproval,
      hasOwnerApproval,
      approvedById,
      approvedAt,
      validationErrors,
    };
  }
}
