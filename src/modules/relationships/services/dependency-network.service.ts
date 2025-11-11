import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ProjectDependency } from '../entities/project-dependency.entity';
import { Project } from '../../projects/entities/project.entity';

interface NetworkNode {
  id: string;
  name: string;
  level: number;
  inDegree: number;
  outDegree: number;
  critical: boolean;
  status: string;
  metadata: any;
}

interface NetworkEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
  critical: boolean;
  lagDays: number;
}

interface DependencyNetwork {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    criticalNodes: number;
    bottlenecks: string[];
    maxDepth: number;
  };
}

@Injectable()
export class DependencyNetworkService {
  constructor(
    @InjectRepository(ProjectDependency)
    private readonly dependencyRepository: Repository<ProjectDependency>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  /**
   * Build a complete dependency network for given projects
   */
  async buildNetwork(projectIds: string[]): Promise<DependencyNetwork> {
    // Get all projects
    const projects = await this.projectRepository.find({
      where: { id: In(projectIds) },
    });

    // Get all dependencies between these projects
    const dependencies = await this.dependencyRepository.find({
      where: [
        { predecessorId: In(projectIds) },
        { successorId: In(projectIds) },
      ],
      relations: ['predecessor', 'successor'],
    });

    // Build node map
    const nodeMap = new Map<string, NetworkNode>();
    const edgeList: NetworkEdge[] = [];

    // Initialize nodes
    for (const project of projects) {
      nodeMap.set(project.id, {
        id: project.id,
        name: project.name,
        level: 0,
        inDegree: 0,
        outDegree: 0,
        critical: false,
        status: project.status,
        metadata: {
          budget: (project as any).budget,
          progress: (project as any).progressPercentage,
          startDate: project.startDate,
          endDate: project.endDate,
        },
      });
    }

    // Build edges and calculate degrees
    for (const dep of dependencies) {
      const sourceNode = nodeMap.get(dep.predecessorId);
      const targetNode = nodeMap.get(dep.successorId);

      if (sourceNode && targetNode) {
        sourceNode.outDegree++;
        targetNode.inDegree++;

        if (dep.isCritical) {
          sourceNode.critical = true;
          targetNode.critical = true;
        }

        edgeList.push({
          source: dep.predecessorId,
          target: dep.successorId,
          type: dep.dependencyType,
          weight: this.calculateEdgeWeight(dep),
          critical: dep.isCritical,
          lagDays: dep.lagDays,
        });
      }
    }

    // Calculate levels (topological sort)
    this.calculateNodeLevels(nodeMap, edgeList);

    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(nodeMap, edgeList);

    // Calculate network statistics
    const stats = {
      totalNodes: nodeMap.size,
      totalEdges: edgeList.length,
      criticalNodes: Array.from(nodeMap.values()).filter((n: NetworkNode) => n.critical).length,
      bottlenecks,
      maxDepth: Math.max(...Array.from(nodeMap.values()).map((n: NetworkNode) => n.level)),
    };

    return {
      nodes: Array.from(nodeMap.values()),
      edges: edgeList,
      stats,
    };
  }

  /**
   * Find the critical path between two projects
   */
  async findCriticalPath(
    startProject: string,
    endProject: string,
  ): Promise<string[]> {
    // Use Dijkstra's algorithm with negative weights for critical path
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const visited = new Set<string>();
    const queue = new Set<string>([startProject]);

    // Initialize distances
    distances.set(startProject, 0);

    while (queue.size > 0) {
      // Find node with minimum distance
      let current: string | null = null;
      let minDistance = Infinity;

      for (const node of queue) {
        const distance = distances.get(node) ?? Infinity;
        if (distance < minDistance) {
          minDistance = distance;
          current = node;
        }
      }

      if (!current) break;
      if (current === endProject) break;

      queue.delete(current);
      visited.add(current);

      // Get all dependencies from current node
      const dependencies = await this.dependencyRepository.find({
        where: { predecessorId: current },
        relations: ['successor'],
      });

      for (const dep of dependencies) {
        if (visited.has(dep.successorId)) continue;

        // Calculate distance (negative for critical path finding)
        const weight = dep.isCritical ? -10 : 1;
        const alt = minDistance + weight + dep.lagDays;

        const currentDistance = distances.get(dep.successorId) ?? Infinity;
        if (alt < currentDistance) {
          distances.set(dep.successorId, alt);
          previous.set(dep.successorId, current);
          queue.add(dep.successorId);
        }
      }
    }

    // Reconstruct path
    const path: string[] = [];
    let current: string | null = endProject;

    while (current) {
      path.unshift(current);
      current = previous.get(current) ?? null;
      if (current === startProject) {
        path.unshift(current);
        break;
      }
    }

    return path.length > 1 && path[0] === startProject ? path : [];
  }

  /**
   * Detect bottlenecks in the dependency network
   */
  async detectBottlenecks(): Promise<Project[]> {
    // Find projects that are dependencies for many others
    const query = `
      WITH dependency_stats AS (
        SELECT
          predecessor_id,
          COUNT(DISTINCT successor_id) as successor_count,
          SUM(CASE WHEN is_critical THEN 1 ELSE 0 END) as critical_count
        FROM project_dependencies
        WHERE status = 'ACTIVE'
        GROUP BY predecessor_id
      ),
      ranked_bottlenecks AS (
        SELECT
          ds.predecessor_id,
          ds.successor_count,
          ds.critical_count,
          p.name,
          p.status,
          p.progress_percentage,
          RANK() OVER (ORDER BY ds.successor_count DESC, ds.critical_count DESC) as rank
        FROM dependency_stats ds
        JOIN projects p ON p.id = ds.predecessor_id
        WHERE ds.successor_count > 2
      )
      SELECT *
      FROM ranked_bottlenecks
      WHERE rank <= 10
      ORDER BY rank
    `;

    const results = await this.projectRepository.query(query);

    const projectIds = results.map((r: any) => r.predecessor_id);
    return await this.projectRepository.find({
      where: { id: In(projectIds) },
    });
  }

  /**
   * Analyze network connectivity
   */
  async analyzeConnectivity(projectIds: string[]): Promise<any> {
    const network = await this.buildNetwork(projectIds);

    // Calculate clustering coefficient
    const clusteringCoefficient = this.calculateClusteringCoefficient(
      network.nodes,
      network.edges,
    );

    // Find strongly connected components
    const components = this.findStronglyConnectedComponents(
      network.nodes,
      network.edges,
    );

    // Calculate network density
    const maxPossibleEdges = network.nodes.length * (network.nodes.length - 1);
    const density = maxPossibleEdges > 0 ? network.edges.length / maxPossibleEdges : 0;

    // Find isolated nodes
    const isolatedNodes = network.nodes.filter(
      (n: NetworkNode) => n.inDegree === 0 && n.outDegree === 0
    );

    // Find terminal nodes (no outgoing dependencies)
    const terminalNodes = network.nodes.filter(
      (n: NetworkNode) => n.outDegree === 0 && n.inDegree > 0
    );

    // Find source nodes (no incoming dependencies)
    const sourceNodes = network.nodes.filter(
      (n: NetworkNode) => n.inDegree === 0 && n.outDegree > 0
    );

    return {
      metrics: {
        clusteringCoefficient,
        density,
        componentsCount: components.length,
        averageDegree: this.calculateAverageDegree(network.nodes),
        maxInDegree: Math.max(...network.nodes.map((n: NetworkNode) => n.inDegree)),
        maxOutDegree: Math.max(...network.nodes.map((n: NetworkNode) => n.outDegree)),
      },
      nodeTypes: {
        isolated: isolatedNodes.map((n: NetworkNode) => ({ id: n.id, name: n.name })),
        terminal: terminalNodes.map((n: NetworkNode) => ({ id: n.id, name: n.name })),
        source: sourceNodes.map((n: NetworkNode) => ({ id: n.id, name: n.name })),
        bottlenecks: network.stats.bottlenecks,
      },
      components: components.map((c: string[], i: number) => ({
        id: i + 1,
        size: c.length,
        nodes: c,
      })),
      recommendations: this.generateNetworkRecommendations(
        network,
        components,
        density,
      ),
    };
  }

  private calculateEdgeWeight(dependency: ProjectDependency): number {
    let weight = 1;

    // Critical dependencies have higher weight
    if (dependency.isCritical) weight *= 2;

    // Add weight based on impact
    switch (dependency.impact) {
      case 'CRITICAL':
        weight *= 3;
        break;
      case 'HIGH':
        weight *= 2;
        break;
      case 'MEDIUM':
        weight *= 1.5;
        break;
    }

    // Add lag days as additional weight
    weight += Math.abs(dependency.lagDays) * 0.1;

    return weight;
  }

  private calculateNodeLevels(
    nodeMap: Map<string, NetworkNode>,
    edges: NetworkEdge[],
  ): void {
    // Topological sort to assign levels
    const inDegreeMap = new Map<string, number>();
    const adjacencyList = new Map<string, string[]>();

    // Initialize maps
    for (const node of nodeMap.values()) {
      inDegreeMap.set(node.id, node.inDegree);
      adjacencyList.set(node.id, []);
    }

    // Build adjacency list
    for (const edge of edges) {
      const list = adjacencyList.get(edge.source) || [];
      list.push(edge.target);
      adjacencyList.set(edge.source, list);
    }

    // Process nodes level by level
    let level = 0;
    while (inDegreeMap.size > 0) {
      const currentLevel: string[] = [];

      // Find nodes with no incoming edges
      for (const [nodeId, inDegree] of inDegreeMap) {
        if (inDegree === 0) {
          currentLevel.push(nodeId);
          const node = nodeMap.get(nodeId);
          if (node) node.level = level;
        }
      }

      if (currentLevel.length === 0) {
        // Cycle detected, assign remaining nodes to current level
        for (const nodeId of inDegreeMap.keys()) {
          const node = nodeMap.get(nodeId);
          if (node) node.level = level;
        }
        break;
      }

      // Remove processed nodes and update in-degrees
      for (const nodeId of currentLevel) {
        inDegreeMap.delete(nodeId);
        const neighbors = adjacencyList.get(nodeId) || [];
        for (const neighbor of neighbors) {
          const currentInDegree = inDegreeMap.get(neighbor);
          if (currentInDegree !== undefined) {
            inDegreeMap.set(neighbor, currentInDegree - 1);
          }
        }
      }

      level++;
    }
  }

  private identifyBottlenecks(
    nodeMap: Map<string, NetworkNode>,
    edges: NetworkEdge[],
  ): string[] {
    const bottlenecks: string[] = [];

    for (const node of nodeMap.values()) {
      // A node is a bottleneck if:
      // 1. It has high out-degree (many projects depend on it)
      // 2. It's on the critical path
      // 3. It's not completed
      if (
        node.outDegree > 3 &&
        node.critical &&
        node.status !== 'COMPLETED'
      ) {
        bottlenecks.push(node.id);
      }
    }

    return bottlenecks;
  }

  private calculateClusteringCoefficient(
    nodes: NetworkNode[],
    edges: NetworkEdge[],
  ): number {
    // Calculate local clustering coefficient for each node
    const adjacencyMap = new Map<string, Set<string>>();

    // Build adjacency map
    for (const edge of edges) {
      if (!adjacencyMap.has(edge.source)) {
        adjacencyMap.set(edge.source, new Set());
      }
      adjacencyMap.get(edge.source)!.add(edge.target);
    }

    let totalCoefficient = 0;
    let nodeCount = 0;

    for (const node of nodes) {
      const neighbors = adjacencyMap.get(node.id);
      if (!neighbors || neighbors.size < 2) continue;

      const k = neighbors.size;
      let edgeCount = 0;

      // Count edges between neighbors
      for (const n1 of neighbors) {
        for (const n2 of neighbors) {
          if (n1 !== n2) {
            const n1Neighbors = adjacencyMap.get(n1);
            if (n1Neighbors && n1Neighbors.has(n2)) {
              edgeCount++;
            }
          }
        }
      }

      const coefficient = edgeCount / (k * (k - 1));
      totalCoefficient += coefficient;
      nodeCount++;
    }

    return nodeCount > 0 ? totalCoefficient / nodeCount : 0;
  }

  private findStronglyConnectedComponents(
    nodes: NetworkNode[],
    edges: NetworkEdge[],
  ): string[][] {
    // Kosaraju's algorithm for finding strongly connected components
    const adjacencyMap = new Map<string, string[]>();
    const reverseMap = new Map<string, string[]>();

    // Build adjacency lists
    for (const node of nodes) {
      adjacencyMap.set(node.id, []);
      reverseMap.set(node.id, []);
    }

    for (const edge of edges) {
      adjacencyMap.get(edge.source)?.push(edge.target);
      reverseMap.get(edge.target)?.push(edge.source);
    }

    // First DFS to get finishing times
    const visited = new Set<string>();
    const finishOrder: string[] = [];

    const dfs1 = (nodeId: string): void => {
      visited.add(nodeId);
      const neighbors = adjacencyMap.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs1(neighbor);
        }
      }
      finishOrder.push(nodeId);
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs1(node.id);
      }
    }

    // Second DFS on reverse graph
    visited.clear();
    const components: string[][] = [];

    const dfs2 = (nodeId: string, component: string[]): void => {
      visited.add(nodeId);
      component.push(nodeId);
      const neighbors = reverseMap.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs2(neighbor, component);
        }
      }
    };

    for (let i = finishOrder.length - 1; i >= 0; i--) {
      const nodeId = finishOrder[i];
      if (!visited.has(nodeId)) {
        const component: string[] = [];
        dfs2(nodeId, component);
        if (component.length > 1) {
          components.push(component);
        }
      }
    }

    return components;
  }

  private calculateAverageDegree(nodes: NetworkNode[]): number {
    if (nodes.length === 0) return 0;
    const totalDegree = nodes.reduce((sum: number, n: NetworkNode) => sum + n.inDegree + n.outDegree, 0);
    return totalDegree / nodes.length;
  }

  private generateNetworkRecommendations(
    network: DependencyNetwork,
    components: string[][],
    density: number,
  ): string[] {
    const recommendations: string[] = [];

    // Check for circular dependencies
    if (components.length > 0) {
      recommendations.push(
        `Warning: ${components.length} circular dependency group(s) detected. Review and break cycles.`
      );
    }

    // Check for bottlenecks
    if (network.stats.bottlenecks.length > 0) {
      recommendations.push(
        `Critical: ${network.stats.bottlenecks.length} bottleneck project(s) identified. Prioritize these for resource allocation.`
      );
    }

    // Check network density
    if (density > 0.3) {
      recommendations.push(
        'High dependency density detected. Consider reducing coupling between projects.'
      );
    } else if (density < 0.1) {
      recommendations.push(
        'Low dependency density. Projects may be too isolated - verify coordination needs.'
      );
    }

    // Check for long dependency chains
    if (network.stats.maxDepth > 5) {
      recommendations.push(
        `Long dependency chain detected (${network.stats.maxDepth} levels). Consider parallelizing where possible.`
      );
    }

    // Check critical path coverage
    const criticalRatio = network.stats.criticalNodes / network.stats.totalNodes;
    if (criticalRatio > 0.5) {
      recommendations.push(
        'Over 50% of projects are on critical paths. Limited flexibility for delays.'
      );
    }

    return recommendations;
  }
}