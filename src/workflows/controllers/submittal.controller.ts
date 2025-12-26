import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { SubmittalService } from '../services/submittal.service';
import {
  CreateSubmittalDto,
  UpdateSubmittalDto,
  SubmitForReviewDto,
  AssignFinalStatusDto,
  ListSubmittalsDto,
} from '../dto/workflow.dto';

/**
 * Submittal Controller
 *
 * Manages submittal workflows for contractor-to-architect review processes.
 *
 * Endpoints:
 * - POST   /projects/:projectId/submittals - Create submittal
 * - GET    /projects/:projectId/submittals - List submittals
 * - GET    /submittals/:submittalId - Get submittal details
 * - PUT    /submittals/:submittalId - Update submittal
 * - POST   /submittals/:submittalId/submit - Submit for review
 * - POST   /submittals/:submittalId/final-status - Assign final status
 * - DELETE /submittals/:submittalId - Delete submittal
 */
@Controller('workflows')
export class SubmittalController {
  constructor(private readonly submittalService: SubmittalService) {}

  @Post('projects/:projectId/submittals')
  async createSubmittal(
    @Param('projectId') projectId: string,
    @Body() dto: CreateSubmittalDto,
    @Request() req: any,
  ) {
    return this.submittalService.createSubmittal(projectId, req.user.id, dto);
  }

  @Get('projects/:projectId/submittals')
  async listSubmittals(
    @Param('projectId') projectId: string,
    @Query() query: ListSubmittalsDto,
    @Request() req: any,
  ) {
    return this.submittalService.listSubmittals(projectId, req.user.id, query);
  }

  @Get('submittals/:submittalId')
  async getSubmittal(
    @Param('submittalId') submittalId: string,
    @Request() req: any,
  ) {
    return this.submittalService.getSubmittal(submittalId, req.user.id);
  }

  @Put('submittals/:submittalId')
  async updateSubmittal(
    @Param('submittalId') submittalId: string,
    @Body() dto: UpdateSubmittalDto,
    @Request() req: any,
  ) {
    return this.submittalService.updateSubmittal(submittalId, req.user.id, dto);
  }

  @Post('submittals/:submittalId/submit')
  async submitForReview(
    @Param('submittalId') submittalId: string,
    @Body() dto: SubmitForReviewDto,
    @Request() req: any,
  ) {
    return this.submittalService.submitForReview(submittalId, req.user.id, dto);
  }

  @Post('submittals/:submittalId/final-status')
  async assignFinalStatus(
    @Param('submittalId') submittalId: string,
    @Body() dto: AssignFinalStatusDto,
    @Request() req: any,
  ) {
    return this.submittalService.assignFinalStatus(submittalId, req.user.id, dto);
  }
}
