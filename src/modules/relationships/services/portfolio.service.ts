import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PortfolioView } from '../entities/portfolio-view.entity';
import { Project } from '../../projects/entities/project.entity';
import { CreatePortfolioViewDto } from '../dto/create-portfolio-view.dto';
import { UpdatePortfolioViewDto } from '../dto/update-portfolio-view.dto';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(PortfolioView)
    private readonly portfolioViewRepository: Repository<PortfolioView>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  /**
   * Create a new portfolio view
   */
  async create(
    data: CreatePortfolioViewDto,
    userId: string,
  ): Promise<PortfolioView> {
    // If setting as default, unset other defaults for this organization
    if (data.isDefault) {
      await this.portfolioViewRepository.update(
        {
          organizationId: data.organizationId,
          isDefault: true,
        },
        { isDefault: false }
      );
    }

    const view = this.portfolioViewRepository.create({
      ...data,
      createdBy: userId,
      updatedBy: userId,
    });

    return await this.portfolioViewRepository.save(view);
  }

  /**
   * Find all portfolio views for an organization
   */
  async findAll(
    organizationId: string,
    userId: string,
  ): Promise<PortfolioView[]> {
    return await this.portfolioViewRepository.find({
      where: [
        { organizationId, isPublic: true },
        { organizationId, createdBy: userId },
      ],
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Find one portfolio view
   */
  async findOne(id: string): Promise<PortfolioView> {
    const view = await this.portfolioViewRepository.findOne({
      where: { id },
      relations: ['organization'],
    });

    if (!view) {
      throw new NotFoundException(`Portfolio view ${id} not found`);
    }

    return view;
  }

  /**
   * Update a portfolio view
   */
  async update(
    id: string,
    data: UpdatePortfolioViewDto,
    userId: string,
  ): Promise<PortfolioView> {
    const view = await this.findOne(id);

    // Check ownership
    if (view.createdBy !== userId && !view.isPublic) {
      throw new BadRequestException(
        'You can only update your own portfolio views',
      );
    }

    // If setting as default, unset other defaults
    if (data.isDefault && !view.isDefault) {
      await this.portfolioViewRepository.update(
        {
          organizationId: view.organizationId,
          isDefault: true,
        },
        { isDefault: false }
      );
    }

    Object.assign(view, {
      ...data,
      updatedBy: userId,
    });

    return await this.portfolioViewRepository.save(view);
  }

  /**
   * Remove a portfolio view
   */
  async remove(id: string): Promise<void> {
    const view = await this.findOne(id);

    if (view.isDefault) {
      throw new BadRequestException('Cannot delete the default portfolio view');
    }

    await this.portfolioViewRepository.remove(view);
  }

  /**
   * Get portfolio data based on view filters
   */
  async getPortfolioData(viewId: string): Promise<any> {
    const view = await this.findOne(viewId);

    // Build query based on filters
    const query = this.projectRepository.createQueryBuilder('project');

    // Apply organization filter
    query.where('project.organizationId = :orgId', {
      orgId: view.organizationId,
    });

    // Apply custom filters
    if (view.filters) {
      this.applyFilters(query, view.filters);
    }

    // Apply sorting
    if (view.sortOrder) {
      this.applySorting(query, view.sortOrder);
    }

    // Execute query
    const projects = await query.getMany();

    // Calculate portfolio metrics
    const metrics = this.calculatePortfolioMetrics(projects);

    // Format data based on columns configuration
    const formattedData = this.formatProjectData(projects, view.columns);

    return {
      view: {
        id: view.id,
        name: view.name,
        type: view.viewType,
      },
      projects: formattedData,
      metrics,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get default portfolio view for an organization
   */
  async getDefaultView(organizationId: string): Promise<PortfolioView | null> {
    return await this.portfolioViewRepository.findOne({
      where: {
        organizationId,
        isDefault: true,
      },
    });
  }

  /**
   * Clone an existing portfolio view
   */
  async cloneView(
    viewId: string,
    newName: string,
    userId: string,
  ): Promise<PortfolioView> {
    const originalView = await this.findOne(viewId);

    const clonedView = this.portfolioViewRepository.create({
      organizationId: originalView.organizationId,
      name: newName,
      description: `Cloned from ${originalView.name}`,
      viewType: originalView.viewType,
      filters: originalView.filters,
      columns: originalView.columns,
      sortOrder: originalView.sortOrder,
      isDefault: false,
      isPublic: false,
      createdBy: userId,
      updatedBy: userId,
    });

    return await this.portfolioViewRepository.save(clonedView);
  }

  private applyFilters(query: any, filters: Record<string, any>): void {
    // Status filter
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query.andWhere('project.status IN (:...statuses)', {
          statuses: filters.status,
        });
      } else {
        query.andWhere('project.status = :status', { status: filters.status });
      }
    }

    // Date range filters
    if (filters.startDateFrom) {
      query.andWhere('project.startDate >= :startDateFrom', {
        startDateFrom: filters.startDateFrom,
      });
    }
    if (filters.startDateTo) {
      query.andWhere('project.startDate <= :startDateTo', {
        startDateTo: filters.startDateTo,
      });
    }
    if (filters.endDateFrom) {
      query.andWhere('project.endDate >= :endDateFrom', {
        endDateFrom: filters.endDateFrom,
      });
    }
    if (filters.endDateTo) {
      query.andWhere('project.endDate <= :endDateTo', {
        endDateTo: filters.endDateTo,
      });
    }

    // Budget filters
    if (filters.budgetMin) {
      query.andWhere('project.budget >= :budgetMin', {
        budgetMin: filters.budgetMin,
      });
    }
    if (filters.budgetMax) {
      query.andWhere('project.budget <= :budgetMax', {
        budgetMax: filters.budgetMax,
      });
    }

    // Progress filter
    if (filters.progressMin !== undefined) {
      query.andWhere('project.progressPercentage >= :progressMin', {
        progressMin: filters.progressMin,
      });
    }
    if (filters.progressMax !== undefined) {
      query.andWhere('project.progressPercentage <= :progressMax', {
        progressMax: filters.progressMax,
      });
    }

    // Priority filter
    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        query.andWhere('project.priority IN (:...priorities)', {
          priorities: filters.priority,
        });
      } else {
        query.andWhere('project.priority = :priority', {
          priority: filters.priority,
        });
      }
    }

    // Tags filter (assuming tags are stored in metadata)
    if (filters.tags && filters.tags.length > 0) {
      query.andWhere('project.metadata @> :tags', {
        tags: JSON.stringify({ tags: filters.tags }),
      });
    }

    // Risk level filter (assuming risk is stored in metadata)
    if (filters.riskLevel) {
      query.andWhere("project.metadata->>'riskLevel' = :riskLevel", {
        riskLevel: filters.riskLevel,
      });
    }

    // Team size filter (assuming team info is in metadata)
    if (filters.teamSizeMin) {
      query.andWhere("(project.metadata->>'teamSize')::int >= :teamSizeMin", {
        teamSizeMin: filters.teamSizeMin,
      });
    }
    if (filters.teamSizeMax) {
      query.andWhere("(project.metadata->>'teamSize')::int <= :teamSizeMax", {
        teamSizeMax: filters.teamSizeMax,
      });
    }
  }

  private applySorting(query: any, sortOrder: Record<string, any>): void {
    const sortField = sortOrder.field || 'createdAt';
    const sortDirection = sortOrder.direction || 'DESC';

    // Map sort fields to actual database columns
    const fieldMap: Record<string, string> = {
      name: 'project.name',
      status: 'project.status',
      startDate: 'project.startDate',
      endDate: 'project.endDate',
      budget: 'project.budget',
      progress: 'project.progressPercentage',
      priority: 'project.priority',
      createdAt: 'project.createdAt',
      updatedAt: 'project.updatedAt',
    };

    const dbField = fieldMap[sortField] || 'project.createdAt';
    query.orderBy(dbField, sortDirection);

    // Add secondary sort for stability
    if (sortField !== 'name') {
      query.addOrderBy('project.name', 'ASC');
    }
  }

  private calculatePortfolioMetrics(projects: Project[]): any {
    const totalProjects = projects.length;
    const totalBudget = projects.reduce((sum, p) => sum + ((p as any).budget || 0), 0);
    const totalActualCost = projects.reduce((sum, p) => sum + ((p as any).actualCost || 0), 0);
    const avgProgress = projects.reduce((sum, p) => sum + ((p as any).progressPercentage || 0), 0) / (totalProjects || 1);

    // Status distribution
    const statusDistribution = projects.reduce((acc, p) => {
      acc[(p as any).status] = (acc[(p as any).status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Health metrics
    const onTrack = projects.filter(p => (p as any).status === 'ON_TRACK').length;
    const atRisk = projects.filter(p => (p as any).status === 'AT_RISK').length;
    const delayed = projects.filter(p => (p as any).status === 'DELAYED').length;

    // Budget performance
    const overBudget = projects.filter(p =>
      (p as any).actualCost && (p as any).budget && (p as any).actualCost > (p as any).budget
    ).length;
    const underBudget = projects.filter(p =>
      (p as any).actualCost && (p as any).budget && (p as any).actualCost <= (p as any).budget
    ).length;

    return {
      summary: {
        totalProjects,
        totalBudget,
        totalActualCost,
        avgProgress: Math.round(avgProgress * 100) / 100,
        budgetVariance: totalBudget - totalActualCost,
      },
      statusDistribution,
      health: {
        onTrack,
        atRisk,
        delayed,
        healthScore: this.calculateHealthScore(onTrack, atRisk, delayed, totalProjects),
      },
      budgetPerformance: {
        overBudget,
        underBudget,
        budgetUtilization: totalBudget > 0 ? (totalActualCost / totalBudget) * 100 : 0,
      },
      timeline: {
        upcoming: projects.filter(p =>
          p.startDate && new Date(p.startDate) > new Date()
        ).length,
        inProgress: projects.filter(p =>
          (p as any).status === 'IN_PROGRESS' || (p as any).status === 'ACTIVE'
        ).length,
        completed: projects.filter(p => (p as any).status === 'COMPLETED').length,
      },
    };
  }

  private formatProjectData(projects: Project[], columns: any[]): any[] {
    if (!columns || columns.length === 0) {
      // Default columns
      columns = [
        { field: 'name', label: 'Project Name' },
        { field: 'status', label: 'Status' },
        { field: 'progress', label: 'Progress' },
        { field: 'budget', label: 'Budget' },
        { field: 'endDate', label: 'End Date' },
      ];
    }

    return projects.map(project => {
      const formattedProject: any = { id: project.id };

      for (const column of columns) {
        const field = column.field;

        // Handle nested fields and special formatting
        switch (field) {
          case 'progress':
            formattedProject[field] = `${(project as any).progressPercentage || 0}%`;
            break;
          case 'budget':
            formattedProject[field] = this.formatCurrency((project as any).budget);
            break;
          case 'actualCost':
            formattedProject[field] = this.formatCurrency((project as any).actualCost);
            break;
          case 'budgetVariance':
            const variance = ((project as any).budget || 0) - ((project as any).actualCost || 0);
            formattedProject[field] = this.formatCurrency(variance);
            break;
          case 'healthIndicator':
            formattedProject[field] = this.getHealthIndicator(project);
            break;
          default:
            formattedProject[field] = (project as any)[field];
        }
      }

      return formattedProject;
    });
  }

  private calculateHealthScore(
    onTrack: number,
    atRisk: number,
    delayed: number,
    total: number,
  ): number {
    if (total === 0) return 100;

    const score = ((onTrack * 100) + (atRisk * 50) + (delayed * 0)) / total;
    return Math.round(score * 100) / 100;
  }

  private formatCurrency(value: number | undefined): string {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  private getHealthIndicator(project: Project): string {
    // Simple health calculation based on multiple factors
    let score = 100;

    // Check schedule
    if (project.endDate && new Date(project.endDate) < new Date()) {
      if ((project as any).status !== 'COMPLETED') {
        score -= 40; // Overdue
      }
    }

    // Check budget
    if ((project as any).budget && (project as any).actualCost) {
      const budgetVariance = ((project as any).actualCost - (project as any).budget) / (project as any).budget;
      if (budgetVariance > 0.1) score -= 20; // Over budget by >10%
      if (budgetVariance > 0.2) score -= 20; // Over budget by >20%
    }

    // Check progress vs timeline
    if (project.startDate && project.endDate && (project as any).progressPercentage !== undefined) {
      const totalDuration = new Date(project.endDate).getTime() - new Date(project.startDate).getTime();
      const elapsed = new Date().getTime() - new Date(project.startDate).getTime();
      const expectedProgress = (elapsed / totalDuration) * 100;

      if ((project as any).progressPercentage < expectedProgress - 10) {
        score -= 20; // Behind schedule
      }
    }

    if (score >= 80) return 'GOOD';
    if (score >= 60) return 'FAIR';
    if (score >= 40) return 'AT_RISK';
    return 'CRITICAL';
  }
}