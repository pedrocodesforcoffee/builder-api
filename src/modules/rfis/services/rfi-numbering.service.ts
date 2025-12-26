import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Rfi } from '../entities/rfi.entity';
import { Project } from '../../projects/entities/project.entity';

@Injectable()
export class RfiNumberingService {
  constructor(
    @InjectRepository(Rfi)
    private readonly rfiRepository: Repository<Rfi>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async generateNumber(
    projectId: string,
    manager?: EntityManager,
  ): Promise<{ number: string; sequenceNumber: number }> {
    const repo = manager?.getRepository(Rfi) || this.rfiRepository;
    const projectRepo = manager?.getRepository(Project) || this.projectRepository;

    // Get project for prefix
    const project = await projectRepo.findOne({ where: { id: projectId } });
    const projectPrefix = project?.number || 'PRJ';

    // Get next sequence number
    // Note: This runs within a transaction in the calling service, providing isolation
    const result = await repo
      .createQueryBuilder('rfi')
      .select('COALESCE(MAX(rfi.sequenceNumber), 0) + 1', 'nextSeq')
      .where('rfi.projectId = :projectId', { projectId })
      .getRawOne();

    const sequenceNumber = parseInt(result.nextSeq, 10);
    const paddedNumber = sequenceNumber.toString().padStart(4, '0');
    const number = `${projectPrefix}-RFI-${paddedNumber}`;

    return { number, sequenceNumber };
  }
}
