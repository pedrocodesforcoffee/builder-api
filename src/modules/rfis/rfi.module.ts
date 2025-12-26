import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rfi } from './entities/rfi.entity';
import { RfiResponse } from './entities/rfi-response.entity';
import { RfiHistory } from './entities/rfi-history.entity';
import { RfiReference } from './entities/rfi-reference.entity';
import { Project } from '../projects/entities/project.entity';
import { RfiService } from './services/rfi.service';
import { RfiNumberingService } from './services/rfi-numbering.service';
import { RfiController } from './controllers/rfi.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Rfi,
      RfiResponse,
      RfiHistory,
      RfiReference,
      Project,
    ]),
  ],
  controllers: [RfiController],
  providers: [RfiService, RfiNumberingService],
  exports: [RfiService],
})
export class RfiModule {}
