import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { SafetyTopic } from './entities/safety-topic.entity';
import { ToolboxTalk } from './entities/toolbox-talk.entity';
import { ToolboxTalkAttendee } from './entities/toolbox-talk-attendee.entity';
import { SafetyObservation } from './entities/safety-observation.entity';
import { SafetyObservationAction } from './entities/safety-observation-action.entity';
import { SafetyIncident } from './entities/safety-incident.entity';
import { IncidentInvestigation } from './entities/incident-investigation.entity';
import { SafetyCertification } from './entities/safety-certification.entity';
import { WorkerSafetyCertification } from './entities/worker-safety-certification.entity';

// Related entities (imported from other modules)
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { WorkerProfile } from '../time-attendance/entities/worker-profile.entity';

// Controllers
import { SafetyController } from './controllers/safety.controller';

// Services
import { SafetyService } from './services/safety.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Safety Entities
      SafetyTopic,
      ToolboxTalk,
      ToolboxTalkAttendee,
      SafetyObservation,
      SafetyObservationAction,
      SafetyIncident,
      IncidentInvestigation,
      SafetyCertification,
      WorkerSafetyCertification,
      // Related Entities
      Project,
      User,
      WorkerProfile,
    ]),
  ],
  controllers: [SafetyController],
  providers: [SafetyService],
  exports: [SafetyService],
})
export class SafetyModule {}
