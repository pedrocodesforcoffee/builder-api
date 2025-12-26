import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { DailyReportsController } from './controllers/daily-reports.controller';
import { DailyReportsService } from './services/daily-reports.service';
import { WeatherService } from './services/weather.service';
import { PdfService } from './services/pdf.service';

import { DailyReport } from './entities/daily-report.entity';
import { DailyManpower } from './entities/daily-manpower.entity';
import { DailyEquipment } from './entities/daily-equipment.entity';
import { DailyWork } from './entities/daily-work.entity';
import { DailyMaterial } from './entities/daily-material.entity';
import { DailyInspection } from './entities/daily-inspection.entity';
import { DailyIncident } from './entities/daily-incident.entity';
import { DailyVisitor } from './entities/daily-visitor.entity';
import { DailyDelay } from './entities/daily-delay.entity';

import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';

/**
 * Daily Reports Module
 * Provides comprehensive daily construction report management
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Daily Report Entities
      DailyReport,
      DailyManpower,
      DailyEquipment,
      DailyWork,
      DailyMaterial,
      DailyInspection,
      DailyIncident,
      DailyVisitor,
      DailyDelay,
      // Related Entities (for relationships)
      Project,
      User,
    ]),
    HttpModule, // For weather API requests
    ConfigModule, // For environment variables
  ],
  controllers: [DailyReportsController],
  providers: [DailyReportsService, WeatherService, PdfService],
  exports: [DailyReportsService], // Export service for use in other modules
})
export class DailyReportsModule {}
