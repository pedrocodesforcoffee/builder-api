import { Injectable, Logger } from '@nestjs/common';
import { ProjectMembershipService } from './project-membership.service';
import {
  BulkAddMembersDto,
  BulkUpdateMembersDto,
  BulkRemoveMembersDto,
  RemoveMemberDto,
} from '../dto';

interface BulkOperationResult<T = any> {
  success: T[];
  failed: Array<{
    data: any;
    error: string;
  }>;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

/**
 * Bulk Operations Service
 *
 * Handles bulk operations for project memberships with partial failure support
 */
@Injectable()
export class BulkOperationsService {
  private readonly logger = new Logger(BulkOperationsService.name);

  constructor(
    private readonly projectMembershipService: ProjectMembershipService,
  ) {}

  /**
   * Bulk add members to project
   */
  async bulkAddMembers(
    projectId: string,
    dto: BulkAddMembersDto,
    requestingUserId: string,
  ): Promise<BulkOperationResult> {
    this.logger.log(
      `Bulk adding ${dto.members.length} members to project ${projectId}`,
    );

    const results: BulkOperationResult = {
      success: [],
      failed: [],
      summary: {
        total: dto.members.length,
        succeeded: 0,
        failed: 0,
      },
    };

    // Process each member addition
    for (const memberDto of dto.members) {
      try {
        const result = await this.projectMembershipService.addProjectMember(
          projectId,
          memberDto,
          requestingUserId,
        );

        results.success.push(result);
        results.summary.succeeded++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        results.failed.push({
          data: memberDto,
          error: errorMessage,
        });
        results.summary.failed++;

        this.logger.warn(
          `Failed to add member ${memberDto.userId}: ${errorMessage}`,
        );
      }
    }

    this.logger.log(
      `Bulk add completed: ${results.summary.succeeded} succeeded, ${results.summary.failed} failed`,
    );

    return results;
  }

  /**
   * Bulk update members in project
   */
  async bulkUpdateMembers(
    projectId: string,
    dto: BulkUpdateMembersDto,
    requestingUserId: string,
  ): Promise<BulkOperationResult> {
    this.logger.log(
      `Bulk updating ${dto.updates.length} members in project ${projectId}`,
    );

    const results: BulkOperationResult = {
      success: [],
      failed: [],
      summary: {
        total: dto.updates.length,
        succeeded: 0,
        failed: 0,
      },
    };

    // Process each member update
    for (const updateDto of dto.updates) {
      try {
        const { userId, ...updates } = updateDto;
        const result = await this.projectMembershipService.updateProjectMember(
          projectId,
          userId,
          updates,
          requestingUserId,
        );

        results.success.push(result);
        results.summary.succeeded++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        results.failed.push({
          data: updateDto,
          error: errorMessage,
        });
        results.summary.failed++;

        this.logger.warn(
          `Failed to update member ${updateDto.userId}: ${errorMessage}`,
        );
      }
    }

    this.logger.log(
      `Bulk update completed: ${results.summary.succeeded} succeeded, ${results.summary.failed} failed`,
    );

    return results;
  }

  /**
   * Bulk remove members from project
   */
  async bulkRemoveMembers(
    projectId: string,
    dto: BulkRemoveMembersDto,
    requestingUserId: string,
  ): Promise<BulkOperationResult> {
    this.logger.log(
      `Bulk removing ${dto.userIds.length} members from project ${projectId}`,
    );

    const results: BulkOperationResult = {
      success: [],
      failed: [],
      summary: {
        total: dto.userIds.length,
        succeeded: 0,
        failed: 0,
      },
    };

    const removeMemberDto: RemoveMemberDto | undefined = dto.reason
      ? { reason: dto.reason }
      : undefined;

    // Process each member removal
    for (const userId of dto.userIds) {
      try {
        await this.projectMembershipService.removeProjectMember(
          projectId,
          userId,
          requestingUserId,
          removeMemberDto,
        );

        results.success.push({ userId });
        results.summary.succeeded++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        results.failed.push({
          data: { userId },
          error: errorMessage,
        });
        results.summary.failed++;

        this.logger.warn(`Failed to remove member ${userId}: ${errorMessage}`);
      }
    }

    this.logger.log(
      `Bulk remove completed: ${results.summary.succeeded} succeeded, ${results.summary.failed} failed`,
    );

    return results;
  }
}
