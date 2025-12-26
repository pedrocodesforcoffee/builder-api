import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CommitmentService } from '../services/commitment.service';
import { DocumentUploadService } from '../../documents/services/document-upload.service';
import { DocumentService } from '../../documents/services/document.service';
import { InitiateUploadDto } from '../../documents/dto/initiate-upload.dto';
import { CompleteUploadDto } from '../../documents/dto/complete-upload.dto';
import {
  SingleUploadResponseDto,
  MultipartUploadResponseDto,
  CompleteUploadResponseDto,
} from '../../documents/dto/upload-responses.dto';

/**
 * Commitment Document Controller
 *
 * Handles document uploads and management for commitments.
 * All documents are stored in the commitment's folder structure:
 * /Financials/Commitments/{Title}/{Number - Vendor}/
 *
 * Base URL: /api/v1/projects/:projectId/commitments/:commitmentId/documents
 */
@ApiTags('Commitment Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/commitments/:commitmentId/documents')
export class CommitmentDocumentController {
  constructor(
    private readonly commitmentService: CommitmentService,
    private readonly documentUploadService: DocumentUploadService,
    private readonly documentService: DocumentService,
  ) {}

  /**
   * Get all documents for a commitment
   * GET /api/v1/projects/:projectId/commitments/:commitmentId/documents
   */
  @Get()
  @ApiOperation({ summary: 'Get all documents for a commitment' })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: 'string',
  })
  @ApiParam({
    name: 'commitmentId',
    description: 'Commitment ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Documents retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Commitment not found' })
  async getDocuments(
    @Param('projectId') projectId: string,
    @Param('commitmentId') commitmentId: string,
  ): Promise<any[]> {
    // Get commitment and verify it has a folder
    const commitment = await this.commitmentService.findOne(commitmentId);

    if (!commitment.folderId) {
      // Return empty array if no folder exists yet
      return [];
    }

    // Get all documents in the commitment's folder
    const documents = await this.documentService.getProjectDocuments(projectId, {
      folderId: commitment.folderId,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit: 1000,
      offset: 0,
    });

    return documents;
  }

  /**
   * Initiate document upload for a commitment
   * POST /api/v1/projects/:projectId/commitments/:commitmentId/documents/initiate-upload
   */
  @Post('initiate-upload')
  @ApiOperation({ summary: 'Initiate a document upload for a commitment' })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: 'string',
  })
  @ApiParam({
    name: 'commitmentId',
    description: 'Commitment ID',
    type: 'string',
  })
  @ApiResponse({
    status: 201,
    description: 'Upload initiated successfully',
    type: SingleUploadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Commitment not found' })
  async initiateUpload(
    @Param('projectId') projectId: string,
    @Param('commitmentId') commitmentId: string,
    @Body() dto: InitiateUploadDto,
    @Request() req: any,
  ): Promise<SingleUploadResponseDto | MultipartUploadResponseDto> {
    // Ensure folder exists for this commitment (create on-demand if needed)
    // This is only created when the first document is uploaded
    const folderId = await this.commitmentService.ensureCommitmentFolder(commitmentId);

    // Get commitment details for metadata
    const commitment = await this.commitmentService.findOne(commitmentId);

    // Add commitment metadata to the upload
    const enrichedDto: InitiateUploadDto = {
      ...dto,
      folderId: folderId,
      metadata: {
        ...dto.metadata,
        customFields: {
          ...dto.metadata?.customFields,
          commitmentId: commitment.id,
          commitmentNumber: commitment.number,
          commitmentTitle: commitment.title,
          commitmentType: commitment.type,
          vendorName: commitment.vendorName,
        },
      },
    };

    return this.documentUploadService.initiateUpload(
      projectId,
      enrichedDto,
      req.user.id,
    );
  }

  /**
   * Complete document upload for a commitment
   * POST /api/v1/projects/:projectId/commitments/:commitmentId/documents/uploads/:uploadId/complete
   */
  @Post('uploads/:uploadId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a document upload for a commitment' })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'commitmentId',
    description: 'Commitment ID',
  })
  @ApiParam({
    name: 'uploadId',
    description: 'Upload ID from initiate response',
  })
  @ApiResponse({
    status: 200,
    description: 'Upload completed successfully',
    type: CompleteUploadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Upload already completed' })
  @ApiResponse({ status: 404, description: 'Upload not found' })
  async completeUpload(
    @Param('uploadId') uploadId: string,
    @Body() dto: CompleteUploadDto,
    @Request() req: any,
  ): Promise<CompleteUploadResponseDto> {
    return this.documentUploadService.completeUpload(
      uploadId,
      dto,
      req.user.id,
    );
  }

  /**
   * Delete a document from a commitment
   * DELETE /api/v1/projects/:projectId/commitments/:commitmentId/documents/:documentId
   */
  @Delete(':documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a document from a commitment' })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'commitmentId',
    description: 'Commitment ID',
  })
  @ApiParam({
    name: 'documentId',
    description: 'Document ID',
  })
  @ApiResponse({ status: 204, description: 'Document deleted successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async deleteDocument(
    @Param('projectId') projectId: string,
    @Param('commitmentId') commitmentId: string,
    @Param('documentId') documentId: string,
  ): Promise<void> {
    // Verify commitment exists
    await this.commitmentService.findOne(commitmentId);

    // Delete the document (soft delete)
    await this.documentService.deleteDocument(projectId, documentId);
  }
}
