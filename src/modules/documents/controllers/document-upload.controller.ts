import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StorageQuotaGuard } from '../guards/storage-quota.guard';
import { DocumentUploadService } from '../services/document-upload.service';
import { InitiateUploadDto } from '../dto/initiate-upload.dto';
import { CompleteUploadDto } from '../dto/complete-upload.dto';
import {
  SingleUploadResponseDto,
  MultipartUploadResponseDto,
  CompleteUploadResponseDto,
  AbortUploadResponseDto,
  UploadStatusResponseDto,
} from '../dto/upload-responses.dto';

@ApiTags('Document Uploads')
@Controller('api/projects/:projectId/documents')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@ApiBearerAuth()
export class DocumentUploadController {
  constructor(private readonly uploadService: DocumentUploadService) {}

  @Post('initiate-upload')
  @UseGuards(StorageQuotaGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 uploads per minute
  @ApiOperation({
    summary: 'Initiate a document upload',
    description:
      'Initiates a new document upload and returns pre-signed URL(s) for direct S3 upload. For files under 100MB, returns a single URL. For larger files, returns multiple part URLs for multipart upload.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: 'string',
  })
  @ApiResponse({
    status: 201,
    description: 'Upload initiated successfully',
    type: SingleUploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or size exceeds limit',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Storage quota exceeded or rate limit hit',
  })
  @ApiResponse({
    status: 404,
    description: 'Project or folder not found',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
  })
  async initiateUpload(
    @Param('projectId') projectId: string,
    @Body() dto: InitiateUploadDto,
    @Request() req: any,
  ): Promise<SingleUploadResponseDto | MultipartUploadResponseDto> {
    return this.uploadService.initiateUpload(projectId, dto, req.user.id);
  }

  @Post('uploads/:uploadId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete an upload',
    description:
      'Completes an upload after file(s) have been uploaded to S3. Creates the document and version records.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
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
  @ApiResponse({
    status: 400,
    description: 'Upload already completed or invalid parts',
  })
  @ApiResponse({
    status: 403,
    description: 'Not the upload owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Upload not found',
  })
  async completeUpload(
    @Param('uploadId') uploadId: string,
    @Body() dto: CompleteUploadDto,
    @Request() req: any,
  ): Promise<CompleteUploadResponseDto> {
    return this.uploadService.completeUpload(uploadId, dto, req.user.id);
  }

  @Post('uploads/:uploadId/abort')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Abort an upload',
    description: 'Aborts an in-progress upload and cleans up S3 parts.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'uploadId',
    description: 'Upload ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Upload aborted successfully',
    type: AbortUploadResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Not the upload owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Upload not found',
  })
  async abortUpload(
    @Param('uploadId') uploadId: string,
    @Request() req: any,
  ): Promise<AbortUploadResponseDto> {
    return this.uploadService.abortUpload(uploadId, req.user.id);
  }

  @Get('uploads/:uploadId/status')
  @ApiOperation({
    summary: 'Get upload status',
    description: 'Retrieves the current status of an upload and its processing.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'uploadId',
    description: 'Upload ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Upload status retrieved successfully',
    type: UploadStatusResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Upload not found',
  })
  async getUploadStatus(
    @Param('uploadId') uploadId: string,
    @Request() req: any,
  ): Promise<UploadStatusResponseDto> {
    return this.uploadService.getUploadStatus(uploadId, req.user.id);
  }
}
