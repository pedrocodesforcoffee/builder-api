import { BadRequestException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { OrganizationMember } from '../entities/organization-member.entity';
import { OrganizationRole } from '../../users/enums/organization-role.enum';

/**
 * Organization Member Validation Utilities
 *
 * Provides validation functions to ensure business rules are enforced
 * when managing organization memberships.
 */

/**
 * Validates that removing a member won't leave the organization without an OWNER
 *
 * Business Rule: Every organization must have at least one OWNER at all times.
 * This prevents orphaned organizations and ensures there's always someone with
 * full administrative control.
 *
 * @param organizationId - The organization ID
 * @param userIdToRemove - The user ID being removed
 * @param memberRepository - TypeORM repository for OrganizationMember
 * @throws ConflictException if removing this member would leave no owners
 */
export async function validateNotRemovingLastOwner(
  organizationId: string,
  userIdToRemove: string,
  memberRepository: Repository<OrganizationMember>
): Promise<void> {
  // First, check if the member being removed is an OWNER
  const memberToRemove = await memberRepository.findOne({
    where: {
      organizationId,
      userId: userIdToRemove,
    },
  });

  // If not an owner, removal is safe
  if (!memberToRemove || !memberToRemove.isOwner()) {
    return;
  }

  // Count total owners in the organization
  const ownerCount = await memberRepository.count({
    where: {
      organizationId,
      role: OrganizationRole.OWNER,
    },
  });

  // If this is the last owner, prevent removal
  if (ownerCount <= 1) {
    throw new ConflictException(
      'Cannot remove the last owner from an organization. ' +
      'Transfer ownership to another member before removing this owner.'
    );
  }
}

/**
 * Validates that demoting a member won't leave the organization without an OWNER
 *
 * Similar to removal validation, but for role changes.
 *
 * @param organizationId - The organization ID
 * @param userId - The user ID whose role is being changed
 * @param newRole - The new role being assigned
 * @param memberRepository - TypeORM repository for OrganizationMember
 * @throws ConflictException if demoting this owner would leave no owners
 */
export async function validateNotDemotingLastOwner(
  organizationId: string,
  userId: string,
  newRole: OrganizationRole,
  memberRepository: Repository<OrganizationMember>
): Promise<void> {
  // If the new role is OWNER, no validation needed
  if (newRole === OrganizationRole.OWNER) {
    return;
  }

  // Check if the member being changed is currently an OWNER
  const currentMember = await memberRepository.findOne({
    where: {
      organizationId,
      userId,
    },
  });

  // If not currently an owner, demotion is safe
  if (!currentMember || !currentMember.isOwner()) {
    return;
  }

  // Count total owners in the organization
  const ownerCount = await memberRepository.count({
    where: {
      organizationId,
      role: OrganizationRole.OWNER,
    },
  });

  // If this is the last owner, prevent demotion
  if (ownerCount <= 1) {
    throw new ConflictException(
      'Cannot demote the last owner of an organization. ' +
      'Promote another member to owner before demoting this owner.'
    );
  }
}

/**
 * Validates role hierarchy rules
 *
 * Business Rules:
 * - GUEST cannot add members or change roles
 * - ORG_MEMBER can only invite other ORG_MEMBERs or GUESTs
 * - Only OWNERs can create other OWNERs
 * - Admins can manage members with equal or lower privilege
 *
 * @param actorRole - The role of the user performing the action
 * @param targetRole - The role being assigned or modified
 * @throws BadRequestException if the role assignment violates hierarchy rules
 */
export function validateRoleHierarchy(
  actorRole: OrganizationRole,
  targetRole: OrganizationRole
): void {
  const roleHierarchy: Record<OrganizationRole, number> = {
    [OrganizationRole.OWNER]: 4,
    [OrganizationRole.ORG_ADMIN]: 3,
    [OrganizationRole.ORG_MEMBER]: 2,
    [OrganizationRole.GUEST]: 1,
  };

  const actorLevel = roleHierarchy[actorRole];
  const targetLevel = roleHierarchy[targetRole];

  // Only owners can create other owners
  if (targetRole === OrganizationRole.OWNER && actorRole !== OrganizationRole.OWNER) {
    throw new BadRequestException(
      'Only organization owners can assign the owner role to other members.'
    );
  }

  // Users cannot assign roles higher than their own
  if (targetLevel > actorLevel) {
    throw new BadRequestException(
      `Insufficient permissions: ${actorRole} cannot assign ${targetRole} role.`
    );
  }

  // Guests cannot perform member management
  if (actorRole === OrganizationRole.GUEST) {
    throw new BadRequestException(
      'Guests do not have permission to manage organization members.'
    );
  }
}

/**
 * Validates invitation workflow timestamps
 *
 * Business Rules:
 * - invitedAt must be set when creating an invitation
 * - acceptedAt must be after invitedAt
 * - joinedAt must be after or equal to acceptedAt
 *
 * @param invitedAt - When the invitation was sent
 * @param acceptedAt - When the invitation was accepted
 * @param joinedAt - When the member actually joined
 * @throws BadRequestException if timestamps are invalid
 */
export function validateInvitationTimestamps(
  invitedAt?: Date,
  acceptedAt?: Date,
  joinedAt?: Date
): void {
  if (acceptedAt && !invitedAt) {
    throw new BadRequestException(
      'Cannot set acceptedAt without invitedAt. An invitation must be sent before it can be accepted.'
    );
  }

  if (joinedAt && !acceptedAt) {
    throw new BadRequestException(
      'Cannot set joinedAt without acceptedAt. An invitation must be accepted before joining.'
    );
  }

  if (invitedAt && acceptedAt && acceptedAt < invitedAt) {
    throw new BadRequestException(
      'acceptedAt cannot be before invitedAt. Acceptance must occur after invitation.'
    );
  }

  if (acceptedAt && joinedAt && joinedAt < acceptedAt) {
    throw new BadRequestException(
      'joinedAt cannot be before acceptedAt. Joining must occur after or at acceptance.'
    );
  }
}
