import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Time Attendance Entities
import { ProjectGeofence } from './entities/project-geofence.entity';
import { WorkerProfile } from './entities/worker-profile.entity';
import { TimeEntry } from './entities/time-entry.entity';
import { ClockEvent } from './entities/clock-event.entity';
import { TimeEntryCostAllocation } from './entities/time-entry-cost-allocation.entity';
import { CrewTimesheet } from './entities/crew-timesheet.entity';

// Related Entities from other modules
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { CostCode } from '../financials/entities/cost-code.entity';

// Controllers
import { GeofenceController } from './controllers/geofence.controller';
import { WorkerProfileController } from './controllers/worker-profile.controller';
import { TimeAttendanceController } from './controllers/time-attendance.controller';
import { CrewTimesheetController } from './controllers/crew-timesheet.controller';

// Services
import { GeofenceService } from './services/geofence.service';
import { WorkerProfileService } from './services/worker-profile.service';
import { OvertimeCalculatorService } from './services/overtime-calculator.service';
import { TimeAttendanceService } from './services/time-attendance.service';
import { CrewTimesheetService } from './services/crew-timesheet.service';

/**
 * TimeAttendanceModule
 *
 * Comprehensive time tracking and payroll preparation module:
 * - GPS-based clock in/out with geofencing
 * - Multiple overtime calculation engines (Standard, California, Union, Construction, Custom)
 * - Break and lunch tracking
 * - Cost code allocation
 * - Approval workflows (DRAFT → SUBMITTED → APPROVED → LOCKED)
 * - Crew timesheet bulk entry
 * - Daily/weekly reporting
 * - Payroll export (CSV, JSON, QuickBooks, ADP)
 *
 * @module TimeAttendanceModule
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Time Attendance Entities
      ProjectGeofence,
      WorkerProfile,
      TimeEntry,
      ClockEvent,
      TimeEntryCostAllocation,
      CrewTimesheet,
      // Related Entities
      Project,
      User,
      Organization,
      CostCode,
    ]),
  ],
  controllers: [
    GeofenceController,
    WorkerProfileController,
    TimeAttendanceController,
    CrewTimesheetController,
  ],
  providers: [
    GeofenceService,
    WorkerProfileService,
    OvertimeCalculatorService,
    TimeAttendanceService,
    CrewTimesheetService,
  ],
  exports: [
    TimeAttendanceService, // Export for integration with other modules (e.g., Daily Reports)
    WorkerProfileService, // Export for user profile integration
  ],
})
export class TimeAttendanceModule {}
