import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { Project } from '../../projects/entities/project.entity';
import { PermissionService } from '../../permissions/services/permission.service';

interface MemberHistory {
  userId: string;
  userName: string;
  userEmail: string;
  changes: Array<{
    timestamp: Date;
    field: string;
    oldValue: any;
    newValue: any;
    changedBy: string;
  }>;
}

interface ProjectStatistics {
  totalMembers: number;
  membersByRole: Record<string, number>;
  membersByRoleCategory: {
    admin: number;
    field: number;
    office: number;
    specialized: number;
    view: number;
  };
  scopeStatistics: {
    limited: number;
    unrestricted: number;
  };
  expirationStatistics: {
    active: number;
    expiring: number;
    expired: number;
  };
}

interface PendingRenewal {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  expiresAt: Date;
  daysRemaining: number;
  expirationReason?: string;
  expirationNotified: boolean;
}

/**
 * Membership History Service
 *
 * Provides role change history and membership statistics
 */
@Injectable()
export class MembershipHistoryService {
  private readonly logger = new Logger(MembershipHistoryService.name);

  constructor(
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * Get member role change history
   * Note: This is a simplified version - in production, you'd want a separate audit table
   */
  async getMemberHistory(
    projectId: string,
    userId: string,
    requestingUserId: string,
  ): Promise<MemberHistory> {
    this.logger.log(
      `Getting history for member ${userId} in project ${projectId}`,
    );

    // 1. Check permission
    const hasPermission = await this.permissionService.hasPermission(
      requestingUserId,
      projectId,
      'project:members:read',
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to view member history',
      );
    }

    // 2. Get current membership
    const membership = await this.projectMemberRepo.findOne({
      where: { userId, projectId },
      relations: ['user'],
    });

    if (!membership) {
      throw new NotFoundException('Project membership not found');
    }

    // 3. In a real implementation, you would query an audit log table
    // For now, return a simplified history based on timestamps
    const changes: MemberHistory['changes'] = [];

    if (membership.addedAt) {
      changes.push({
        timestamp: membership.addedAt,
        field: 'membership',
        oldValue: null,
        newValue: 'added',
        changedBy: membership.addedBy || 'system',
      });
    }

    if (membership.updatedAt && membership.updatedAt > membership.addedAt) {
      changes.push({
        timestamp: membership.updatedAt,
        field: 'membership',
        oldValue: 'previous_state',
        newValue: 'updated',
        changedBy: 'unknown', // Would come from audit log
      });
    }

    return {
      userId: membership.userId,
      userName: membership.user.name,
      userEmail: membership.user.email,
      changes,
    };
  }

  /**
   * Get project membership statistics
   */
  async getProjectStatistics(
    projectId: string,
    requestingUserId: string,
  ): Promise<ProjectStatistics> {
    this.logger.log(`Getting statistics for project ${projectId}`);

    // 1. Check permission
    const hasPermission = await this.permissionService.hasPermission(
      requestingUserId,
      projectId,
      'project:members:read',
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to view project statistics',
      );
    }

    // 2. Validate project exists
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // 3. Get all members
    const members = await this.projectMemberRepo.find({
      where: { projectId },
    });

    // 4. Calculate statistics
    const totalMembers = members.length;

    // Count by role
    const membersByRole: Record<string, number> = {};
    members.forEach((member) => {
      membersByRole[member.role] = (membersByRole[member.role] || 0) + 1;
    });

    // Count by role category
    const membersByRoleCategory = {
      admin: membersByRole['PROJECT_ADMIN'] || 0,
      field:
        (membersByRole['SUPERINTENDENT'] || 0) +
        (membersByRole['FOREMAN'] || 0) +
        (membersByRole['FIELD_ENGINEER'] || 0),
      office:
        (membersByRole['PROJECT_MANAGER'] || 0) +
        (membersByRole['PROJECT_ENGINEER'] || 0) +
        (membersByRole['ESTIMATOR'] || 0),
      specialized:
        (membersByRole['SAFETY_OFFICER'] || 0) +
        (membersByRole['QUALITY_CONTROL'] || 0) +
        (membersByRole['SURVEYOR'] || 0),
      view: membersByRole['VIEWER'] || 0,
    };

    // Scope statistics
    const scopeStatistics = {
      limited: members.filter((m) => m.scope !== null).length,
      unrestricted: members.filter((m) => m.scope === null).length,
    };

    // Expiration statistics
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const expirationStatistics = {
      active: members.filter(
        (m) => m.expiresAt === null || m.expiresAt > now,
      ).length,
      expiring: members.filter(
        (m) => m.expiresAt !== null && m.expiresAt <= futureDate && m.expiresAt > now,
      ).length,
      expired: members.filter((m) => m.expiresAt !== null && m.expiresAt <= now)
        .length,
    };

    return {
      totalMembers,
      membersByRole,
      membersByRoleCategory,
      scopeStatistics,
      expirationStatistics,
    };
  }

  /**
   * Get members pending expiration renewal
   */
  async getPendingRenewals(
    projectId: string,
    requestingUserId: string,
    daysAhead: number = 30,
  ): Promise<PendingRenewal[]> {
    this.logger.log(
      `Getting pending renewals for project ${projectId} (${daysAhead} days ahead)`,
    );

    // 1. Check permission
    const hasPermission = await this.permissionService.hasPermission(
      requestingUserId,
      projectId,
      'project:members:read',
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to view pending renewals',
      );
    }

    // 2. Validate project exists
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // 3. Calculate date range
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    // 4. Get members expiring in the date range
    const expiringMembers = await this.projectMemberRepo.find({
      where: {
        projectId,
        expiresAt: LessThan(futureDate),
      },
      relations: ['user'],
      order: {
        expiresAt: 'ASC',
      },
    });

    // 5. Filter out already expired and map to response format
    const pendingRenewals: PendingRenewal[] = expiringMembers
      .filter((member) => member.expiresAt && member.expiresAt > now)
      .map((member) => {
        const daysRemaining = Math.ceil(
          (member.expiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        return {
          userId: member.userId,
          userName: member.user.name,
          userEmail: member.user.email,
          role: member.role,
          expiresAt: member.expiresAt!,
          daysRemaining,
          expirationReason: member.expirationReason || undefined,
          expirationNotified: member.expirationNotified,
        };
      });

    return pendingRenewals;
  }
}
