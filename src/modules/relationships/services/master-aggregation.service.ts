import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MasterProject } from '../entities/master-project.entity';
import { Project } from '../../projects/entities/project.entity';
import { ProjectRelationship } from '../entities/project-relationship.entity';
import { RelationshipType } from '../enums/relationship-type.enum';

@Injectable()
export class MasterAggregationService {
  constructor(
    @InjectRepository(MasterProject)
    private readonly masterProjectRepository: Repository<MasterProject>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectRelationship)
    private readonly relationshipRepository: Repository<ProjectRelationship>,
  ) {}

  /**
   * Aggregate budget from all sub-projects
   */
  async aggregateBudget(masterProjectId: string): Promise<number> {
    const masterProject = await this.masterProjectRepository.findOne({
      where: { id: masterProjectId },
    });

    if (!masterProject) {
      return 0;
    }

    const query = `
      WITH RECURSIVE project_hierarchy AS (
        -- Start with master project itself
        SELECT
          p.id,
          p.budget
        FROM projects p
        WHERE p.id = $1

        UNION

        -- Get all child projects recursively
        SELECT
          p.id,
          p.budget
        FROM projects p
        INNER JOIN project_relationships pr ON pr.target_project_id = p.id
        INNER JOIN project_hierarchy ph ON pr.source_project_id = ph.id
        WHERE pr.relationship_type = $2
          AND pr.is_active = true
      )
      SELECT SUM(COALESCE(budget, 0)) as total_budget
      FROM project_hierarchy
    `;

    const result = await this.projectRepository.query(query, [
      masterProject.projectId,
      RelationshipType.PARENT_CHILD,
    ]);

    return parseFloat(result[0].total_budget) || 0;
  }

  /**
   * Aggregate cost from all sub-projects
   */
  async aggregateCost(masterProjectId: string): Promise<number> {
    const masterProject = await this.masterProjectRepository.findOne({
      where: { id: masterProjectId },
    });

    if (!masterProject) {
      return 0;
    }

    const query = `
      WITH RECURSIVE project_hierarchy AS (
        -- Start with master project itself
        SELECT
          p.id,
          p.actual_cost
        FROM projects p
        WHERE p.id = $1

        UNION

        -- Get all child projects recursively
        SELECT
          p.id,
          p.actual_cost
        FROM projects p
        INNER JOIN project_relationships pr ON pr.target_project_id = p.id
        INNER JOIN project_hierarchy ph ON pr.source_project_id = ph.id
        WHERE pr.relationship_type = $2
          AND pr.is_active = true
      )
      SELECT SUM(COALESCE(actual_cost, 0)) as total_cost
      FROM project_hierarchy
    `;

    const result = await this.projectRepository.query(query, [
      masterProject.projectId,
      RelationshipType.PARENT_CHILD,
    ]);

    return parseFloat(result[0].total_cost) || 0;
  }

  /**
   * Aggregate progress from all sub-projects
   */
  async aggregateProgress(masterProjectId: string): Promise<number> {
    const masterProject = await this.masterProjectRepository.findOne({
      where: { id: masterProjectId },
    });

    if (!masterProject) {
      return 0;
    }

    const query = `
      WITH RECURSIVE project_hierarchy AS (
        -- Start with master project itself
        SELECT
          p.id,
          p.progress_percentage,
          COALESCE(p.budget, 1) as weight
        FROM projects p
        WHERE p.id = $1

        UNION

        -- Get all child projects recursively
        SELECT
          p.id,
          p.progress_percentage,
          COALESCE(p.budget, 1) as weight
        FROM projects p
        INNER JOIN project_relationships pr ON pr.target_project_id = p.id
        INNER JOIN project_hierarchy ph ON pr.source_project_id = ph.id
        WHERE pr.relationship_type = $2
          AND pr.is_active = true
      )
      SELECT
        SUM(COALESCE(progress_percentage, 0) * weight) / NULLIF(SUM(weight), 0) as weighted_progress
      FROM project_hierarchy
    `;

    const result = await this.projectRepository.query(query, [
      masterProject.projectId,
      RelationshipType.PARENT_CHILD,
    ]);

    return Math.min(100, Math.max(0, parseFloat(result[0].weighted_progress) || 0));
  }

  /**
   * Aggregate schedule information from all sub-projects
   */
  async aggregateSchedule(masterProjectId: string): Promise<any> {
    const masterProject = await this.masterProjectRepository.findOne({
      where: { id: masterProjectId },
    });

    if (!masterProject) {
      return {
        earliestStart: null,
        latestEnd: null,
        duration: 0,
      };
    }

    const query = `
      WITH RECURSIVE project_hierarchy AS (
        -- Start with master project itself
        SELECT
          p.id,
          p.start_date,
          p.end_date,
          p.duration_days
        FROM projects p
        WHERE p.id = $1

        UNION

        -- Get all child projects recursively
        SELECT
          p.id,
          p.start_date,
          p.end_date,
          p.duration_days
        FROM projects p
        INNER JOIN project_relationships pr ON pr.target_project_id = p.id
        INNER JOIN project_hierarchy ph ON pr.source_project_id = ph.id
        WHERE pr.relationship_type = $2
          AND pr.is_active = true
      )
      SELECT
        MIN(start_date) as earliest_start,
        MAX(end_date) as latest_end,
        MAX(duration_days) as max_duration
      FROM project_hierarchy
    `;

    const result = await this.projectRepository.query(query, [
      masterProject.projectId,
      RelationshipType.PARENT_CHILD,
    ]);

    const schedule = result[0];
    const duration = schedule.earliest_start && schedule.latest_end
      ? Math.ceil(
          (new Date(schedule.latest_end).getTime() -
           new Date(schedule.earliest_start).getTime()) /
          (1000 * 60 * 60 * 24)
        )
      : schedule.max_duration || 0;

    return {
      earliestStart: schedule.earliest_start,
      latestEnd: schedule.latest_end,
      duration,
    };
  }

  /**
   * Aggregate all metrics for a master project
   */
  async aggregateAll(masterProjectId: string): Promise<any> {
    const masterProject = await this.masterProjectRepository.findOne({
      where: { id: masterProjectId },
    });

    if (!masterProject) {
      return {
        budget: 0,
        cost: 0,
        progress: 0,
        totalSubProjects: 0,
        activeSubProjects: 0,
        schedule: {
          earliestStart: null,
          latestEnd: null,
          duration: 0,
        },
        metrics: {},
      };
    }

    // Get all sub-projects count
    const subProjectsQuery = `
      WITH RECURSIVE project_hierarchy AS (
        -- Don't include master project itself in counts
        SELECT
          pr.target_project_id as id,
          p.status
        FROM project_relationships pr
        INNER JOIN projects p ON pr.target_project_id = p.id
        WHERE pr.source_project_id = $1
          AND pr.relationship_type = $2
          AND pr.is_active = true

        UNION

        -- Get all descendant projects recursively
        SELECT
          pr.target_project_id as id,
          p.status
        FROM project_relationships pr
        INNER JOIN projects p ON pr.target_project_id = p.id
        INNER JOIN project_hierarchy ph ON pr.source_project_id = ph.id
        WHERE pr.relationship_type = $2
          AND pr.is_active = true
      )
      SELECT
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE status IN ('ACTIVE', 'IN_PROGRESS')) as active_count
      FROM project_hierarchy
    `;

    const countResult = await this.projectRepository.query(subProjectsQuery, [
      masterProject.projectId,
      RelationshipType.PARENT_CHILD,
    ]);

    // Aggregate all metrics in parallel
    const [budget, cost, progress, schedule] = await Promise.all([
      this.aggregateBudget(masterProjectId),
      this.aggregateCost(masterProjectId),
      this.aggregateProgress(masterProjectId),
      this.aggregateSchedule(masterProjectId),
    ]);

    // Calculate additional metrics
    const metrics = {
      budgetVariance: budget - cost,
      costPerformanceIndex: budget > 0 ? cost / budget : 0,
      schedulePerformanceIndex: this.calculateSchedulePerformance(schedule),
      healthScore: this.calculateHealthScore(progress, budget, cost),
    };

    return {
      budget,
      cost,
      progress,
      totalSubProjects: parseInt(countResult[0].total_count) || 0,
      activeSubProjects: parseInt(countResult[0].active_count) || 0,
      schedule,
      metrics,
    };
  }

  private calculateSchedulePerformance(schedule: any): number {
    if (!schedule.earliestStart || !schedule.latestEnd) {
      return 1;
    }

    const now = new Date();
    const start = new Date(schedule.earliestStart);
    const end = new Date(schedule.latestEnd);
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();

    if (elapsed <= 0) return 1;
    if (elapsed >= totalDuration) return 0.5;

    return 1 - (elapsed / totalDuration) * 0.5;
  }

  private calculateHealthScore(
    progress: number,
    budget: number,
    cost: number,
  ): number {
    const progressScore = progress;
    const budgetScore = budget > 0 ? Math.max(0, 100 - (Math.abs(cost - budget) / budget) * 100) : 100;

    return (progressScore + budgetScore) / 2;
  }
}