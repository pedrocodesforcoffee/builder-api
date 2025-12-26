import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectDependency, DependencyImpact } from '../entities/project-dependency.entity';
import { Project } from '../../projects/entities/project.entity';
import { DependencyType } from '../enums/dependency-type.enum';

@Injectable()
export class DependencyImpactService {
  constructor(
    @InjectRepository(ProjectDependency)
    private readonly dependencyRepository: Repository<ProjectDependency>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  /**
   * Analyze the impact of delays in a project on dependent projects
   */
  async analyzeImpact(projectId: string): Promise<any> {
    // Get project details
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      return null;
    }

    // Get all dependent projects (successors)
    const successorDependencies = await this.dependencyRepository.find({
      where: {
        predecessorId: projectId,
        status: 'ACTIVE',
      },
      relations: ['successor'],
    });

    // Get all predecessor dependencies
    const predecessorDependencies = await this.dependencyRepository.find({
      where: {
        successorId: projectId,
        status: 'ACTIVE',
      },
      relations: ['predecessor'],
    });

    // Analyze impact on each successor
    const successorImpacts = await Promise.all(
      successorDependencies.map((dep: ProjectDependency) => this.analyzeSuccessorImpact(project, dep))
    );

    // Analyze impact from predecessors
    const predecessorImpacts = await Promise.all(
      predecessorDependencies.map((dep: ProjectDependency) => this.analyzePredecessorImpact(project, dep))
    );

    // Calculate overall impact score
    const overallImpact = this.calculateOverallImpact(
      successorImpacts,
      predecessorImpacts,
    );

    // Identify bottlenecks
    const bottlenecks = await this.identifyBottlenecks(projectId);

    return {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        endDate: project.endDate,
        progressPercentage: (project as any).progressPercentage,
      },
      impactAnalysis: {
        directlyImpactedCount: successorDependencies.length,
        totalImpactedCount: await this.countTotalImpactedProjects(projectId),
        criticalImpactCount: successorImpacts.filter((i: any) => i.impact === DependencyImpact.CRITICAL).length,
        overallImpactScore: overallImpact,
      },
      successorImpacts,
      predecessorImpacts,
      bottlenecks,
      recommendations: this.generateRecommendations(overallImpact, bottlenecks),
    };
  }

  /**
   * Get projects that would be impacted by a delay
   */
  async getImpactedProjects(
    projectId: string,
    delayDays: number,
  ): Promise<Project[]> {
    // Use recursive CTE to find all downstream projects
    const query = `
      WITH RECURSIVE impacted_projects AS (
        -- Direct successors
        SELECT
          pd.successor_id as project_id,
          pd.lag_days,
          pd.dependency_type,
          $2::int as delay_days,
          1 as depth
        FROM project_dependencies pd
        WHERE pd.predecessor_id = $1
          AND pd.status = 'ACTIVE'

        UNION

        -- Recursive successors
        SELECT
          pd.successor_id as project_id,
          pd.lag_days,
          pd.dependency_type,
          ip.delay_days + pd.lag_days as delay_days,
          ip.depth + 1 as depth
        FROM project_dependencies pd
        INNER JOIN impacted_projects ip ON pd.predecessor_id = ip.project_id
        WHERE pd.status = 'ACTIVE'
          AND ip.depth < 20 -- Limit recursion
      )
      SELECT DISTINCT p.*, ip.delay_days
      FROM impacted_projects ip
      INNER JOIN projects p ON p.id = ip.project_id
      WHERE ip.delay_days > 0
      ORDER BY ip.delay_days DESC, p.name
    `;

    const projects = await this.projectRepository.query(query, [
      projectId,
      delayDays,
    ]);

    return projects;
  }

  /**
   * Calculate cascading delays through the dependency chain
   */
  async calculateCascadingDelay(
    projectId: string,
    delayDays: number,
  ): Promise<Map<string, number>> {
    const delayMap = new Map<string, number>();
    const visited = new Set<string>();
    const queue: Array<{ projectId: string; delay: number }> = [
      { projectId, delay: delayDays },
    ];

    while (queue.length > 0) {
      const { projectId: currentId, delay } = queue.shift()!;

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      delayMap.set(currentId, delay);

      // Get all successors
      const dependencies = await this.dependencyRepository.find({
        where: {
          predecessorId: currentId,
          status: 'ACTIVE',
        },
      });

      for (const dep of dependencies) {
        const cascadingDelay = this.calculateDependencyDelay(dep, delay);

        if (cascadingDelay > 0) {
          const existingDelay = delayMap.get(dep.successorId) || 0;
          if (cascadingDelay > existingDelay) {
            queue.push({
              projectId: dep.successorId,
              delay: cascadingDelay,
            });
          }
        }
      }
    }

    return delayMap;
  }

  private async analyzeSuccessorImpact(
    project: Project,
    dependency: ProjectDependency,
  ): Promise<any> {
    const successor = dependency.successor;

    // Calculate potential delay based on dependency type
    const potentialDelay = this.calculatePotentialDelay(project, dependency);

    // Determine impact level
    const impact = this.determineImpactLevel(successor, potentialDelay);

    // Calculate cost impact
    const costImpact = this.calculateCostImpact(successor, potentialDelay);

    return {
      projectId: successor.id,
      projectName: successor.name,
      dependencyType: dependency.dependencyType,
      lagDays: dependency.lagDays,
      impact,
      potentialDelay,
      costImpact,
      currentStatus: successor.status,
      criticalPath: dependency.isCritical,
      mitigationOptions: this.generateMitigationOptions(dependency, potentialDelay),
    };
  }

  private async analyzePredecessorImpact(
    project: Project,
    dependency: ProjectDependency,
  ): Promise<any> {
    const predecessor = dependency.predecessor;

    // Check if predecessor delay affects this project
    const predecessorDelay = this.calculatePredecessorDelay(predecessor);

    return {
      projectId: predecessor.id,
      projectName: predecessor.name,
      dependencyType: dependency.dependencyType,
      currentDelay: predecessorDelay,
      impactOnProject: predecessorDelay > 0,
      requiredCompletion: this.calculateRequiredCompletion(project, dependency),
    };
  }

  private calculatePotentialDelay(
    project: Project,
    dependency: ProjectDependency,
  ): number {
    if (!project.endDate) return 0;

    const projectEndDate = new Date(project.endDate);
    const today = new Date();
    const currentDelay = Math.max(
      0,
      Math.ceil((today.getTime() - projectEndDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Add dependency-specific delays based on type
    switch (dependency.dependencyType) {
      case DependencyType.FINISH_TO_START:
        return currentDelay + dependency.lagDays;
      case DependencyType.START_TO_START:
        return Math.max(0, currentDelay - dependency.lagDays);
      case DependencyType.FINISH_TO_FINISH:
        return currentDelay;
      case DependencyType.START_TO_FINISH:
        return Math.max(0, currentDelay + dependency.lagDays);
      default:
        return 0;
    }
  }

  private determineImpactLevel(
    project: Project,
    delayDays: number,
  ): DependencyImpact {
    if (delayDays === 0) return DependencyImpact.NONE;

    // Consider project buffer
    const buffer = (project as any).metadata?.bufferDays || 0;
    const netDelay = delayDays - buffer;

    if (netDelay <= 0) return DependencyImpact.LOW;
    if (netDelay <= 7) return DependencyImpact.MEDIUM;
    if (netDelay <= 14) return DependencyImpact.HIGH;
    return DependencyImpact.CRITICAL;
  }

  private calculateCostImpact(project: Project, delayDays: number): number {
    if (!(project as any).budget || delayDays <= 0) return 0;

    // Assume 1% of budget per day of delay as cost impact
    const dailyCost = (project as any).budget * 0.01;
    return dailyCost * delayDays;
  }

  private calculateDependencyDelay(
    dependency: ProjectDependency,
    predecessorDelay: number,
  ): number {
    switch (dependency.dependencyType) {
      case DependencyType.FINISH_TO_START:
        return predecessorDelay + dependency.lagDays;
      case DependencyType.START_TO_START:
        return Math.max(0, predecessorDelay - dependency.lagDays);
      case DependencyType.FINISH_TO_FINISH:
        return predecessorDelay;
      case DependencyType.START_TO_FINISH:
        return Math.max(0, predecessorDelay + dependency.lagDays);
      default:
        return 0;
    }
  }

  private calculatePredecessorDelay(project: Project): number {
    if (!project.endDate) return 0;

    const endDate = new Date(project.endDate);
    const today = new Date();

    if ((project as any).status === 'COMPLETED') return 0;

    return Math.max(
      0,
      Math.ceil((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
    );
  }

  private calculateRequiredCompletion(
    project: Project,
    dependency: ProjectDependency,
  ): Date | null {
    if (!project.startDate) return null;

    const startDate = new Date(project.startDate);

    switch (dependency.dependencyType) {
      case DependencyType.FINISH_TO_START:
        const requiredDate = new Date(startDate);
        requiredDate.setDate(requiredDate.getDate() - dependency.lagDays);
        return requiredDate;
      default:
        return null;
    }
  }

  private async countTotalImpactedProjects(projectId: string): Promise<number> {
    const query = `
      WITH RECURSIVE impacted AS (
        SELECT successor_id as project_id
        FROM project_dependencies
        WHERE predecessor_id = $1
          AND status = 'ACTIVE'

        UNION

        SELECT pd.successor_id as project_id
        FROM project_dependencies pd
        INNER JOIN impacted i ON pd.predecessor_id = i.project_id
        WHERE pd.status = 'ACTIVE'
      )
      SELECT COUNT(DISTINCT project_id) as count
      FROM impacted
    `;

    const result = await this.dependencyRepository.query(query, [projectId]);
    return parseInt(result[0].count) || 0;
  }

  private async identifyBottlenecks(projectId: string): Promise<any[]> {
    // Find projects that are dependencies for many others
    const query = `
      SELECT
        p.id,
        p.name,
        COUNT(DISTINCT pd.successor_id) as dependent_count,
        AVG(pd.lag_days) as avg_lag,
        SUM(CASE WHEN pd.is_critical THEN 1 ELSE 0 END) as critical_count
      FROM projects p
      INNER JOIN project_dependencies pd ON pd.predecessor_id = p.id
      WHERE pd.status = 'ACTIVE'
        AND (pd.predecessor_id = $1 OR pd.successor_id = $1)
      GROUP BY p.id, p.name
      HAVING COUNT(DISTINCT pd.successor_id) > 2
      ORDER BY dependent_count DESC, critical_count DESC
      LIMIT 5
    `;

    const result = await this.projectRepository.query(query, [projectId]);

    return result.map((r: any) => ({
      projectId: r.id,
      projectName: r.name,
      dependentCount: parseInt(r.dependent_count),
      avgLag: parseFloat(r.avg_lag),
      criticalCount: parseInt(r.critical_count),
      risk: r.critical_count > 0 ? 'HIGH' : 'MEDIUM',
    }));
  }

  private calculateOverallImpact(
    successorImpacts: any[],
    predecessorImpacts: any[],
  ): number {
    let score = 0;

    // Weight successor impacts more heavily
    for (const impact of successorImpacts) {
      switch (impact.impact) {
        case DependencyImpact.CRITICAL:
          score += 25;
          break;
        case DependencyImpact.HIGH:
          score += 15;
          break;
        case DependencyImpact.MEDIUM:
          score += 10;
          break;
        case DependencyImpact.LOW:
          score += 5;
          break;
      }
    }

    // Add predecessor impact
    const delayedPredecessors = predecessorImpacts.filter((p: any) => p.impactOnProject);
    score += delayedPredecessors.length * 10;

    return Math.min(100, score);
  }

  private generateMitigationOptions(
    dependency: ProjectDependency,
    potentialDelay: number,
  ): string[] {
    const options = [];

    if (potentialDelay > 0) {
      options.push('Fast-track critical activities');
      options.push('Allocate additional resources');

      if (dependency.lagDays > 0) {
        options.push(`Reduce lag time (currently ${dependency.lagDays} days)`);
      }

      if (dependency.dependencyType === DependencyType.FINISH_TO_START) {
        options.push('Consider changing to Start-to-Start dependency');
      }

      if (potentialDelay > 7) {
        options.push('Review and adjust project scope');
        options.push('Negotiate deadline extension');
      }
    }

    return options;
  }

  private generateRecommendations(
    overallImpact: number,
    bottlenecks: any[],
  ): string[] {
    const recommendations = [];

    if (overallImpact > 75) {
      recommendations.push('Critical: Immediate action required to prevent cascade failures');
      recommendations.push('Schedule emergency stakeholder meeting');
      recommendations.push('Consider project restructuring');
    } else if (overallImpact > 50) {
      recommendations.push('High Priority: Review and adjust dependent project schedules');
      recommendations.push('Implement risk mitigation strategies');
    } else if (overallImpact > 25) {
      recommendations.push('Monitor closely and prepare contingency plans');
    }

    if (bottlenecks.length > 0) {
      recommendations.push(`Focus on bottleneck projects: ${bottlenecks[0].projectName}`);
      recommendations.push('Consider parallel processing where possible');
    }

    return recommendations;
  }
}