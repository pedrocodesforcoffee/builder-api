import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { DatabaseModule } from './modules/database/database.module';
import { HealthModule } from './modules/health/health.module';
import { LoggingModule } from './common/logging/logging.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { MetricsModule } from './modules/metrics/metrics.module';
// Temporarily disabled due to TypeScript compilation errors
// import { MembershipsModule } from './modules/memberships/memberships.module';
// import { CascadeModule } from './modules/cascade/cascade.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    LoggingModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    OrganizationsModule,
    ProjectsModule,
    MetricsModule,
    // Temporarily disabled - has TypeScript errors in permissions module
    // MembershipsModule,
    // CascadeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
