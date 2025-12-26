import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMember } from '../entities/project-member.entity';
import { Project } from '../entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { AddProjectMemberDto } from '../dto/members/add-project-member.dto';
import { UpdateProjectMemberDto } from '../dto/members/update-project-member.dto';

/**
 * Service for managing project team members
 */
@Injectable()
export class ProjectMemberService {
  constructor(
    @InjectRepository(ProjectMember)
    private projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /**
   * List all team members for a project
   */
  async listMembers(projectId: string): Promise<ProjectMember[]> {
    // Verify project exists
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Get all members with user details
    return this.projectMemberRepo.find({
      where: { projectId },
      relations: ['user'],
      order: {
        createdAt: 'ASC',
      },
    });
  }

  /**
   * Add a team member to a project
   * Supports adding by userId or email
   */
  async addMember(
    projectId: string,
    dto: AddProjectMemberDto,
  ): Promise<ProjectMember> {
    // Verify project exists
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Determine userId - either from dto or lookup by email
    let userId: string;

    if (dto.userId) {
      userId = dto.userId;
    } else if (dto.email) {
      // Look up user by email
      const user = await this.userRepo.findOne({
        where: { email: dto.email.toLowerCase() },
      });

      if (!user) {
        throw new NotFoundException(
          `User with email ${dto.email} not found. Please ensure the user has an account.`,
        );
      }

      userId = user.id;
    } else {
      throw new BadRequestException(
        'Either userId or email must be provided',
      );
    }

    // Verify user exists
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if member already exists
    const existingMember = await this.projectMemberRepo.findOne({
      where: { projectId, userId },
    });

    if (existingMember) {
      throw new ConflictException(
        `User ${user.email} is already a member of this project`,
      );
    }

    // Create new project member
    const member = this.projectMemberRepo.create({
      projectId,
      userId,
      role: dto.role,
    });

    const savedMember = await this.projectMemberRepo.save(member);

    // Return with user details
    return this.projectMemberRepo.findOne({
      where: { projectId, userId },
      relations: ['user'],
    }) as Promise<ProjectMember>;
  }

  /**
   * Update a team member's role
   */
  async updateMember(
    projectId: string,
    userId: string,
    dto: UpdateProjectMemberDto,
  ): Promise<ProjectMember> {
    // Find the member
    const member = await this.projectMemberRepo.findOne({
      where: { projectId, userId },
      relations: ['user'],
    });

    if (!member) {
      throw new NotFoundException(
        `Team member with user ID ${userId} not found in project ${projectId}`,
      );
    }

    // Update the role
    member.role = dto.role;
    await this.projectMemberRepo.save(member);

    // Return updated member with user details
    return this.projectMemberRepo.findOne({
      where: { projectId, userId },
      relations: ['user'],
    }) as Promise<ProjectMember>;
  }

  /**
   * Remove a team member from a project
   */
  async removeMember(projectId: string, userId: string): Promise<void> {
    // Find the member
    const member = await this.projectMemberRepo.findOne({
      where: { projectId, userId },
    });

    if (!member) {
      throw new NotFoundException(
        `Team member with user ID ${userId} not found in project ${projectId}`,
      );
    }

    // Remove the member
    await this.projectMemberRepo.remove(member);
  }

  /**
   * Get a single team member
   */
  async getMember(projectId: string, userId: string): Promise<ProjectMember> {
    const member = await this.projectMemberRepo.findOne({
      where: { projectId, userId },
      relations: ['user'],
    });

    if (!member) {
      throw new NotFoundException(
        `Team member with user ID ${userId} not found in project ${projectId}`,
      );
    }

    return member;
  }

  /**
   * Check if a user is a member of a project
   */
  async isMember(projectId: string, userId: string): Promise<boolean> {
    const member = await this.projectMemberRepo.findOne({
      where: { projectId, userId },
    });

    return !!member;
  }
}
