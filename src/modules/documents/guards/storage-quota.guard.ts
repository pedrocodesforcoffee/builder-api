import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentVersion } from '../entities/document-version.entity';

/**
 * Storage Quota Guard
 *
 * CRITICAL SECURITY: Enforces storage limits per project
 *
 * Prevents:
 * - Storage exhaustion attacks
 * - Excessive resource consumption
 * - Cost overruns
 */
@Injectable()
export class StorageQuotaGuard implements CanActivate {
  private readonly logger = new Logger(StorageQuotaGuard.name);

  // Default quota: 10GB per project
  private readonly DEFAULT_PROJECT_QUOTA =
    parseInt(process.env.DEFAULT_PROJECT_QUOTA || '10737418240', 10);

  constructor(
    @InjectRepository(DocumentVersion)
    private versionRepository: Repository<DocumentVersion>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { projectId } = request.params;
    const { fileSize } = request.body;

    // Skip if no projectId or fileSize
    if (!projectId || !fileSize) {
      return true;
    }

    try {
      // Calculate current storage usage for project
      const result = await this.versionRepository
        .createQueryBuilder('version')
        .select('SUM(version.fileSize)', 'totalSize')
        .innerJoin('version.document', 'document')
        .where('document.projectId = :projectId', { projectId })
        .getRawOne();

      const currentUsage = parseInt(result?.totalSize || '0', 10);
      const quota = this.DEFAULT_PROJECT_QUOTA;
      const newTotal = currentUsage + parseInt(fileSize, 10);

      this.logger.debug(
        `Storage check for project ${projectId}: ${currentUsage}/${quota} bytes (attempting to add ${fileSize})`,
      );

      if (newTotal > quota) {
        this.logger.warn(
          `Storage quota exceeded for project ${projectId}: ${newTotal}/${quota} bytes`,
        );

        throw new ForbiddenException({
          statusCode: 403,
          message: 'Project storage quota exceeded',
          error: 'StorageQuotaExceeded',
          details: {
            currentUsage,
            quota,
            attemptedSize: parseInt(fileSize, 10),
            available: Math.max(0, quota - currentUsage),
          },
        });
      }

      return true;
    } catch (error) {
      // Re-throw ForbiddenException
      if (error instanceof ForbiddenException) {
        throw error;
      }

      // Log other errors but allow request to proceed
      this.logger.error(
        `Error checking storage quota for project ${projectId}:`,
        error,
      );
      return true;
    }
  }
}
