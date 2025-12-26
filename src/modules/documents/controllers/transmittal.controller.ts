import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { TransmittalService } from '../services/transmittal.service';
import {
  CreateTransmittalDto,
  AddTransmittalDocumentsDto,
  AddTransmittalRecipientsDto,
  AcknowledgeTransmittalDto,
  CreateDistributionListDto,
  AddDistributionListMembersDto,
  TransmittalResponseDto,
  DistributionListResponseDto,
} from '../dto/permission.dto';

/**
 * Transmittal Controller
 *
 * Manages formal document distribution via transmittals.
 *
 * Endpoints:
 * - POST   /projects/:projectId/transmittals - Create transmittal
 * - GET    /projects/:projectId/transmittals - List transmittals
 * - GET    /transmittals/:transmittalId - Get transmittal details
 * - POST   /transmittals/:transmittalId/documents - Add documents
 * - POST   /transmittals/:transmittalId/recipients - Add recipients
 * - POST   /transmittals/:transmittalId/send - Send transmittal
 * - POST   /transmittals/:transmittalId/recipients/:recipientId/acknowledge - Acknowledge
 * - POST   /transmittals/:transmittalId/recipients/:recipientId/download - Download package
 * - POST   /projects/:projectId/distribution-lists - Create distribution list
 * - GET    /projects/:projectId/distribution-lists - List distribution lists
 * - GET    /distribution-lists/:listId/members - Get list members
 * - POST   /distribution-lists/:listId/members - Add list members
 */
@Controller()
export class TransmittalController {
  constructor(private readonly transmittalService: TransmittalService) {}

  /**
   * Create new transmittal
   */
  @Post('projects/:projectId/transmittals')
  async createTransmittal(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTransmittalDto,
    @Request() req: any,
  ): Promise<TransmittalResponseDto> {
    const userId = req.user.id;

    const transmittal = await this.transmittalService.createTransmittal(
      userId,
      projectId,
      {
        subject: dto.subject,
        message: dto.message,
        responseRequired: dto.responseRequired,
        responseDueDate: dto.responseDueDate,
        watermarkDownloads: dto.watermarkDownloads,
        expiresAt: dto.expiresAt,
        includeCoverSheet: dto.includeCoverSheet,
        coverSheetTemplate: dto.coverSheetTemplate,
      },
    );

    return {
      id: transmittal.id,
      projectId: transmittal.projectId,
      transmittalNumber: transmittal.transmittalNumber,
      subject: transmittal.subject,
      message: transmittal.message || undefined,
      status: transmittal.status,
      responseRequired: transmittal.responseRequired,
      responseDueDate: transmittal.responseDueDate || undefined,
      watermarkDownloads: transmittal.watermarkDownloads,
      expiresAt: transmittal.expiresAt || undefined,
      documents: [],
      recipients: [],
      sentAt: transmittal.sentAt || undefined,
      createdAt: transmittal.createdAt,
    };
  }

  /**
   * List project transmittals
   */
  @Get('projects/:projectId/transmittals')
  async getProjectTransmittals(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ): Promise<TransmittalResponseDto[]> {
    const userId = req.user.id;

    const transmittals = await this.transmittalService.getProjectTransmittals(
      projectId,
      userId,
    );

    return transmittals.map(t => ({
      id: t.id,
      projectId: t.projectId,
      transmittalNumber: t.transmittalNumber,
      subject: t.subject,
      message: t.message || undefined,
      status: t.status,
      responseRequired: t.responseRequired,
      responseDueDate: t.responseDueDate || undefined,
      watermarkDownloads: t.watermarkDownloads,
      expiresAt: t.expiresAt || undefined,
      documents: t.documents || [],
      recipients: t.recipients || [],
      sentAt: t.sentAt || undefined,
      createdAt: t.createdAt,
    }));
  }

  /**
   * Get transmittal details
   */
  @Get('transmittals/:transmittalId')
  async getTransmittal(
    @Param('transmittalId') transmittalId: string,
    @Request() req: any,
  ): Promise<TransmittalResponseDto> {
    const userId = req.user.id;

    const transmittal = await this.transmittalService.getTransmittal(
      transmittalId,
      userId,
    );

    return {
      id: transmittal.id,
      projectId: transmittal.projectId,
      transmittalNumber: transmittal.transmittalNumber,
      subject: transmittal.subject,
      message: transmittal.message || undefined,
      status: transmittal.status,
      responseRequired: transmittal.responseRequired,
      responseDueDate: transmittal.responseDueDate || undefined,
      watermarkDownloads: transmittal.watermarkDownloads,
      expiresAt: transmittal.expiresAt || undefined,
      documents: transmittal.documents || [],
      recipients: transmittal.recipients || [],
      sentAt: transmittal.sentAt || undefined,
      createdAt: transmittal.createdAt,
    };
  }

  /**
   * Add documents to transmittal
   */
  @Post('transmittals/:transmittalId/documents')
  async addDocuments(
    @Param('transmittalId') transmittalId: string,
    @Body() dto: AddTransmittalDocumentsDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;

    const documents = await this.transmittalService.addDocuments(
      transmittalId,
      userId,
      dto.documentIds,
    );

    return {
      message: 'Documents added successfully',
      count: documents.length,
      documents,
    };
  }

