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
import { FieldNoteTemplateService } from '../services/field-note-template.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import {
  CreateFieldNoteTemplateDto,
  UpdateFieldNoteTemplateDto,
  QueryFieldNoteTemplatesDto,
  FieldNoteTemplateResponseDto,
} from '../dto/field-note-template.dto';

@ApiTags('Field Note Templates')
@Controller('v1/field-notes/templates')
@UseGuards(JwtAuthGuard)
export class FieldNoteTemplateController {
  constructor(
    private readonly templateService: FieldNoteTemplateService,
  ) {}

  // ==================== TEMPLATE CRUD ====================

  @Post()
  @ApiOperation({ summary: 'Create a new field note template' })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
    type: FieldNoteTemplateResponseDto,
  })
  async create(
    @Body() dto: CreateFieldNoteTemplateDto,
    @CurrentUser('id') userId: string,
  ): Promise<FieldNoteTemplateResponseDto> {
    return this.templateService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all field note templates' })
  @ApiResponse({
    status: 200,
    description: 'Templates retrieved successfully',
    type: [FieldNoteTemplateResponseDto],
  })
  async findAll(@Query() query: QueryFieldNoteTemplatesDto) {
    return this.templateService.findAll(query);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular templates by usage count' })
  @ApiResponse({
    status: 200,
    description: 'Popular templates retrieved successfully',
    type: [FieldNoteTemplateResponseDto],
  })
  async getPopular(
    @Query('organizationId') organizationId?: string,
    @Query('limit') limit?: number,
  ): Promise<FieldNoteTemplateResponseDto[]> {
    return this.templateService.getPopular(organizationId, limit);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all template categories' })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
    type: [String],
  })
  async getCategories(
    @Query('organizationId') organizationId?: string,
  ): Promise<string[]> {
    return this.templateService.getCategories(organizationId);
  }

  @Get('by-category/:category')
  @ApiOperation({ summary: 'Get templates by category' })
  @ApiResponse({
    status: 200,
    description: 'Templates retrieved successfully',
    type: [FieldNoteTemplateResponseDto],
  })
  async getByCategory(
    @Param('category') category: string,
    @Query('organizationId') organizationId?: string,
  ): Promise<FieldNoteTemplateResponseDto[]> {
    return this.templateService.getByCategory(category, organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a field note template by ID' })
  @ApiResponse({
    status: 200,
    description: 'Template retrieved successfully',
    type: FieldNoteTemplateResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FieldNoteTemplateResponseDto> {
    return this.templateService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a field note template' })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
    type: FieldNoteTemplateResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 403, description: 'Cannot edit system templates' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFieldNoteTemplateDto,
    @CurrentUser('id') userId: string,
  ): Promise<FieldNoteTemplateResponseDto> {
    return this.templateService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a field note template' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({
    status: 403,
    description: 'Cannot delete system templates or templates in use',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.templateService.remove(id);
    return { message: 'Template deleted successfully' };
  }

  @Post(':id/increment-usage')
  @ApiOperation({
    summary: 'Increment template usage count (internal use)',
  })
  @ApiResponse({ status: 200, description: 'Usage count incremented' })
  async incrementUsage(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.templateService.incrementUsage(id);
    return { message: 'Usage count incremented' };
  }
}
