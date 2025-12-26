import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PotentialChangeOrder,
  OwnerChangeOrder,
  CommitmentChangeOrder,
  Commitment,
  PrimeContract,
} from '../entities';
import { Project } from '../../projects/entities/project.entity';
import {
  GenerateChangeOrderLogReportDto,
  ChangeOrderLogReportDto,
  ChangeOrderLogLineDto,
  ChangeOrderTypeFilter,
} from '../dto/report';
import { ReportExcelExportService } from './report-excel-export.service';

/**
 * Change Order Log Report Service
 *
 * Generates comprehensive chronological logs of all change orders:
 * - PCOs (Potential Change Orders)
 * - OCOs (Owner Change Orders)
 * - CCOs (Commitment Change Orders)
 *
 * Shows complete audit trail with dates, amounts, statuses, and workflow.
 *
 * Business Logic:
 * - Aggregates all three change order types
 * - Chronological ordering by creation date
 * - Status tracking (draft, submitted, approved, rejected)
 * - Amount tracking (requested vs approved)
 * - Workflow audit (created by, approved by, etc.)
 */
@Injectable()
export class ChangeOrderLogReportService {
  private readonly logger = new Logger(ChangeOrderLogReportService.name);

  constructor(
    @InjectRepository(PotentialChangeOrder)
    private pcoRepo: Repository<PotentialChangeOrder>,
    @InjectRepository(OwnerChangeOrder)
    private ocoRepo: Repository<OwnerChangeOrder>,
    @InjectRepository(CommitmentChangeOrder)
    private ccoRepo: Repository<CommitmentChangeOrder>,
    @InjectRepository(Commitment)
    private commitmentRepo: Repository<Commitment>,
    @InjectRepository(PrimeContract)
    private primeContractRepo: Repository<PrimeContract>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    private excelExportService: ReportExcelExportService,
  ) {}

