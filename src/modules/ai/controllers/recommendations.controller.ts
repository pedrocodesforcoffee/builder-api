/**
 * Recommendations Controller
 * REST API for AI-powered recommendations and cross-project learning
 */

import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RecommendationsService } from '../services/recommendations.service';
import { PatternCalculatorService } from '../services/pattern-calculator.service';
import {
  CreateProjectProfileDto,
  UpdateProjectProfileDto,
  FindSimilarProjectsDto,
  CreateRecommendationDto,
  UpdateRecommendationDto,
  CreateLessonLearnedDto,
  GetRecommendationsDto,
  GetLessonsLearnedDto,
  ProjectProfileResponseDto,
  SimilarProjectDto,
  SmartDefaultsResponseDto,
  RecommendationResponseDto,
  LessonLearnedResponseDto,
} from '../dto';
import { PatternType } from '../enums';

@ApiTags('AI Recommendations')
@Controller('ai/recommendations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecommendationsController {
  constructor(
    private recommendationsService: RecommendationsService,
    private patternCalculatorService: PatternCalculatorService,
  ) {}

  // ============================================================================
  // PROJECT PROFILE ENDPOINTS
  // ============================================================================

  @Post('projects/:projectId/profile')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create project profile',
    description: 'Creates a new project profile for similarity matching and pattern analysis',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Project profile created successfully',
    type: ProjectProfileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Profile already exists or invalid data',
  })
  async createProjectProfile(
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectProfileDto,
    @Request() req: any,
  ): Promise<ProjectProfileResponseDto> {
    // Override projectId from URL by creating a new DTO object
    const profileDto = { ...dto, projectId };

    const profile = await this.recommendationsService.createProjectProfile(profileDto);

    // Optionally generate embedding immediately
    // await this.recommendationsService.generateProjectProfileEmbedding(profile.id);

    return profile;
  }

  @Put('projects/:projectId/profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update project profile',
    description: 'Updates an existing project profile (typically when project completes)',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project profile updated successfully',
    type: ProjectProfileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project profile not found',
  })
  async updateProjectProfile(
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectProfileDto,
    @Request() req: any,
  ): Promise<ProjectProfileResponseDto> {
    const profile = await this.recommendationsService.updateProjectProfile(
      projectId,
      dto,
    );

    // Regenerate embedding if profile data changed significantly
    // Fire and forget - don't wait for embedding
    this.recommendationsService
      .generateProjectProfileEmbedding(profile.id)
      .catch((error) => {
        console.error('Failed to regenerate embedding:', error);
      });

    return profile;
  }

  @Get('projects/:projectId/profile')
  @ApiOperation({
    summary: 'Get project profile',
    description: 'Retrieves the project profile for a specific project',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project profile retrieved successfully',
    type: ProjectProfileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project profile not found',
  })
  async getProjectProfile(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ): Promise<ProjectProfileResponseDto> {
    return this.recommendationsService.getProjectProfile(projectId);
  }

  // ============================================================================
  // SIMILARITY MATCHING ENDPOINTS
  // ============================================================================

  @Get('projects/:projectId/similar')
  @ApiOperation({
    summary: 'Find similar projects',
    description:
      'Finds projects similar to the specified project using weighted similarity algorithm',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of results (default: 5, max: 20)',
  })
  @ApiQuery({
    name: 'minSimilarityScore',
    required: false,
    type: Number,
    description: 'Minimum similarity score 0.0-1.0 (default: 0.3)',
  })
  @ApiQuery({
    name: 'useEmbeddings',
    required: false,
    type: Boolean,
    description: 'Use embedding-based similarity (default: false)',
  })
  @ApiQuery({
    name: 'onlyCompleted',
    required: false,
    type: Boolean,
    description: 'Only return completed projects (default: false)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Similar projects found',
    type: [SimilarProjectDto],
  })
  async findSimilarProjects(
    @Param('projectId') projectId: string,
    @Query('limit') limit?: number,
    @Query('minSimilarityScore') minSimilarityScore?: number,
    @Query('useEmbeddings') useEmbeddings?: boolean,
    @Query('onlyCompleted') onlyCompleted?: boolean,
  ): Promise<SimilarProjectDto[]> {
    const dto: FindSimilarProjectsDto = {
      projectId,
      limit: limit ? Number(limit) : 5,
      minSimilarityScore: minSimilarityScore ? Number(minSimilarityScore) : 0.3,
      useEmbeddings: useEmbeddings === true || useEmbeddings === 'true' as any,
      onlyCompleted: onlyCompleted === true || onlyCompleted === 'true' as any,
    };

    return this.recommendationsService.findSimilarProjects(dto);
  }

  @Get('projects/:projectId/smart-defaults')
  @ApiOperation({
    summary: 'Generate smart defaults',
    description:
      'Generates AI-powered budget, duration, and risk estimates based on similar projects',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Smart defaults generated successfully',
    type: SmartDefaultsResponseDto,
  })
  async generateSmartDefaults(
    @Param('projectId') projectId: string,
  ): Promise<SmartDefaultsResponseDto> {
    return this.recommendationsService.generateSmartDefaults(projectId);
  }

  // ============================================================================
  // RECOMMENDATION ENDPOINTS
  // ============================================================================

  @Post('recommendations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create recommendation',
    description: 'Creates a new AI-generated recommendation',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Recommendation created successfully',
    type: RecommendationResponseDto,
  })
  async createRecommendation(
    @Body() dto: CreateRecommendationDto,
    @Request() req: any,
  ): Promise<RecommendationResponseDto> {
    return this.recommendationsService.createRecommendation(dto);
  }

  @Get('projects/:projectId/recommendations')
  @ApiOperation({
    summary: 'Get project recommendations',
    description: 'Retrieves all recommendations for a specific project',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by recommendation type',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    description: 'Filter by priority',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recommendations retrieved successfully',
  })
  async getProjectRecommendations(
    @Param('projectId') projectId: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('priority') priority?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const dto: GetRecommendationsDto = {
      projectId,
      statuses: status ? status.split(',') as any : undefined,
      types: type ? type.split(',') as any : undefined,
      priorities: priority ? priority.split(',') as any : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    };

    return this.recommendationsService.getRecommendations(dto);
  }

  @Get('recommendations/:id')
  @ApiOperation({
    summary: 'Get recommendation by ID',
    description: 'Retrieves a single recommendation by its ID',
  })
  @ApiParam({ name: 'id', description: 'Recommendation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recommendation retrieved successfully',
    type: RecommendationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Recommendation not found',
  })
  async getRecommendationById(@Param('id') id: string): Promise<RecommendationResponseDto> {
    return this.recommendationsService.getRecommendationById(id);
  }

  @Put('recommendations/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update recommendation',
    description: 'Updates a recommendation (typically to accept/reject or rate)',
  })
  @ApiParam({ name: 'id', description: 'Recommendation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recommendation updated successfully',
    type: RecommendationResponseDto,
  })
  async updateRecommendation(
    @Param('id') id: string,
    @Body() dto: UpdateRecommendationDto,
    @Request() req: any,
  ): Promise<RecommendationResponseDto> {
    return this.recommendationsService.updateRecommendation(
      id,
      dto,
      req.user?.userId,
    );
  }

  @Post('recommendations/:id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept recommendation',
    description: 'Accepts a recommendation and optionally provides feedback',
  })
  @ApiParam({ name: 'id', description: 'Recommendation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recommendation accepted successfully',
    type: RecommendationResponseDto,
  })
  async acceptRecommendation(
    @Param('id') id: string,
    @Body() body: { userId: string; feedback?: string },
    @Request() req: any,
  ): Promise<RecommendationResponseDto> {
    return this.recommendationsService.acceptRecommendation(
      id,
      body.userId,
      body.feedback,
    );
  }

  @Post('recommendations/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject recommendation',
    description: 'Rejects a recommendation with a reason',
  })
  @ApiParam({ name: 'id', description: 'Recommendation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recommendation rejected successfully',
    type: RecommendationResponseDto,
  })
  async rejectRecommendation(
    @Param('id') id: string,
    @Body() body: { userId: string; reason: string },
    @Request() req: any,
  ): Promise<RecommendationResponseDto> {
    return this.recommendationsService.rejectRecommendation(
      id,
      body.userId,
      body.reason,
    );
  }

  // ============================================================================
  // LESSONS LEARNED ENDPOINTS
  // ============================================================================

  @Post('lessons-learned')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create lesson learned',
    description: 'Creates a new lesson learned entry',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Lesson learned created successfully',
    type: LessonLearnedResponseDto,
  })
  async createLessonLearned(
    @Body() dto: CreateLessonLearnedDto,
    @Request() req: any,
  ): Promise<LessonLearnedResponseDto> {
    const lesson = await this.recommendationsService.createLessonLearned(dto);

    // Generate embedding for lesson learned (fire and forget)
    this.recommendationsService
      .generateLessonLearnedEmbedding(lesson.id)
      .catch((error) => {
        console.error('Failed to generate lesson embedding:', error);
      });

    return lesson;
  }

  @Get('lessons-learned')
  @ApiOperation({
    summary: 'Get lessons learned',
    description: 'Retrieves lessons learned with filtering and pagination',
  })
  @ApiQuery({
    name: 'organizationId',
    required: true,
    description: 'Filter by organization',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Filter by project',
  })
  @ApiQuery({
    name: 'categories',
    required: false,
    description: 'Filter by categories (comma-separated)',
  })
  @ApiQuery({
    name: 'tags',
    required: false,
    description: 'Filter by tags (comma-separated)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search in title, situation, and lesson text',
  })
  @ApiQuery({
    name: 'approvedOnly',
    required: false,
    type: Boolean,
    description: 'Only show approved lessons (default: false)',
  })
  @ApiQuery({
    name: 'publicOnly',
    required: false,
    type: Boolean,
    description: 'Only show public lessons (default: false)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lessons learned retrieved successfully',
  })
  async getLessonsLearned(
    @Query('organizationId') organizationId: string,
    @Query('projectId') projectId?: string,
    @Query('categories') categories?: string,
    @Query('tags') tags?: string,
    @Query('search') search?: string,
    @Query('approvedOnly') approvedOnly?: string,
    @Query('publicOnly') publicOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const dto: GetLessonsLearnedDto = {
      organizationId,
      projectId,
      categories: categories ? categories.split(',') as any : undefined,
      tags: tags ? tags.split(',') : undefined,
      search,
      approvedOnly: approvedOnly === 'true',
      publicOnly: publicOnly === 'true',
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    };

    return this.recommendationsService.getLessonsLearned(dto);
  }

  // ============================================================================
  // PATTERN ANALYSIS ENDPOINTS
  // ============================================================================

  @Get('organizations/:organizationId/patterns')
  @ApiOperation({
    summary: 'Get organization patterns',
    description: 'Retrieves all calculated patterns for an organization',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Patterns retrieved successfully',
  })
  async getOrganizationPatterns(@Param('organizationId') organizationId: string) {
    return this.patternCalculatorService.getOrganizationPatterns(organizationId);
  }

  @Get('organizations/:organizationId/patterns/:patternType')
  @ApiOperation({
    summary: 'Get specific pattern',
    description: 'Retrieves a specific pattern type for an organization',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({
    name: 'patternType',
    description: 'Pattern type (COST_VARIANCE, SCHEDULE_VARIANCE, RFI_VELOCITY, CHANGE_ORDER_FREQUENCY)',
    enum: PatternType,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pattern retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pattern not found',
  })
  async getPattern(
    @Param('organizationId') organizationId: string,
    @Param('patternType') patternType: PatternType,
  ) {
    const pattern = await this.patternCalculatorService.getPattern(
      organizationId,
      patternType,
    );

    if (!pattern) {
      throw new BadRequestException(
        `Pattern ${patternType} not found for organization ${organizationId}`,
      );
    }

    return pattern;
  }

  @Post('organizations/:organizationId/patterns/calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculate patterns manually',
    description: 'Manually triggers pattern calculation for an organization (normally runs weekly)',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pattern calculation triggered successfully',
  })
  async calculatePatterns(@Param('organizationId') organizationId: string) {
    await this.patternCalculatorService.calculateOrganizationPatterns(
      organizationId,
    );
    return { message: 'Pattern calculation completed successfully' };
  }

  // ============================================================================
  // EMBEDDING GENERATION ENDPOINTS
  // ============================================================================

  @Post('projects/:projectId/profile/embedding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate profile embedding',
    description: 'Manually generates embedding for a project profile',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Embedding generated successfully',
  })
  async generateProfileEmbedding(@Param('projectId') projectId: string) {
    const profile = await this.recommendationsService.getProjectProfile(
      projectId,
    );
    await this.recommendationsService.generateProjectProfileEmbedding(
      profile.id,
    );
    return { message: 'Embedding generated successfully' };
  }

  @Post('lessons-learned/:lessonId/embedding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate lesson embedding',
    description: 'Manually generates embedding for a lesson learned',
  })
  @ApiParam({ name: 'lessonId', description: 'Lesson Learned ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Embedding generated successfully',
  })
  async generateLessonEmbedding(@Param('lessonId') lessonId: string) {
    await this.recommendationsService.generateLessonLearnedEmbedding(lessonId);
    return { message: 'Embedding generated successfully' };
  }

  @Post('organizations/:organizationId/embeddings/batch-profiles')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Batch generate profile embeddings',
    description: 'Generates embeddings for all profiles without embeddings (up to limit)',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum profiles to process (default: 50)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch embedding generation completed',
  })
  async batchGenerateProfileEmbeddings(
    @Param('organizationId') organizationId: string,
    @Query('limit') limit?: number,
  ) {
    const result =
      await this.recommendationsService.generateProjectProfileEmbeddingsBatch(
        organizationId,
        limit ? Number(limit) : 50,
      );
    return result;
  }

  @Post('organizations/:organizationId/embeddings/batch-lessons')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Batch generate lesson embeddings',
    description: 'Generates embeddings for all lessons without embeddings (up to limit)',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum lessons to process (default: 50)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch embedding generation completed',
  })
  async batchGenerateLessonEmbeddings(
    @Param('organizationId') organizationId: string,
    @Query('limit') limit?: number,
  ) {
    const result =
      await this.recommendationsService.generateLessonLearnedEmbeddingsBatch(
        organizationId,
        limit ? Number(limit) : 50,
      );
    return result;
  }
}
