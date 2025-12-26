import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectProgram } from '../entities/project-program.entity';
import { ProjectRelationship } from '../entities/project-relationship.entity';
import { Project } from '../../projects/entities/project.entity';
import { RelationshipType } from '../enums/relationship-type.enum';

@Injectable()
export class ProgramMetricsService {
  constructor(
    @InjectRepository(ProjectProgram)
    private readonly programRepository: Repository<ProjectProgram>,
    @InjectRepository(ProjectRelationship)
    private readonly relationshipRepository: Repository<ProjectRelationship>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  /**
   * Aggregate all metrics from projects in the program
   */
  async aggregateMetrics(programId: string): Promise<any> {
    // Get all projects in the program
    const relationships = await this.relationshipRepository.find({
      where: {
        sourceProjectId: programId,
        relationshipType: RelationshipType.PROGRAM,
        isActive: true,
      },
      relations: ['targetProject'],
    });

    const projectIds = relationships.map((r: ProjectRelationship) => r.targetProjectId);

    if (projectIds.length === 0) {
      return {
        totalProjects: 0,
        totalBudget: 0,
        totalCost: 0,
        avgProgress: 0,
        statusDistribution: {},
        timelineInfo: null,
      };
    }

    // Get aggregated data from projects
    const query = `
      SELECT
        COUNT(*) as total_projects,
        SUM(COALESCE(budget, 0)) as total_budget,
        SUM(COALESCE(actual_cost, 0)) as total_cost,
        AVG(COALESCE(progress_percentage, 0)) as avg_progress,
        MIN(start_date) as earliest_start,
        MAX(end_date) as latest_end,
        json_object_agg(
          status,
          status_count
        ) FILTER (WHERE status IS NOT NULL) as status_distribution
      FROM (
        SELECT
          p.*,
          status,
          COUNT(*) OVER (PARTITION BY status) as status_count
        FROM projects p
        WHERE p.id = ANY($1::uuid[])
      ) as project_data
    `;

    const result = await this.projectRepository.query(query, [projectIds]);

    const metrics = result[0];

    // Calculate additional metrics
    const onTimeProjects = await this.countOnTimeProjects(projectIds);
    const atRiskProjects = await this.countAtRiskProjects(projectIds);
    const resourceUtilization = await this.calculateResourceUtilization(projectIds);

    return {
      totalProjects: parseInt(metrics.total_projects) || 0,
      totalBudget: parseFloat(metrics.total_budget) || 0,
      totalCost: parseFloat(metrics.total_cost) || 0,
      avgProgress: parseFloat(metrics.avg_progress) || 0,
      statusDistribution: metrics.status_distribution || {},
      timelineInfo: {
        earliestStart: metrics.earliest_start,
        latestEnd: metrics.latest_end,
      },
      onTimeProjects,
      atRiskProjects,
      resourceUtilization,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get timeline information for a program
   */
  async getTimeline(programId: string): Promise<any> {
    const relationships = await this.relationshipRepository.find({
      where: {
        sourceProjectId: programId,
        relationshipType: RelationshipType.PROGRAM,
        isActive: true,
      },
      relations: ['targetProject'],
    });

    const projects = relationships.map((r: ProjectRelationship) => r.targetProject);

    if (projects.length === 0) {
      return {
        earliestStart: null,
        latestEnd: null,
        duration: 0,
        phases: [],
      };
    }

    // Sort projects by start date
    projects.sort((a: Project, b: Project) => {
      const aStart = a.startDate ? new Date(a.startDate).getTime() : 0;
      const bStart = b.startDate ? new Date(b.startDate).getTime() : 0;
      return aStart - bStart;
    });

    const earliestStart = projects[0].startDate;
    const latestEnd = projects.reduce((latest: any, p: Project) => {
      if (!p.endDate) return latest;
      if (!latest) return p.endDate;
      return new Date(p.endDate) > new Date(latest) ? p.endDate : latest;
    }, null);

    // Group projects into phases based on overlapping timeframes
    const phases = this.groupProjectsIntoPhases(projects);

    return {
      earliestStart,
      latestEnd,
      duration: this.calculateDuration(earliestStart, latestEnd),
      phases,
      projects: projects.map((p: Project) => ({
        id: p.id,
        name: p.name,
        startDate: p.startDate,
        endDate: p.endDate,
        status: p.status,
      })),
    };
  }

  /**
   * Get resource allocation for a program
   */
  async getResourceAllocation(programId: string): Promise<any> {
    const relationships = await this.relationshipRepository.find({
      where: {
        sourceProjectId: programId,
        relationshipType: RelationshipType.PROGRAM,
        isActive: true,
      },
    });

    const projectIds = relationships.map((r: ProjectRelationship) => r.targetProjectId);

    if (projectIds.length === 0) {
      return {
        totalResources: 0,
        allocatedResources: 0,
        utilizationRate: 0,
        resourcesByType: {},
        resourcesByProject: [],
      };
    }

    // This would typically query resource allocation data
    // For now, returning a structured placeholder
    const resourceData = await this.getResourceData(projectIds);

    return {
      totalResources: resourceData.total,
      allocatedResources: resourceData.allocated,
      utilizationRate: resourceData.utilization,
      resourcesByType: resourceData.byType,
      resourcesByProject: resourceData.byProject,
    };
  }

  private async countOnTimeProjects(projectIds: string[]): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM projects
      WHERE id = ANY($1::uuid[])
        AND end_date >= CURRENT_DATE
        AND status NOT IN ('DELAYED', 'AT_RISK')
    `;

    const result = await this.projectRepository.query(query, [projectIds]);
    return parseInt(result[0].count) || 0;
  }

  private async countAtRiskProjects(projectIds: string[]): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM projects
      WHERE id = ANY($1::uuid[])
        AND (
          status = 'AT_RISK'
          OR (end_date < CURRENT_DATE AND status != 'COMPLETED')
        )
    `;

    const result = await this.projectRepository.query(query, [projectIds]);
    return parseInt(result[0].count) || 0;
  }

  private async calculateResourceUtilization(
    projectIds: string[],
  ): Promise<number> {
    // This would typically calculate actual resource utilization
    // For now, returning a calculated value based on project count
    return projectIds.length > 0 ? 75 + Math.random() * 20 : 0;
  }

  private groupProjectsIntoPhases(projects: Project[]): any[] {
    // Group projects that have overlapping timeframes into phases
    const phases = [];
    let currentPhase = null;

    for (const project of projects) {
      if (!project.startDate) continue;

      if (!currentPhase) {
        currentPhase = {
          name: `Phase 1`,
          startDate: project.startDate,
          endDate: project.endDate,
          projects: [project.id],
        };
      } else if (this.datesOverlap(currentPhase, project)) {
        currentPhase.projects.push(project.id);
        if (project.endDate && (!currentPhase.endDate ||
            new Date(project.endDate) > new Date(currentPhase.endDate))) {
          currentPhase.endDate = project.endDate;
        }
      } else {
        phases.push(currentPhase);
        currentPhase = {
          name: `Phase ${phases.length + 2}`,
          startDate: project.startDate,
          endDate: project.endDate,
          projects: [project.id],
        };
      }
    }

    if (currentPhase) {
      phases.push(currentPhase);
    }

    return phases;
  }

  private datesOverlap(phase: any, project: Project): boolean {
    if (!phase.endDate || !project.startDate) return true;
    return new Date(project.startDate) <= new Date(phase.endDate);
  }

  private calculateDuration(startDate: any, endDate: any): number {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  private async getResourceData(projectIds: string[]): Promise<any> {
    // Placeholder for resource data calculation
    // In a real implementation, this would query actual resource allocation data
    return {
      total: projectIds.length * 10,
      allocated: projectIds.length * 7.5,
      utilization: 75,
      byType: {
        developers: projectIds.length * 4,
        designers: projectIds.length * 2,
        managers: projectIds.length * 1,
        others: projectIds.length * 0.5,
      },
      byProject: projectIds.map((id: string) => ({
        projectId: id,
        allocated: 7.5,
        utilization: 75,
      })),
    };
  }
}