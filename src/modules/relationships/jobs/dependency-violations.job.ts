import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectDependency } from '../entities/project-dependency.entity';
import { Project } from '../../projects/entities/project.entity';
import { DependencyType } from '../enums/dependency-type.enum';

interface ViolatedDependency {
  dependency: ProjectDependency;
  violationType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  impactedProject: string;
}

@Injectable()
export class DependencyViolationsJob {
  private readonly logger = new Logger(DependencyViolationsJob.name);

  constructor(
    @InjectRepository(ProjectDependency)
    private readonly dependencyRepository: Repository<ProjectDependency>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  /**
   * Check for dependency violations every hour
   */
  @Cron('0 * * * *')
  async handleViolationCheck(): Promise<void> {
    this.logger.log('Starting dependency violation check');

    try {
      // Get all active dependencies
      const dependencies = await this.dependencyRepository.find({
        where: { status: 'ACTIVE' },
        relations: ['predecessor', 'successor'],
      });

      this.logger.log(`Checking ${dependencies.length} active dependencies`);

      const violations: ViolatedDependency[] = [];

      // Check each dependency for violations
      for (const dependency of dependencies) {
        const dependencyViolations = await this.checkDependencyViolations(dependency);
        violations.push(...dependencyViolations);
      }

      if (violations.length > 0) {
        this.logger.warn(`Found ${violations.length} dependency violations`);
        await this.handleViolations(violations);
      } else {
        this.logger.log('No dependency violations found');
      }

      // Update critical path markings
      await this.updateCriticalPaths();

      // Check for circular dependencies
      await this.checkForCircularDependencies();

    } catch (error) {
      this.logger.error('Dependency violation check failed', (error as Error).stack);
    }
  }

  /**
   * Check for specific dependency violations
   */
  private async checkDependencyViolations(
    dependency: ProjectDependency,
  ): Promise<ViolatedDependency[]> {
    const violations: ViolatedDependency[] = [];

    if (!dependency.predecessor || !dependency.successor) {
      return violations;
    }

    switch (dependency.dependencyType) {
      case DependencyType.FINISH_TO_START:
        violations.push(...this.checkFinishToStartViolation(dependency));
        break;
      case DependencyType.START_TO_START:
        violations.push(...this.checkStartToStartViolation(dependency));
        break;
      case DependencyType.FINISH_TO_FINISH:
        violations.push(...this.checkFinishToFinishViolation(dependency));
        break;
      case DependencyType.START_TO_FINISH:
        violations.push(...this.checkStartToFinishViolation(dependency));
        break;
    }

    // Check for general violations
    if ((dependency.predecessor as any).status === 'CANCELLED') {
      violations.push({
        dependency,
        violationType: 'PREDECESSOR_CANCELLED',
        severity: 'HIGH',
        description: `Predecessor project "${dependency.predecessor.name}" has been cancelled`,
        impactedProject: dependency.successor.name,
      });
    }

    if ((dependency.predecessor as any).status === 'ON_HOLD') {
      violations.push({
        dependency,
        violationType: 'PREDECESSOR_ON_HOLD',
        severity: 'MEDIUM',
        description: `Predecessor project "${dependency.predecessor.name}" is on hold`,
        impactedProject: dependency.successor.name,
      });
    }

    return violations;
  }

  private checkFinishToStartViolation(
    dependency: ProjectDependency,
  ): ViolatedDependency[] {
    const violations: ViolatedDependency[] = [];
    const predecessor = dependency.predecessor;
    const successor = dependency.successor;

    // Check if successor started before predecessor finished
    if (predecessor.endDate && successor.startDate) {
      const predecessorEnd = new Date(predecessor.endDate);
      const successorStart = new Date(successor.startDate);

      // Account for lag days
      const requiredGap = dependency.lagDays * 24 * 60 * 60 * 1000;
      const actualGap = successorStart.getTime() - predecessorEnd.getTime();

      if (actualGap < requiredGap) {
        violations.push({
          dependency,
          violationType: 'FINISH_TO_START_VIOLATED',
          severity: (successor as any).status === 'ACTIVE' ? 'HIGH' : 'MEDIUM',
          description: `Successor started ${Math.abs(Math.ceil(actualGap / (24 * 60 * 60 * 1000)))} days before predecessor completion`,
          impactedProject: successor.name,
        });
      }
    }

    // Check if predecessor is delayed and successor is active
    if ((predecessor as any).status === 'DELAYED' && (successor as any).status === 'ACTIVE') {
      violations.push({
        dependency,
        violationType: 'PREDECESSOR_DELAYED',
        severity: 'HIGH',
        description: `Predecessor "${predecessor.name}" is delayed while successor is active`,
        impactedProject: successor.name,
      });
    }

    return violations;
  }

  private checkStartToStartViolation(
    dependency: ProjectDependency,
  ): ViolatedDependency[] {
    const violations: ViolatedDependency[] = [];
    const predecessor = dependency.predecessor;
    const successor = dependency.successor;

    // Check if successor started before predecessor
    if (predecessor.startDate && successor.startDate) {
      const predecessorStart = new Date(predecessor.startDate);
      const successorStart = new Date(successor.startDate);

      const requiredGap = dependency.lagDays * 24 * 60 * 60 * 1000;
      const actualGap = successorStart.getTime() - predecessorStart.getTime();

      if (actualGap < requiredGap) {
        violations.push({
          dependency,
          violationType: 'START_TO_START_VIOLATED',
          severity: 'MEDIUM',
          description: `Successor started too early relative to predecessor start`,
          impactedProject: successor.name,
        });
      }
    }

    return violations;
  }

  private checkFinishToFinishViolation(
    dependency: ProjectDependency,
  ): ViolatedDependency[] {
    const violations: ViolatedDependency[] = [];
    const predecessor = dependency.predecessor;
    const successor = dependency.successor;

    // Check if successor finished before predecessor
    if (predecessor.endDate && successor.endDate &&
        (successor as any).status === 'COMPLETED' && (predecessor as any).status !== 'COMPLETED') {
      violations.push({
        dependency,
        violationType: 'FINISH_TO_FINISH_VIOLATED',
        severity: 'LOW',
        description: `Successor completed before predecessor`,
        impactedProject: successor.name,
      });
    }

    return violations;
  }

  private checkStartToFinishViolation(
    dependency: ProjectDependency,
  ): ViolatedDependency[] {
    const violations: ViolatedDependency[] = [];
    const predecessor = dependency.predecessor;
    const successor = dependency.successor;

    // Check if successor finished before predecessor started
    if (predecessor.startDate && successor.endDate) {
      const predecessorStart = new Date(predecessor.startDate);
      const successorEnd = new Date(successor.endDate);

      if ((successor as any).status === 'COMPLETED' &&
          successorEnd < predecessorStart) {
        violations.push({
          dependency,
          violationType: 'START_TO_FINISH_VIOLATED',
          severity: 'MEDIUM',
          description: `Successor completed before predecessor started`,
          impactedProject: successor.name,
        });
      }
    }

    return violations;
  }

  /**
   * Handle identified violations
   */
  private async handleViolations(violations: ViolatedDependency[]): Promise<void> {
    // Group violations by severity
    const critical = violations.filter(v => v.severity === 'CRITICAL');
    const high = violations.filter(v => v.severity === 'HIGH');
    const medium = violations.filter(v => v.severity === 'MEDIUM');
    const low = violations.filter(v => v.severity === 'LOW');

    // Log violations by severity
    if (critical.length > 0) {
      this.logger.error(`CRITICAL violations: ${critical.length}`);
      critical.forEach(v => {
        this.logger.error(`  - ${v.description}`);
      });
    }

    if (high.length > 0) {
      this.logger.warn(`HIGH severity violations: ${high.length}`);
      high.forEach(v => {
        this.logger.warn(`  - ${v.description}`);
      });
    }

    if (medium.length > 0) {
      this.logger.log(`MEDIUM severity violations: ${medium.length}`);
    }

    if (low.length > 0) {
      this.logger.debug(`LOW severity violations: ${low.length}`);
    }

    // Update dependency records with violation information
    for (const violation of violations) {
      await this.updateDependencyViolation(violation);
    }

    // Send alerts for critical and high severity violations
    if (critical.length > 0 || high.length > 0) {
      await this.sendViolationAlerts(critical.concat(high));
    }
  }

  /**
   * Update dependency record with violation information
   */
  private async updateDependencyViolation(violation: ViolatedDependency): Promise<void> {
    const dependency = violation.dependency;

    dependency.metadata = {
      ...dependency.metadata,
      lastViolationCheck: new Date(),
      violation: {
        type: violation.violationType,
        severity: violation.severity,
        description: violation.description,
        detectedAt: new Date(),
      },
    };

    // Update impact level based on violation
    if (violation.severity === 'CRITICAL') {
      (dependency as any).impact = 'CRITICAL' as any;
    } else if (violation.severity === 'HIGH' && (dependency as any).impact !== 'CRITICAL') {
      (dependency as any).impact = 'HIGH' as any;
    }

    await this.dependencyRepository.save(dependency);
  }

  /**
   * Send alerts for violations
   */
  private async sendViolationAlerts(violations: ViolatedDependency[]): Promise<void> {
    // This would integrate with notification system
    // For now, just log the alerts
    this.logger.warn(`Sending alerts for ${violations.length} dependency violations`);

    // Group by impacted project
    const byProject = new Map<string, ViolatedDependency[]>();
    for (const violation of violations) {
      const projectName = violation.impactedProject;
      if (!byProject.has(projectName)) {
        byProject.set(projectName, []);
      }
      byProject.get(projectName)!.push(violation);
    }

    // Log alerts by project
    for (const [projectName, projectViolations] of byProject) {
      this.logger.warn(
        `Project "${projectName}" has ${projectViolations.length} dependency violation(s)`,
      );
    }
  }

  /**
   * Update critical paths for all projects
   */
  private async updateCriticalPaths(): Promise<void> {
    try {
      // Get all projects with dependencies
      const query = `
        SELECT DISTINCT project_id
        FROM (
          SELECT predecessor_id as project_id FROM project_dependencies
          UNION
          SELECT successor_id as project_id FROM project_dependencies
        ) as projects_with_deps
      `;

      const results = await this.dependencyRepository.query(query);
      const projectIds = results.map((r: any) => r.project_id);

      this.logger.debug(`Updating critical paths for ${projectIds.length} projects`);

      // Update critical path for each project
      // This would typically use a more sophisticated algorithm
      for (const projectId of projectIds) {
        await this.updateProjectCriticalPath(projectId);
      }
    } catch (error) {
      this.logger.error('Failed to update critical paths', (error as Error).stack);
    }
  }

  private async updateProjectCriticalPath(projectId: string): Promise<void> {
    // Simplified critical path update
    // In reality, this would use CPM (Critical Path Method) algorithm
    const dependencies = await this.dependencyRepository.find({
      where: [
        { predecessorId: projectId },
        { successorId: projectId },
      ],
    });

    for (const dep of dependencies) {
      // Mark as critical if it's a FINISH_TO_START with no slack
      if (dep.dependencyType === DependencyType.FINISH_TO_START && dep.lagDays === 0) {
        dep.isCritical = true;
        await this.dependencyRepository.save(dep);
      }
    }
  }

  /**
   * Check for circular dependencies in the system
   */
  private async checkForCircularDependencies(): Promise<void> {
    const query = `
      WITH RECURSIVE dependency_chain AS (
        SELECT
          predecessor_id,
          successor_id,
          ARRAY[predecessor_id, successor_id] as path,
          false as has_cycle
        FROM project_dependencies
        WHERE status = 'ACTIVE'

        UNION ALL

        SELECT
          pd.predecessor_id,
          pd.successor_id,
          dc.path || pd.successor_id,
          pd.successor_id = ANY(dc.path) as has_cycle
        FROM project_dependencies pd
        JOIN dependency_chain dc ON pd.predecessor_id = dc.successor_id
        WHERE pd.status = 'ACTIVE'
          AND NOT dc.has_cycle
          AND array_length(dc.path, 1) < 20
      )
      SELECT DISTINCT path
      FROM dependency_chain
      WHERE has_cycle = true
    `;

    const results = await this.dependencyRepository.query(query);

    if (results.length > 0) {
      this.logger.error(`Found ${results.length} circular dependency chain(s)`);
      for (const result of results) {
        this.logger.error(`Circular dependency: ${result.path.join(' -> ')}`);
      }
    }
  }
}