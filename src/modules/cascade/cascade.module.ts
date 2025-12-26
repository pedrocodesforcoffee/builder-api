/**
 * Cascade Module
 *
 * Provides cascade services and controllers for deletion and restoration operations
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCascadeService } from './services/user-cascade.service';
import { OrganizationCascadeService } from './services/organization-cascade.service';
import { ProjectCascadeService } from './services/project-cascade.service';
import { UserCascadeController } from './controllers/user-cascade.controller';
import { OrganizationCascadeController } from './controllers/organization-cascade.controller';
import { ProjectCascadeController } from './controllers/project-cascade.controller';
import { User } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { OrganizationMember } from '../organizations/entities/organization-member.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Organization,
      OrganizationMember,
      Project,
      ProjectMember,
    ]),
    forwardRef(() => PermissionsModule),
  ],
  controllers: [
    UserCascadeController,
    OrganizationCascadeController,
    ProjectCascadeController,
  ],
  providers: [
    UserCascadeService,
    ProjectCascadeService,
    OrganizationCascadeService,
  ],
  exports: [
    UserCascadeService,
    ProjectCascadeService,
    OrganizationCascadeService,
  ],
})
export class CascadeModule {}
