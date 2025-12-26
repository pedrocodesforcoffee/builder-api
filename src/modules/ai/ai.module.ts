/**
 * AI Module
 * Centralized AI integration for construction management
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { AiOperationLog } from './entities/ai-operation-log.entity';
import { AiCache } from './entities/ai-cache.entity';
import { OrganizationAiBudget } from './entities/organization-ai-budget.entity';
import { ProjectProfile } from './entities/project-profile.entity';
import { Recommendation } from './entities/recommendation.entity';
import { LessonLearned } from './entities/lesson-learned.entity';
import { ProjectPattern } from './entities/project-pattern.entity';
import { SubcontractorPerformance } from './entities/subcontractor-performance.entity';
import { AiNotification } from './entities/ai-notification.entity';

// Services
import { AiService } from './services/ai.service';
import { OpenAiClientService } from './services/openai-client.service';
import { AiPromptService } from './services/ai-prompt.service';
import { AiCostTrackingService } from './services/ai-cost-tracking.service';
import { AiCacheService } from './services/ai-cache.service';
import { DocumentIntelligenceService } from './services/document-intelligence.service';
import { ProjectIntelligenceService } from './services/project-intelligence.service';
import { AutoActionsService } from './services/auto-actions.service';
import { AnalyticsForecastingService } from './services/analytics-forecasting.service';
import { OrganizationAiBudgetService } from './services/organization-ai-budget.service';
import { RecommendationsService } from './services/recommendations.service';
import { PatternCalculatorService } from './services/pattern-calculator.service';
import { RecommendationTriggersService } from './services/recommendation-triggers.service';
import { LessonCaptureService } from './services/lesson-capture.service';
import { AiDashboardService } from './services/ai-dashboard.service';
import { AiNotificationService } from './services/ai-notification.service';

// Import entities from other modules
import { Document } from '../documents/entities/document.entity';
import { DocumentVersion } from '../documents/entities/document-version.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { CostCode } from '../financials/entities/cost-code.entity';
import { BudgetLineItem } from '../financials/entities/budget-line-item.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../users/entities/user.entity';

// Controllers
import { AiController } from './controllers/ai.controller';
import { DocumentIntelligenceController } from './controllers/document-intelligence.controller';
import { ProjectIntelligenceController } from './controllers/project-intelligence.controller';
import { AutoActionsController } from './controllers/auto-actions.controller';
import { AnalyticsForecastingController } from './controllers/analytics-forecasting.controller';
import { OrganizationAiBudgetController } from './controllers/organization-ai-budget.controller';
import { RecommendationsController } from './controllers/recommendations.controller';
import { AiDashboardController } from './controllers/ai-dashboard.controller';
import { AiNotificationController } from './controllers/ai-notification.controller';

// Gateways
import { AiStreamingGateway } from './gateways/ai-streaming.gateway';

// Schedulers
import { AiSchedulerService } from './schedulers/ai-scheduler.service';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback-secret',
      signOptions: { expiresIn: '1d' },
    }),
    TypeOrmModule.forFeature([
      // AI entities
      AiOperationLog,
      AiCache,
      OrganizationAiBudget,
      ProjectProfile,
      Recommendation,
      LessonLearned,
      ProjectPattern,
      SubcontractorPerformance,
      AiNotification,
      // External entities needed by AI services
      Document,
      DocumentVersion,
      Project,
      ProjectMember,
      CostCode,
      BudgetLineItem,
      Organization,
      User,
    ]),
  ],
  providers: [
    // Core services
    AiService,
    OpenAiClientService,
    AiPromptService,
    AiCostTrackingService,
    AiCacheService,
    // Feature services
    DocumentIntelligenceService,
    ProjectIntelligenceService,
    AutoActionsService,
    AnalyticsForecastingService,
    OrganizationAiBudgetService,
    RecommendationsService,
    PatternCalculatorService,
    RecommendationTriggersService,
    LessonCaptureService,
    AiDashboardService,
    AiNotificationService,
    // Gateways
    AiStreamingGateway,
    // Schedulers
    AiSchedulerService,
  ],
  controllers: [
    AiController,
    DocumentIntelligenceController,
    ProjectIntelligenceController,
    AutoActionsController,
    AnalyticsForecastingController,
    OrganizationAiBudgetController,
    RecommendationsController,
    AiDashboardController,
    AiNotificationController,
  ],
  exports: [
    AiService,
    AiCostTrackingService,
    AiCacheService,
    DocumentIntelligenceService,
    ProjectIntelligenceService,
    AutoActionsService,
    AnalyticsForecastingService,
    RecommendationsService,
    PatternCalculatorService,
    RecommendationTriggersService,
    LessonCaptureService,
    AiDashboardService,
    AiNotificationService,
  ],
})
export class AiModule {}
