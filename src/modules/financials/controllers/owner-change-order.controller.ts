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
import { OwnerChangeOrderService } from '../services/owner-change-order.service';
import { ChangeOrderDocumentService } from '../services/change-order-document.service';
import {
  CreateOwnerChangeOrderDto,
  UpdateOwnerChangeOrderDto,
  OwnerChangeOrderResponseDto,
  SubmitOcoDto,
  ApproveOcoDto,
  RejectOcoDto,
  ExecuteOcoDto,
  OcoCostBreakdownResponseDto,
  UpdateCostBreakdownDto,
  ChangeOrderDocumentResponseDto,
  AddCODocumentDto,
} from '../dto';
import { OcoStatus } from '../enums/oco-status.enum';

/**
 * Owner Change Order Controller
 *
 * Handles HTTP requests for OCO management.
 * Base URL: /api/v1/projects/:projectId/ocos
 */
@ApiTags('Owner Change Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/ocos')
export class OwnerChangeOrderController {
  constructor(
    private readonly ocoService: OwnerChangeOrderService,
    private readonly documentService: ChangeOrderDocumentService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new OCO' })
  @ApiResponse({ status: 201, description: 'OCO created successfully' })
  async create(
    @Param('projectId') projectId: string,
    @Body() createDto: CreateOwnerChangeOrderDto,
    @CurrentUser('id') userId: string,
  ): Promise<OwnerChangeOrderResponseDto> {
    const dto = { ...createDto, projectId, createdById: userId };
    return this.ocoService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all OCOs for a project' })
  @ApiResponse({ status: 200, description: 'OCOs retrieved successfully' })
  async findAll(
    @Param('projectId') projectId: string,
    @Query('status') status?: OcoStatus,
  ): Promise<OwnerChangeOrderResponseDto[]> {
    return this.ocoService.findAll(projectId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an OCO by ID' })
  @ApiResponse({ status: 200, description: 'OCO retrieved successfully' })
  @ApiResponse({ status: 404, description: 'OCO not found' })
  async findOne(
    @Param('id') id: string,
  ): Promise<OwnerChangeOrderResponseDto> {
    return this.ocoService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an OCO' })
  @ApiResponse({ status: 200, description: 'OCO updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateOwnerChangeOrderDto,
  ): Promise<OwnerChangeOrderResponseDto> {
    return this.ocoService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an OCO' })
  @ApiResponse({ status: 204, description: 'OCO deleted successfully' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.ocoService.remove(id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit OCO for approval' })
  @ApiResponse({ status: 200, description: 'OCO submitted successfully' })
  async submit(
    @Param('id') id: string,
    @Body() submitDto: SubmitOcoDto,
    @CurrentUser('id') userId: string,
  ): Promise<OwnerChangeOrderResponseDto> {
    return this.ocoService.submit(id, userId);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve an OCO' })
  @ApiResponse({ status: 200, description: 'OCO approved successfully' })
  async approve(
    @Param('id') id: string,
    @Body() approveDto: ApproveOcoDto,
    @CurrentUser('id') userId: string,
  ): Promise<OwnerChangeOrderResponseDto> {
    return this.ocoService.approve(id, userId);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject an OCO' })
  @ApiResponse({ status: 200, description: 'OCO rejected successfully' })
  async reject(
    @Param('id') id: string,
    @Body() rejectDto: RejectOcoDto,
    @CurrentUser('id') userId: string,
  ): Promise<OwnerChangeOrderResponseDto> {
    return this.ocoService.reject(id, userId, rejectDto.reason);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute an OCO' })
  @ApiResponse({ status: 200, description: 'OCO executed successfully' })
  async execute(
    @Param('id') id: string,
    @Body() executeDto: ExecuteOcoDto,
    @CurrentUser('id') userId: string,
  ): Promise<OwnerChangeOrderResponseDto> {
    return this.ocoService.execute(id, userId);
  }

  @Get(':id/cost-breakdown')
  @ApiOperation({ summary: 'Get OCO cost breakdown' })
  @ApiResponse({ status: 200, description: 'Cost breakdown retrieved successfully' })
  @ApiResponse({ status: 404, description: 'OCO not found' })
  async getCostBreakdown(@Param('id') id: string): Promise<OcoCostBreakdownResponseDto[]> {
    return this.ocoService.getCostBreakdown(id);
  }

  @Put(':id/cost-breakdown')
  @ApiOperation({ summary: 'Update OCO cost breakdown' })
  @ApiResponse({ status: 200, description: 'Cost breakdown updated successfully' })
  @ApiResponse({ status: 404, description: 'OCO not found' })
  async updateCostBreakdown(
    @Param('id') id: string,
    @Body() dto: UpdateCostBreakdownDto,
    @CurrentUser('id') userId: string,
  ): Promise<OcoCostBreakdownResponseDto[]> {
    return this.ocoService.updateCostBreakdown(id, dto, userId);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Get all documents for OCO' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  @ApiResponse({ status: 404, description: 'OCO not found' })
  async getDocuments(@Param('id') id: string): Promise<ChangeOrderDocumentResponseDto[]> {
    const documents = await this.documentService.getDocuments(id, 'OCO');
    return documents as any;
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Add document to OCO' })
  @ApiResponse({ status: 201, description: 'Document added successfully' })
  @ApiResponse({ status: 404, description: 'OCO not found' })
  async addDocument(
    @Param('id') id: string,
    @Body() dto: AddCODocumentDto,
    @CurrentUser('id') userId: string,
  ): Promise<ChangeOrderDocumentResponseDto> {
    const document = await this.documentService.addDocument(id, 'OCO', dto, userId);
    return document as any;
  }

  @Delete(':id/documents/:docId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove document from OCO' })
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
