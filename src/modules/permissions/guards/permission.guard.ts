/**
 * NestJS Permission Guard
 *
 * Implements CanActivate for NestJS route protection
 */

import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY, PermissionMetadata } from '../decorators/permission.decorator';
import { DocumentGuard } from './document.guard';
import { RFIGuard } from './rfi.guard';
import { SubmittalGuard } from './submittal.guard';
import { SafetyGuard } from './safety.guard';
import { BudgetGuard } from './budget.guard';
import { QualityGuard } from './quality.guard';
import { ProjectSettingsGuard } from './project-settings.guard';
import { PermissionContext } from '../interfaces/guard.interface';

/**
 * NestJS Permission Guard
 *
 * Intercepts requests and enforces permission checks based on @Permission() decorator
 *
 * @example
 * ```typescript
 * // In controller
 * @UseGuards(PermissionGuard)
 * @Permission({ guard: 'document', action: 'create' })
 * @Post('/projects/:projectId/documents')
 * async createDocument() {
 *   // ...
 * }
 * ```
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly documentGuard: DocumentGuard,
    private readonly rfiGuard: RFIGuard,
    private readonly submittalGuard: SubmittalGuard,
    private readonly safetyGuard: SafetyGuard,
    private readonly budgetGuard: BudgetGuard,
    private readonly qualityGuard: QualityGuard,
    private readonly projectSettingsGuard: ProjectSettingsGuard,
  ) {}

  /**
   * Can activate - check if request is allowed
   *
   * @param context - Execution context
   * @returns true if allowed, throws exception if denied
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get permission metadata from decorator
    const permissionMetadata = this.reflector.get<PermissionMetadata>(
      PERMISSION_KEY,
      context.getHandler(),
    );

    if (!permissionMetadata) {
      // No permission decorator - allow by default
      // In production, you might want to deny by default for security
      this.logger.warn(
        `No @Permission() decorator found on route ${context.getClass().name}.${context.getHandler().name}`,
      );
      return true;
    }

    // Extract request and user information
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      this.logger.error('No user found in request - authentication may be missing');
      throw new Error('Authentication required');
    }

    // Extract project ID from route params
    const projectParam = permissionMetadata.projectParam || 'projectId';
    const projectId = request.params[projectParam];

    if (!projectId) {
      this.logger.error(
        `Project ID not found in route params (looking for '${projectParam}')`,
      );
      throw new Error('Project ID required');
    }

    // Extract resource ID if specified
    let resourceId: string | undefined;
    if (permissionMetadata.resourceParam) {
      resourceId = request.params[permissionMetadata.resourceParam];
    }

    // Build permission context from request
    const context_data: PermissionContext = {
      resourceType: permissionMetadata.guard,
      resourceId,
      metadata: {
        // Pass request body for additional context
        ...request.body,
        // Pass query params
        ...request.query,
      },
    };

    // Get appropriate guard
    const guard = this.getGuard(permissionMetadata.guard);

    if (!guard) {
      this.logger.error(`Unknown guard type: ${permissionMetadata.guard}`);
      throw new Error(`Invalid guard type: ${permissionMetadata.guard}`);
    }

    // Enforce permission
    await guard.enforcePermission(
      user.id,
      projectId,
      permissionMetadata.action,
      resourceId,
      context_data,
    );

    // If we get here, permission is granted
    return true;
  }

  /**
   * Get guard instance by name
   *
   * @param guardName - Guard name
   * @returns Guard instance
   */
  private getGuard(
    guardName: string,
  ):
    | DocumentGuard
    | RFIGuard
    | SubmittalGuard
    | SafetyGuard
    | BudgetGuard
    | QualityGuard
    | ProjectSettingsGuard
    | null {
    switch (guardName) {
      case 'document':
        return this.documentGuard;
      case 'rfi':
        return this.rfiGuard;
      case 'submittal':
        return this.submittalGuard;
      case 'safety':
        return this.safetyGuard;
      case 'budget':
        return this.budgetGuard;
      case 'quality':
        return this.qualityGuard;
      case 'project-settings':
        return this.projectSettingsGuard;
      default:
        return null;
    }
  }
}
