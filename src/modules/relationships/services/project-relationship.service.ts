import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectRelationship } from '../entities/project-relationship.entity';
import { Project } from '../../projects/entities/project.entity';
import { RelationshipType } from '../enums/relationship-type.enum';
import { HierarchyTraversalService } from './hierarchy-traversal.service';

@Injectable()
export class ProjectRelationshipService {
  constructor(
    @InjectRepository(ProjectRelationship)
    private readonly relationshipRepository: Repository<ProjectRelationship>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly hierarchyTraversalService: HierarchyTraversalService,
  ) {}

  /**
   * Create a new project relationship
   */
  async create(
    sourceId: string,
    targetId: string,
    type: RelationshipType,
    userId: string,
    metadata?: Record<string, any>,
  ): Promise<ProjectRelationship> {
    // Validate projects exist
    const [source, target] = await Promise.all([
      this.projectRepository.findOne({ where: { id: sourceId } }),
      this.projectRepository.findOne({ where: { id: targetId } }),
    ]);

    if (!source) {
      throw new NotFoundException(`Source project ${sourceId} not found`);
    }
    if (!target) {
      throw new NotFoundException(`Target project ${targetId} not found`);
    }

    // Check if relationship already exists
    const existing = await this.relationshipRepository.findOne({
      where: {
        sourceProjectId: sourceId,
        targetProjectId: targetId,
        relationshipType: type,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Relationship already exists between these projects`,
      );
    }

    // Additional validation for parent-child relationships
    if (type === RelationshipType.PARENT_CHILD) {
      // Check if target already has a parent
      const existingParent = await this.relationshipRepository.findOne({
        where: {
          targetProjectId: targetId,
          relationshipType: RelationshipType.PARENT_CHILD,
          isActive: true,
        },
      });

      if (existingParent) {
        throw new ConflictException(
          `Project ${targetId} already has a parent`,
        );
      }

      // Check for circular dependency
      const ancestors = await this.hierarchyTraversalService.getAncestors(
        sourceId,
      );
      if (ancestors.some((a) => a.id === targetId)) {
        throw new BadRequestException(
          `Cannot create parent-child relationship: would create circular dependency`,
        );
      }
    }

    const relationship = this.relationshipRepository.create({
      sourceProjectId: sourceId,
      targetProjectId: targetId,
      relationshipType: type,
      createdBy: userId,
      metadata: metadata || {},
    });

    return await this.relationshipRepository.save(relationship);
  }

  /**
   * Find all relationships for a project
   */
  async findByProject(projectId: string): Promise<ProjectRelationship[]> {
    return await this.relationshipRepository.find({
      where: [
        { sourceProjectId: projectId, isActive: true },
        { targetProjectId: projectId, isActive: true },
      ],
      relations: ['sourceProject', 'targetProject'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find relationships by type
   */
  async findByType(
    projectId: string,
    type: RelationshipType,
  ): Promise<ProjectRelationship[]> {
    return await this.relationshipRepository.find({
      where: [
        { sourceProjectId: projectId, relationshipType: type, isActive: true },
        { targetProjectId: projectId, relationshipType: type, isActive: true },
      ],
      relations: ['sourceProject', 'targetProject'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Remove a relationship
   */
  async remove(id: string): Promise<void> {
    const relationship = await this.relationshipRepository.findOne({
      where: { id },
    });

    if (!relationship) {
      throw new NotFoundException(`Relationship ${id} not found`);
    }

    await this.relationshipRepository.remove(relationship);
  }

  /**
   * Set a project's parent
   */
  async setParent(
    projectId: string,
    parentId: string,
    userId: string,
  ): Promise<ProjectRelationship> {
    // Remove existing parent if any
    const existingParent = await this.relationshipRepository.findOne({
      where: {
        targetProjectId: projectId,
        relationshipType: RelationshipType.PARENT_CHILD,
        isActive: true,
      },
    });

    if (existingParent) {
      existingParent.isActive = false;
      await this.relationshipRepository.save(existingParent);
    }

    return await this.create(
      parentId,
      projectId,
      RelationshipType.PARENT_CHILD,
      userId,
    );
  }

  /**
   * Get a project's parent
   */
  async getParent(projectId: string): Promise<Project | null> {
    const relationship = await this.relationshipRepository.findOne({
      where: {
        targetProjectId: projectId,
        relationshipType: RelationshipType.PARENT_CHILD,
        isActive: true,
      },
      relations: ['sourceProject'],
    });

    return relationship ? relationship.sourceProject : null;
  }

  /**
   * Get a project's children
   */
  async getChildren(projectId: string): Promise<Project[]> {
    const relationships = await this.relationshipRepository.find({
      where: {
        sourceProjectId: projectId,
        relationshipType: RelationshipType.PARENT_CHILD,
        isActive: true,
      },
      relations: ['targetProject'],
    });

    return relationships.map((r) => r.targetProject);
  }

  /**
   * Get all ancestors (delegate to HierarchyTraversalService)
   */
  async getAncestors(projectId: string): Promise<Project[]> {
    return await this.hierarchyTraversalService.getAncestors(projectId);
  }

  /**
   * Get all descendants (delegate to HierarchyTraversalService)
   */
  async getDescendants(projectId: string): Promise<Project[]> {
    return await this.hierarchyTraversalService.getDescendants(projectId);
  }
}