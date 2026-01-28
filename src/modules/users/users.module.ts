import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserPinnedProject } from './entities/user-pinned-project.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { UserPinnedProjectsService } from './services/user-pinned-projects.service';
import { UserPinnedProjectsController } from './controllers/user-pinned-projects.controller';

/**
 * Users Module
 *
 * Provides user-related functionality including:
 * - Pinned projects management
 * - User preferences
 *
 * This module imports the User, UserPinnedProject, Project, and ProjectMember entities.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserPinnedProject,
      Project,
      ProjectMember,
    ]),
  ],
  controllers: [UserPinnedProjectsController],
  providers: [UserPinnedProjectsService],
  exports: [UserPinnedProjectsService],
})
export class UsersModule {}
