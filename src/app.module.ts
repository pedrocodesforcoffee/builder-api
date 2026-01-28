import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { DatabaseModule } from './modules/database/database.module';
import { HealthModule } from './modules/health/health.module';
import { LoggingModule } from './common/logging/logging.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { RelationshipsModule } from './modules/relationships/relationships.module';
import { SearchModule } from './modules/search/search.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { FinancialsModule } from './modules/financials/financials.module';
import { QuickBooksModule } from './modules/integrations/quickbooks/quickbooks.module';
import { RfiModule } from './modules/rfis/rfi.module';
import { SubmittalModule } from './modules/submittals/submittal.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { DailyReportsModule } from './modules/daily-reports/daily-reports.module';
import { PunchListModule } from './modules/punch-list/punch-list.module';
import { TimeAttendanceModule } from './modules/time-attendance/time-attendance.module';
import { SafetyModule } from './modules/safety/safety.module';
import { FieldNotesModule } from './modules/field-notes/field-notes.module';
// Temporarily disabled due to TypeScript compilation errors - has 38 compilation errors
// import { MembershipsModule } from './modules/memberships/memberships.module';
// import { CascadeModule } from './modules/cascade/cascade.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    LoggingModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    DashboardModule,
    OrganizationsModule,
    ProjectsModule,
    MetricsModule,
    RelationshipsModule,
    SearchModule,
    DocumentsModule,
    WorkflowsModule,
    FinancialsModule,
    QuickBooksModule,
    RfiModule,
    SubmittalModule,
    AnalyticsModule,
    DailyReportsModule,
    PunchListModule,
    TimeAttendanceModule,
    SafetyModule,
    FieldNotesModule,
    // Temporarily disabled - has TypeScript errors (38 errors in permissions and memberships modules)
    // MembershipsModule,
    // CascadeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
