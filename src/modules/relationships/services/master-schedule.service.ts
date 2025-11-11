import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MasterProject } from '../entities/master-project.entity';
import { Project } from '../../projects/entities/project.entity';
import { ProjectRelationship } from '../entities/project-relationship.entity';
import { ProjectDependency } from '../entities/project-dependency.entity';
import { RelationshipType } from '../enums/relationship-type.enum';

// Interfaces for network structures
interface NetworkNode {
  id: string;
  name: string;
  duration: number;
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  slack: number;
}

interface NetworkEdge {
  from: string;
  to: string;
  lag: number;
  type: string;
}

interface DependencyNetwork {
  nodes: Map<string, NetworkNode>;
  edges: NetworkEdge[];
}

@Injectable()
export class MasterScheduleService {
  constructor(
    @InjectRepository(MasterProject)
    private readonly masterProjectRepository: Repository<MasterProject>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectRelationship)
    private readonly relationshipRepository: Repository<ProjectRelationship>,
    @InjectRepository(ProjectDependency)
    private readonly dependencyRepository: Repository<ProjectDependency>,
  ) {}

  /**
   * Calculate the master schedule for a master project
   */
  async calculateMasterSchedule(masterProjectId: string): Promise<any> {
    const masterProject = await this.masterProjectRepository.findOne({
      where: { id: masterProjectId },
    });

    if (!masterProject) {
      return null;
    }

    // Get all sub-projects
    const subProjects = await this.getSubProjects(masterProject.projectId);

    if (subProjects.length === 0) {
      return {
        earliestStart: null,
        latestEnd: null,
        duration: 0,
        criticalPath: [],
        phases: [],
        milestones: [],
      };
    }

    // Calculate earliest start and latest end
    const earliestStart = await this.getEarliestStart(masterProjectId);
    const latestEnd = await this.getLatestEnd(masterProjectId);

    // Calculate critical path
    const criticalPath = await this.calculateCriticalPath(subProjects);

    // Group into phases
    const phases = this.groupIntoPhases(subProjects);

    // Identify milestones
    const milestones = this.extractMilestones(subProjects);

    const duration = earliestStart && latestEnd
      ? Math.ceil(
          (new Date(latestEnd).getTime() - new Date(earliestStart).getTime()) /
          (1000 * 60 * 60 * 24)
        )
      : 0;

    return {
      earliestStart,
      latestEnd,
      duration,
      criticalPath,
      phases,
      milestones,
      ganttChart: this.generateGanttChart(subProjects, await this.getDependencies(subProjects)),
    };
  }

  /**
   * Get the earliest start date from all sub-projects
   */
  async getEarliestStart(masterProjectId: string): Promise<Date | null> {
    const masterProject = await this.masterProjectRepository.findOne({
      where: { id: masterProjectId },
    });

    if (!masterProject) {
      return null;
    }

    const query = `
      WITH RECURSIVE project_hierarchy AS (
        SELECT
          p.id,
          p.start_date
        FROM projects p
        WHERE p.id = $1

        UNION

        SELECT
          p.id,
          p.start_date
        FROM projects p
        INNER JOIN project_relationships pr ON pr.target_project_id = p.id
        INNER JOIN project_hierarchy ph ON pr.source_project_id = ph.id
        WHERE pr.relationship_type = $2
          AND pr.is_active = true
      )
      SELECT MIN(start_date) as earliest_start
      FROM project_hierarchy
      WHERE start_date IS NOT NULL
    `;

    const result = await this.projectRepository.query(query, [
      masterProject.projectId,
      RelationshipType.PARENT_CHILD,
    ]);

    return result[0].earliest_start;
  }

  /**
   * Get the latest end date from all sub-projects
   */
  async getLatestEnd(masterProjectId: string): Promise<Date | null> {
    const masterProject = await this.masterProjectRepository.findOne({
      where: { id: masterProjectId },
    });

    if (!masterProject) {
      return null;
    }

    const query = `
      WITH RECURSIVE project_hierarchy AS (
        SELECT
          p.id,
          p.end_date
        FROM projects p
        WHERE p.id = $1

        UNION

        SELECT
          p.id,
          p.end_date
        FROM projects p
        INNER JOIN project_relationships pr ON pr.target_project_id = p.id
        INNER JOIN project_hierarchy ph ON pr.source_project_id = ph.id
        WHERE pr.relationship_type = $2
          AND pr.is_active = true
      )
      SELECT MAX(end_date) as latest_end
      FROM project_hierarchy
      WHERE end_date IS NOT NULL
    `;

    const result = await this.projectRepository.query(query, [
      masterProject.projectId,
      RelationshipType.PARENT_CHILD,
    ]);

    return result[0].latest_end;
  }

  private async getSubProjects(masterProjectId: string): Promise<Project[]> {
    const query = `
      WITH RECURSIVE project_hierarchy AS (
        -- Get direct children
        SELECT
          p.*,
          1 as depth
        FROM projects p
        INNER JOIN project_relationships pr ON pr.target_project_id = p.id
        WHERE pr.source_project_id = $1
          AND pr.relationship_type = $2
          AND pr.is_active = true

        UNION

        -- Get all descendants
        SELECT
          p.*,
          ph.depth + 1 as depth
        FROM projects p
        INNER JOIN project_relationships pr ON pr.target_project_id = p.id
        INNER JOIN project_hierarchy ph ON pr.source_project_id = ph.id
        WHERE pr.relationship_type = $2
          AND pr.is_active = true
          AND ph.depth < 10 -- Limit recursion depth
      )
      SELECT DISTINCT * FROM project_hierarchy
      ORDER BY start_date, name
    `;

    return await this.projectRepository.query(query, [
      masterProjectId,
      RelationshipType.PARENT_CHILD,
    ]);
  }

  private async calculateCriticalPath(projects: Project[]): Promise<any[]> {
    if (projects.length === 0) {
      return [];
    }

    const projectIds = projects.map((p: Project) => p.id);

    // Get all dependencies between these projects
    const dependencies = await this.dependencyRepository.find({
      where: [
        { predecessorId: projectIds as any },
        { successorId: projectIds as any },
      ],
      relations: ['predecessor', 'successor'],
    });

    // Build dependency network
    const network = this.buildDependencyNetwork(projects, dependencies);

    // Find critical path using CPM (Critical Path Method)
    const criticalPath = this.findCriticalPath(network);

    return criticalPath;
  }

  private buildDependencyNetwork(
    projects: Project[],
    dependencies: ProjectDependency[],
  ): DependencyNetwork {
    const network: DependencyNetwork = {
      nodes: new Map<string, NetworkNode>(),
      edges: [],
    };

    // Add all projects as nodes
    for (const project of projects) {
      network.nodes.set(project.id, {
        id: project.id,
        name: project.name,
        duration: (project as any).durationDays || 0,
        earlyStart: 0,
        earlyFinish: 0,
        lateStart: Infinity,
        lateFinish: Infinity,
        slack: 0,
      });
    }

    // Add dependencies as edges
    for (const dep of dependencies) {
      network.edges.push({
        from: dep.predecessorId,
        to: dep.successorId,
        lag: dep.lagDays || 0,
        type: dep.dependencyType,
      });
    }

    return network;
  }

  private findCriticalPath(network: DependencyNetwork): any[] {
    // Forward pass - calculate early start and early finish
    const visited = new Set();
    const queue = [];

    // Find nodes with no predecessors
    for (const [nodeId, node] of network.nodes) {
      const hasPredecessor = network.edges.some((e: NetworkEdge) => e.to === nodeId);
      if (!hasPredecessor) {
        node.earlyStart = 0;
        node.earlyFinish = node.duration;
        queue.push(nodeId);
      }
    }

    while (queue.length > 0) {
      const currentId = queue.shift() as string;
      visited.add(currentId);

      const successors = network.edges.filter((e: NetworkEdge) => e.from === currentId);
      for (const edge of successors) {
        const successor = network.nodes.get(edge.to);
        const current = network.nodes.get(currentId);

        if (current && successor) {
          const earlyStart = current.earlyFinish + edge.lag;
          if (earlyStart > successor.earlyStart) {
            successor.earlyStart = earlyStart;
            successor.earlyFinish = earlyStart + successor.duration;
          }
        }

        if (!visited.has(edge.to) && !queue.includes(edge.to)) {
          queue.push(edge.to);
        }
      }
    }

    // Backward pass - calculate late start and late finish
    const maxEarlyFinish = Math.max(
      ...Array.from(network.nodes.values()).map((n: NetworkNode) => n.earlyFinish)
    );

    // Find nodes with no successors
    for (const [nodeId, node] of network.nodes) {
      const hasSuccessor = network.edges.some((e: NetworkEdge) => e.from === nodeId);
      if (!hasSuccessor) {
        node.lateFinish = node.earlyFinish;
        node.lateStart = node.lateFinish - node.duration;
      }
    }

    visited.clear();
    queue.length = 0;

    // Process in reverse order
    const reverseQueue = Array.from(network.nodes.keys()).reverse();
    for (const nodeId of reverseQueue) {
      const node = network.nodes.get(nodeId);
      const predecessors = network.edges.filter((e: NetworkEdge) => e.to === nodeId);

      if (node) {
        for (const edge of predecessors) {
          const predecessor = network.nodes.get(edge.from);
          const lateFinish = node.lateStart - edge.lag;

          if (predecessor && (lateFinish < predecessor.lateFinish || predecessor.lateFinish === Infinity)) {
            predecessor.lateFinish = lateFinish;
            predecessor.lateStart = lateFinish - predecessor.duration;
          }
        }
      }
    }

    // Calculate slack and identify critical path
    const criticalNodes = [];
    for (const [nodeId, node] of network.nodes) {
      node.slack = node.lateStart - node.earlyStart;
      if (Math.abs(node.slack) < 0.01) { // Account for floating point errors
        criticalNodes.push({
          id: node.id,
          name: node.name,
          earlyStart: node.earlyStart,
          earlyFinish: node.earlyFinish,
          duration: node.duration,
        });
      }
    }

    return criticalNodes;
  }

  private async getDependencies(projects: Project[]): Promise<ProjectDependency[]> {
    const projectIds = projects.map((p: Project) => p.id);
    return await this.dependencyRepository.find({
      where: [
        { predecessorId: projectIds as any },
        { successorId: projectIds as any },
      ],
    });
  }

  private groupIntoPhases(projects: Project[]): any[] {
    const phases = [];
    const sorted = [...projects].sort((a: Project, b: Project) => {
      const aStart = a.startDate ? new Date(a.startDate).getTime() : 0;
      const bStart = b.startDate ? new Date(b.startDate).getTime() : 0;
      return aStart - bStart;
    });

    let currentPhase = null;
    let phaseNumber = 1;

    for (const project of sorted) {
      if (!project.startDate) continue;

      if (!currentPhase) {
        currentPhase = {
          number: phaseNumber,
          name: `Phase ${phaseNumber}`,
          startDate: project.startDate,
          endDate: project.endDate,
          projects: [project.id],
        };
      } else if (this.shouldStartNewPhase(currentPhase, project)) {
        phases.push(currentPhase);
        phaseNumber++;
        currentPhase = {
          number: phaseNumber,
          name: `Phase ${phaseNumber}`,
          startDate: project.startDate,
          endDate: project.endDate,
          projects: [project.id],
        };
      } else {
        currentPhase.projects.push(project.id);
        if (project.endDate && (!currentPhase.endDate ||
            new Date(project.endDate) > new Date(currentPhase.endDate))) {
          currentPhase.endDate = project.endDate;
        }
      }
    }

    if (currentPhase) {
      phases.push(currentPhase);
    }

    return phases;
  }

  private shouldStartNewPhase(currentPhase: any, project: Project): boolean {
    if (!currentPhase.endDate || !project.startDate) {
      return false;
    }

    const phaseEnd = new Date(currentPhase.endDate);
    const projectStart = new Date(project.startDate);
    const gap = projectStart.getTime() - phaseEnd.getTime();
    const gapDays = gap / (1000 * 60 * 60 * 24);

    return gapDays > 30; // Start new phase if gap is more than 30 days
  }

  private extractMilestones(projects: Project[]): any[] {
    const milestones = [];

    for (const project of projects) {
      // Add project completion as milestone for significant projects
      if (project.endDate && (project as any).budget && (project as any).budget > 100000) {
        milestones.push({
          date: project.endDate,
          name: `${project.name} - Completion`,
          projectId: project.id,
          type: 'PROJECT_COMPLETE',
        });
      }

      // Extract custom milestones from metadata
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

    // Sort by date
    milestones.sort((a: any, b: any) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return milestones;
  }

  private generateGanttChart(projects: Project[], dependencies: ProjectDependency[]): any {
    return {
      tasks: projects.map((p: Project) => ({
        id: p.id,
        name: p.name,
        startDate: p.startDate,
        endDate: p.endDate,
        progress: (p as any).progressPercentage || 0,
        dependencies: dependencies
          .filter((d: ProjectDependency) => d.successorId === p.id)
          .map((d: ProjectDependency) => d.predecessorId),
      })),
      links: dependencies.map((d: ProjectDependency) => ({
        from: d.predecessorId,
        to: d.successorId,
        type: d.dependencyType,
        lag: d.lagDays,
      })),
    };
  }
}