  /**
   * Add recipients to transmittal
   */
  @Post('transmittals/:transmittalId/recipients')
  async addRecipients(
    @Param('transmittalId') transmittalId: string,
    @Body() dto: AddTransmittalRecipientsDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;

    const recipients = await this.transmittalService.addRecipients(
      transmittalId,
      userId,
      {
        distributionListId: dto.distributionListId,
        manualRecipients: dto.manualRecipients,
      },
    );

    return {
      message: 'Recipients added successfully',
      count: recipients.length,
      recipients,
    };
  }

  /**
   * Send transmittal
   */
  @Post('transmittals/:transmittalId/send')
  async sendTransmittal(
    @Param('transmittalId') transmittalId: string,
    @Request() req: any,
  ): Promise<TransmittalResponseDto> {
    const userId = req.user.id;

    const transmittal = await this.transmittalService.sendTransmittal(
      transmittalId,
      userId,
    );

    return {
      id: transmittal.id,
      projectId: transmittal.projectId,
      transmittalNumber: transmittal.transmittalNumber,
      subject: transmittal.subject,
      message: transmittal.message || undefined,
      status: transmittal.status,
      responseRequired: transmittal.responseRequired,
      responseDueDate: transmittal.responseDueDate || undefined,
      watermarkDownloads: transmittal.watermarkDownloads,
      expiresAt: transmittal.expiresAt || undefined,
      documents: transmittal.documents || [],
      recipients: transmittal.recipients || [],
      sentAt: transmittal.sentAt || undefined,
      createdAt: transmittal.createdAt,
    };
  }

  /**
   * Acknowledge transmittal receipt
   */
  @Post('transmittals/:transmittalId/recipients/:recipientId/acknowledge')
  async acknowledgeReceipt(
    @Param('transmittalId') transmittalId: string,
    @Param('recipientId') recipientId: string,
    @Body() dto: AcknowledgeTransmittalDto,
  ) {
    const recipient = await this.transmittalService.acknowledgeReceipt(
      transmittalId,
      recipientId,
      dto.comment,
    );

    return {
      message: 'Receipt acknowledged successfully',
      recipient,
    };
  }

  /**
   * Download transmittal package
   */
  @Post('transmittals/:transmittalId/recipients/:recipientId/download')
  async downloadTransmittalPackage(
    @Param('transmittalId') transmittalId: string,
    @Param('recipientId') recipientId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { documents, coverSheet } =
      await this.transmittalService.downloadTransmittalPackage(
        transmittalId,
        recipientId,
      );

    // For simplicity, return first document
    // In production, you'd zip all files together
    if (documents.length > 0) {
      const doc = documents[0];
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${doc.filename}"`);
      res.setHeader('Content-Length', doc.buffer.length);
      res.status(HttpStatus.OK).send(doc.buffer);
    } else if (coverSheet) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${coverSheet.filename}"`,
      );
      res.setHeader('Content-Length', coverSheet.buffer.length);
      res.status(HttpStatus.OK).send(coverSheet.buffer);
    } else {
      res.status(HttpStatus.NOT_FOUND).send({ message: 'No files to download' });
    }
  }

  /**
   * Create distribution list
   */
  @Post('projects/:projectId/distribution-lists')
  async createDistributionList(
    @Param('projectId') projectId: string,
    @Body() dto: CreateDistributionListDto,
    @Request() req: any,
  ): Promise<DistributionListResponseDto> {
    const userId = req.user.id;

    const list = await this.transmittalService.createDistributionList(
      userId,
      projectId,
      {
        name: dto.name,
        description: dto.description,
        autoIncludeCriteria: dto.autoIncludeCriteria,
      },
    );

    return {
      id: list.id,
      projectId: list.projectId,
      name: list.name,
      description: list.description || undefined,
      autoIncludeCriteria: list.autoIncludeCriteria || undefined,
      members: [],
      createdAt: list.createdAt,
    };
  }

  /**
   * Get distribution list members
   */
  @Get('distribution-lists/:listId/members')
  async getDistributionListMembers(@Param('listId') listId: string) {
    const members = await this.transmittalService.getDistributionListMembers(
      listId,
    );

    return {
      listId,
      count: members.length,
      members,
    };
  }

  /**
   * Add members to distribution list
   */
  @Post('distribution-lists/:listId/members')
  async addDistributionListMembers(
    @Param('listId') listId: string,
    @Body() dto: AddDistributionListMembersDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;

    const members = await this.transmittalService.addDistributionListMembers(
      listId,
      userId,
      dto.members,
    );

    return {
      message: 'Members added successfully',
      count: members.length,
      members,
    };
  }

  /**
   * Get recipient activity
   */
  @Get('transmittals/:projectId/recipients/:recipientId/activity')
  async getRecipientActivity(
    @Param('projectId') projectId: string,
    @Param('recipientId') recipientId: string,
    @Request() req: any,
  ): Promise<any[]> {
    // Stub endpoint - return empty array for now
    // This prevents 404 errors on the distribution page
    return [];
  }
}
