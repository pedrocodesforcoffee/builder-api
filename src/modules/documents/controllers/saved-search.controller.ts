import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
} from '@nestjs/common';
import { SavedSearchService } from '../services/saved-search.service';
import {
  CreateSavedSearchDto,
  UpdateSavedSearchDto,
  SavedSearchResponseDto,
  SearchResponseDto,
} from '../dto/search.dto';

/**
 * Saved Search Controller
 *
 * Manages user's saved searches with alert notifications.
 *
 * Endpoints:
 * - POST   /projects/:projectId/saved-searches - Create saved search
 * - GET    /projects/:projectId/saved-searches - List saved searches
 * - GET    /saved-searches/:savedSearchId - Get saved search
 * - PUT    /saved-searches/:savedSearchId - Update saved search
 * - DELETE /saved-searches/:savedSearchId - Delete saved search
 * - POST   /saved-searches/:savedSearchId/execute - Execute saved search
 */
@Controller()
export class SavedSearchController {
  constructor(private readonly savedSearchService: SavedSearchService) {}

  /**
   * Create a new saved search
   */
  @Post('projects/:projectId/saved-searches')
  async createSavedSearch(
    @Param('projectId') projectId: string,
    @Body() dto: CreateSavedSearchDto,
    @Request() req: any,
  ): Promise<SavedSearchResponseDto> {
    const userId = req.user.id;
    return this.savedSearchService.createSavedSearch(projectId, userId, dto);
  }

  /**
   * Get saved search by ID
   */
  @Get('saved-searches/:savedSearchId')
  async getSavedSearch(
    @Param('savedSearchId') savedSearchId: string,
    @Request() req: any,
  ): Promise<SavedSearchResponseDto> {
    const userId = req.user.id;
    return this.savedSearchService.getSavedSearch(savedSearchId, userId);
  }

  /**
   * List user's saved searches for a project
   */
  @Get('projects/:projectId/saved-searches')
  async listSavedSearches(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ): Promise<SavedSearchResponseDto[]> {
    const userId = req.user.id;
    return this.savedSearchService.listSavedSearches(projectId, userId);
  }

  /**
   * Update saved search
   */
  @Put('saved-searches/:savedSearchId')
  async updateSavedSearch(
    @Param('savedSearchId') savedSearchId: string,
    @Body() dto: UpdateSavedSearchDto,
    @Request() req: any,
  ): Promise<SavedSearchResponseDto> {
    const userId = req.user.id;
    return this.savedSearchService.updateSavedSearch(savedSearchId, userId, dto);
  }

  /**
   * Delete saved search
   */
  @Delete('saved-searches/:savedSearchId')
  async deleteSavedSearch(
    @Param('savedSearchId') savedSearchId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    const userId = req.user.id;
    await this.savedSearchService.deleteSavedSearch(savedSearchId, userId);
    return { message: 'Saved search deleted successfully' };
  }

  /**
   * Execute a saved search
   *
   * Runs the saved search with optionally overridden parameters
   */
  @Post('saved-searches/:savedSearchId/execute')
  async executeSavedSearch(
    @Param('savedSearchId') savedSearchId: string,
    @Body() overrides: any,
    @Request() req: any,
  ): Promise<SearchResponseDto> {
    const userId = req.user.id;
    return this.savedSearchService.executeSavedSearch(
      savedSearchId,
      userId,
      overrides,
    );
  }
}
