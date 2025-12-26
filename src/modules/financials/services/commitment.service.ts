import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Commitment } from '../entities/commitment.entity';
import { CommitmentItem } from '../entities/commitment-item.entity';
import { Project } from '../../projects/entities/project.entity';
import { CommitmentType } from '../enums/commitment-type.enum';
import { CommitmentStatus } from '../enums/commitment-status.enum';
import { ProjectFolderService } from '../../projects/services/project-folder.service';
import {
  CreateCommitmentDto,
  UpdateCommitmentDto,
  CommitmentResponseDto,
} from '../dto';

/**
 * Commitment Service
 *
 * Handles business logic for commitment management including:
 * - CRUD operations for commitments
 * - Status workflow management (draft → pending_approval → approved → active → complete → closed)
 * - Commitment type validation (SUBCONTRACT or PURCHASE_ORDER)
 * - Total commitment recalculation from line items
 * - Project and commitment validation
 *
 * @service CommitmentService
 */
@Injectable()
export class CommitmentService {
  private readonly logger = new Logger(CommitmentService.name);

  constructor(
    @InjectRepository(Commitment)
    private readonly commitmentRepo: Repository<Commitment>,
    @InjectRepository(CommitmentItem)
    private readonly commitmentItemRepo: Repository<CommitmentItem>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly projectFolderService: ProjectFolderService,
  ) {}

