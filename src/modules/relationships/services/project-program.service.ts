import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectProgram } from '../entities/project-program.entity';
import { ProjectRelationship } from '../entities/project-relationship.entity';
import { Project } from '../../projects/entities/project.entity';
import { RelationshipType } from '../enums/relationship-type.enum';
import { CreateProgramDto } from '../dto/create-program.dto';
import { UpdateProgramDto } from '../dto/update-program.dto';

@Injectable()
export class ProjectProgramService {
  constructor(
    @InjectRepository(ProjectProgram)
    private readonly programRepository: Repository<ProjectProgram>,
    @InjectRepository(ProjectRelationship)
    private readonly relationshipRepository: Repository<ProjectRelationship>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  /**
   * Create a new program
   */
  async create(data: CreateProgramDto, userId: string): Promise<ProjectProgram> {
    const program = this.programRepository.create({
      ...data,
      createdBy: userId,
      updatedBy: userId,
    });

    return await this.programRepository.save(program);
  }

  /**
   * Find all programs for an organization
   */
  async findAll(organizationId: string): Promise<ProjectProgram[]> {
    return await this.programRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find one program by ID
   */
  async findOne(id: string): Promise<ProjectProgram> {
    const program = await this.programRepository.findOne({
      where: { id },
      relations: ['organization'],
    });

    if (!program) {
      throw new NotFoundException(`Program ${id} not found`);
    }

    return program;
  }

  /**
   * Update a program
   */
  async update(
    id: string,
    data: UpdateProgramDto,
    userId: string,
  ): Promise<ProjectProgram> {
    const program = await this.findOne(id);

    Object.assign(program, {
      ...data,
      updatedBy: userId,
    });

    return await this.programRepository.save(program);
  }

  /**
   * Remove a program
   */
  async remove(id: string): Promise<void> {
    const program = await this.findOne(id);

    // Remove all program relationships
    await this.relationshipRepository.delete({
      sourceProjectId: id,
      relationshipType: RelationshipType.PROGRAM,
    });

    await this.programRepository.remove(program);
  }

  /**
   * Add a project to a program
   */
  async addProject(programId: string, projectId: string): Promise<void> {
    // Validate program exists
    const program = await this.findOne(programId);

    // Validate project exists
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    // Check if project is already in a program
    const existingRelationship = await this.relationshipRepository.findOne({
      where: {
        targetProjectId: projectId,
        relationshipType: RelationshipType.PROGRAM,
        isActive: true,
      },
    });

    if (existingRelationship) {
      throw new BadRequestException(
        `Project ${projectId} is already in a program`,
      );
    }

    // Create program relationship
    const relationship = this.relationshipRepository.create({
      sourceProjectId: programId,
      targetProjectId: projectId,
      relationshipType: RelationshipType.PROGRAM,
      metadata: {
        programName: program.name,
        programType: program.programType,
      },
    });

    await this.relationshipRepository.save(relationship);
  }

  /**
   * Remove a project from a program
   */
  async removeProject(programId: string, projectId: string): Promise<void> {
    const relationship = await this.relationshipRepository.findOne({
      where: {
        sourceProjectId: programId,
        targetProjectId: projectId,
        relationshipType: RelationshipType.PROGRAM,
        isActive: true,
      },
    });

    if (!relationship) {
      throw new NotFoundException(
        `Project ${projectId} is not in program ${programId}`,
      );
    }

    relationship.isActive = false;
    await this.relationshipRepository.save(relationship);
  }

  /**
   * Get all projects in a program
   */
  async getProjects(programId: string): Promise<Project[]> {
    const relationships = await this.relationshipRepository.find({
      where: {
        sourceProjectId: programId,
        relationshipType: RelationshipType.PROGRAM,
        isActive: true,
      },
      relations: ['targetProject'],
    });

    return relationships.map((r) => r.targetProject);
  }
}