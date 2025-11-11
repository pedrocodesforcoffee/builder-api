import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationMember } from './entities/organization-member.entity';
import { OrganizationService } from './services/organization.service';
import { OrganizationController } from './controllers/organization.controller';

/**
 * Organizations Module
 *
 * Provides organization management functionality including:
 * - Organization CRUD operations
 * - Organization member management
 * - Organization-project relationships
 */
@Module({
  imports: [TypeOrmModule.forFeature([Organization, OrganizationMember])],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationsModule {}
