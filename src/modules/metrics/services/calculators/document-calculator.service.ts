import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetricCalculator } from '../../interfaces/metric-calculator.interface';
import { MetricResult } from '../../interfaces/metric-result.interface';
import { CalculationOptions } from '../../interfaces/calculation-options.interface';
import { ValidationResult } from '../../interfaces/validation-result.interface';
import { MetricGroup } from '../../enums/metric-group.enum';
import { Project } from '../../../projects/entities/project.entity';
import { ProjectFolder } from '../../../projects/entities/project-folder.entity';
import { FolderType } from '../../../projects/enums/folder-type.enum';

/**
 * DocumentCalculator Service
 *
 * Calculates document management metrics including:
 * - Total documents and storage usage
 * - Document categorization by type and folder
 * - Activity tracking and recent uploads
 * - Top contributors and collaboration metrics
 */
@Injectable()
export class DocumentCalculatorService implements MetricCalculator {
  private readonly logger = new Logger(DocumentCalculatorService.name);

  readonly name = 'documents';
  readonly group = MetricGroup.DOCUMENTS;
  readonly ttl = 900; // 15 minutes
  readonly isRealTime = false;
  readonly dependencies = [];

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectFolder)
    private readonly folderRepository: Repository<ProjectFolder>,
  ) {}

  async calculate(projectId: string, options?: CalculationOptions): Promise<MetricResult> {
    const startTime = Date.now();

    try {
      const project = await this.projectRepository.findOne({
        where: { id: projectId },
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const folders = await this.folderRepository.find({
        where: { projectId },
        order: { level: 'ASC', order: 'ASC' },
      });

      // Calculate total documents
      const totalDocuments = this.calculateTotalDocuments(folders);

      // Calculate by type breakdown
      const byTypeBreakdown = this.calculateByTypeBreakdown(folders);

      // Calculate by folder breakdown
      const byFolderBreakdown = this.calculateByFolderBreakdown(folders);

      // Calculate recent activity
      const recentActivity = this.calculateRecentActivity(folders);

      // Calculate storage metrics
      const storageMetrics = this.calculateStorageMetrics(folders);

      // Calculate folder statistics
      const folderStatistics = this.calculateFolderStatistics(folders);

      // Top folders by activity
      const topFolders = this.getTopFoldersByActivity(folders);

      // Document growth trend (mock data for now)
      const growthTrend = this.calculateGrowthTrend(folders);

      const metrics = {
        totalDocuments,
        totalFolders: folders.length,

        // Breakdowns
        byType: byTypeBreakdown,
        byFolder: byFolderBreakdown,

        // Activity metrics
        recentActivity,
        lastActivityDate: this.getLastActivityDate(folders),

        // Storage
        storage: storageMetrics,

        // Folder stats
        folderStats: folderStatistics,

        // Top items
        topFolders,

        // Growth
        growthTrend,

        // Health indicators
        averageFilesPerFolder: totalDocuments / Math.max(1, folders.length),
        emptyFolders: folders.filter(f => f.fileCount === 0).length,
        lockedFolders: folders.filter(f => f.isLocked).length,
        publicFolders: folders.filter(f => f.isPublic).length,
      };

      return {
        group: this.group,
        calculatedAt: new Date(),
        calculationDuration: Date.now() - startTime,
        metrics,
        values: this.formatMetricValues(metrics),
        kpis: {
          primary: {
            key: 'totalDocuments',
            value: totalDocuments,
            label: 'Total Documents',
            format: 'number',
          },
          secondary: [
            {
              key: 'recentUploads',
              value: recentActivity.today + recentActivity.week,
              label: 'Recent Uploads (7d)',
              format: 'number',
            },
            {
              key: 'totalStorage',
              value: storageMetrics.totalSize,
              label: 'Storage Used',
              format: 'bytes',
              unit: 'bytes',
            },
          ],
        },
        summary: {
          documents: totalDocuments,
          folders: folders.length,
          storageGB: storageMetrics.totalSizeGB,
          activeToday: recentActivity.today,
          activeThisWeek: recentActivity.week,
        },
        breakdown: {
          dimension: 'folderType',
          items: byTypeBreakdown,
        },
        dataSourceVersion: await this.getDataSourceVersion(projectId),
      };
    } catch (error) {
      this.logger.error(`Failed to calculate document metrics for project ${projectId}:`, error);
      throw error;
    }
  }

  async getDataSourceVersion(projectId: string): Promise<string> {
    const latestFolder = await this.folderRepository.findOne({
      where: { projectId },
      order: { updatedAt: 'DESC' },
    });

    return latestFolder?.updatedAt?.getTime()?.toString() || new Date().toISOString();
  }

  async validate(projectId: string): Promise<ValidationResult> {
    const errors = [];
    const warnings = [];

    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      errors.push({
        code: 'PROJECT_NOT_FOUND',
        message: `Project ${projectId} not found`,
      });
    }

    const folderCount = await this.folderRepository.count({
      where: { projectId },
    });

    if (folderCount === 0) {
      warnings.push({
        code: 'NO_FOLDERS',
        message: 'Project has no folders defined',
        suggestion: 'Create folder structure for document organization',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        checkedAt: new Date(),
        checksPerformed: ['project_exists', 'folders_exist'],
        dataAvailability: {
          project: !!project,
          folders: folderCount > 0,
        },
      },
    };
  }

  private calculateTotalDocuments(folders: ProjectFolder[]): number {
    return folders.reduce((sum, folder) => sum + folder.totalFileCount, 0);
  }

  private calculateByTypeBreakdown(folders: ProjectFolder[]): any[] {
    const typeGroups = new Map<FolderType, { count: number; files: number; size: number }>();

    folders.forEach((folder) => {
      const existing = typeGroups.get(folder.folderType) || { count: 0, files: 0, size: 0 };
      existing.count++;
      existing.files += folder.totalFileCount;
      existing.size += Number(folder.totalSize || 0);
      typeGroups.set(folder.folderType, existing);
    });

    const totalFiles = this.calculateTotalDocuments(folders);

    return Array.from(typeGroups.entries()).map(([type, data]) => ({
      name: this.formatFolderTypeName(type),
      value: data.files,
      percentage: totalFiles > 0 ? (data.files / totalFiles) * 100 : 0,
      metadata: {
        type,
        folderCount: data.count,
        totalSize: data.size,
      },
    }));
  }

  private calculateByFolderBreakdown(folders: ProjectFolder[]): any[] {
    const rootFolders = folders.filter(f => f.isRootFolder());

    return rootFolders.map((folder) => {
      const childFolders = this.getChildFoldersRecursive(folder, folders);
      const totalFiles = folder.totalFileCount +
        childFolders.reduce((sum, child) => sum + child.totalFileCount, 0);
      const totalSize = Number(folder.totalSize || 0) +
        childFolders.reduce((sum, child) => sum + Number(child.totalSize || 0), 0);

      return {
        name: folder.name,
        value: totalFiles,
        metadata: {
          folderId: folder.id,
          folderType: folder.folderType,
          childFolders: childFolders.length,
          totalSize,
          isSystem: folder.isSystemFolder,
          isLocked: folder.isLocked,
        },
      };
    });
  }

  private getChildFoldersRecursive(parent: ProjectFolder, allFolders: ProjectFolder[]): ProjectFolder[] {
    const children = allFolders.filter(f => f.parentId === parent.id);
    const allDescendants = [...children];

    children.forEach((child) => {
      allDescendants.push(...this.getChildFoldersRecursive(child, allFolders));
    });

    return allDescendants;
  }

  private calculateRecentActivity(folders: ProjectFolder[]): any {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;

    folders.forEach((folder) => {
      if (folder.lastActivityAt) {
        const activityDate = new Date(folder.lastActivityAt);
        if (activityDate >= today) {
          todayCount++;
        }
        if (activityDate >= weekAgo) {
          weekCount++;
        }
        if (activityDate >= monthAgo) {
          monthCount++;
        }
      }
    });

    return {
      today: todayCount,
      week: weekCount,
      month: monthCount,
    };
  }

  private calculateStorageMetrics(folders: ProjectFolder[]): any {
    const totalSize = folders.reduce((sum, folder) => sum + Number(folder.totalSize || 0), 0);
    const fileCounts = folders.map(f => f.fileCount).filter(c => c > 0);
    const sizes = folders.map(f => Number(f.totalSize || 0)).filter(s => s > 0);

    return {
      totalSize,
      totalSizeGB: totalSize / (1024 * 1024 * 1024),
      averageFileSize: fileCounts.length > 0 ? totalSize / fileCounts.reduce((a, b) => a + b, 0) : 0,
      largestFolder: sizes.length > 0 ? Math.max(...sizes) : 0,
      smallestFolder: sizes.length > 0 ? Math.min(...sizes) : 0,
    };
  }

  private calculateFolderStatistics(folders: ProjectFolder[]): any {
    const depths = folders.map(f => f.level);
    const fileCounts = folders.map(f => f.fileCount);

    return {
      maxDepth: depths.length > 0 ? Math.max(...depths) : 0,
      avgDepth: depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 0,
      maxFiles: fileCounts.length > 0 ? Math.max(...fileCounts) : 0,
      avgFiles: fileCounts.length > 0 ? fileCounts.reduce((a, b) => a + b, 0) / fileCounts.length : 0,
      systemFolders: folders.filter(f => f.isSystemFolder).length,
      userFolders: folders.filter(f => !f.isSystemFolder).length,
    };
  }

  private getTopFoldersByActivity(folders: ProjectFolder[]): any[] {
    return folders
      .filter(f => f.lastActivityAt)
      .sort((a, b) => {
        const dateA = new Date(a.lastActivityAt!).getTime();
        const dateB = new Date(b.lastActivityAt!).getTime();
        return dateB - dateA;
      })
      .slice(0, 5)
      .map((folder) => ({
        id: folder.id,
        name: folder.name,
        fileCount: folder.fileCount,
        lastActivity: folder.lastActivityAt,
        type: folder.folderType,
      }));
  }

  private calculateGrowthTrend(folders: ProjectFolder[]): any {
    // Mock implementation - would need actual document creation timestamps
    const totalFiles = this.calculateTotalDocuments(folders);
    const estimatedGrowthRate = 0.05; // 5% monthly growth estimate

    return {
      currentMonth: totalFiles,
      lastMonth: Math.round(totalFiles * 0.95),
      growthRate: estimatedGrowthRate,
      projectedNextMonth: Math.round(totalFiles * 1.05),
    };
  }

  private getLastActivityDate(folders: ProjectFolder[]): Date | null {
    const dates = folders
      .filter(f => f.lastActivityAt)
      .map(f => new Date(f.lastActivityAt!));

    if (dates.length === 0) {
      return null;
    }

    return new Date(Math.max(...dates.map(d => d.getTime())));
  }

  private formatFolderTypeName(type: FolderType): string {
    const nameMap: Partial<Record<FolderType, string>> = {
      [FolderType.GENERAL]: 'General',
      [FolderType.DRAWINGS]: 'Drawings',
      [FolderType.SPECIFICATIONS]: 'Specifications',
      [FolderType.CONTRACTS]: 'Contracts',
      [FolderType.SUBMITTALS]: 'Submittals',
      [FolderType.RFIS]: 'RFIs',
      [FolderType.PHOTOS]: 'Photos',
      [FolderType.REPORTS]: 'Reports',
      [FolderType.SCHEDULES]: 'Schedules',
      [FolderType.PERMITS]: 'Permits',
      [FolderType.CORRESPONDENCE]: 'Correspondence',
      [FolderType.MEETING_NOTES]: 'Meeting Notes',
      [FolderType.PUNCH_LIST]: 'Punch List',
      [FolderType.CLOSEOUT]: 'Closeout',
      [FolderType.FINANCIAL]: 'Financial',
      [FolderType.SAFETY]: 'Safety',
      [FolderType.QUALITY]: 'Quality',
      [FolderType.TESTING]: 'Testing',
      [FolderType.AS_BUILTS]: 'As-Builts',
      [FolderType.WARRANTIES]: 'Warranties',
      [FolderType.CUSTOM]: 'Custom',
    };

    return nameMap[type] || type;
  }

  private formatMetricValues(metrics: any): any[] {
    const values = [];

    values.push({
      key: 'totalDocuments',
      value: metrics.totalDocuments,
      label: 'Total Documents',
      format: 'number',
    });

    values.push({
      key: 'totalFolders',
      value: metrics.totalFolders,
      label: 'Total Folders',
      format: 'number',
    });

    values.push({
      key: 'storageUsed',
      value: metrics.storage.totalSizeGB,
      label: 'Storage Used',
      format: 'decimal',
      unit: 'GB',
    });

    values.push({
      key: 'recentActivity',
      value: metrics.recentActivity.week,
      label: 'Active Folders (7d)',
      format: 'number',
    });

    values.push({
      key: 'avgFilesPerFolder',
      value: Math.round(metrics.averageFilesPerFolder),
      label: 'Avg Files/Folder',
      format: 'number',
    });

    return values;
  }
}