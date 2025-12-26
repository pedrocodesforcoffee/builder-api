import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { ApprovalService } from '../services/approval.service';
import {
  CreateApprovalChainDto,
  ApproveDocumentDto,
  RejectDocumentDto,
  ConditionalApproveDto,
  ListApprovalsDto,
} from '../dto/workflow.dto';

@Controller()
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Post('projects/:projectId/approval-chains')
  async createApprovalChain(
    @Param('projectId') projectId: string,
    @Body() dto: CreateApprovalChainDto,
    @Request() req: any,
  ) {
    return this.approvalService.createApprovalChain(projectId, req.user.id, dto);
  }

  @Get('projects/:projectId/approvals/pending')
  async listPendingApprovals(
    @Param('projectId') projectId: string,
    @Query() query: ListApprovalsDto,
    @Request() req: any,
  ) {
    return this.approvalService.listPendingApprovals(projectId, req.user.id);
  }

  @Post('approvals/:approvalId/approve')
  async approveDocument(
    @Param('approvalId') approvalId: string,
    @Body() dto: ApproveDocumentDto,
    @Request() req: any,
  ) {
    return this.approvalService.approveDocument(approvalId, req.user.id, dto);
  }

  @Post('approvals/:approvalId/reject')
  async rejectDocument(
    @Param('approvalId') approvalId: string,
    @Body() dto: RejectDocumentDto,
    @Request() req: any,
  ) {
    return this.approvalService.rejectDocument(approvalId, req.user.id, dto);
  }

  @Post('approvals/:approvalId/conditional-approve')
  async conditionallyApprove(
    @Param('approvalId') approvalId: string,
    @Body() dto: ConditionalApproveDto,
    @Request() req: any,
  ) {
    return this.approvalService.conditionallyApprove(approvalId, req.user.id, dto);
  }
}
