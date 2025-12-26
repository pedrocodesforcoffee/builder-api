import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import PDFDocument from 'pdfkit';
import {
  Transmittal,
  TransmittalDocument,
  TransmittalRecipient,
  DistributionList,
  DistributionListMember,
  Document,
  ProjectMember,
} from '../entities';
import {
  TransmittalStatus,
  RecipientStatus,
  DocumentAction,
  ProjectRole,
  MemberStatus,
} from '../enums/permission.enums';
import { DrawingDiscipline } from '../enums';
import { S3Service } from '../../../common/services/s3.service';
import { WatermarkService } from './watermark.service';
import { PermissionService } from './permission.service';

/**
 * Transmittal Service
 *
 * Manages formal document distribution via transmittals.
 *
 * Features:
 * - Create transmittals with documents and recipients
 * - Auto-generate transmittal numbers
 * - Distribution list integration
 * - Cover sheet generation (PDF)
 * - Watermarked document packages
 * - Email notifications (placeholder for mail service)
 * - Acknowledgment tracking
 * - Response requirement management
 */
@Injectable()
export class TransmittalService {
  constructor(
    @InjectRepository(Transmittal)
    private readonly transmittalRepo: Repository<Transmittal>,
    @InjectRepository(TransmittalDocument)
    private readonly transmittalDocRepo: Repository<TransmittalDocument>,
    @InjectRepository(TransmittalRecipient)
    private readonly recipientRepo: Repository<TransmittalRecipient>,
    @InjectRepository(DistributionList)
    private readonly distListRepo: Repository<DistributionList>,
    @InjectRepository(DistributionListMember)
    private readonly distMemberRepo: Repository<DistributionListMember>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(ProjectMember)
    private readonly memberRepo: Repository<ProjectMember>,
    private readonly s3Service: S3Service,
    private readonly watermarkService: WatermarkService,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * Create a new transmittal (draft)
   */
  async createTransmittal(
    userId: string,
    projectId: string,
    data: {
      subject: string;
      message?: string;
      responseRequired?: boolean;
      responseDueDate?: Date;
      watermarkDownloads?: boolean;
      expiresAt?: Date;
      includeCoverSheet?: boolean;
      coverSheetTemplate?: string;
    },
  ): Promise<Transmittal> {
    // Verify user is project member
    const member = await this.permissionService.getMemberByUserId(userId, projectId);
    if (!member || member.status !== MemberStatus.ACTIVE) {
      throw new ForbiddenException('Not a project member');
    }

    // Generate transmittal number
    const transmittalNumber = await this.generateTransmittalNumber(projectId);

    // Create transmittal
    const transmittal = this.transmittalRepo.create({
      projectId,
      transmittalNumber,
      subject: data.subject,
      message: data.message || null,
      responseRequired: data.responseRequired ?? false,
      responseDueDate: data.responseDueDate || null,
      watermarkDownloads: data.watermarkDownloads ?? false,
      expiresAt: data.expiresAt || null,
      includeCoverSheet: data.includeCoverSheet ?? true,
      coverSheetTemplate: data.coverSheetTemplate || null,
      status: TransmittalStatus.DRAFT,
      sentById: userId,
    });

    return this.transmittalRepo.save(transmittal);
  }

  /**
   * Add documents to transmittal
   */
  async addDocuments(
    transmittalId: string,
    userId: string,
    documentIds: string[],
  ): Promise<TransmittalDocument[]> {
    const transmittal = await this.getTransmittal(transmittalId, userId);

    if (transmittal.status !== TransmittalStatus.DRAFT) {
      throw new BadRequestException('Cannot modify sent transmittal');
    }

    // Verify user has permission to share all documents
    for (const docId of documentIds) {
      await this.permissionService.enforcePermission(
        userId,
        docId,
        DocumentAction.SHARE,
      );
    }

    // Check documents exist
    const documents = await this.documentRepo.findBy({
      id: In(documentIds),
    });

    if (documents.length !== documentIds.length) {
      throw new NotFoundException('One or more documents not found');
    }

    // Create transmittal documents
    const transmittalDocs: TransmittalDocument[] = [];
    for (const doc of documents) {
      const transmittalDoc = this.transmittalDocRepo.create({
        transmittalId,
        documentId: doc.id,
        versionId: doc.currentVersionId || undefined,
      });
      const saved = await this.transmittalDocRepo.save(transmittalDoc);
      transmittalDocs.push(saved);
    }

    return transmittalDocs;
  }

  /**
   * Add recipients to transmittal (manual or from distribution list)
   */
  async addRecipients(
    transmittalId: string,
    userId: string,
    data: {
      distributionListId?: string;
      manualRecipients?: Array<{
        userId?: string;
        email: string;
        name: string;
        company?: string;
      }>;
    },
  ): Promise<TransmittalRecipient[]> {
    const transmittal = await this.getTransmittal(transmittalId, userId);

    if (transmittal.status !== TransmittalStatus.DRAFT) {
      throw new BadRequestException('Cannot modify sent transmittal');
    }

    const recipients: TransmittalRecipient[] = [];

    // Add from distribution list
    if (data.distributionListId) {
      const distList = await this.distListRepo.findOne({
        where: {
          id: data.distributionListId,
          projectId: transmittal.projectId,
        },
      });

      if (!distList) {
        throw new NotFoundException('Distribution list not found');
      }

      // Get members (both manual and auto-computed)
      const members = await this.getDistributionListMembers(data.distributionListId);

      for (const member of members) {
        const recipient = this.recipientRepo.create({
          transmittalId,
          userId: member.userId,
          email: member.email,
          name: member.name,
          company: member.company,
          status: RecipientStatus.PENDING,
        });
        recipients.push(await this.recipientRepo.save(recipient));
      }
    }

    // Add manual recipients
    if (data.manualRecipients && data.manualRecipients.length > 0) {
      for (const recipientData of data.manualRecipients) {
        const recipient = this.recipientRepo.create({
          transmittalId,
          userId: recipientData.userId || null,
          email: recipientData.email,
          name: recipientData.name,
          company: recipientData.company || null,
          status: RecipientStatus.PENDING,
        });
        recipients.push(await this.recipientRepo.save(recipient));
      }
    }

    return recipients;
  }

  /**
   * Send transmittal
   */
  async sendTransmittal(
    transmittalId: string,
    userId: string,
  ): Promise<Transmittal> {
    const transmittal = await this.transmittalRepo.findOne({
      where: { id: transmittalId },
      relations: ['documents', 'recipients'],
    });

    if (!transmittal) {
      throw new NotFoundException('Transmittal not found');
    }

    // Verify user is sender
    if (transmittal.sentById !== userId) {
      throw new ForbiddenException('Only sender can send transmittal');
    }

    if (transmittal.status !== TransmittalStatus.DRAFT) {
      throw new BadRequestException('Transmittal already sent');
    }

    // Validate transmittal has documents and recipients
    if (!transmittal.documents || transmittal.documents.length === 0) {
      throw new BadRequestException('Transmittal must have at least one document');
    }

    if (!transmittal.recipients || transmittal.recipients.length === 0) {
      throw new BadRequestException('Transmittal must have at least one recipient');
    }

    // Generate cover sheet if requested
    if (transmittal.includeCoverSheet) {
      const coverSheetS3Key = await this.generateCoverSheet(transmittal);
      transmittal.coverSheetS3Key = coverSheetS3Key;
    }

    // Update status
    transmittal.status = TransmittalStatus.SENT;
    transmittal.sentAt = new Date();

    // Update recipients to delivered
    for (const recipient of transmittal.recipients) {
      recipient.status = RecipientStatus.DELIVERED;
      recipient.deliveredAt = new Date();
      await this.recipientRepo.save(recipient);
    }

    // TODO: Send email notifications to recipients
    // await this.emailService.sendTransmittalNotifications(transmittal);

    return this.transmittalRepo.save(transmittal);
  }

  /**
   * Get transmittal by ID
   */
  async getTransmittal(
    transmittalId: string,
    userId: string,
  ): Promise<Transmittal> {
    const transmittal = await this.transmittalRepo.findOne({
      where: { id: transmittalId },
      relations: ['documents', 'recipients'],
    });

    if (!transmittal) {
      throw new NotFoundException('Transmittal not found');
    }

    // Verify user is project member
    const member = await this.permissionService.getMemberByUserId(
      userId,
      transmittal.projectId,
    );

    if (!member || member.status !== MemberStatus.ACTIVE) {
      throw new ForbiddenException('Not a project member');
    }

    return transmittal;
  }

  /**
   * List project transmittals
   */
  async getProjectTransmittals(
    projectId: string,
    userId: string,
  ): Promise<Transmittal[]> {
    // Verify user is project member
    const member = await this.permissionService.getMemberByUserId(userId, projectId);
    if (!member || member.status !== MemberStatus.ACTIVE) {
      throw new ForbiddenException('Not a project member');
    }

    return this.transmittalRepo.find({
      where: { projectId },
      relations: ['documents', 'recipients'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Acknowledge transmittal receipt
   */
  async acknowledgeReceipt(
    transmittalId: string,
    recipientId: string,
    comment?: string,
  ): Promise<TransmittalRecipient> {
    const recipient = await this.recipientRepo.findOne({
      where: { id: recipientId, transmittalId },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    recipient.status = RecipientStatus.ACKNOWLEDGED;
    recipient.acknowledgedAt = new Date();
    recipient.acknowledgmentComments = comment || null;

    await this.recipientRepo.save(recipient);

    // Update transmittal status
    await this.updateTransmittalStatus(transmittalId);

    return recipient;
  }

  /**
   * Download transmittal package (all documents + cover sheet)
   */
  async downloadTransmittalPackage(
    transmittalId: string,
    recipientId: string,
  ): Promise<{
    documents: Array<{ buffer: Buffer; filename: string }>;
    coverSheet?: { buffer: Buffer; filename: string };
  }> {
    const recipient = await this.recipientRepo.findOne({
      where: { id: recipientId, transmittalId },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    const transmittal = await this.transmittalRepo.findOne({
      where: { id: transmittalId },
      relations: ['documents', 'documents.document', 'documents.version'],
    });

    if (!transmittal) {
      throw new NotFoundException('Transmittal not found');
    }

    // Update recipient status
    if (recipient.status === RecipientStatus.DELIVERED) {
      recipient.status = RecipientStatus.DOWNLOADED;
      await this.recipientRepo.save(recipient);
    }

    // Download documents
    const documents: Array<{ buffer: Buffer; filename: string }> = [];

    for (const transmittalDoc of transmittal.documents) {
      const version = (transmittalDoc as any).version || { s3Key: '' };
      if (!version) continue;

      let fileBuffer = await this.s3Service.getObject(version.s3Key);

      // Apply watermark if enabled
      if (transmittal.watermarkDownloads) {
        try {
          const watermarkSettings =
            this.watermarkService.createTransmittalWatermarkSettings(
              transmittal,
              recipient.name,
              recipient.company || undefined,
            );

          fileBuffer = await this.watermarkService.watermarkFile(
            fileBuffer,
            version.mimeType,
            watermarkSettings,
          );
        } catch (error) {
          console.error('Watermark error:', error);
        }
      }

      documents.push({
        buffer: fileBuffer,
        filename: version.originalFilename,
      });
    }

    // Download cover sheet if exists
    let coverSheet: { buffer: Buffer; filename: string } | undefined;
    if (transmittal.coverSheetS3Key) {
      const buffer = await this.s3Service.getObject(transmittal.coverSheetS3Key);
      coverSheet = {
        buffer,
        filename: `${transmittal.transmittalNumber}_cover_sheet.pdf`,
      };
    }

    // Log access
    for (const doc of transmittal.documents) {
      await this.permissionService.logAccess({
        documentId: doc.documentId,
        versionId: doc.versionId,
        action: DocumentAction.DOWNLOAD,
        transmittalId: transmittal.id,
        externalEmail: recipient.email,
        ipAddress: '0.0.0.0', // Would be passed from controller
        details: {
          success: true,
          downloadFormat: 'transmittal_package',
        },
      });
    }

    return { documents, coverSheet };
  }

  /**
   * Create distribution list
   */
  async createDistributionList(
    userId: string,
    projectId: string,
    data: {
      name: string;
      description?: string;
      autoIncludeCriteria?: {
        roles?: ProjectRole[];
        disciplines?: DrawingDiscipline[];
        companies?: string[];
      };
    },
  ): Promise<DistributionList> {
    // Verify user is project member
    const member = await this.permissionService.getMemberByUserId(userId, projectId);
    if (!member || member.status !== MemberStatus.ACTIVE) {
      throw new ForbiddenException('Not a project member');
    }

    const list = this.distListRepo.create({
      projectId,
      name: data.name,
      description: data.description || null,
      autoIncludeCriteria: data.autoIncludeCriteria || null,
      createdById: userId,
    });

    return this.distListRepo.save(list);
  }

  /**
   * Add members to distribution list
   */
  async addDistributionListMembers(
    listId: string,
    userId: string,
    members: Array<{
      userId?: string;
      email: string;
      name: string;
      company?: string;
    }>,
  ): Promise<DistributionListMember[]> {
    const list = await this.distListRepo.findOne({
      where: { id: listId },
    });

    if (!list) {
      throw new NotFoundException('Distribution list not found');
    }

    // Verify user is project member
    const member = await this.permissionService.getMemberByUserId(
      userId,
      list.projectId,
    );
    if (!member || member.status !== MemberStatus.ACTIVE) {
      throw new ForbiddenException('Not a project member');
    }

    const distMembers: DistributionListMember[] = [];

    for (const memberData of members) {
      const distMember = this.distMemberRepo.create({
        listId,
        userId: memberData.userId || null,
        email: memberData.email,
        name: memberData.name,
        company: memberData.company || null,
        isAutoIncluded: false,
      });
      distMembers.push(await this.distMemberRepo.save(distMember));
    }

    return distMembers;
  }

  /**
   * Get distribution list members (manual + auto-computed)
   */
  async getDistributionListMembers(
    listId: string,
  ): Promise<DistributionListMember[]> {
    const list = await this.distListRepo.findOne({
      where: { id: listId },
      relations: ['members'],
    });

    if (!list) {
      throw new NotFoundException('Distribution list not found');
    }

    // Get manual members
    const members = [...(list.members || [])];

    // Compute auto-included members
    if (list.autoIncludeCriteria) {
      const criteria = list.autoIncludeCriteria;
      const queryBuilder = this.memberRepo
        .createQueryBuilder('member')
        .where('member.projectId = :projectId', { projectId: list.projectId })
        .andWhere('member.status = :status', { status: MemberStatus.ACTIVE });

      // Filter by roles
      if (criteria.roles && criteria.roles.length > 0) {
        queryBuilder.andWhere('member.roles && ARRAY[:...roles]::varchar[]', {
          roles: criteria.roles,
        });
      }

      // Filter by disciplines
      if (criteria.disciplines && criteria.disciplines.length > 0) {
        queryBuilder.andWhere(
          'member.disciplines && ARRAY[:...disciplines]::varchar[]',
          { disciplines: criteria.disciplines },
        );
      }

      // Filter by companies
      if (criteria.companies && criteria.companies.length > 0) {
        queryBuilder.andWhere('member.company IN (:...companies)', {
          companies: criteria.companies,
        });
      }

      const autoMembers = await queryBuilder.getMany();

      // Convert to DistributionListMember format
      for (const autoMember of autoMembers) {
        // Skip if already in manual list
        const existingMember = members.find(m => m.userId === autoMember.userId);
        if (existingMember) continue;

        // Create virtual member (not saved to DB)
        const distMember = new DistributionListMember();
        distMember.listId = listId;
        distMember.userId = autoMember.userId;
        distMember.email = autoMember.inviteEmail || 'unknown@example.com';
        distMember.name = autoMember.title || 'Project Member';
        distMember.company = autoMember.company;
        distMember.isAutoIncluded = true;
        members.push(distMember);
      }
    }

    return members;
  }

  /**
   * Generate transmittal number (format: T-YYYYMMDD-XXX)
   */
  private async generateTransmittalNumber(projectId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

    // Count transmittals today
    const count = await this.transmittalRepo
      .createQueryBuilder('t')
      .where('t.projectId = :projectId', { projectId })
      .andWhere("t.transmittalNumber LIKE :pattern", {
        pattern: `T-${dateStr}-%`,
      })
      .getCount();

    const sequence = String(count + 1).padStart(3, '0');
    return `T-${dateStr}-${sequence}`;
  }

  /**
   * Generate cover sheet PDF
   */
  private async generateCoverSheet(transmittal: Transmittal): Promise<string> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 50,
      });

      const chunks: Buffer[] = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        const s3Key = `transmittals/${transmittal.id}/cover_sheet.pdf`;
        await this.s3Service.putObject(s3Key, buffer, 'application/pdf');
        resolve(s3Key);
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(24).text('TRANSMITTAL', { align: 'center' });
      doc.moveDown();

      // Transmittal info
      doc.fontSize(12);
      doc.text(`Number: ${transmittal.transmittalNumber}`);
      doc.text(`Date: ${transmittal.sentAt?.toISOString().split('T')[0] || 'Draft'}`);
      doc.text(`Subject: ${transmittal.subject}`);
      doc.moveDown();

      // Message
      if (transmittal.message) {
        doc.text('Message:', { underline: true });
        doc.text(transmittal.message);
        doc.moveDown();
      }

      // Response required
      if (transmittal.responseRequired) {
        doc.font('Helvetica-Bold').text('RESPONSE REQUIRED');
        if (transmittal.responseDueDate) {
          doc.text(
            `Due Date: ${transmittal.responseDueDate.toISOString().split('T')[0]}`,
          );
        }
        doc.moveDown();
      }

      // Documents
      doc.text('Documents:', { underline: true });
      // Note: transmittal.documents might not be loaded here
      // In production, you'd load them or pass them in
      doc.text('See attached documents');
      doc.moveDown();

      // Recipients
      doc.text('Recipients:', { underline: true });
      // Note: transmittal.recipients might not be loaded here
      doc.text('See distribution list');

      doc.end();
    });
  }

  /**
   * Update transmittal status based on recipient acknowledgments
   */
  private async updateTransmittalStatus(transmittalId: string): Promise<void> {
    const recipients = await this.recipientRepo.find({
      where: { transmittalId },
    });

    const acknowledgedCount = recipients.filter(
      r => r.status === RecipientStatus.ACKNOWLEDGED,
    ).length;

    let newStatus: TransmittalStatus;
    if (acknowledgedCount === 0) {
      newStatus = TransmittalStatus.SENT;
    } else if (acknowledgedCount === recipients.length) {
      newStatus = TransmittalStatus.FULLY_ACKNOWLEDGED;
    } else {
      newStatus = TransmittalStatus.PARTIALLY_ACKNOWLEDGED;
    }

    await this.transmittalRepo.update({ id: transmittalId }, { status: newStatus });
  }
}
