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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FieldNoteService } from '../services/field-note.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import {
  CreateFieldNoteDto,
  UpdateFieldNoteDto,
  QueryFieldNotesDto,
  AddAttachmentDto,
  AddLinkDto,
  AddCommentDto,
  BulkSyncDto,
  FieldNoteResponseDto,
} from '../dto/field-note.dto';

@ApiTags('Field Notes & Observations')
@Controller('v1/projects/:projectId/field-notes')
@UseGuards(JwtAuthGuard)
export class FieldNoteController {
  constructor(private readonly fieldNoteService: FieldNoteService) {}

  // ==================== FIELD NOTES CRUD ====================

  @Post()
  @ApiOperation({ summary: 'Create a new field note' })
  @ApiResponse({
    status: 201,
    description: 'Field note created successfully',
    type: FieldNoteResponseDto,
  })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateFieldNoteDto,
    @CurrentUser('id') userId: string,
  ): Promise<FieldNoteResponseDto> {
    return this.fieldNoteService.create(projectId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all field notes for a project' })
  @ApiResponse({
    status: 200,
    description: 'Field notes retrieved successfully',
    type: [FieldNoteResponseDto],
  })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: QueryFieldNotesDto,
    @CurrentUser('id') userId: string,
  ) {
    // Set projectId from URL param
    query.projectId = projectId;
    return this.fieldNoteService.findAll(query, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a field note by ID' })
  @ApiResponse({
    status: 200,
    description: 'Field note retrieved successfully',
    type: FieldNoteResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Field note not found' })
  async findOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<FieldNoteResponseDto> {
    return this.fieldNoteService.findOne(id, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a field note' })
  @ApiResponse({
    status: 200,
    description: 'Field note updated successfully',
    type: FieldNoteResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Field note not found' })
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFieldNoteDto,
    @CurrentUser('id') userId: string,
  ): Promise<FieldNoteResponseDto> {
    return this.fieldNoteService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a field note' })
  @ApiResponse({ status: 200, description: 'Field note deleted successfully' })
  @ApiResponse({ status: 404, description: 'Field note not found' })
  async remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ message: string }> {
    await this.fieldNoteService.remove(id, userId);
    return { message: 'Field note deleted successfully' };
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted field note' })
  @ApiResponse({
    status: 200,
    description: 'Field note restored successfully',
    type: FieldNoteResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Field note not found' })
  async restore(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<FieldNoteResponseDto> {
    return this.fieldNoteService.restore(id, userId);
  }

  // ==================== ATTACHMENTS ====================

  @Post(':id/attachments')
  @ApiOperation({ summary: 'Add an attachment to a field note' })
  @ApiResponse({ status: 201, description: 'Attachment added successfully' })
  async addAttachment(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddAttachmentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.fieldNoteService.addAttachment(id, dto, userId);
  }

  @Delete(':id/attachments/:attachmentId')
  @ApiOperation({ summary: 'Remove an attachment from a field note' })
  @ApiResponse({ status: 200, description: 'Attachment removed successfully' })
  async removeAttachment(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ message: string }> {
    await this.fieldNoteService.removeAttachment(id, attachmentId, userId);
    return { message: 'Attachment removed successfully' };
  }

  // ==================== LINKS ====================

  @Post(':id/links')
  @ApiOperation({ summary: 'Add a link to another entity' })
  @ApiResponse({ status: 201, description: 'Link added successfully' })
  async addLink(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddLinkDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.fieldNoteService.addLink(id, dto, userId);
  }

  @Delete(':id/links/:linkId')
  @ApiOperation({ summary: 'Remove a link from a field note' })
  @ApiResponse({ status: 200, description: 'Link removed successfully' })
  async removeLink(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ message: string }> {
    await this.fieldNoteService.removeLink(id, linkId, userId);
    return { message: 'Link removed successfully' };
  }

  // ==================== COMMENTS ====================

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add a comment to a field note' })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  async addComment(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddCommentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.fieldNoteService.addComment(id, dto, userId);
  }

  // ==================== FOLLOW-UP ====================

  @Post(':id/follow-up/complete')
  @ApiOperation({ summary: 'Complete follow-up for a field note' })
  @ApiResponse({
    status: 200,
    description: 'Follow-up completed successfully',
    type: FieldNoteResponseDto,
  })
  async completeFollowUp(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('notes') notes: string,
    @CurrentUser('id') userId: string,
  ): Promise<FieldNoteResponseDto> {
    return this.fieldNoteService.completeFollowUp(id, notes, userId);
  }

  // ==================== TAGS ====================

  @Get('tags/suggestions')
  @ApiOperation({ summary: 'Get tag suggestions for a project' })
  @ApiResponse({
    status: 200,
    description: 'Tag suggestions retrieved successfully',
    type: [String],
  })
  async getTagSuggestions(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('search') search?: string,
  ): Promise<string[]> {
    return this.fieldNoteService.getTagSuggestions(projectId, search);
  }

  // ==================== BULK OPERATIONS ====================

  @Post('bulk/sync')
  @ApiOperation({ summary: 'Bulk sync field notes (offline mode)' })
  @ApiResponse({ status: 201, description: 'Notes synced successfully' })
  async bulkSync(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: BulkSyncDto,
    @CurrentUser('id') userId: string,
  ) {
    const results = [];
    for (const noteDto of dto.notes) {
      try {
        const note = await this.fieldNoteService.create(projectId, noteDto, userId);
        results.push({ success: true, note });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    return { results };
  }
}
