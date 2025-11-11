import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectProgram } from '../entities/project-program.entity';
import { ProjectRelationship } from '../entities/project-relationship.entity';
import { Project } from '../../projects/entities/project.entity';
import { ProjectDependency } from '../entities/project-dependency.entity';
import { RelationshipType } from '../enums/relationship-type.enum';

@Injectable()
export class ProgramTimelineService {
  constructor(
    @InjectRepository(ProjectProgram)
    private readonly programRepository: Repository<ProjectProgram>,
    @InjectRepository(ProjectRelationship)
    private readonly relationshipRepository: Repository<ProjectRelationship>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectDependency)
    private readonly dependencyRepository: Repository<ProjectDependency>,
  ) {}

  /**
   * Calculate the overall timeline for a program
   */
  async calculateProgramTimeline(programId: string): Promise<any> {
    // Get all projects in the program
    const relationships = await this.relationshipRepository.find({
      where: {
        sourceProjectId: programId,
        relationshipType: RelationshipType.PROGRAM,
        isActive: true,
      },
      relations: ['targetProject'],
    });

    const projects = relationships.map((r) => r.targetProject);

    if (projects.length === 0) {
      return {
        earliestStart: null,
        latestEnd: null,
        duration: 0,
        criticalPath: [],
        milestones: [],
      };
    }

    // Calculate earliest start and latest end
    const timelineBounds = this.calculateTimelineBounds(projects);

    // Calculate critical path across all projects
    const criticalPath = await this.calculateCriticalPath(
      projects.map(p => p.id),
    );

    // Identify key milestones
    const milestones = await this.identifyMilestones(projects);

    return {
      earliestStart: timelineBounds.earliestStart,
      latestEnd: timelineBounds.latestEnd,
      duration: timelineBounds.duration,
      criticalPath,
      milestones,
      ganttData: this.generateGanttData(projects),
    };
  }

  /**
   * Get the critical path for a program
   */
  async getCriticalPath(programId: string): Promise<Project[]> {
    const relationships = await this.relationshipRepository.find({
      where: {
        sourceProjectId: programId,
        relationshipType: RelationshipType.PROGRAM,
        isActive: true,
      },
    });

    const projectIds = relationships.map((r) => r.targetProjectId);

    if (projectIds.length === 0) {
      return [];
    }

    // Find all dependencies between projects in the program
    const dependencies = await this.dependencyRepository.find({
      where: [
        { predecessorId: projectIds as any, isCritical: true },
        { successorId: projectIds as any, isCritical: true },
      ],
      relations: ['predecessor', 'successor'],
    });

    // Build dependency graph
    const graph = this.buildDependencyGraph(dependencies);

    // Find longest path (critical path)
    const criticalProjectIds = this.findLongestPath(graph, projectIds);

    // Return projects in critical path order
    return await this.projectRepository.findByIds(criticalProjectIds);
  }

  private calculateTimelineBounds(projects: Project[]): any {
    let earliestStart = null;
    let latestEnd = null;

    for (const project of projects) {
      if (project.startDate) {
        if (!earliestStart || new Date(project.startDate) < new Date(earliestStart)) {
          earliestStart = project.startDate;
        }
      }

      if (project.endDate) {
        if (!latestEnd || new Date(project.endDate) > new Date(latestEnd)) {
          latestEnd = project.endDate;
        }
      }
    }

    const duration = earliestStart && latestEnd
      ? Math.ceil(
          (new Date(latestEnd).getTime() - new Date(earliestStart).getTime()) /
          (1000 * 60 * 60 * 24)
        )
      : 0;

    return { earliestStart, latestEnd, duration };
  }

  private async calculateCriticalPath(projectIds: string[]): Promise<any[]> {
    // Get all dependencies for these projects
    const query = `
      WITH project_deps AS (
        SELECT
          pd.*,
          p1.name as predecessor_name,
          p1.start_date as predecessor_start,
          p1.end_date as predecessor_end,
          p1.duration_days as predecessor_duration,
          p2.name as successor_name,
          p2.start_date as successor_start,
          p2.end_date as successor_end,
          p2.duration_days as successor_duration
        FROM project_dependencies pd
        JOIN projects p1 ON pd.predecessor_id = p1.id
        JOIN projects p2 ON pd.successor_id = p2.id
        WHERE pd.predecessor_id = ANY($1::uuid[])
          AND pd.successor_id = ANY($1::uuid[])
          AND pd.is_critical = true
      )
      SELECT * FROM project_deps
      ORDER BY predecessor_start, successor_start
    `;

    const dependencies = await this.dependencyRepository.query(query, [projectIds]);

    // Build critical path from dependencies
    const path = [];
    const visited = new Set();

    for (const dep of dependencies) {
      if (!visited.has(dep.predecessor_id)) {
        path.push({
          projectId: dep.predecessor_id,
          name: dep.predecessor_name,
          startDate: dep.predecessor_start,
          endDate: dep.predecessor_end,
          duration: dep.predecessor_duration,
          type: 'predecessor',
        });
        visited.add(dep.predecessor_id);
      }

      if (!visited.has(dep.successor_id)) {
        path.push({
          projectId: dep.successor_id,
          name: dep.successor_name,
          startDate: dep.successor_start,
          endDate: dep.successor_end,
          duration: dep.successor_duration,
          type: 'successor',
          lagDays: dep.lag_days,
        });
        visited.add(dep.successor_id);
      }
    }

    return path;
  }

  private async identifyMilestones(projects: Project[]): Promise<any[]> {
    const milestones = [];

    for (const project of projects) {
      // Add project start as milestone if it's significant
      if (project.startDate) {
        milestones.push({
          date: project.startDate,
          name: `${project.name} - Start`,
          projectId: project.id,
          type: 'START',
        });
      }

      // Add project end as milestone
      if (project.endDate) {
        milestones.push({
          date: project.endDate,
          name: `${project.name} - Complete`,
          projectId: project.id,
          type: 'END',
        });
      }

      // Add any custom milestones from project metadata
      if ((project as any).metadata && (project as any).metadata.milestones) {
        for (const milestone of (project as any).metadata.milestones) {
          milestones.push({
            ...milestone,
            projectId: project.id,
            type: 'CUSTOM',
          });
        }
      }
    }

    // Sort milestones by date
    milestones.sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return milestones;
  }

  private generateGanttData(projects: Project[]): any[] {
    return projects.map(project => ({
      id: project.id,
      name: project.name,
      startDate: project.startDate,
      endDate: project.endDate,
      progress: (project as any).progressPercentage || 0,
      status: (project as any).status,
      dependencies: [], // Would be populated from dependency data
    }));
  }

  private buildDependencyGraph(dependencies: ProjectDependency[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const dep of dependencies) {
      if (!graph.has(dep.predecessorId)) {
        graph.set(dep.predecessorId, []);
      }
      const node = graph.get(dep.predecessorId);
      if (node) {
        node.push(dep.successorId);
      }
    }

    return graph;
  }

  private findLongestPath(
    graph: Map<string, string[]>,
    projectIds: string[],
  ): string[] {
    const visited = new Set<string>();
    const path = [];
    let maxLength = 0;
    let longestPath: string[] = [];

    // DFS to find longest path
    const dfs = (node: string, currentPath: string[]) => {
      visited.add(node);
      currentPath.push(node);

      if (currentPath.length > maxLength) {
        maxLength = currentPath.length;
        longestPath = [...currentPath];
      }

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, currentPath);
        }
      }

      currentPath.pop();
      visited.delete(node);
    };

    // Try starting from each project
    for (const projectId of projectIds) {
      if (!visited.has(projectId)) {
        dfs(projectId, []);
      }
    }

    return longestPath;
  }
}