/**
 * Permissions Module
 *
 * Provides permission checking services for multi-level RBAC
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionService } from './services/permission.service';
import { InheritanceService } from './services/inheritance.service';
import { ScopeService } from './services/scope.service';
import { ExpirationService } from './services/expiration.service';
import { ExpirationNotificationService } from './services/expiration-notification.service';
import { ExpirationSchedulerService } from './services/expiration-scheduler.service';
import { AuditService } from './services/audit.service';
import { GuardCacheService } from './services/guard-cache.service';
import { DocumentGuard } from './guards/document.guard';
import { RFIGuard } from './guards/rfi.guard';
import { SubmittalGuard } from './guards/submittal.guard';
import { SafetyGuard } from './guards/safety.guard';
import { BudgetGuard } from './guards/budget.guard';
import { QualityGuard } from './guards/quality.guard';
import { ProjectSettingsGuard } from './guards/project-settings.guard';
import { PermissionGuard } from './guards/permission.guard';
import { User } from '../users/entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { OrganizationMember } from '../organizations/entities/organization-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Project,
      Organization,
      ProjectMember,
      OrganizationMember,
    ]),
  ],
  providers: [
    // Core services
    PermissionService,
    InheritanceService,
    ScopeService,
    ExpirationService,
    ExpirationNotificationService,
    ExpirationSchedulerService,
    AuditService,
    GuardCacheService,
    // Feature guards
    DocumentGuard,
    RFIGuard,
    SubmittalGuard,
    SafetyGuard,
    BudgetGuard,
    QualityGuard,
    ProjectSettingsGuard,
    // NestJS guard
    PermissionGuard,
  ],
  exports: [
    // Core services
    PermissionService,
    InheritanceService,
    ScopeService,
    ExpirationService,
    ExpirationNotificationService,
    ExpirationSchedulerService,
    AuditService,
    GuardCacheService,
    // Feature guards
    DocumentGuard,
    RFIGuard,
    SubmittalGuard,
    SafetyGuard,
    BudgetGuard,
    QualityGuard,
    ProjectSettingsGuard,
    // NestJS guard
    PermissionGuard,
  ],
})
export class PermissionsModule {}
