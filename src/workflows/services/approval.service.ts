import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalChain } from '../entities/approval-chain.entity';
import { DocumentApproval } from '../entities/document-approval.entity';
import { ApprovalAction } from '../entities/approval-action.entity';
import { IntegrityService } from './integrity.service';
import {
  CreateApprovalChainDto,
  ApproveDocumentDto,
  RejectDocumentDto,
  ConditionalApproveDto,
} from '../dto/workflow.dto';

@Injectable()
export class ApprovalService {
  constructor(
    @InjectRepository(ApprovalChain)
    private readonly chainRepo: Repository<ApprovalChain>,
    @InjectRepository(DocumentApproval)
    private readonly approvalRepo: Repository<DocumentApproval>,
    @InjectRepository(ApprovalAction)
    private readonly actionRepo: Repository<ApprovalAction>,
    private readonly integrityService: IntegrityService,
  ) {}

  async createApprovalChain(projectId: string, userId: string, dto: CreateApprovalChainDto) {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async approveDocument(approvalId: string, userId: string, dto: ApproveDocumentDto) {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async rejectDocument(approvalId: string, userId: string, dto: RejectDocumentDto) {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async conditionallyApprove(approvalId: string, userId: string, dto: ConditionalApproveDto) {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async getApprovalChain(chainId: string) {
    return this.chainRepo.findOne({ where: { id: chainId } });
  }

  async listPendingApprovals(projectId: string, userId: string) {
    // TODO: Implement
    throw new Error('Not implemented');
  }
}
