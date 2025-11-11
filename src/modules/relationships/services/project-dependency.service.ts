import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectDependency } from '../entities/project-dependency.entity';
import { Project } from '../../projects/entities/project.entity';
import { CreateDependencyDto } from '../dto/create-dependency.dto';
import { UpdateDependencyDto } from '../dto/update-dependency.dto';
import { CircularDependencyValidatorService } from './circular-dependency-validator.service';

@Injectable()
export class ProjectDependencyService {
  constructor(
    @InjectRepository(ProjectDependency)
    private readonly dependencyRepository: Repository<ProjectDependency>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly circularValidator: CircularDependencyValidatorService,
  ) {}

  /**
   * Create a new project dependency
   */
  async create(
    predecessorId: string,
    data: CreateDependencyDto,
    userId: string,
  ): Promise<ProjectDependency> {
    // Validate projects exist
    const [predecessor, successor] = await Promise.all([
      this.projectRepository.findOne({ where: { id: predecessorId } }),
      this.projectRepository.findOne({ where: { id: data.successorId } }),
    ]);

    if (!predecessor) {
      throw new NotFoundException(`Predecessor project ${predecessorId} not found`);
    }
    if (!successor) {
      throw new NotFoundException(`Successor project ${data.successorId} not found`);
    }

    // Check for self-dependency
    if (predecessorId === data.successorId) {
      throw new BadRequestException('A project cannot depend on itself');
    }

    // Check if dependency already exists
    const existing = await this.dependencyRepository.findOne({
      where: {
        predecessorId,
        successorId: data.successorId,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Dependency already exists between these projects`,
      );
    }

    // Validate no circular dependencies
    const isValid = await this.circularValidator.validateNoCircularDependency(
      predecessorId,
      data.successorId,
    );

    if (!isValid) {
      throw new BadRequestException(
        'Creating this dependency would result in a circular dependency',
      );
    }

    const dependency = this.dependencyRepository.create({
      predecessorId,
      successorId: data.successorId,
      dependencyType: data.dependencyType,
      lagDays: data.lagDays || 0,
      description: data.description,
      createdBy: userId,
      updatedBy: userId,
    });

    return await this.dependencyRepository.save(dependency);
  }

  /**
   * Find all dependencies for a project
   */
  async findAll(projectId: string): Promise<ProjectDependency[]> {
    return await this.dependencyRepository.find({
      where: [
        { predecessorId: projectId },
        { successorId: projectId },
      ],
      relations: ['predecessor', 'successor'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find one dependency by ID
   */
  async findOne(id: string): Promise<ProjectDependency> {
    const dependency = await this.dependencyRepository.findOne({
      where: { id },
      relations: ['predecessor', 'successor'],
    });

    if (!dependency) {
      throw new NotFoundException(`Dependency ${id} not found`);
    }

    return dependency;
  }

  /**
   * Update a dependency
   */
  async update(
    id: string,
    data: UpdateDependencyDto,
    userId: string,
  ): Promise<ProjectDependency> {
    const dependency = await this.findOne(id);

    // If dependency type is being changed, validate again
    if (data.dependencyType && data.dependencyType !== dependency.dependencyType) {
      const isValid = await this.circularValidator.validateNoCircularDependency(
        dependency.predecessorId,
        dependency.successorId,
      );

      if (!isValid) {
        throw new BadRequestException(
          'Updating this dependency would result in a circular dependency',
        );
      }
    }

    Object.assign(dependency, {
      ...data,
      updatedBy: userId,
    });

    return await this.dependencyRepository.save(dependency);
  }

  /**
   * Remove a dependency
   */
  async remove(id: string): Promise<void> {
    const dependency = await this.findOne(id);
    await this.dependencyRepository.remove(dependency);
  }

  /**
   * Get all predecessors for a project
   */
  async getPredecessors(projectId: string): Promise<Project[]> {
    const dependencies = await this.dependencyRepository.find({
      where: {
        successorId: projectId,
        status: 'ACTIVE',
      },
      relations: ['predecessor'],
    });

    return dependencies.map(d => d.predecessor);
  }

  /**
   * Get all successors for a project
   */
  async getSuccessors(projectId: string): Promise<Project[]> {
    const dependencies = await this.dependencyRepository.find({
      where: {
        predecessorId: projectId,
        status: 'ACTIVE',
      },
      relations: ['successor'],
    });

    return dependencies.map(d => d.successor);
  }

  /**
   * Get critical path for a project
   */
  async getCriticalPath(projectId: string): Promise<Project[]> {
    // Get all dependencies starting from this project
    const query = `
      WITH RECURSIVE critical_path AS (
        -- Start with the given project
        SELECT
          pd.predecessor_id,
          pd.successor_id,
          pd.lag_days,
          p1.duration_days as predecessor_duration,
          p2.duration_days as successor_duration,
          p1.start_date as predecessor_start,
          p2.start_date as successor_start,
          ARRAY[pd.predecessor_id, pd.successor_id] as path,
          pd.is_critical
        FROM project_dependencies pd
        JOIN projects p1 ON pd.predecessor_id = p1.id
        JOIN projects p2 ON pd.successor_id = p2.id
        WHERE pd.predecessor_id = $1
          AND pd.is_critical = true
          AND pd.status = 'ACTIVE'

        UNION

        -- Recursively find critical dependencies
        SELECT
          pd.predecessor_id,
          pd.successor_id,
          pd.lag_days,
          p1.duration_days as predecessor_duration,
          p2.duration_days as successor_duration,
          p1.start_date as predecessor_start,
          p2.start_date as successor_start,
          cp.path || pd.successor_id,
          pd.is_critical
        FROM project_dependencies pd
        JOIN projects p1 ON pd.predecessor_id = p1.id
        JOIN projects p2 ON pd.successor_id = p2.id
        JOIN critical_path cp ON pd.predecessor_id = cp.successor_id
        WHERE pd.is_critical = true
          AND pd.status = 'ACTIVE'
          AND NOT pd.successor_id = ANY(cp.path) -- Prevent cycles
      )
      SELECT DISTINCT p.*
      FROM critical_path cp
      JOIN projects p ON p.id = ANY(cp.path)
      ORDER BY p.start_date
    `;

    const projects = await this.projectRepository.query(query, [projectId]);
    return projects;
  }

  /**
   * Validate a potential dependency
   */
  async validateDependency(
    predecessorId: string,
    successorId: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    // Check if projects exist
    const [predecessor, successor] = await Promise.all([
      this.projectRepository.findOne({ where: { id: predecessorId } }),
      this.projectRepository.findOne({ where: { id: successorId } }),
    ]);

    if (!predecessor) {
      return { valid: false, reason: 'Predecessor project not found' };
    }
    if (!successor) {
      return { valid: false, reason: 'Successor project not found' };
    }

    // Check for self-dependency
    if (predecessorId === successorId) {
      return { valid: false, reason: 'A project cannot depend on itself' };
    }

    // Check if dependency already exists
    const existing = await this.dependencyRepository.findOne({
      where: {
        predecessorId,
        successorId,
      },
    });

    if (existing) {
      return { valid: false, reason: 'Dependency already exists' };
    }

    // Check for circular dependency
    const isValid = await this.circularValidator.validateNoCircularDependency(
      predecessorId,
      successorId,
    );

    if (!isValid) {
      return { valid: false, reason: 'Would create circular dependency' };
    }

    return { valid: true };
  }

  /**
   * Mark dependencies on critical path
   */
  async updateCriticalPath(projectId: string): Promise<void> {
    // Reset all dependencies for this project
    await this.dependencyRepository.update(
      { predecessorId: projectId },
      { isCritical: false }
    );
    await this.dependencyRepository.update(
      { successorId: projectId },
      { isCritical: false }
    );

    // Calculate critical path using CPM algorithm
    const criticalDependencies = await this.calculateCriticalDependencies(projectId);

    // Mark critical dependencies
    for (const depId of criticalDependencies) {
      await this.dependencyRepository.update(depId, { isCritical: true });
    }
  }

  private async calculateCriticalDependencies(projectId: string): Promise<string[]> {
    // This would implement the Critical Path Method (CPM) algorithm
    // For now, returning a simplified version
    const dependencies = await this.dependencyRepository.find({
      where: [
        { predecessorId: projectId },
        { successorId: projectId },
      ],
    });

    // Mark dependencies with FINISH_TO_START type as critical
    return dependencies
      .filter(d => d.dependencyType === 'FINISH_TO_START')
      .map(d => d.id);
  }
}