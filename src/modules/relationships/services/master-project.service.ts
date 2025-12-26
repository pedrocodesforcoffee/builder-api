import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MasterProject } from '../entities/master-project.entity';
import { Project } from '../../projects/entities/project.entity';
import { ProjectRelationship } from '../entities/project-relationship.entity';
import { RelationshipType } from '../enums/relationship-type.enum';
import { MasterAggregationService } from './master-aggregation.service';

@Injectable()
export class MasterProjectService {
  constructor(
    @InjectRepository(MasterProject)
    private readonly masterProjectRepository: Repository<MasterProject>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectRelationship)
    private readonly relationshipRepository: Repository<ProjectRelationship>,
    private readonly masterAggregationService: MasterAggregationService,
  ) {}

  /**
   * Create a new master project
   */
  async create(projectId: string, userId: string): Promise<MasterProject> {
    // Validate project exists
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    // Check if already a master project
    const existing = await this.masterProjectRepository.findOne({
      where: { projectId },
    });

    if (existing) {
      throw new ConflictException(
        `Project ${projectId} is already a master project`,
      );
    }

    // Create master project
    const masterProject = this.masterProjectRepository.create({
      projectId,
      totalSubProjects: 0,
      activeSubProjects: 0,
      aggregatedMetrics: {},
    });

    const saved = await this.masterProjectRepository.save(masterProject);

    // Create master relationship
    await this.relationshipRepository.save({
      sourceProjectId: projectId,
      targetProjectId: projectId,
      relationshipType: RelationshipType.MASTER,
      createdBy: userId,
      metadata: { masterProjectId: saved.id },
    });

    // Initial aggregation
    await this.refreshAggregation(saved.id);

    return saved;
  }

  /**
   * Find one master project
   */
  async findOne(id: string): Promise<MasterProject> {
    const masterProject = await this.masterProjectRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!masterProject) {
      throw new NotFoundException(`Master project ${id} not found`);
    }

    return masterProject;
  }

  /**
   * Find master project by project ID
   */
  async findByProject(projectId: string): Promise<MasterProject | null> {
    return await this.masterProjectRepository.findOne({
      where: { projectId },
      relations: ['project'],
    });
  }

  /**
   * Remove a master project
   */
  async remove(id: string): Promise<void> {
    const masterProject = await this.findOne(id);

    // Remove master relationship
    await this.relationshipRepository.delete({
      sourceProjectId: masterProject.projectId,
      relationshipType: RelationshipType.MASTER,
    });

    // Remove all parent-child relationships where this is the parent
    await this.relationshipRepository.update(
      {
        sourceProjectId: masterProject.projectId,
        relationshipType: RelationshipType.PARENT_CHILD,
      },
      { isActive: false }
    );

    await this.masterProjectRepository.remove(masterProject);
  }

  /**
   * Refresh aggregation for a master project
   */
  async refreshAggregation(masterProjectId: string): Promise<MasterProject> {
    const masterProject = await this.findOne(masterProjectId);

    // Get all aggregated data
    const aggregation = await this.masterAggregationService.aggregateAll(
      masterProjectId,
    );

    // Update master project
    masterProject.aggregatedBudget = aggregation.budget;
    masterProject.aggregatedCost = aggregation.cost;
    masterProject.aggregatedProgress = aggregation.progress;
    masterProject.totalSubProjects = aggregation.totalSubProjects;
    masterProject.activeSubProjects = aggregation.activeSubProjects;
    masterProject.earliestStart = aggregation.schedule.earliestStart;
    masterProject.latestEnd = aggregation.schedule.latestEnd;
    masterProject.aggregatedMetrics = aggregation.metrics;
    masterProject.lastAggregatedAt = new Date();

    return await this.masterProjectRepository.save(masterProject);
  }

  /**
   * Get all sub-projects for a master project
   */
  async getSubProjects(masterProjectId: string): Promise<Project[]> {
    const masterProject = await this.findOne(masterProjectId);

    // Get all child projects
    const relationships = await this.relationshipRepository.find({
      where: {
        sourceProjectId: masterProject.projectId,
        relationshipType: RelationshipType.PARENT_CHILD,
        isActive: true,
      },
      relations: ['targetProject'],
    });

    return relationships.map((r) => r.targetProject);
  }

  /**
   * Add a sub-project to a master project
   */
  async addSubProject(
    masterProjectId: string,
    subProjectId: string,
    userId: string,
  ): Promise<void> {
    const masterProject = await this.findOne(masterProjectId);

    // Validate sub-project exists
    const subProject = await this.projectRepository.findOne({
      where: { id: subProjectId },
    });

    if (!subProject) {
      throw new NotFoundException(`Sub-project ${subProjectId} not found`);
    }

    // Check if already has a parent
    const existingParent = await this.relationshipRepository.findOne({
      where: {
        targetProjectId: subProjectId,
        relationshipType: RelationshipType.PARENT_CHILD,
        isActive: true,
      },
    });

    if (existingParent) {
      throw new ConflictException(
        `Project ${subProjectId} already has a parent`,
      );
    }

    // Create parent-child relationship
    await this.relationshipRepository.save({
      sourceProjectId: masterProject.projectId,
      targetProjectId: subProjectId,
      relationshipType: RelationshipType.PARENT_CHILD,
      createdBy: userId,
    });

    // Refresh aggregation
    await this.refreshAggregation(masterProjectId);
  }

  /**
   * Remove a sub-project from a master project
   */
  async removeSubProject(
    masterProjectId: string,
    subProjectId: string,
  ): Promise<void> {
    const masterProject = await this.findOne(masterProjectId);

    const relationship = await this.relationshipRepository.findOne({
      where: {
        sourceProjectId: masterProject.projectId,
        targetProjectId: subProjectId,
        relationshipType: RelationshipType.PARENT_CHILD,
        isActive: true,
      },
    });

    if (!relationship) {
      throw new NotFoundException(
        `Sub-project ${subProjectId} not found in master project`,
      );
    }

    relationship.isActive = false;
    await this.relationshipRepository.save(relationship);

    // Refresh aggregation
    await this.refreshAggregation(masterProjectId);
  }
}