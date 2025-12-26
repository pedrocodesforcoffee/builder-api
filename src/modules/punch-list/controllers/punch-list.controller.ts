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
  HttpCode,
  HttpStatus,
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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { PunchListService } from '../services/punch-list.service';
import {
  CreateLocationDto,
  UpdateLocationDto,
  QueryLocationsDto,
  BulkCreateLocationsDto,
} from '../dto/location.dto';
import {
  CreatePunchListDto,
  UpdatePunchListDto,
  QueryPunchListsDto,
} from '../dto/punch-list.dto';
import {
  CreatePunchItemDto,
  UpdatePunchItemDto,
  QueryPunchItemsDto,
  ChangeStatusDto,
  AssignPunchItemDto,
  AddCommentDto,
  BulkUpdatePunchItemsDto,
} from '../dto/punch-item.dto';

@ApiTags('Punch List Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('punch-list')
export class PunchListController {
  constructor(private readonly punchListService: PunchListService) {}

  // ============================================================================
  // LOCATION ENDPOINTS
  // ============================================================================

  @Post('locations')
  @ApiOperation({ summary: 'Create a new project location' })
  @ApiResponse({ status: 201, description: 'Location created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate code' })
  @ApiResponse({ status: 404, description: 'Project or parent location not found' })
  async createLocation(
    @Body() createDto: CreateLocationDto,
    @CurrentUser() user: User,
  ) {
    return this.punchListService.createLocation(createDto, user);
  }

  @Get('locations')
  @ApiOperation({ summary: 'Get all locations with optional filters' })
  @ApiResponse({ status: 200, description: 'Locations retrieved successfully' })
  async getLocations(@Query() queryDto: QueryLocationsDto) {
    return this.punchListService.getLocations(queryDto);
  }

  @Get('locations/tree')
  @ApiOperation({ summary: 'Get location tree for a project' })
  @ApiQuery({ name: 'projectId', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Location tree retrieved successfully' })
  async getLocationTree(@Query('projectId', ParseUUIDPipe) projectId: string) {
    return this.punchListService.getLocationTree(projectId);
  }

  @Get('locations/:id')
  @ApiOperation({ summary: 'Get a single location with details' })
  @ApiParam({ name: 'id', description: 'Location ID' })
  @ApiResponse({ status: 200, description: 'Location retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async getLocation(@Param('id', ParseUUIDPipe) id: string) {
    return this.punchListService.getLocation(id);
  }

  @Put('locations/:id')
  @ApiOperation({ summary: 'Update a location' })
  @ApiParam({ name: 'id', description: 'Location ID' })
  @ApiResponse({ status: 200, description: 'Location updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid update or circular reference' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async updateLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateLocationDto,
    @CurrentUser() user: User,
  ) {
    return this.punchListService.updateLocation(id, updateDto, user);
  }

  @Delete('locations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a location' })
  @ApiParam({ name: 'id', description: 'Location ID' })
  @ApiResponse({ status: 204, description: 'Location deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete location with punch items or children',
  })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async deleteLocation(@Param('id', ParseUUIDPipe) id: string) {
    await this.punchListService.deleteLocation(id);
  }

  @Post('locations/bulk')
  @ApiOperation({ summary: 'Bulk create locations' })
  @ApiResponse({ status: 201, description: 'Locations created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async bulkCreateLocations(
    @Body() bulkDto: BulkCreateLocationsDto,
    @CurrentUser() user: User,
  ) {
    return this.punchListService.bulkCreateLocations(bulkDto, user);
  }

  // ============================================================================
  // PUNCH LIST ENDPOINTS
  // ============================================================================

  @Post('lists')
  @ApiOperation({ summary: 'Create a new punch list' })
  @ApiResponse({ status: 201, description: 'Punch list created successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async createPunchList(
    @Body() createDto: CreatePunchListDto,
    @CurrentUser() user: User,
  ) {
    return this.punchListService.createPunchList(createDto, user);
  }

  @Get('lists')
  @ApiOperation({ summary: 'Get all punch lists with optional filters' })
  @ApiResponse({ status: 200, description: 'Punch lists retrieved successfully' })
  async getPunchLists(@Query() queryDto: QueryPunchListsDto) {
    return this.punchListService.getPunchLists(queryDto);
  }

  @Get('lists/:id')
  @ApiOperation({ summary: 'Get a single punch list with statistics' })
  @ApiParam({ name: 'id', description: 'Punch list ID' })
  @ApiResponse({ status: 200, description: 'Punch list retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Punch list not found' })
  async getPunchList(@Param('id', ParseUUIDPipe) id: string) {
    return this.punchListService.getPunchList(id);
  }

  @Put('lists/:id')
  @ApiOperation({ summary: 'Update a punch list' })
  @ApiParam({ name: 'id', description: 'Punch list ID' })
  @ApiResponse({ status: 200, description: 'Punch list updated successfully' })
  @ApiResponse({ status: 404, description: 'Punch list not found' })
  async updatePunchList(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdatePunchListDto,
    @CurrentUser() user: User,
  ) {
    return this.punchListService.updatePunchList(id, updateDto, user);
  }

  @Delete('lists/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a punch list' })
  @ApiParam({ name: 'id', description: 'Punch list ID' })
  @ApiResponse({ status: 204, description: 'Punch list deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete locked punch list or list with items',
  })
  @ApiResponse({ status: 404, description: 'Punch list not found' })
  async deletePunchList(@Param('id', ParseUUIDPipe) id: string) {
    await this.punchListService.deletePunchList(id);
  }

  // ============================================================================
  // PUNCH ITEM ENDPOINTS
  // ============================================================================

  @Post('items')
  @ApiOperation({ summary: 'Create a new punch item' })
  @ApiResponse({ status: 201, description: 'Punch item created successfully' })
  @ApiResponse({ status: 400, description: 'Punch list is locked' })
  @ApiResponse({ status: 404, description: 'Punch list not found' })
  async createPunchItem(
    @Body() createDto: CreatePunchItemDto,
    @CurrentUser() user: User,
  ) {
    return this.punchListService.createPunchItem(createDto, user);
  }

  @Get('items')
  @ApiOperation({ summary: 'Get all punch items with advanced filters' })
  @ApiResponse({ status: 200, description: 'Punch items retrieved successfully' })
  async getPunchItems(@Query() queryDto: QueryPunchItemsDto) {
    return this.punchListService.getPunchItems(queryDto);
  }

  @Get('items/stats')
  @ApiOperation({ summary: 'Get punch item statistics' })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Filter by project ID',
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getPunchItemStats(
    @Query('projectId', new ParseUUIDPipe({ optional: true })) projectId?: string,
  ) {
    return this.punchListService.getPunchItemStats(projectId);
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Get a single punch item with full details' })
  @ApiParam({ name: 'id', description: 'Punch item ID' })
  @ApiResponse({ status: 200, description: 'Punch item retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Punch item not found' })
  async getPunchItem(@Param('id', ParseUUIDPipe) id: string) {
    return this.punchListService.getPunchItem(id);
  }

  @Put('items/:id')
  @ApiOperation({ summary: 'Update a punch item' })
  @ApiParam({ name: 'id', description: 'Punch item ID' })
  @ApiResponse({ status: 200, description: 'Punch item updated successfully' })
  @ApiResponse({ status: 400, description: 'Punch list is locked' })
  @ApiResponse({ status: 404, description: 'Punch item not found' })
  async updatePunchItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdatePunchItemDto,
    @CurrentUser() user: User,
  ) {
    return this.punchListService.updatePunchItem(id, updateDto, user);
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a punch item' })
  @ApiParam({ name: 'id', description: 'Punch item ID' })
  @ApiResponse({ status: 204, description: 'Punch item deleted successfully' })
  @ApiResponse({ status: 400, description: 'Punch list is locked' })
  @ApiResponse({ status: 404, description: 'Punch item not found' })
  async deletePunchItem(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.punchListService.deletePunchItem(id, user);
  }

  // ============================================================================
  // PUNCH ITEM WORKFLOW ENDPOINTS
  // ============================================================================

  @Post('items/:id/status')
  @ApiOperation({ summary: 'Change punch item status' })
  @ApiParam({ name: 'id', description: 'Punch item ID' })
  @ApiResponse({ status: 200, description: 'Status changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Punch item not found' })
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: ChangeStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.punchListService.changeStatus(id, statusDto, user);
  }

  @Post('items/:id/assign')
  @ApiOperation({ summary: 'Assign punch item to a user' })
  @ApiParam({ name: 'id', description: 'Punch item ID' })
  @ApiResponse({ status: 200, description: 'Item assigned successfully' })
  @ApiResponse({ status: 404, description: 'Punch item or user not found' })
  async assignPunchItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignDto: AssignPunchItemDto,
    @CurrentUser() user: User,
  ) {
    return this.punchListService.assignPunchItem(id, assignDto, user);
  }

  @Post('items/:id/comment')
  @ApiOperation({ summary: 'Add a comment to a punch item' })
  @ApiParam({ name: 'id', description: 'Punch item ID' })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  @ApiResponse({ status: 404, description: 'Punch item not found' })
  async addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() commentDto: AddCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.punchListService.addComment(id, commentDto, user);
  }

  @Post('items/bulk-update')
  @ApiOperation({ summary: 'Bulk update multiple punch items' })
  @ApiResponse({
    status: 200,
    description: 'Bulk update completed with results',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async bulkUpdatePunchItems(
    @Body() bulkDto: BulkUpdatePunchItemsDto,
    @CurrentUser() user: User,
  ) {
    return this.punchListService.bulkUpdatePunchItems(bulkDto, user);
  }
}
