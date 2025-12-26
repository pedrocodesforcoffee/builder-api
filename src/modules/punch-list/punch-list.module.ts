import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectLocation } from './entities/project-location.entity';
import { PunchList } from './entities/punch-list.entity';
import { PunchItem } from './entities/punch-item.entity';
import { PunchItemPhoto } from './entities/punch-item-photo.entity';
import { PunchItemHistory } from './entities/punch-item-history.entity';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { PunchListService } from './services/punch-list.service';
import { PunchListController } from './controllers/punch-list.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectLocation,
      PunchList,
      PunchItem,
      PunchItemPhoto,
      PunchItemHistory,
      Project,
      User,
    ]),
  ],
  controllers: [PunchListController],
  providers: [PunchListService],
  exports: [PunchListService],
})
export class PunchListModule {}
