import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectPhaseService } from '../services/project-phase.service';
import { CriticalPathService } from '../services/critical-path.service';
import { CreatePhaseDto } from '../dto/phases/create-phase.dto';
import { UpdatePhaseDto } from '../dto/phases/update-phase.dto';

@Controller('api')
@UseGuards(JwtAuthGuard)
export class ProjectPhaseController {
  constructor(
    private readonly phaseService: ProjectPhaseService,
    private readonly criticalPathService: CriticalPathService,
  ) {}

  @Post('projects/:projectId/phases')
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreatePhaseDto,
    @Request() req: any,
  ) {
    return await this.phaseService.create(projectId, dto, req.user.sub);
  }

  @Get('projects/:projectId/phases')
  async findAll(@Param('projectId') projectId: string) {
    return await this.phaseService.findAllByProject(projectId);
  }

  @Get('phases/:id')
  async findOne(@Param('id') id: string) {
    return await this.phaseService.findOne(id);
  }

  @Put('phases/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePhaseDto,
    @Request() req: any,
  ) {
    return await this.phaseService.update(id, dto, req.user.sub);
  }

  @Delete('phases/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.phaseService.remove(id);
  }

  @Post('phases/:id/start')
  async startPhase(@Param('id') id: string, @Request() req: any) {
    return await this.phaseService.startPhase(id, req.user.sub);
  }

  @Post('phases/:id/complete')
  async completePhase(@Param('id') id: string, @Request() req: any) {
    return await this.phaseService.completePhase(id, req.user.sub);
  }

  @Get('projects/:projectId/phases/critical-path')
  async getCriticalPath(@Param('projectId') projectId: string) {
    return await this.criticalPathService.calculateCriticalPath(projectId);
  }
}
