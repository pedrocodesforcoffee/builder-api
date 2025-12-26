import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProjectMember,
  FolderPermission,
  DocumentPermission,
  DocumentRestriction,
  DocumentAccessLog,
  Document,
} from '../entities';
import {
  ProjectRole,
  DocumentAction,
  MemberStatus,
  PermissionTargetType,
} from '../enums/permission.enums';
import { DrawingDiscipline } from '../enums';

/**
 * Permission Service
 *
 * Implements hybrid RBAC + document-level permission system.
 *
 * Permission Resolution Order:
 * 1. Check document-level permissions (highest priority)
 * 2. Check folder-level permissions (with inheritance)
 * 3. Check role-based default permissions
 * 4. Default: DENY
 *
 * Features:
 * - Role-based access control (RBAC)
 * - Document-level permission overrides
 * - Folder permission inheritance
 * - IP address restrictions
 * - Discipline-specific access for subcontractors
 * - Complete audit logging
 */
@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(ProjectMember)
    private readonly memberRepo: Repository<ProjectMember>,
    @InjectRepository(FolderPermission)
    private readonly folderPermissionRepo: Repository<FolderPermission>,
    @InjectRepository(DocumentPermission)
    private readonly documentPermissionRepo: Repository<DocumentPermission>,
    @InjectRepository(DocumentRestriction)
    private readonly restrictionRepo: Repository<DocumentRestriction>,
    @InjectRepository(DocumentAccessLog)
    private readonly accessLogRepo: Repository<DocumentAccessLog>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
  ) {}

  /**
   * Role Permission Matrix
   * Defines default permissions for each role
   */
  private readonly ROLE_PERMISSIONS: Record<ProjectRole, DocumentAction[]> = {
    [ProjectRole.OWNER]: [
      DocumentAction.VIEW,
      DocumentAction.DOWNLOAD,
      DocumentAction.DOWNLOAD_ORIGINAL,
      DocumentAction.PRINT,
      DocumentAction.EDIT,
      DocumentAction.DELETE,
      DocumentAction.SHARE,
      DocumentAction.MANAGE_PERMISSIONS,
      DocumentAction.VERSION,
    ],
    [ProjectRole.ADMIN]: [
      DocumentAction.VIEW,
      DocumentAction.DOWNLOAD,
      DocumentAction.DOWNLOAD_ORIGINAL,
      DocumentAction.PRINT,
      DocumentAction.EDIT,
      DocumentAction.DELETE,
      DocumentAction.SHARE,
      DocumentAction.MANAGE_PERMISSIONS,
      DocumentAction.VERSION,
    ],
    [ProjectRole.ARCHITECT]: [
      DocumentAction.VIEW,
      DocumentAction.DOWNLOAD,
      DocumentAction.DOWNLOAD_ORIGINAL,
      DocumentAction.PRINT,
      DocumentAction.EDIT,
      DocumentAction.SHARE,
      DocumentAction.VERSION,
    ],
    [ProjectRole.ENGINEER]: [
      DocumentAction.VIEW,
      DocumentAction.DOWNLOAD,
      DocumentAction.DOWNLOAD_ORIGINAL,
      DocumentAction.PRINT,
      DocumentAction.EDIT,
      DocumentAction.SHARE,
      DocumentAction.VERSION,
    ],
    [ProjectRole.CONSULTANT]: [
      DocumentAction.VIEW,
      DocumentAction.DOWNLOAD,
      DocumentAction.PRINT,
      DocumentAction.SHARE,
    ],
    [ProjectRole.GENERAL_CONTRACTOR]: [
      DocumentAction.VIEW,
      DocumentAction.DOWNLOAD,
      DocumentAction.DOWNLOAD_ORIGINAL,
      DocumentAction.PRINT,
      DocumentAction.SHARE,
      DocumentAction.VERSION,
    ],
    [ProjectRole.PROJECT_MANAGER]: [
      DocumentAction.VIEW,
      DocumentAction.DOWNLOAD,
      DocumentAction.DOWNLOAD_ORIGINAL,
      DocumentAction.PRINT,
      DocumentAction.EDIT,
      DocumentAction.SHARE,
      DocumentAction.VERSION,
    ],
    [ProjectRole.SUPERINTENDENT]: [
      DocumentAction.VIEW,
      DocumentAction.DOWNLOAD,
      DocumentAction.PRINT,
      DocumentAction.SHARE,
    ],
    [ProjectRole.PROJECT_ENGINEER]: [
      DocumentAction.VIEW,
      DocumentAction.DOWNLOAD,
      DocumentAction.PRINT,
      DocumentAction.EDIT,
      DocumentAction.VERSION,
    ],
    [ProjectRole.SUBCONTRACTOR]: [
      DocumentAction.VIEW,
      DocumentAction.DOWNLOAD,
      DocumentAction.PRINT,
    ],
    [ProjectRole.SUPPLIER]: [
      DocumentAction.VIEW,
      DocumentAction.DOWNLOAD,
      DocumentAction.PRINT,
    ],
    [ProjectRole.INSPECTOR]: [
      DocumentAction.VIEW,
      DocumentAction.DOWNLOAD,
      DocumentAction.PRINT,
    ],
    [ProjectRole.VIEWER]: [
      DocumentAction.VIEW,
    ],
  };

  /**
   * Check if user has permission to perform action on document
   *
   * @param userId - User ID
   * @param documentId - Document ID
   * @param action - Action to perform
   * @param ipAddress - User's IP address (for restriction checks)
   * @returns true if permitted, false otherwise
   */
  async hasPermission(
    userId: string,
    documentId: string,
    action: DocumentAction,
    ipAddress?: string,
  ): Promise<boolean> {
    try {
      // Get document and project membership
      const document = await this.documentRepo.findOne({
        where: { id: documentId },
        select: ['id', 'projectId', 'folderId'],
      });

      if (!document) {
        return false;
      }

      const member = await this.getMemberByUserId(userId, document.projectId);
      if (!member || member.status !== MemberStatus.ACTIVE) {
        return false;
      }

      // Check if member access has expired
      if (member.accessExpiresAt && new Date() > member.accessExpiresAt) {
        return false;
      }

      // TODO: Check discipline restrictions for subcontractors
      // Would need to join with Drawing entity to get discipline
      // For now, skip this check

      // Check IP restrictions
      if (ipAddress) {
        const restriction = await this.restrictionRepo.findOne({
          where: { documentId },
        });

        if (restriction?.allowedIpRanges && restriction.allowedIpRanges.length > 0) {
          const isAllowed = this.checkIpInRanges(ipAddress, restriction.allowedIpRanges);
          if (!isAllowed) {
            return false;
          }
        }

        // Check specific action restrictions
        if (restriction) {
          if (action === DocumentAction.DOWNLOAD && restriction.denyDownload) {
            return false;
          }
          if (action === DocumentAction.PRINT && restriction.denyPrint) {
            return false;
          }
        }
      }

      // Resolution order: Document → Folder → Role

      // 1. Check document-level permissions (highest priority)
      const docPermission = await this.documentPermissionRepo.findOne({
        where: { documentId, userId },
      });

      if (docPermission) {
        // Check if permission has expired
        if (docPermission.expiresAt && new Date() > docPermission.expiresAt) {
          // Expired, continue to folder/role check
        } else {
          return docPermission.actions.includes(action);
        }
      }

      // 2. Check folder-level permissions
      if (document.folderId) {
        const folderAllowed = await this.checkFolderPermissions(
          document.folderId,
          userId,
          member,
          action,
        );
        if (folderAllowed !== null) {
          return folderAllowed;
        }
      }

      // 3. Check role-based permissions (default)
      return this.checkRolePermissions(member.roles as any, action);
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  /**
   * Check folder permissions with inheritance
   */
  private async checkFolderPermissions(
    folderId: string,
    userId: string,
    member: ProjectMember,
    action: DocumentAction,
  ): Promise<boolean | null> {
    // Check user-specific folder permissions
    const userPermission = await this.folderPermissionRepo.findOne({
      where: {
        folderId,
        targetType: PermissionTargetType.USER,
        userId,
      },
    });

    if (userPermission) {
      if (!userPermission.expiresAt || new Date() <= userPermission.expiresAt) {
        return userPermission.actions.includes(action);
      }
    }

    // Check role-based folder permissions
    for (const role of member.roles) {
      const rolePermission = await this.folderPermissionRepo.findOne({
        where: {
          folderId,
          targetType: PermissionTargetType.ROLE,
          role: role as any,
        } as any,
      });

      if (rolePermission) {
        if (!rolePermission.expiresAt || new Date() <= rolePermission.expiresAt) {
          if (rolePermission.actions.includes(action)) {
            return true;
          }
        }
      }
    }

    // Check company-based folder permissions
    if (member.company) {
      const companyPermission = await this.folderPermissionRepo.findOne({
        where: {
          folderId,
          targetType: PermissionTargetType.COMPANY,
          company: member.company,
        },
      });

      if (companyPermission) {
        if (!companyPermission.expiresAt || new Date() <= companyPermission.expiresAt) {
          return companyPermission.actions.includes(action);
        }
      }
    }

    // No folder-level permission found, continue to role check
    return null;
  }

  /**
   * Check role-based permissions
   */
  private checkRolePermissions(roles: ProjectRole[], action: DocumentAction): boolean {
    // User has permission if ANY of their roles grants the action
    for (const role of roles) {
      const rolePermissions = this.ROLE_PERMISSIONS[role];
      if (rolePermissions && rolePermissions.includes(action)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if IP is in allowed ranges
   * Simple CIDR check - can be enhanced with ipaddr.js library
   */
  private checkIpInRanges(ipAddress: string, allowedRanges: string[]): boolean {
    // For now, exact match or wildcard support
    // TODO: Implement proper CIDR range checking with ipaddr.js
    for (const range of allowedRanges) {
      if (range === ipAddress) {
        return true;
      }
      // Simple wildcard support (e.g., "192.168.1.*")
      if (range.includes('*')) {
        const pattern = range.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        if (regex.test(ipAddress)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Enforce permission check - throws if denied
   */
  async enforcePermission(
    userId: string,
    documentId: string,
    action: DocumentAction,
    ipAddress?: string,
  ): Promise<void> {
    const hasPermission = await this.hasPermission(userId, documentId, action, ipAddress);
    if (!hasPermission) {
      throw new ForbiddenException(
        `You do not have permission to ${action} this document`,
      );
    }
  }

  /**
   * Get project member by user ID
   */
  async getMemberByUserId(userId: string, projectId: string): Promise<ProjectMember | null> {
    return this.memberRepo.findOne({
      where: { userId, projectId },
    });
  }

  /**
   * Get project member by ID
   */
  async getMemberById(memberId: string): Promise<ProjectMember> {
    const member = await this.memberRepo.findOne({
      where: { id: memberId },
    });
    if (!member) {
      throw new NotFoundException('Project member not found');
    }
    return member;
  }

  /**
   * Get all project members
   */
  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    return this.memberRepo.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Add member to project
   */
  async addProjectMember(data: {
    projectId: string;
    userId?: string;
    inviteEmail?: string;
    roles: ProjectRole[];
    disciplines?: DrawingDiscipline[];
    company?: string;
    title?: string;
    invitedById: string;
    accessExpiresAt?: Date;
  }): Promise<ProjectMember> {
    // Validate: must have either userId or inviteEmail
    if (!data.userId && !data.inviteEmail) {
      throw new BadRequestException('Must provide either userId or inviteEmail');
    }

    // Check for existing membership
    const existing = await this.memberRepo.findOne({
      where: data.userId
        ? { projectId: data.projectId, userId: data.userId }
        : { projectId: data.projectId, inviteEmail: data.inviteEmail },
    });

    if (existing) {
      throw new BadRequestException('Member already exists in this project');
    }

    const member = this.memberRepo.create({
      ...data,
      status: data.userId ? MemberStatus.ACTIVE : MemberStatus.PENDING,
      joinedAt: data.userId ? new Date() : null,
    });

    return this.memberRepo.save(member);
  }

  /**
   * Update member roles
   */
  async updateMemberRoles(
    memberId: string,
    roles: ProjectRole[],
    disciplines?: DrawingDiscipline[],
  ): Promise<ProjectMember> {
    const member = await this.getMemberById(memberId);
    member.roles = roles;
    if (disciplines !== undefined) {
      member.disciplines = disciplines;
    }
    return this.memberRepo.save(member);
  }

  /**
   * Remove member from project
   */
  async removeMember(memberId: string): Promise<void> {
    const member = await this.getMemberById(memberId);
    await this.memberRepo.remove(member);
  }

  /**
   * Grant document permission to user
   */
  async grantDocumentPermission(data: {
    documentId: string;
    userId: string;
    actions: DocumentAction[];
    expiresAt?: Date;
    reason?: string;
    grantedById: string;
  }): Promise<DocumentPermission> {
    // Check if permission already exists
    let permission = await this.documentPermissionRepo.findOne({
      where: { documentId: data.documentId, userId: data.userId },
    });

    if (permission) {
      // Update existing permission
      permission.actions = data.actions;
      permission.expiresAt = data.expiresAt || null;
      permission.reason = data.reason || null;
    } else {
      // Create new permission
      permission = this.documentPermissionRepo.create(data);
    }

    return this.documentPermissionRepo.save(permission);
  }

  /**
   * Revoke document permission from user
   */
  async revokeDocumentPermission(documentId: string, userId: string): Promise<void> {
    const permission = await this.documentPermissionRepo.findOne({
      where: { documentId, userId },
    });
    if (permission) {
      await this.documentPermissionRepo.remove(permission);
    }
  }

  /**
   * Grant folder permission
   */
  async grantFolderPermission(data: {
    folderId: string;
    targetType: PermissionTargetType;
    role?: ProjectRole;
    userId?: string;
    company?: string;
    actions: DocumentAction[];
    expiresAt?: Date;
    grantedById: string;
  }): Promise<FolderPermission> {
    // Validate target type matches provided fields
    if (data.targetType === PermissionTargetType.ROLE && !data.role) {
      throw new BadRequestException('Role is required for role-based permission');
    }
    if (data.targetType === PermissionTargetType.USER && !data.userId) {
      throw new BadRequestException('UserId is required for user-based permission');
    }
    if (data.targetType === PermissionTargetType.COMPANY && !data.company) {
      throw new BadRequestException('Company is required for company-based permission');
    }

    const permission = this.folderPermissionRepo.create(data);
    return this.folderPermissionRepo.save(permission);
  }

  /**
   * Revoke folder permission
   */
  async revokeFolderPermission(permissionId: string): Promise<void> {
    const permission = await this.folderPermissionRepo.findOne({
      where: { id: permissionId },
    });
    if (permission) {
      await this.folderPermissionRepo.remove(permission);
    }
  }

  /**
   * Get folder permissions
   */
  async getFolderPermissions(folderId: string): Promise<FolderPermission[]> {
    return this.folderPermissionRepo.find({
      where: { folderId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get document permissions
   */
  async getDocumentPermissions(documentId: string): Promise<DocumentPermission[]> {
    return this.documentPermissionRepo.find({
      where: { documentId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Set document restrictions
   */
  async setDocumentRestrictions(data: {
    documentId: string;
    denyDownload?: boolean;
    denyPrint?: boolean;
    requireWatermark?: boolean;
    allowedIpRanges?: string[];
    inheritFromFolder?: boolean;
    setById: string;
  }): Promise<DocumentRestriction> {
    let restriction = await this.restrictionRepo.findOne({
      where: { documentId: data.documentId },
    });

    if (restriction) {
      // Update existing
      Object.assign(restriction, data);
    } else {
      // Create new
      restriction = this.restrictionRepo.create(data);
    }

    return this.restrictionRepo.save(restriction);
  }

  /**
   * Get document restrictions
   */
  async getDocumentRestrictions(documentId: string): Promise<DocumentRestriction | null> {
    return this.restrictionRepo.findOne({
      where: { documentId },
    });
  }

  /**
   * Log document access
   */
  async logAccess(data: {
    documentId: string;
    versionId?: string;
    action: DocumentAction;
    userId?: string;
    externalEmail?: string;
    shareLinkId?: string;
    transmittalId?: string;
    ipAddress: string;
    userAgent?: string;
    geoLocation?: string;
    details?: any;
  }): Promise<DocumentAccessLog> {
    const log = this.accessLogRepo.create(data);
    return this.accessLogRepo.save(log);
  }

  /**
   * Get access logs for document
   */
  async getDocumentAccessLogs(
    documentId: string,
    limit = 100,
  ): Promise<DocumentAccessLog[]> {
    return this.accessLogRepo.find({
      where: { documentId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get access logs for user
   */
  async getUserAccessLogs(
    userId: string,
    limit = 100,
  ): Promise<DocumentAccessLog[]> {
    return this.accessLogRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Check if user is project owner or admin
   */
  async isProjectOwnerOrAdmin(userId: string, projectId: string): Promise<boolean> {
    const member = await this.getMemberByUserId(userId, projectId);
    if (!member || member.status !== MemberStatus.ACTIVE) {
      return false;
    }
    return (
      member.roles.includes(ProjectRole.OWNER) ||
      member.roles.includes(ProjectRole.ADMIN)
    );
  }

  /**
   * Get all documents user has access to in a project
   */
  async getUserDocuments(
    userId: string,
    projectId: string,
    action: DocumentAction = DocumentAction.VIEW,
  ): Promise<string[]> {
    // Get all documents in project
    const documents = await this.documentRepo.find({
      where: { projectId },
      select: ['id'],
    });

    // Filter to documents user has permission for
    const accessibleDocIds: string[] = [];
    for (const doc of documents) {
      const hasAccess = await this.hasPermission(userId, doc.id, action);
      if (hasAccess) {
        accessibleDocIds.push(doc.id);
      }
    }

    return accessibleDocIds;
  }
}
