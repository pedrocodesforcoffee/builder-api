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
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectTemplateService } from '../services/project-template.service';
import { TemplateApplicationService } from '../services/template-application.service';
import { CreateProjectTemplateDto } from '../dto/templates/create-project-template.dto';
import { UpdateProjectTemplateDto } from '../dto/templates/update-project-template.dto';
import { CreateProjectFromTemplateDto } from '../dto/templates/create-project-from-template.dto';
import { TemplateCategory } from '../enums/template-category.enum';

/**
 * Controller for Project Templates
 *
 * Endpoints:
 * - GET    /api/templates - List all templates
 * - GET    /api/templates/system - List system templates
 * - GET    /api/templates/popular - List most popular templates
 * - GET    /api/templates/category/:category - List by category
 * - GET    /api/templates/:id - Get template details
 * - GET    /api/templates/:id/preview - Preview project from template
 * - POST   /api/templates - Create template
 * - POST   /api/templates/:id/duplicate - Duplicate template
 * - POST   /api/projects/from-template - Create project from template
 * - PUT    /api/templates/:id - Update template
 * - DELETE /api/templates/:id - Delete template
 */
@Controller('api')
@UseGuards(JwtAuthGuard)
export class ProjectTemplateController {
  constructor(
    private readonly templateService: ProjectTemplateService,
    private readonly applicationService: TemplateApplicationService,
  ) {}

  /**
   * List all templates with optional filters
   * GET /api/templates?organizationId=xxx&category=COMMERCIAL&isSystem=true
   */
  @Get('templates')
  async findAll(
    @Query('organizationId') organizationId?: string,
    @Query('category') category?: TemplateCategory,
    @Query('isSystem') isSystem?: string,
    @Query('isPublic') isPublic?: string,
  ) {
    const filters: any = {};

    if (organizationId) {
      filters.organizationId = organizationId;
    }

    if (category) {
      filters.category = category;
    }

    if (isSystem !== undefined) {
      filters.isSystem = isSystem === 'true';
    }

    if (isPublic !== undefined) {
      filters.isPublic = isPublic === 'true';
    }

    return await this.templateService.findAll(filters);
  }

  /**
   * Get templates available for an organization
   * GET /api/organizations/:organizationId/templates
   */
  @Get('organizations/:organizationId/templates')
  async findForOrganization(@Param('organizationId') organizationId: string) {
    return await this.templateService.findAvailableForOrganization(
      organizationId,
    );
  }

  /**
   * List system templates
   * GET /api/templates/system
   */
  @Get('templates/system')
  async findSystemTemplates() {
    return await this.templateService.findSystemTemplates();
  }

  /**
   * List most popular templates
   * GET /api/templates/popular?limit=10
   */
  @Get('templates/popular')
  async findPopularTemplates(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return await this.templateService.findMostPopular(limitNum);
  }

  /**
   * List templates by category
   * GET /api/templates/category/:category
   */
  @Get('templates/category/:category')
  async findByCategory(@Param('category') category: TemplateCategory) {
    return await this.templateService.findByCategory(category);
  }

  /**
   * Get template by ID
   * GET /api/templates/:id
   */
  @Get('templates/:id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const organizationId = req.user?.organizations?.[0]?.id;
    return await this.templateService.findOneWithAccess(id, organizationId);
  }

  /**
   * Preview project from template
   * GET /api/templates/:id/preview?startDate=2025-01-01&projectName=Test
   */
  @Get('templates/:id/preview')
  async previewTemplate(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('projectName') projectName: string,
    @Query('organizationId') organizationId: string,
  ) {
    const dto: CreateProjectFromTemplateDto = {
      templateId: id,
      projectName: projectName || 'Preview Project',
      organizationId,
      startDate: startDate || new Date().toISOString().split('T')[0],
    };

    return await this.applicationService.previewProjectFromTemplate(dto);
  }

  /**
   * Create a new template
   * POST /api/templates
   */
  @Post('templates')
  async create(@Body() dto: CreateProjectTemplateDto, @Request() req: any) {
    const userId = req.user.sub;
    return await this.templateService.create(dto, userId);
  }

  /**
   * Duplicate an existing template
   * POST /api/templates/:id/duplicate
   */
  @Post('templates/:id/duplicate')
  async duplicate(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub;
    const organizationId = req.user?.organizations?.[0]?.id;
    return await this.templateService.duplicate(id, userId, organizationId);
  }

  /**
   * Create project from template
   * POST /api/projects/from-template
   */
  @Post('projects/from-template')
  @HttpCode(HttpStatus.CREATED)
  async createProjectFromTemplate(
    @Body() dto: CreateProjectFromTemplateDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return await this.applicationService.createProjectFromTemplate(dto, userId);
  }

  /**
   * Update a template
   * PUT /api/templates/:id
   */
  @Put('templates/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectTemplateDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    const organizationId = req.user?.organizations?.[0]?.id;
    return await this.templateService.update(id, dto, userId, organizationId);
  }

  /**
   * Delete a template
   * DELETE /api/templates/:id
   */
  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: any) {
    const organizationId = req.user?.organizations?.[0]?.id;
    await this.templateService.remove(id, organizationId);
  }
}
