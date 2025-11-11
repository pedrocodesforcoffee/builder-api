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
import { ProjectMilestoneService } from '../services/project-milestone.service';
import { CreateMilestoneDto } from '../dto/milestones/create-milestone.dto';
import { UpdateMilestoneDto } from '../dto/milestones/update-milestone.dto';

@Controller('api')
@UseGuards(JwtAuthGuard)
export class ProjectMilestoneController {
  constructor(
    private readonly milestoneService: ProjectMilestoneService,
  ) {}

  @Post('phases/:phaseId/milestones')
  async create(
    @Param('phaseId') phaseId: string,
    @Body() dto: CreateMilestoneDto & { projectId: string },
    @Request() req: any,
  ) {
    return await this.milestoneService.create(
      dto.projectId,
      phaseId,
      dto,
      req.user.sub,
    );
  }

  @Get('phases/:phaseId/milestones')
  async findAllByPhase(@Param('phaseId') phaseId: string) {
    return await this.milestoneService.findAllByPhase(phaseId);
  }

  @Get('projects/:projectId/milestones')
  async findAllByProject(@Param('projectId') projectId: string) {
    return await this.milestoneService.findAllByProject(projectId);
  }

  @Get('projects/:projectId/milestones/upcoming')
  async getUpcoming(@Param('projectId') projectId: string) {
    return await this.milestoneService.getUpcomingMilestones(projectId);
  }

  @Get('projects/:projectId/milestones/overdue')
  async getOverdue(@Param('projectId') projectId: string) {
    return await this.milestoneService.getOverdueMilestones(projectId);
  }

  @Get('milestones/:id')
  async findOne(@Param('id') id: string) {
    return await this.milestoneService.findOne(id);
  }

  @Put('milestones/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMilestoneDto,
    @Request() req: any,
  ) {
    return await this.milestoneService.update(id, dto, req.user.sub);
  }

  @Delete('milestones/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.milestoneService.remove(id);
  }

  @Post('milestones/:id/complete')
  async complete(
    @Param('id') id: string,
    @Body() body: { actualDate: string },
    @Request() req: any,
  ) {
    return await this.milestoneService.completeMilestone(
      id,
      body.actualDate,
      req.user.sub,
    );
  }

  @Post('milestones/:id/approve')
  async approve(@Param('id') id: string, @Request() req: any) {
    return await this.milestoneService.approveMilestone(id, req.user.sub);
  }
}