  /**
   * Generate Change Order Log Report
   */
  async generate(dto: GenerateChangeOrderLogReportDto): Promise<ChangeOrderLogReportDto> {
    this.logger.log(`Generating Change Order Log Report for project ${dto.projectId}`);

    // 1. Load project
    const project = await this.projectRepo.findOne({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${dto.projectId} not found`);
    }

    // 2. Determine type filter
    const typeFilter = dto.typeFilter || ChangeOrderTypeFilter.ALL;

    // 3. Load change orders based on filter
    const lines: ChangeOrderLogLineDto[] = [];
    let pcoCount = 0;
    let ocoCount = 0;
    let ccoCount = 0;

    if (typeFilter === ChangeOrderTypeFilter.ALL || typeFilter === ChangeOrderTypeFilter.PCO) {
      const pcoLines = await this.loadPCOLines(dto.projectId, dto.startDate, dto.endDate);
      lines.push(...pcoLines);
      pcoCount = pcoLines.length;
    }

    if (typeFilter === ChangeOrderTypeFilter.ALL || typeFilter === ChangeOrderTypeFilter.OCO) {
      const ocoLines = await this.loadOCOLines(dto.projectId, dto.startDate, dto.endDate);
      lines.push(...ocoLines);
      ocoCount = ocoLines.length;
    }

    if (typeFilter === ChangeOrderTypeFilter.ALL || typeFilter === ChangeOrderTypeFilter.CCO) {
      const ccoLines = await this.loadCCOLines(dto.projectId, dto.startDate, dto.endDate);
      lines.push(...ccoLines);
      ccoCount = ccoLines.length;
    }

    // 4. Sort lines by creation date (newest first)
    lines.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // 5. Calculate totals
    let totalAmount = 0;
    let totalApprovedAmount = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    for (const line of lines) {
      totalAmount += line.amount;
      totalApprovedAmount += line.approvedAmount || 0;

      const status = line.status.toLowerCase();
      if (status.includes('pending') || status.includes('submitted') || status.includes('review')) {
        pendingCount++;
      } else if (status.includes('approved')) {
        approvedCount++;
      } else if (status.includes('rejected')) {
        rejectedCount++;
      }
    }

    // 6. Build and return report
    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    return {
      projectId: project.id,
      projectName: project.name,
      typeFilter,
      startDate,
      endDate,
      totalCount: lines.length,
      pcoCount,
      ocoCount,
      ccoCount,
      totalAmount: Number(totalAmount.toFixed(2)),
      totalApprovedAmount: Number(totalApprovedAmount.toFixed(2)),
      pendingCount,
      approvedCount,
      rejectedCount,
      lines,
      generatedAt: new Date(),
    };
  }

  /**
   * Export Change Order Log Report to Excel
   */
  async exportToExcel(dto: GenerateChangeOrderLogReportDto): Promise<Buffer> {
    this.logger.log(`Exporting Change Order Log Report to Excel for project ${dto.projectId}`);

    const report = await this.generate(dto);
    return await this.excelExportService.exportChangeOrderLogToExcel(report);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Load PCO lines
   */
  private async loadPCOLines(
    projectId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ChangeOrderLogLineDto[]> {
    const queryBuilder = this.pcoRepo
      .createQueryBuilder('pco')
      .leftJoinAndSelect('pco.createdBy', 'createdBy')
      .leftJoinAndSelect('pco.approvedBy', 'approvedBy')
      .leftJoinAndSelect('pco.rejectedBy', 'rejectedBy')
      .leftJoinAndSelect('pco.primeContract', 'primeContract')
      .where('pco.projectId = :projectId', { projectId });

    if (startDate) {
      queryBuilder.andWhere('pco.createdAt >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      queryBuilder.andWhere('pco.createdAt <= :endDate', { endDate: new Date(endDate) });
    }

    const pcos = await queryBuilder.getMany();

    return pcos.map((pco) => ({
      changeOrderId: pco.id,
      type: 'PCO',
      number: pco.pcoNumber,
      title: pco.title,
      description: pco.description || '',
      status: pco.status,
      changeType: null,
      priority: pco.priority || null,
      amount: Number(pco.totalAmount),
      approvedAmount: null,
      relatedEntity: pco.primeContract?.contractNumber || null,
      createdAt: pco.createdAt,
      createdByName: pco.createdBy?.name || 'Unknown',
      submittedAt: pco.submittedAt || null,
      approvedAt: pco.approvedAt || null,
      approvedByName: pco.approvedBy?.name || null,
      rejectedAt: pco.rejectedAt || null,
      rejectedByName: pco.rejectedBy?.name || null,
      rejectionReason: pco.rejectionReason || null,
    }));
  }

  /**
   * Load OCO lines
   */
  private async loadOCOLines(
    projectId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ChangeOrderLogLineDto[]> {
    const queryBuilder = this.ocoRepo
      .createQueryBuilder('oco')
      .leftJoinAndSelect('oco.createdBy', 'createdBy')
      .leftJoinAndSelect('oco.approvedBy', 'approvedBy')
      .leftJoinAndSelect('oco.rejectedBy', 'rejectedBy')
      .leftJoinAndSelect('oco.primeContract', 'primeContract')
      .where('oco.projectId = :projectId', { projectId });

    if (startDate) {
      queryBuilder.andWhere('oco.createdAt >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      queryBuilder.andWhere('oco.createdAt <= :endDate', { endDate: new Date(endDate) });
    }

    const ocos = await queryBuilder.getMany();

    return ocos.map((oco) => ({
      changeOrderId: oco.id,
      type: 'OCO',
      number: oco.ocoNumber,
      title: oco.title,
      description: oco.description || '',
      status: oco.status,
      changeType: oco.changeType,
      priority: oco.priority || null,
      amount: Number(oco.amount),
      approvedAmount: oco.approvedAmount ? Number(oco.approvedAmount) : null,
      relatedEntity: oco.primeContract?.contractNumber || null,
      createdAt: oco.createdAt,
      createdByName: oco.createdBy?.name || 'Unknown',
      submittedAt: oco.submittedAt || null,
      approvedAt: oco.approvedAt || null,
      approvedByName: oco.approvedBy?.name || null,
      rejectedAt: oco.rejectedAt || null,
      rejectedByName: oco.rejectedBy?.name || null,
      rejectionReason: oco.rejectionReason || null,
    }));
  }

  /**
   * Load CCO lines
   */
  private async loadCCOLines(
    projectId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ChangeOrderLogLineDto[]> {
    const queryBuilder = this.ccoRepo
      .createQueryBuilder('cco')
      .leftJoinAndSelect('cco.createdBy', 'createdBy')
      .leftJoinAndSelect('cco.approvedBy', 'approvedBy')
      .leftJoinAndSelect('cco.rejectedBy', 'rejectedBy')
      .leftJoinAndSelect('cco.commitment', 'commitment')
      .where('cco.projectId = :projectId', { projectId });

    if (startDate) {
      queryBuilder.andWhere('cco.createdAt >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      queryBuilder.andWhere('cco.createdAt <= :endDate', { endDate: new Date(endDate) });
    }

    const ccos = await queryBuilder.getMany();

    return ccos.map((cco) => ({
      changeOrderId: cco.id,
      type: 'CCO',
      number: cco.ccoNumber,
      title: cco.title,
      description: cco.description || '',
      status: cco.status,
      changeType: cco.changeType,
      priority: null,
      amount: Number(cco.amount),
      approvedAmount: cco.approvedAmount ? Number(cco.approvedAmount) : null,
      relatedEntity: cco.commitment ? `${cco.commitment.number} - ${cco.commitment.vendorName}` : null,
      createdAt: cco.createdAt,
      createdByName: cco.createdBy?.name || 'Unknown',
      submittedAt: cco.submittedAt || null,
      approvedAt: cco.approvedAt || null,
      approvedByName: cco.approvedBy?.name || null,
      rejectedAt: cco.rejectedAt || null,
      rejectedByName: cco.rejectedBy?.name || null,
      rejectionReason: cco.rejectionReason || null,
    }));
  }

  /**
   * Generate report (alias for generate method for controller compatibility)
   */
  async generateReport(dto: any): Promise<any> {
    return this.generate(dto);
  }

}
