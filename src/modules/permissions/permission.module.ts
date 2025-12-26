import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionService } from './permission.service';
import { OrganizationMember } from '../organizations/entities/organization-member.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';

/**
 * Permission Module
 *
 * Provides permission checking services for the multi-level permission system.
 * This module exports the PermissionService for use in other modules.
 *
 * @module PermissionModule
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizationMember, ProjectMember]),
  ],
  providers: [PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}
