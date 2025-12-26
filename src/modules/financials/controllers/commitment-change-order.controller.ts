import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CommitmentChangeOrderService } from '../services/commitment-change-order.service';
import { ChangeOrderDocumentService } from '../services/change-order-document.service';
import {
  CreateCommitmentChangeOrderDto,
  UpdateCommitmentChangeOrderDto,
  CommitmentChangeOrderResponseDto,
  SubmitCcoDto,
  ApproveCcoDto,
  RejectCcoDto,
  ExecuteCcoDto,
  ChangeOrderDocumentResponseDto,
  AddCODocumentDto,
} from '../dto';
import { CcoStatus } from '../enums/cco-status.enum';

/**
 * Commitment Change Order Controller
 *
 * Handles HTTP requests for CCO management.
 * Base URL: /api/v1/projects/:projectId/ccos
 */
@ApiTags('Commitment Change Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/ccos')
export class CommitmentChangeOrderController {
  constructor(
    private readonly ccoService: CommitmentChangeOrderService,
    private readonly documentService: ChangeOrderDocumentService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new CCO' })
  @ApiResponse({ status: 201, description: 'CCO created successfully' })
  async create(
    @Param('projectId') projectId: string,
    @Body() createDto: CreateCommitmentChangeOrderDto,
    @CurrentUser('id') userId: string,
  ): Promise<CommitmentChangeOrderResponseDto> {
    const dto = { ...createDto, projectId, createdById: userId };
    return this.ccoService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all CCOs for a project' })
  @ApiResponse({ status: 200, description: 'CCOs retrieved successfully' })
  async findAll(
    @Param('projectId') projectId: string,
    @Query('commitmentId') commitmentId?: string,
    @Query('status') status?: CcoStatus,
  ): Promise<CommitmentChangeOrderResponseDto[]> {
    return this.ccoService.findAll(projectId, commitmentId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a CCO by ID' })
  @ApiResponse({ status: 200, description: 'CCO retrieved successfully' })
  @ApiResponse({ status: 404, description: 'CCO not found' })
  async findOne(
    @Param('id') id: string,
  ): Promise<CommitmentChangeOrderResponseDto> {
    return this.ccoService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a CCO' })
  @ApiResponse({ status: 200, description: 'CCO updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCommitmentChangeOrderDto,
  ): Promise<CommitmentChangeOrderResponseDto> {
    return this.ccoService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a CCO' })
  @ApiResponse({ status: 204, description: 'CCO deleted successfully' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.ccoService.remove(id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit CCO for approval' })
  @ApiResponse({ status: 200, description: 'CCO submitted successfully' })
  async submit(
    @Param('id') id: string,
    @Body() submitDto: SubmitCcoDto,
    @CurrentUser('id') userId: string,
  ): Promise<CommitmentChangeOrderResponseDto> {
    return this.ccoService.submit(id, userId);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a CCO' })
  @ApiResponse({ status: 200, description: 'CCO approved successfully' })
  async approve(
    @Param('id') id: string,
    @Body() approveDto: ApproveCcoDto,
    @CurrentUser('id') userId: string,
  ): Promise<CommitmentChangeOrderResponseDto> {
    return this.ccoService.approve(id, userId);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a CCO' })
  @ApiResponse({ status: 200, description: 'CCO rejected successfully' })
  async reject(
    @Param('id') id: string,
    @Body() rejectDto: RejectCcoDto,
    @CurrentUser('id') userId: string,
  ): Promise<CommitmentChangeOrderResponseDto> {
    return this.ccoService.reject(id, userId, rejectDto.reason);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute a CCO' })
  @ApiResponse({ status: 200, description: 'CCO executed successfully' })
  async execute(
    @Param('id') id: string,
    @Body() executeDto: ExecuteCcoDto,
    @CurrentUser('id') userId: string,
  ): Promise<CommitmentChangeOrderResponseDto> {
    return this.ccoService.execute(id, userId);
  }

  @Post(':id/recalculate')
  @ApiOperation({ summary: 'Recalculate CCO total from line items or T&M entries' })
  @ApiResponse({ status: 200, description: 'CCO total recalculated' })
  async recalculateTotal(
    @Param('id') id: string,
  ): Promise<CommitmentChangeOrderResponseDto> {
    return this.ccoService.recalculateTotal(id);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Get all documents for CCO' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  @ApiResponse({ status: 404, description: 'CCO not found' })
  async getDocuments(@Param('id') id: string): Promise<ChangeOrderDocumentResponseDto[]> {
    const documents = await this.documentService.getDocuments(id, 'CCO');
    return documents as any;
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Add document to CCO' })
  @ApiResponse({ status: 201, description: 'Document added successfully' })
  @ApiResponse({ status: 404, description: 'CCO not found' })
  async addDocument(
    @Param('id') id: string,
    @Body() dto: AddCODocumentDto,
    @CurrentUser('id') userId: string,
  ): Promise<ChangeOrderDocumentResponseDto> {
    const document = await this.documentService.addDocument(id, 'CCO', dto, userId);
    return document as any;
  }

  @Delete(':id/documents/:docId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove document from CCO' })
  @ApiResponse({ status: 204, description: 'Document removed successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async removeDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.documentService.removeDocument(docId, userId);
  }
}
