import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectRelationship } from '../entities/project-relationship.entity';
import { Project } from '../../projects/entities/project.entity';
import { RelationshipType } from '../enums/relationship-type.enum';

@Injectable()
export class HierarchyTraversalService {
  constructor(
    @InjectRepository(ProjectRelationship)
    private readonly relationshipRepository: Repository<ProjectRelationship>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  /**
   * Get all ancestor projects (parents, grandparents, etc.)
   */
  async getAncestors(projectId: string): Promise<Project[]> {
    const query = `
      WITH RECURSIVE ancestor_hierarchy AS (
        -- Get direct parent
        SELECT
          pr.source_project_id as project_id,
          1 as depth
        FROM project_relationships pr
        WHERE pr.target_project_id = $1
          AND pr.relationship_type = $2
          AND pr.is_active = true

        UNION

        -- Recursively get ancestors
        SELECT
          pr.source_project_id as project_id,
          ah.depth + 1 as depth
        FROM project_relationships pr
        INNER JOIN ancestor_hierarchy ah ON pr.target_project_id = ah.project_id
        WHERE pr.relationship_type = $2
          AND pr.is_active = true
          AND ah.depth < 20 -- Prevent infinite recursion
      )
      SELECT DISTINCT p.*
      FROM ancestor_hierarchy ah
      INNER JOIN projects p ON p.id = ah.project_id
      ORDER BY p.name
    `;

    const result = await this.projectRepository.query(query, [
      projectId,
      RelationshipType.PARENT_CHILD,
    ]);

    return result;
  }

  /**
   * Get all descendant projects (children, grandchildren, etc.)
   */
  async getDescendants(projectId: string): Promise<Project[]> {
    const query = `
      WITH RECURSIVE descendant_hierarchy AS (
        -- Get direct children
        SELECT
          pr.target_project_id as project_id,
          1 as depth
        FROM project_relationships pr
        WHERE pr.source_project_id = $1
          AND pr.relationship_type = $2
          AND pr.is_active = true

        UNION

        -- Recursively get descendants
        SELECT
          pr.target_project_id as project_id,
          dh.depth + 1 as depth
        FROM project_relationships pr
        INNER JOIN descendant_hierarchy dh ON pr.source_project_id = dh.project_id
        WHERE pr.relationship_type = $2
          AND pr.is_active = true
          AND dh.depth < 20 -- Prevent infinite recursion
      )
      SELECT DISTINCT p.*
      FROM descendant_hierarchy dh
      INNER JOIN projects p ON p.id = dh.project_id
      ORDER BY p.name
    `;

    const result = await this.projectRepository.query(query, [
      projectId,
      RelationshipType.PARENT_CHILD,
    ]);

    return result;
  }

  /**
   * Get sibling projects (projects with the same parent)
   */
  async getSiblings(projectId: string): Promise<Project[]> {
    const query = `
      WITH project_parent AS (
        -- Get the parent of the current project
        SELECT source_project_id as parent_id
        FROM project_relationships
        WHERE target_project_id = $1
          AND relationship_type = $2
          AND is_active = true
        LIMIT 1
      )
      SELECT DISTINCT p.*
      FROM project_relationships pr
      INNER JOIN project_parent pp ON pr.source_project_id = pp.parent_id
      INNER JOIN projects p ON p.id = pr.target_project_id
      WHERE pr.relationship_type = $2
        AND pr.is_active = true
        AND pr.target_project_id != $1
      ORDER BY p.name
    `;

    const result = await this.projectRepository.query(query, [
      projectId,
      RelationshipType.PARENT_CHILD,
    ]);

    return result;
  }

  /**
   * Get the depth of a project in the hierarchy
   */
  async getDepth(projectId: string): Promise<number> {
    const query = `
      WITH RECURSIVE project_depth AS (
        -- Check if project has parent
        SELECT
          pr.source_project_id as parent_id,
          1 as depth
        FROM project_relationships pr
        WHERE pr.target_project_id = $1
          AND pr.relationship_type = $2
          AND pr.is_active = true

        UNION

        -- Recursively get parent's parent
        SELECT
          pr.source_project_id as parent_id,
          pd.depth + 1 as depth
        FROM project_relationships pr
        INNER JOIN project_depth pd ON pr.target_project_id = pd.parent_id
        WHERE pr.relationship_type = $2
          AND pr.is_active = true
          AND pd.depth < 20 -- Prevent infinite recursion
      )
      SELECT COALESCE(MAX(depth), 0) as max_depth
      FROM project_depth
    `;

    const result = await this.relationshipRepository.query(query, [
      projectId,
      RelationshipType.PARENT_CHILD,
    ]);

    return result[0].max_depth;
  }

  /**
   * Get the path from root to project
   */
  async getPath(projectId: string): Promise<string[]> {
    const query = `
      WITH RECURSIVE project_path AS (
        -- Start with the project itself
        SELECT
          $1::uuid as project_id,
          ARRAY[$1::uuid] as path,
          0 as depth

        UNION

        -- Recursively get parents
        SELECT
          pr.source_project_id as project_id,
          pr.source_project_id || pp.path as path,
          pp.depth + 1 as depth
        FROM project_relationships pr
        INNER JOIN project_path pp ON pr.target_project_id = pp.project_id
        WHERE pr.relationship_type = $2
          AND pr.is_active = true
          AND pp.depth < 20 -- Prevent infinite recursion
      )
      SELECT path
      FROM project_path
      ORDER BY depth DESC
      LIMIT 1
    `;

    const result = await this.relationshipRepository.query(query, [
      projectId,
      RelationshipType.PARENT_CHILD,
    ]);

    return result.length > 0 ? result[0].path : [projectId];
  }
}