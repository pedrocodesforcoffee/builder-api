import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { AnalyticsSnapshot } from './entities/analytics-snapshot.entity';
import { UserPerformanceMetrics } from './entities/user-performance-metrics.entity';
import { SavedReport } from './entities/saved-report.entity';
import { Rfi } from '../rfis/entities/rfi.entity';
import { RfiHistory } from '../rfis/entities/rfi-history.entity';
import { Submittal } from '../submittals/entities/submittal.entity';
import { SubmittalResponse } from '../submittals/entities/submittal-response.entity';
import { Project } from '../projects/entities/project.entity';

// Services
import { RfiAnalyticsService } from './services/rfi-analytics.service';
import { SubmittalAnalyticsService } from './services/submittal-analytics.service';
import { ExportService } from './services/export.service';
import { ReportService } from './services/report.service';
import { AnalyticsSnapshotService } from './services/analytics-snapshot.service';

// Controllers
import { AnalyticsController } from './controllers/analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Analytics entities
      AnalyticsSnapshot,
      UserPerformanceMetrics,
      SavedReport,
      // Related entities
      Rfi,
      RfiHistory,
      Submittal,
      SubmittalResponse,
      Project,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [AnalyticsController],
  providers: [
    RfiAnalyticsService,
    SubmittalAnalyticsService,
    ExportService,
    ReportService,
    AnalyticsSnapshotService,
  ],
  exports: [
    RfiAnalyticsService,
    SubmittalAnalyticsService,
    ExportService,
    ReportService,
    AnalyticsSnapshotService,
  ],
})
export class AnalyticsModule {}
