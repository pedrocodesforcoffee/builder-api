import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PotentialChangeOrderService } from '../services/potential-change-order.service';
import { OwnerChangeOrderService } from '../services/owner-change-order.service';
import { CommitmentChangeOrderService } from '../services/commitment-change-order.service';
import { ChangeOrderCalculationService } from '../services/change-order-calculation.service';
import {
  UnifiedChangeOrderResponseDto,
  ChangeOrderQueryDto,
  COSummaryDto,
  ChangeOrderHistoryResponseDto,
} from '../dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChangeOrderHistory } from '../entities/change-order-history.entity';

/**
 * Change Order Controller (Unified)
 *
 * Provides project-wide queries across all change order types.
 * Base URL: /api/v1/projects/:projectId/change-orders
 */
@ApiTags('Change Orders (Unified)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/change-orders')
export class ChangeOrderController {
  constructor(
    private readonly pcoService: PotentialChangeOrderService,
    private readonly ocoService: OwnerChangeOrderService,
    private readonly ccoService: CommitmentChangeOrderService,
    private readonly calculationService: ChangeOrderCalculationService,
    @InjectRepository(ChangeOrderHistory)
    private readonly historyRepo: Repository<ChangeOrderHistory>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all change orders for project (unified query)' })
  @ApiResponse({
    status: 200,
    description: 'Change orders retrieved successfully',
    type: UnifiedChangeOrderResponseDto,
  })
  async findAll(
    @Param('projectId') projectId: string,
    @Query() query: ChangeOrderQueryDto,
  ): Promise<UnifiedChangeOrderResponseDto> {
    // Default to including all types if not specified
    const includePcos = query.includePcos !== false;
    const includeOcos = query.includeOcos !== false;
    const includeCcos = query.includeCcos !== false;

    // Fetch each type based on query parameters
    const pcos = includePcos
      ? await this.pcoService.findAll(projectId, query.pcoStatus)
      : [];

    const ocos = includeOcos
      ? await this.ocoService.findAll(projectId, query.ocoStatus)
      : [];

    const ccos = includeCcos
      ? await this.ccoService.findAll(projectId, undefined, query.ccoStatus)
      : [];

    // Calculate totals
    const totalCount = pcos.length + ocos.length + ccos.length;
    const totalAmount =
      pcos.reduce((sum, pco) => sum + Number(pco.totalAmount || 0), 0) +
      ocos.reduce((sum, oco) => sum + Number(oco.amount || 0), 0) +
      ccos.reduce((sum, cco) => sum + Number(cco.amount || 0), 0);

    return {
      pcos,
      ocos,
      ccos,
      totalCount,
      totalAmount,
    };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get project change order summary' })
  @ApiResponse({
    status: 200,
    description: 'Change order summary retrieved successfully',
    type: COSummaryDto,
  })
  async getSummary(
    @Param('projectId') projectId: string,
  ): Promise<COSummaryDto> {
    return this.calculationService.calculateProjectCOSummary(projectId);
  }

  @Get('log')
  @ApiOperation({ summary: 'Get change order log (history for all COs)' })
  @ApiResponse({
    status: 200,
    description: 'Change order log retrieved successfully',
    type: [ChangeOrderHistoryResponseDto],
  })
  async getLog(
    @Param('projectId') projectId: string,
    @Query('limit') limit?: number,
  ): Promise<ChangeOrderHistoryResponseDto[]> {
    const queryLimit = limit && limit > 0 ? limit : 100;

    // Query history for all change orders in the project
    // Note: We need to join with OCO/CCO/PCO tables to filter by projectId
    const historyEntries = await this.historyRepo
      .createQueryBuilder('history')
      .leftJoin('owner_change_order', 'oco',
        'history.change_order_id = oco.id AND history.change_order_type = :ocoType',
        { ocoType: 'OCO' }
      )
      .leftJoin('commitment_change_order', 'cco',
        'history.change_order_id = cco.id AND history.change_order_type = :ccoType',
        { ccoType: 'CCO' }
      )
      .leftJoin('potential_change_order', 'pco',
        'history.change_order_id = pco.id AND history.change_order_type = :pcoType',
        { pcoType: 'PCO' }
      )
      .leftJoin('change_order_package', 'pkg',
        'history.change_order_id = pkg.id AND history.change_order_type = :pkgType',
        { pkgType: 'PACKAGE' }
      )
      .where('oco.project_id = :projectId', { projectId })
      .orWhere('cco.project_id = :projectId', { projectId })
      .orWhere('pco.project_id = :projectId', { projectId })
      .orWhere('pkg.project_id = :projectId', { projectId })
      .orderBy('history.performed_at', 'DESC')
      .limit(queryLimit)
      .getMany();

    return historyEntries as any;
  }
}
