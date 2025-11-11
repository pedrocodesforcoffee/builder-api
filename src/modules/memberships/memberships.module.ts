import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationMember } from '../organizations/entities/organization-member.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { User } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Project } from '../projects/entities/project.entity';

// Services
import { OrganizationMembershipService } from './services/organization-membership.service';
import { ProjectMembershipService } from './services/project-membership.service';
import { BulkOperationsService } from './services/bulk-operations.service';
import { MembershipHistoryService } from './services/membership-history.service';

// Controllers
import { OrganizationMembershipController } from './controllers/organization-membership.controller';
import { ProjectMembershipController } from './controllers/project-membership.controller';
import { BulkOperationsController } from './controllers/bulk-operations.controller';
import { MembershipHistoryController } from './controllers/membership-history.controller';

// Import permission services
import { PermissionsModule } from '../permissions/permissions.module';

/**
 * Memberships Module
 *
 * Manages organization and project memberships with advanced features:
 * - Organization membership CRUD
 * - Project membership CRUD with scope and expiration
 * - Bulk operations (add/update/remove)
 * - Role change history
 * - Membership statistics
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationMember,
      ProjectMember,
      User,
      Organization,
      Project,
    ]),
    PermissionsModule,
  ],
  controllers: [
    OrganizationMembershipController,
    ProjectMembershipController,
    BulkOperationsController,
    MembershipHistoryController,
  ],
  providers: [
    OrganizationMembershipService,
    ProjectMembershipService,
    BulkOperationsService,
    MembershipHistoryService,
  ],
  exports: [
    OrganizationMembershipService,
    ProjectMembershipService,
    BulkOperationsService,
    MembershipHistoryService,
  ],
})
export class MembershipsModule {}