  /**
   * Create a new commitment
   *
   * Validates project exists.
   * Validates commitment type is valid (SUBCONTRACT or PURCHASE_ORDER).
   * Ensures commitment number is unique within the project.
   * Initializes commitment with given amounts.
   *
   * @param createDto - Commitment creation data
   * @returns Created commitment
   * @throws NotFoundException if project doesn't exist
   * @throws BadRequestException if validation fails (invalid type)
   */
  async create(
    createDto: CreateCommitmentDto,
  ): Promise<CommitmentResponseDto> {
    this.logger.log(
      `Creating commitment "${createDto.number}" for project ${createDto.projectId}`,
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

    // Validate commitment type
    if (
      createDto.type !== CommitmentType.SUBCONTRACT &&
      createDto.type !== CommitmentType.PURCHASE_ORDER
    ) {
      throw new BadRequestException(
        `Invalid commitment type: ${createDto.type}. Must be ${CommitmentType.SUBCONTRACT} or ${CommitmentType.PURCHASE_ORDER}`,
      );
    }

    // Check if commitment number is unique within project
    const existingCommitment = await this.commitmentRepo.findOne({
      where: {
        projectId: createDto.projectId,
        number: createDto.number,
      },
    });

    if (existingCommitment) {
      throw new BadRequestException(
        `Commitment number "${createDto.number}" already exists in this project`,
      );
    }

    // Create commitment
    const commitment = this.commitmentRepo.create({
      ...createDto,
      status: createDto.status || CommitmentStatus.DRAFT,
    });

    const savedCommitment = await this.commitmentRepo.save(commitment);

    this.logger.log(
      `Commitment created successfully: ${savedCommitment.id}`,
    );

    // Create folder structure for the commitment
    // Note: Folder creation is now done on-demand when the first document is uploaded
    // This prevents creating empty folders for commitments without documents

    return this.toResponseDto(savedCommitment);
  }

  /**
   * List all commitments
   *
   * Optionally filter by:
   * - Project
   * - Type (SUBCONTRACT or PURCHASE_ORDER)
   * - Status
   *
   * @param projectId - Filter to specific project (optional)
   * @param type - Filter to specific type (optional)
   * @param status - Filter to specific status (optional)
   * @returns Array of commitments
   */
  async findAll(
    projectId?: string,
    type?: CommitmentType,
    status?: CommitmentStatus,
  ): Promise<CommitmentResponseDto[]> {
    this.logger.log(
      `Fetching commitments - projectId: ${projectId}, type: ${type}, status: ${status}`,
    );

    const queryBuilder = this.commitmentRepo.createQueryBuilder('commitment');

    // Filter by project
    if (projectId) {
      queryBuilder.andWhere('commitment.project_id = :projectId', {
        projectId,
      });
    }

    // Filter by type
    if (type) {
      queryBuilder.andWhere('commitment.type = :type', { type });
    }

    // Filter by status
    if (status) {
      queryBuilder.andWhere('commitment.status = :status', { status });
    }

    // Order by most recently created
    queryBuilder.orderBy('commitment.created_at', 'DESC');

    const commitments = await queryBuilder.getMany();

    this.logger.log(`Found ${commitments.length} commitments`);

    return commitments.map((commitment) => this.toResponseDto(commitment));
  }

  /**
   * Get commitment by ID
   *
   * Includes associated items in response.
   *
   * @param id - Commitment ID
   * @param includeItems - Whether to include items (default: true)
   * @returns Commitment details
   * @throws NotFoundException if commitment doesn't exist
   */
  async findOne(
    id: string,
    includeItems = true,
  ): Promise<CommitmentResponseDto> {
    this.logger.log(`Fetching commitment by ID: ${id}`);

    const queryBuilder = this.commitmentRepo
      .createQueryBuilder('commitment')
      .where('commitment.id = :id', { id });

    if (includeItems) {
      queryBuilder.leftJoinAndSelect('commitment.items', 'items');
    }

    const commitment = await queryBuilder.getOne();

    if (!commitment) {
      throw new NotFoundException(`Commitment with ID ${id} not found`);
    }

    return this.toResponseDto(commitment);
  }

  /**
   * Get commitment by number within project
   *
   * @param projectId - Project ID
   * @param number - Commitment number
   * @returns Commitment details
   * @throws NotFoundException if commitment doesn't exist
   */
  async findByNumber(
    projectId: string,
    number: string,
  ): Promise<CommitmentResponseDto> {
    this.logger.log(
      `Fetching commitment by number: ${number} in project ${projectId}`,
    );

    const commitment = await this.commitmentRepo.findOne({
      where: {
        projectId,
        number,
      },
      relations: ['items'],
    });

    if (!commitment) {
      throw new NotFoundException(
        `Commitment with number "${number}" not found in project ${projectId}`,
      );
    }

    return this.toResponseDto(commitment);
  }

  /**
   * Update commitment
   *
   * Validates commitment type if being updated.
   * Validates status transition if status is being updated.
   * Cannot update commitment if marked as CLOSED or VOID.
   *
   * @param id - Commitment ID
   * @param updateDto - Update data
   * @returns Updated commitment
   * @throws NotFoundException if commitment doesn't exist
   * @throws BadRequestException if validation fails or commitment is locked
   */
  async update(
    id: string,
    updateDto: UpdateCommitmentDto,
  ): Promise<CommitmentResponseDto> {
    this.logger.log(`Updating commitment ${id}`);

    const commitment = await this.commitmentRepo.findOne({
      where: { id },
    });

    if (!commitment) {
      throw new NotFoundException(`Commitment with ID ${id} not found`);
    }

    // Cannot update if commitment is CLOSED or VOID
    if (
      commitment.status === CommitmentStatus.CLOSED ||
      commitment.status === CommitmentStatus.VOID
    ) {
      throw new BadRequestException(
        `Cannot update a ${commitment.status.toLowerCase()} commitment`,
      );
    }

    // Validate commitment type if being updated
    if (updateDto.type && updateDto.type !== commitment.type) {
      if (
        updateDto.type !== CommitmentType.SUBCONTRACT &&
        updateDto.type !== CommitmentType.PURCHASE_ORDER
      ) {
        throw new BadRequestException(
          `Invalid commitment type: ${updateDto.type}. Must be ${CommitmentType.SUBCONTRACT} or ${CommitmentType.PURCHASE_ORDER}`,
        );
      }
    }

    // Validate status transition if status is being updated
    if (updateDto.status && updateDto.status !== commitment.status) {
      this.validateStatusTransition(commitment.status, updateDto.status);
    }

    // Check if commitment number would conflict with another commitment in same project
    if (updateDto.number && updateDto.number !== commitment.number) {
      const existingCommitment = await this.commitmentRepo.findOne({
        where: {
          projectId: commitment.projectId,
          number: updateDto.number,
        },
      });

      if (existingCommitment && existingCommitment.id !== id) {
        throw new BadRequestException(
          `Commitment number "${updateDto.number}" already exists in this project`,
        );
      }
    }

    // Apply updates
    Object.assign(commitment, updateDto);

    const updatedCommitment = await this.commitmentRepo.save(commitment);

    this.logger.log(`Commitment ${id} updated successfully`);

    return this.toResponseDto(updatedCommitment);
  }

  /**
   * Update commitment status
   *
   * Convenience method for status transitions.
   *
   * @param id - Commitment ID
   * @param status - New status
   * @returns Updated commitment
   * @throws BadRequestException if invalid status transition
   */
  async updateStatus(
    id: string,
    status: CommitmentStatus,
  ): Promise<CommitmentResponseDto> {
    this.logger.log(`Updating commitment ${id} status to ${status}`);
    return this.update(id, { status });
  }

  /**
   * Recalculate commitment total from line items
   *
   * Sums all line item amounts and updates the commitment's currentAmount field.
   * Should be called whenever line items are added/updated/removed.
   *
   * @param id - Commitment ID
   * @returns Updated commitment
   * @throws NotFoundException if commitment doesn't exist
   */
  async recalculateTotal(id: string): Promise<CommitmentResponseDto> {
    this.logger.log(`Recalculating total for commitment ${id}`);

    const commitment = await this.commitmentRepo.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!commitment) {
      throw new NotFoundException(`Commitment with ID ${id} not found`);
    }

    // Calculate total from line items
    const total = commitment.items?.reduce((sum, item) => {
      return sum + (item.amount || 0);
    }, 0) || 0;

    commitment.currentAmount = total;
    const updatedCommitment = await this.commitmentRepo.save(commitment);

    this.logger.log(
      `Commitment ${id} total recalculated: ${updatedCommitment.currentAmount}`,
    );

    return this.toResponseDto(updatedCommitment);
  }

