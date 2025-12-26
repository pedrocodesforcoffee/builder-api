/**
 * Organization AI Budget Controller
 * API endpoints for managing organization-level AI budgets
 */

import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrganizationAiBudgetService } from '../services/organization-ai-budget.service';
import { OrganizationAiBudget } from '../entities/organization-ai-budget.entity';

@Controller('ai/organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationAiBudgetController {
  constructor(
    private orgBudgetService: OrganizationAiBudgetService,
  ) {}

  /**
   * GET /ai/organizations/:organizationId/budget
   * Get organization AI budget
   */
  @Get(':organizationId/budget')
  async getBudget(
    @Param('organizationId') organizationId: string,
    @Request() req,
  ) {
    // TODO: Add permission check - only org admins can view budget
    return this.orgBudgetService.getOrCreateBudget(organizationId);
  }

  /**
   * GET /ai/organizations/:organizationId/usage-stats
   * Get usage statistics
   */
  @Get(':organizationId/usage-stats')
  async getUsageStats(
    @Param('organizationId') organizationId: string,
    @Request() req,
  ) {
    // TODO: Add permission check
    return this.orgBudgetService.getUsageStats(organizationId);
  }

  /**
   * PUT /ai/organizations/:organizationId/budget
   * Update organization AI budget settings
   */
  @Put(':organizationId/budget')
  async updateBudget(
    @Param('organizationId') organizationId: string,
    @Body() updates: Partial<OrganizationAiBudget>,
    @Request() req,
  ) {
    // TODO: Add permission check - only org admins can update budget

    // Don't allow updating usage counters directly
    delete updates.tokensUsedThisMonth;
    delete updates.tokensUsedToday;
    delete updates.costThisMonth;
    delete updates.totalOperationsThisMonth;

    return this.orgBudgetService.updateBudget(organizationId, updates);
  }

  /**
   * GET /ai/organizations/alerts
   * Get all organizations with budget alerts (admin only)
   */
  @Get('alerts')
  async getOrganizationsWithAlerts(@Request() req) {
    // TODO: Add system admin check

    return this.orgBudgetService.getOrganizationsWithAlerts();
  }
}
