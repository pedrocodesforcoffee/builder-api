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
import { BudgetLineItemService } from '../services/budget-line-item.service';
import {
  CreateBudgetLineItemDto,
  UpdateBudgetLineItemDto,
  BudgetLineItemResponseDto,
  PaginatedLineItemsResponseDto,
  BulkCreateLineItemsDto,
  BulkUpdateLineItemsDto,
  ReorderLineItemsDto,
  LineItemQueryDto,
} from '../dto';

/**
 * BudgetLineItem Controller
 *
 * Handles HTTP requests for budget line item management.
 * All endpoints require authentication and project access.
 *
 * Base URL: /api/v1/projects/:projectId/budgets/:budgetId/line-items
 */
@ApiTags('Budget Line Items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/budgets/:budgetId/line-items')
export class BudgetLineItemController {
  constructor(private readonly lineItemService: BudgetLineItemService) {}

  /**
   * Create a new line item
   * POST /api/v1/projects/:projectId/budgets/:budgetId/line-items
   */
  @Post()
  @ApiOperation({ summary: 'Create a new budget line item' })
  @ApiResponse({
    status: 201,
    description: 'Line item created successfully',
    type: BudgetLineItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Budget or cost code not found' })
  async create(
    @Param('budgetId') budgetId: string,
    @Body() createDto: CreateBudgetLineItemDto,
  ): Promise<BudgetLineItemResponseDto> {
    // Ensure budgetId matches the route parameter
    const dto = { ...createDto, budgetId };
    return this.lineItemService.create(dto);
  }

  /**
   * Get all line items for a budget
   * GET /api/v1/projects/:projectId/budgets/:budgetId/line-items
   */
  @Get()
  @ApiOperation({ summary: 'Get all line items for a budget' })
  @ApiResponse({
    status: 200,
    description: 'Line items retrieved successfully',
    type: PaginatedLineItemsResponseDto,
  })
  async findAll(
    @Param('budgetId') budgetId: string,
    @Query() query: LineItemQueryDto,
  ): Promise<PaginatedLineItemsResponseDto> {
    return this.lineItemService.findAllByBudget(budgetId, query);
  }

  /**
   * Get a line item by ID
   * GET /api/v1/projects/:projectId/budgets/:budgetId/line-items/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a line item by ID' })
  @ApiResponse({
    status: 200,
    description: 'Line item retrieved successfully',
    type: BudgetLineItemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Line item not found' })
  async findOne(@Param('id') id: string): Promise<BudgetLineItemResponseDto> {
    return this.lineItemService.findOne(id);
  }

  /**
   * Update a line item
   * PUT /api/v1/projects/:projectId/budgets/:budgetId/line-items/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a budget line item' })
  @ApiResponse({
    status: 200,
    description: 'Line item updated successfully',
    type: BudgetLineItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Line item not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateBudgetLineItemDto,
  ): Promise<BudgetLineItemResponseDto> {
    return this.lineItemService.update(id, updateDto);
  }

  /**
   * Delete a line item
   * DELETE /api/v1/projects/:projectId/budgets/:budgetId/line-items/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a budget line item' })
  @ApiResponse({ status: 204, description: 'Line item deleted successfully' })
  @ApiResponse({ status: 404, description: 'Line item not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.lineItemService.remove(id);
  }

  /**
   * Bulk create line items
   * POST /api/v1/projects/:projectId/budgets/:budgetId/line-items/bulk
   */
  @Post('bulk')
  @ApiOperation({ summary: 'Bulk create budget line items' })
  @ApiResponse({
    status: 201,
    description: 'Line items created successfully',
    type: [BudgetLineItemResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Budget or cost code not found' })
  async bulkCreate(
    @Param('budgetId') budgetId: string,
    @Body() dto: BulkCreateLineItemsDto,
    @CurrentUser('id') userId: string,
  ): Promise<BudgetLineItemResponseDto[]> {
    return this.lineItemService.bulkCreate(budgetId, dto, userId);
  }

  /**
   * Bulk update line items
   * PUT /api/v1/projects/:projectId/budgets/:budgetId/line-items/bulk
   */
  @Put('bulk')
  @ApiOperation({ summary: 'Bulk update budget line items' })
  @ApiResponse({
    status: 200,
    description: 'Line items updated successfully',
    type: [BudgetLineItemResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Line item not found' })
  async bulkUpdate(
    @Param('budgetId') budgetId: string,
    @Body() dto: BulkUpdateLineItemsDto,
    @CurrentUser('id') userId: string,
  ): Promise<BudgetLineItemResponseDto[]> {
    return this.lineItemService.bulkUpdate(budgetId, dto, userId);
  }

  /**
   * Reorder line items
   * POST /api/v1/projects/:projectId/budgets/:budgetId/line-items/reorder
   */
  @Post('reorder')
  @ApiOperation({ summary: 'Reorder budget line items' })
  @ApiResponse({ status: 204, description: 'Line items reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Line item not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorder(
    @Param('budgetId') budgetId: string,
    @Body() dto: ReorderLineItemsDto,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.lineItemService.reorder(budgetId, dto, userId);
  }
}
