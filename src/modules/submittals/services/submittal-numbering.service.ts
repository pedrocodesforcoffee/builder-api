import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Submittal } from '../entities/submittal.entity';
import { Project } from '../../projects/entities/project.entity';

@Injectable()
export class SubmittalNumberingService {
  constructor(
    @InjectRepository(Submittal)
    private readonly submittalRepository: Repository<Submittal>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async generateNumber(
    projectId: string,
    manager?: EntityManager,
  ): Promise<{ number: string; sequenceNumber: number }> {
    const repo = manager?.getRepository(Submittal) || this.submittalRepository;
    const projectRepo = manager?.getRepository(Project) || this.projectRepository;

    const project = await projectRepo.findOne({ where: { id: projectId } });
    const projectPrefix = project?.number || 'PRJ';

    const result = await repo
      .createQueryBuilder('submittal')
      .select('COALESCE(MAX(submittal.sequenceNumber), 0) + 1', 'nextSeq')
      .where('submittal.projectId = :projectId', { projectId })
      .setLock('pessimistic_write')
      .getRawOne();

    const sequenceNumber = parseInt(result.nextSeq, 10);
    const paddedNumber = sequenceNumber.toString().padStart(4, '0');
    const number = `${projectPrefix}-SUB-${paddedNumber}`;

    return { number, sequenceNumber };
  }
}
