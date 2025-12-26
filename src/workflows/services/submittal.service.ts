import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submittal } from '../entities/submittal.entity';
import { SubmittalReviewer } from '../entities/submittal-reviewer.entity';
import { SubmittalEvent } from '../entities/submittal-event.entity';
import { IntegrityService } from './integrity.service';
import {
  CreateSubmittalDto,
  UpdateSubmittalDto,
  SubmitForReviewDto,
  AddReviewerDto,
  AssignFinalStatusDto,
} from '../dto/workflow.dto';

@Injectable()
export class SubmittalService {
  constructor(
    @InjectRepository(Submittal)
    private readonly submittalRepo: Repository<Submittal>,
    @InjectRepository(SubmittalReviewer)
    private readonly reviewerRepo: Repository<SubmittalReviewer>,
    @InjectRepository(SubmittalEvent)
    private readonly eventRepo: Repository<SubmittalEvent>,
    private readonly integrityService: IntegrityService,
  ) {}

  async createSubmittal(projectId: string, userId: string, dto: CreateSubmittalDto) {
    // TODO: Implement create logic
    throw new Error('Not implemented');
  }

  async updateSubmittal(submittalId: string, userId: string, dto: UpdateSubmittalDto) {
    // TODO: Implement update logic
    throw new Error('Not implemented');
  }

  async submitForReview(submittalId: string, userId: string, dto: SubmitForReviewDto) {
    // TODO: Implement submit logic
    throw new Error('Not implemented');
  }

  async assignFinalStatus(submittalId: string, userId: string, dto: AssignFinalStatusDto) {
    // TODO: Implement final status logic
    throw new Error('Not implemented');
  }

  async getSubmittal(submittalId: string, userId: string) {
    const submittal = await this.submittalRepo.findOne({ where: { id: submittalId } });
    if (!submittal) throw new NotFoundException('Submittal not found');
    return submittal;
  }

  async listSubmittals(projectId: string, userId: string, query: any) {
    // TODO: Implement list logic with filters
    throw new Error('Not implemented');
  }
}
