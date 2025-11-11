import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectDependency } from '../entities/project-dependency.entity';

@Injectable()
export class CircularDependencyValidatorService {
  constructor(
    @InjectRepository(ProjectDependency)
    private readonly dependencyRepository: Repository<ProjectDependency>,
  ) {}

  /**
   * Validate that adding a dependency won't create a circular dependency
   * Uses recursive CTE to check if adding this dependency would create a cycle
   */
  async validateNoCircularDependency(
    predecessorId: string,
    successorId: string,
  ): Promise<boolean> {
    const query = `
      WITH RECURSIVE dependency_path AS (
        -- Start with all dependencies where the successor is the predecessor
        SELECT
          predecessor_id,
          successor_id
        FROM project_dependencies
        WHERE predecessor_id = $1

        UNION

        -- Recursively find all dependencies
        SELECT
          pd.predecessor_id,
          pd.successor_id
        FROM project_dependencies pd
        INNER JOIN dependency_path dp ON pd.predecessor_id = dp.successor_id
      )
      SELECT EXISTS(
        SELECT 1
        FROM dependency_path
        WHERE successor_id = $2
      ) as has_circular
    `;

    const result = await this.dependencyRepository.query(query, [
      successorId,
      predecessorId,
    ]);

    return !result[0].has_circular;
  }

  /**
   * Get all dependencies for a project (both as predecessor and successor)
   */
  async getAllDependencies(projectId: string): Promise<string[]> {
    const query = `
      WITH RECURSIVE all_deps AS (
        -- Direct dependencies where project is predecessor
        SELECT successor_id as related_project_id
        FROM project_dependencies
        WHERE predecessor_id = $1

        UNION

        -- Direct dependencies where project is successor
        SELECT predecessor_id as related_project_id
        FROM project_dependencies
        WHERE successor_id = $1

        UNION

        -- Recursive dependencies through successors
        SELECT pd.successor_id as related_project_id
        FROM project_dependencies pd
        INNER JOIN all_deps ad ON pd.predecessor_id = ad.related_project_id
      )
      SELECT DISTINCT related_project_id
      FROM all_deps
    `;

    const result = await this.dependencyRepository.query(query, [projectId]);
    return result.map((row: any) => row.related_project_id);
  }

  /**
   * Get the dependency path between two projects
   */
  async getDependencyPath(
    fromProject: string,
    toProject: string,
  ): Promise<string[]> {
    const query = `
      WITH RECURSIVE dependency_path AS (
        -- Start with the from project
        SELECT
          predecessor_id,
          successor_id,
          ARRAY[predecessor_id, successor_id] as path,
          1 as depth
        FROM project_dependencies
        WHERE predecessor_id = $1

        UNION

        -- Recursively find path to target
        SELECT
          pd.predecessor_id,
          pd.successor_id,
          dp.path || pd.successor_id,
          dp.depth + 1
        FROM project_dependencies pd
        INNER JOIN dependency_path dp ON pd.predecessor_id = dp.successor_id
        WHERE NOT pd.successor_id = ANY(dp.path) -- Prevent cycles
          AND dp.depth < 20 -- Prevent infinite recursion
      )
      SELECT path
      FROM dependency_path
      WHERE successor_id = $2
      ORDER BY depth
      LIMIT 1
    `;

    const result = await this.dependencyRepository.query(query, [
      fromProject,
      toProject,
    ]);

    return result.length > 0 ? result[0].path : [];
  }
}