  /**
   * Delete commitment
   *
   * Permanently removes the commitment and all associated line items.
   * Cannot delete a commitment that is ACTIVE, COMPLETE, CLOSED, or VOID.
   *
   * @param id - Commitment ID
   * @throws NotFoundException if commitment doesn't exist
   * @throws BadRequestException if commitment cannot be deleted
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Removing commitment ${id}`);

    const commitment = await this.commitmentRepo.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!commitment) {
      throw new NotFoundException(`Commitment with ID ${id} not found`);
    }

    // Cannot delete active, complete, closed, or void commitments
    if (commitment.status === CommitmentStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot delete an active commitment. Change status first.',
      );
    }

    if (commitment.status === CommitmentStatus.COMPLETE) {
      throw new BadRequestException(
        'Cannot delete a completed commitment. Change status to DRAFT first.',
      );
    }

    if (commitment.status === CommitmentStatus.CLOSED) {
      throw new BadRequestException('Cannot delete a closed commitment.');
    }

    if (commitment.status === CommitmentStatus.VOID) {
      throw new BadRequestException('Cannot delete a void commitment.');
    }

    // Delete associated line items first
    if (commitment.items && commitment.items.length > 0) {
      await this.commitmentItemRepo.remove(commitment.items);
      this.logger.log(`Deleted ${commitment.items.length} line items`);
    }

    await this.commitmentRepo.remove(commitment);

    this.logger.log(`Commitment ${id} deleted successfully`);
  }

  /**
   * Validate status transition
   *
   * Enforces valid status workflow:
   * - DRAFT → PENDING_APPROVAL
   * - PENDING_APPROVAL → APPROVED, DRAFT, VOID
   * - APPROVED → ACTIVE, DRAFT, VOID
   * - ACTIVE → COMPLETE, DRAFT
   * - COMPLETE → CLOSED, ACTIVE
   * - CLOSED → (no transitions)
   * - VOID → (no transitions)
   *
   * @param currentStatus - Current status
   * @param newStatus - Proposed new status
   * @throws BadRequestException if transition is invalid
   */
  private validateStatusTransition(
    currentStatus: CommitmentStatus,
    newStatus: CommitmentStatus,
  ): void {
    const validTransitions: Record<CommitmentStatus, CommitmentStatus[]> = {
      [CommitmentStatus.DRAFT]: [CommitmentStatus.PENDING_APPROVAL],
      [CommitmentStatus.PENDING_APPROVAL]: [
        CommitmentStatus.APPROVED,
        CommitmentStatus.DRAFT,
        CommitmentStatus.VOID,
      ],
      [CommitmentStatus.APPROVED]: [
        CommitmentStatus.ACTIVE,
        CommitmentStatus.DRAFT,
        CommitmentStatus.VOID,
      ],
      [CommitmentStatus.ACTIVE]: [
        CommitmentStatus.COMPLETE,
        CommitmentStatus.DRAFT,
      ],
      [CommitmentStatus.COMPLETE]: [
        CommitmentStatus.CLOSED,
        CommitmentStatus.ACTIVE,
      ],
      [CommitmentStatus.CLOSED]: [], // Cannot transition from closed
      [CommitmentStatus.VOID]: [], // Cannot transition from void
    };

    const allowedStatuses = validTransitions[currentStatus] || [];

    if (!allowedStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedStatuses.join(', ') || 'none'}`,
      );
    }
  }

  /**
   * Submit commitment for approval
   *
   * Changes status from DRAFT to PENDING_APPROVAL.
   *
   * @param id - Commitment ID
   * @param userId - User ID submitting the commitment
   * @returns Updated commitment
   * @throws NotFoundException if commitment doesn't exist
   * @throws BadRequestException if commitment is not in DRAFT status
   */
  async submit(id: string, userId: string): Promise<CommitmentResponseDto> {
    this.logger.log(`Submitting commitment ${id} for approval by user ${userId}`);

    const commitment = await this.commitmentRepo.findOne({ where: { id } });

    if (!commitment) {
      throw new NotFoundException(`Commitment with ID ${id} not found`);
    }

    if (commitment.status !== CommitmentStatus.DRAFT) {
      throw new BadRequestException(
        `Can only submit commitments in DRAFT status. Current status: ${commitment.status}`,
      );
    }

    commitment.status = CommitmentStatus.PENDING_APPROVAL;
    const updated = await this.commitmentRepo.save(commitment);

    this.logger.log(`Commitment ${id} submitted for approval`);
    return this.toResponseDto(updated);
  }

  /**
   * Approve commitment
   *
   * Changes status from PENDING_APPROVAL to APPROVED.
   * Records approver and approval timestamp.
   *
   * @param id - Commitment ID
   * @param userId - User ID approving the commitment
   * @returns Updated commitment
   * @throws NotFoundException if commitment doesn't exist
   * @throws BadRequestException if commitment is not pending approval
   */
  async approve(id: string, userId: string): Promise<CommitmentResponseDto> {
    this.logger.log(`Approving commitment ${id} by user ${userId}`);

    const commitment = await this.commitmentRepo.findOne({ where: { id } });

    if (!commitment) {
      throw new NotFoundException(`Commitment with ID ${id} not found`);
    }

    if (commitment.status !== CommitmentStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Can only approve commitments in PENDING_APPROVAL status. Current status: ${commitment.status}`,
      );
    }

    commitment.status = CommitmentStatus.APPROVED;
    commitment.approvedById = userId;
    commitment.approvedAt = new Date();
    commitment.rejectedById = undefined;
    commitment.rejectedAt = undefined;
    commitment.rejectionReason = undefined;

    const updated = await this.commitmentRepo.save(commitment);

    this.logger.log(`Commitment ${id} approved`);
    return this.toResponseDto(updated);
  }

  /**
   * Reject commitment
   *
   * Changes status from PENDING_APPROVAL back to DRAFT.
   * Records rejector, rejection timestamp, and reason.
   *
   * @param id - Commitment ID
   * @param userId - User ID rejecting the commitment
   * @param reason - Reason for rejection
   * @returns Updated commitment
   * @throws NotFoundException if commitment doesn't exist
   * @throws BadRequestException if commitment is not pending approval
   */
  async reject(
    id: string,
    userId: string,
    reason: string,
  ): Promise<CommitmentResponseDto> {
    this.logger.log(`Rejecting commitment ${id} by user ${userId}`);

    const commitment = await this.commitmentRepo.findOne({ where: { id } });

    if (!commitment) {
      throw new NotFoundException(`Commitment with ID ${id} not found`);
    }

    if (commitment.status !== CommitmentStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Can only reject commitments in PENDING_APPROVAL status. Current status: ${commitment.status}`,
      );
    }

    commitment.status = CommitmentStatus.DRAFT;
    commitment.rejectedById = userId;
    commitment.rejectedAt = new Date();
    commitment.rejectionReason = reason;
    commitment.approvedById = undefined;
    commitment.approvedAt = undefined;

    const updated = await this.commitmentRepo.save(commitment);

    this.logger.log(`Commitment ${id} rejected`);
    return this.toResponseDto(updated);
  }

  /**
   * Activate commitment
   *
   * Changes status from APPROVED to ACTIVE.
   *
   * @param id - Commitment ID
   * @param userId - User ID activating the commitment
   * @returns Updated commitment
   * @throws NotFoundException if commitment doesn't exist
   * @throws BadRequestException if commitment is not approved
   */
  async activate(id: string, userId: string): Promise<CommitmentResponseDto> {
    this.logger.log(`Activating commitment ${id} by user ${userId}`);

    const commitment = await this.commitmentRepo.findOne({ where: { id } });

    if (!commitment) {
      throw new NotFoundException(`Commitment with ID ${id} not found`);
    }

    if (commitment.status !== CommitmentStatus.APPROVED) {
      throw new BadRequestException(
        `Can only activate commitments in APPROVED status. Current status: ${commitment.status}`,
      );
    }

    commitment.status = CommitmentStatus.ACTIVE;
    const updated = await this.commitmentRepo.save(commitment);

    this.logger.log(`Commitment ${id} activated`);
    return this.toResponseDto(updated);
  }

  /**
   * Mark commitment as complete
   *
   * Changes status from ACTIVE to COMPLETE.
   *
   * @param id - Commitment ID
   * @param userId - User ID marking the commitment complete
   * @returns Updated commitment
   * @throws NotFoundException if commitment doesn't exist
   * @throws BadRequestException if commitment is not active
   */
  async complete(id: string, userId: string): Promise<CommitmentResponseDto> {
    this.logger.log(`Marking commitment ${id} as complete by user ${userId}`);

    const commitment = await this.commitmentRepo.findOne({ where: { id } });

    if (!commitment) {
      throw new NotFoundException(`Commitment with ID ${id} not found`);
    }

    if (commitment.status !== CommitmentStatus.ACTIVE) {
      throw new BadRequestException(
        `Can only complete commitments in ACTIVE status. Current status: ${commitment.status}`,
      );
    }

    commitment.status = CommitmentStatus.COMPLETE;
    const updated = await this.commitmentRepo.save(commitment);

    this.logger.log(`Commitment ${id} marked as complete`);
    return this.toResponseDto(updated);
  }

  /**
   * Close commitment
   *
   * Changes status from COMPLETE to CLOSED.
   * This is a final status - no further changes allowed.
   *
   * @param id - Commitment ID
   * @param userId - User ID closing the commitment
   * @returns Updated commitment
   * @throws NotFoundException if commitment doesn't exist
   * @throws BadRequestException if commitment is not complete
   */
  async close(id: string, userId: string): Promise<CommitmentResponseDto> {
    this.logger.log(`Closing commitment ${id} by user ${userId}`);

    const commitment = await this.commitmentRepo.findOne({ where: { id } });

    if (!commitment) {
      throw new NotFoundException(`Commitment with ID ${id} not found`);
    }

    if (commitment.status !== CommitmentStatus.COMPLETE) {
      throw new BadRequestException(
        `Can only close commitments in COMPLETE status. Current status: ${commitment.status}`,
      );
    }

    commitment.status = CommitmentStatus.CLOSED;
    const updated = await this.commitmentRepo.save(commitment);

    this.logger.log(`Commitment ${id} closed`);
    return this.toResponseDto(updated);
  }

  /**
   * Void commitment
   *
   * Changes status to VOID.
   * Can be done from PENDING_APPROVAL or APPROVED status.
   * This is a final status - no further changes allowed.
   *
   * @param id - Commitment ID
   * @param userId - User ID voiding the commitment
   * @param reason - Reason for voiding
   * @returns Updated commitment
   * @throws NotFoundException if commitment doesn't exist
   * @throws BadRequestException if commitment cannot be voided
   */
  async void(
    id: string,
    userId: string,
    reason: string,
  ): Promise<CommitmentResponseDto> {
    this.logger.log(`Voiding commitment ${id} by user ${userId}`);

    const commitment = await this.commitmentRepo.findOne({ where: { id } });

    if (!commitment) {
      throw new NotFoundException(`Commitment with ID ${id} not found`);
    }

    if (
      commitment.status !== CommitmentStatus.PENDING_APPROVAL &&
      commitment.status !== CommitmentStatus.APPROVED
    ) {
      throw new BadRequestException(
        `Can only void commitments in PENDING_APPROVAL or APPROVED status. Current status: ${commitment.status}`,
      );
    }

    commitment.status = CommitmentStatus.VOID;
    commitment.rejectionReason = reason;

    const updated = await this.commitmentRepo.save(commitment);

    this.logger.log(`Commitment ${id} voided`);
    return this.toResponseDto(updated);
  }

  /**
   * Ensure folder exists for commitment (create on-demand)
   * This is called when the first document is uploaded
   *
   * @param commitmentId - Commitment ID
   * @returns Folder ID
   */
  async ensureCommitmentFolder(commitmentId: string): Promise<string> {
    // Fetch the commitment entity (not DTO)
    const commitment = await this.commitmentRepo.findOne({
      where: { id: commitmentId },
    });

    if (!commitment) {
      throw new NotFoundException(`Commitment with ID ${commitmentId} not found`);
    }

    // If folder already exists, return it
    if (commitment.folderId) {
      return commitment.folderId;
    }

    this.logger.log(
      `Creating folder on-demand for commitment ${commitment.number}`,
    );

    try {
      const folder = await this.projectFolderService.ensureCommitmentFolderStructure(
        commitment.projectId,
        commitment.id,
        commitment.title || 'General Commitment',
        commitment.number,
        commitment.vendorName,
      );

      // Update commitment with folder ID
      commitment.folderId = folder.id;
      await this.commitmentRepo.save(commitment);

      this.logger.log(
        `Folder created for commitment ${commitment.number}: ${folder.path}`,
      );

      return folder.id;
    } catch (error) {
      this.logger.error(
        `Failed to create folder for commitment ${commitment.number}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Convert entity to response DTO
   *
   * @param commitment - Commitment entity
   * @returns Response DTO
   */
  private toResponseDto(commitment: Commitment): CommitmentResponseDto {
    return {
      id: commitment.id,
      projectId: commitment.projectId,
      number: commitment.number,
      type: commitment.type,
      title: commitment.title,
      description: commitment.description,
      status: commitment.status,
      vendorName: commitment.vendorName,
      vendorContact: commitment.vendorContact,
      vendorEmail: commitment.vendorEmail,
      originalAmount: commitment.originalAmount,
      currentAmount: commitment.currentAmount,
      startDate: commitment.startDate,
      endDate: commitment.endDate,
      folderId: commitment.folderId,
      createdAt: commitment.createdAt,
      updatedAt: commitment.updatedAt,
    };
  }
}
