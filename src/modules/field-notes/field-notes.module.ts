import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { FieldNote } from './entities/field-note.entity';
import { FieldNoteTemplate } from './entities/field-note-template.entity';
import { FieldNoteAttachment } from './entities/field-note-attachment.entity';
import { FieldNoteLink } from './entities/field-note-link.entity';
import { FieldNoteComment } from './entities/field-note-comment.entity';
import { FieldNoteHistory } from './entities/field-note-history.entity';

// Related entities (imported from other modules)
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';

// Controllers
import { FieldNoteController } from './controllers/field-note.controller';
import { FieldNoteTemplateController } from './controllers/field-note-template.controller';

// Services
import { FieldNoteService } from './services/field-note.service';
import { FieldNoteTemplateService } from './services/field-note-template.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Field Notes Entities
      FieldNote,
      FieldNoteTemplate,
      FieldNoteAttachment,
      FieldNoteLink,
      FieldNoteComment,
      FieldNoteHistory,
      // Related Entities
      Project,
      User,
      Organization,
    ]),
  ],
  controllers: [FieldNoteController, FieldNoteTemplateController],
  providers: [FieldNoteService, FieldNoteTemplateService],
  exports: [FieldNoteService, FieldNoteTemplateService],
})
export class FieldNotesModule {}
