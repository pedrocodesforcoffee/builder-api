/**
 * Permission Decorator
 *
 * Decorator for protecting routes with permission checks
 */

import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for permission decorator
 */
export const PERMISSION_KEY = 'permission';

/**
 * Permission metadata
 */
export interface PermissionMetadata {
  guard: 'document' | 'rfi' | 'submittal' | 'safety' | 'budget' | 'quality' | 'project-settings';
  action: string;
  resourceParam?: string; // Name of the route param containing resource ID
  projectParam?: string; // Name of the route param containing project ID (default: 'projectId')
}

/**
 * Permission decorator
 *
 * Use this decorator to protect routes with permission checks
 *
 * @param metadata - Permission metadata
 *
 * @example
 * ```typescript
 * @Permission({
 *   guard: 'document',
 *   action: 'create',
 *   projectParam: 'projectId'
 * })
 * @Post('/projects/:projectId/documents')
 * async createDocument(@Param('projectId') projectId: string) {
 *   // ...
 * }
 * ```
 *
 * @example
 * ```typescript
 * @Permission({
 *   guard: 'rfi',
 *   action: 'update',
 *   resourceParam: 'rfiId',
 *   projectParam: 'projectId'
 * })
 * @Patch('/projects/:projectId/rfis/:rfiId')
 * async updateRFI(
 *   @Param('projectId') projectId: string,
 *   @Param('rfiId') rfiId: string
 * ) {
 *   // ...
 * }
 * ```
 */
export const Permission = (metadata: PermissionMetadata) =>
  SetMetadata(PERMISSION_KEY, metadata);
