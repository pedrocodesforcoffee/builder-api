import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { QuickBooksVendorService } from '../services/quickbooks-vendor.service';
import {
  CreateQBVendorDto,
  UpdateQBVendorDto,
  QueryVendorsDto,
  QBVendorResponseDto,
  QBVendorsListResponseDto,
  LinkVendorToCommitmentDto,
  SyncVendorFromCommitmentDto,
} from '../dto';

/**
 * QuickBooks Vendor Controller
 *
 * REST API endpoints for vendor synchronization with QuickBooks.
 *
 * @controller integrations/quickbooks/:organizationId/vendors
 */
@Controller('integrations/quickbooks/:organizationId/vendors')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('QuickBooks - Vendors')
export class QuickBooksVendorController {
  constructor(private readonly vendorService: QuickBooksVendorService) {}

  /**
   * Get vendors from QuickBooks
   *
   * Fetches vendors from QuickBooks with optional filtering.
   *
   * @param organizationId - Organization ID
   * @param filters - Query filters
   * @returns List of vendors
   */
  @Get()
  @ApiOperation({
    summary: 'Get vendors from QuickBooks',
    description: 'Fetches vendors from QuickBooks with optional filtering',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Vendors retrieved successfully',
    type: QBVendorsListResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'QuickBooks connection not found',
  })
  async getVendors(
    @Param('organizationId') organizationId: string,
    @Query() filters: QueryVendorsDto,
  ): Promise<QBVendorsListResponseDto> {
    return this.vendorService.getVendors(organizationId, filters);
  }

  /**
   * Get vendor by ID
   *
   * Fetches a specific vendor from QuickBooks by ID.
   *
   * @param organizationId - Organization ID
   * @param vendorId - QuickBooks vendor ID
   * @returns Vendor details
   */
  @Get(':vendorId')
  @ApiOperation({
    summary: 'Get vendor by ID',
    description: 'Fetches a specific vendor from QuickBooks by ID',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
    type: 'string',
  })
  @ApiParam({
    name: 'vendorId',
    description: 'QuickBooks vendor ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Vendor retrieved successfully',
    type: QBVendorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Vendor not found',
  })
  async getVendorById(
    @Param('organizationId') organizationId: string,
    @Param('vendorId') vendorId: string,
  ): Promise<QBVendorResponseDto> {
    return this.vendorService.getVendorById(organizationId, vendorId);
  }

  /**
   * Create vendor in QuickBooks
   *
   * Creates a new vendor in QuickBooks.
   *
   * @param organizationId - Organization ID
   * @param data - Vendor creation data
   * @returns Created vendor
   */
  @Post()
  @ApiOperation({
    summary: 'Create vendor in QuickBooks',
    description: 'Creates a new vendor in QuickBooks',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
    type: 'string',
  })
  @ApiResponse({
    status: 201,
    description: 'Vendor created successfully',
    type: QBVendorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid vendor data',
  })
  async createVendor(
    @Param('organizationId') organizationId: string,
    @Body() data: CreateQBVendorDto,
  ): Promise<QBVendorResponseDto> {
    return this.vendorService.createVendor(organizationId, data);
  }

  /**
   * Update vendor in QuickBooks
   *
   * Updates an existing vendor in QuickBooks.
   *
   * @param organizationId - Organization ID
   * @param vendorId - QuickBooks vendor ID
   * @param data - Vendor update data
   * @returns Updated vendor
   */
  @Put(':vendorId')
  @ApiOperation({
    summary: 'Update vendor in QuickBooks',
    description: 'Updates an existing vendor in QuickBooks',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
    type: 'string',
  })
  @ApiParam({
    name: 'vendorId',
    description: 'QuickBooks vendor ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Vendor updated successfully',
    type: QBVendorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid vendor data or stale SyncToken',
  })
  @ApiResponse({
    status: 404,
    description: 'Vendor not found',
  })
  async updateVendor(
    @Param('organizationId') organizationId: string,
    @Param('vendorId') vendorId: string,
    @Body() data: UpdateQBVendorDto,
  ): Promise<QBVendorResponseDto> {
    return this.vendorService.updateVendor(organizationId, vendorId, data);
  }

  /**
   * Link vendor to commitment
   *
   * Links a QuickBooks vendor to a platform commitment.
   * Updates commitment.qbVendorId and creates entity link.
   *
   * @param organizationId - Organization ID
   * @param data - Link data
   */
  @Post('link')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Link vendor to commitment',
    description: 'Links a QuickBooks vendor to a platform commitment',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'Vendor linked successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Commitment or vendor not found',
  })
  async linkVendorToCommitment(
    @Param('organizationId') organizationId: string,
    @Body() data: LinkVendorToCommitmentDto,
  ): Promise<void> {
    return this.vendorService.linkVendorToCommitment(organizationId, data);
  }

  /**
   * Unlink vendor from commitment
   *
   * Removes the link between a QuickBooks vendor and a platform commitment.
   * Clears commitment.qbVendorId and removes entity link.
   *
   * @param organizationId - Organization ID
   * @param commitmentId - Commitment ID to unlink
   */
  @Post(':commitmentId/unlink')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Unlink vendor from commitment',
    description: 'Removes the link between a QuickBooks vendor and a platform commitment',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
    type: 'string',
  })
  @ApiParam({
    name: 'commitmentId',
    description: 'Commitment ID',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'Vendor unlinked successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Commitment or link not found',
  })
  async unlinkVendor(
    @Param('organizationId') organizationId: string,
    @Param('commitmentId') commitmentId: string,
  ): Promise<void> {
    // Delete the entity link
    const link = await this.vendorService['entityLinkRepository'].findOne({
      where: {
        organizationId,
        platformEntityType: 'COMMITMENT',
        platformEntityId: commitmentId,
        qbEntityType: 'VENDOR' as any,
      },
    });

    if (link) {
      await this.vendorService['entityLinkRepository'].remove(link);
    }

    // TODO: Also clear commitment.qbVendorId if commitment entity has this field
    // This would require injecting the Commitment repository

    return;
  }

  /**
   * Sync vendor from commitment
   *
   * Creates or updates a vendor in QuickBooks based on commitment data.
   * Automatically links the vendor to the commitment.
   *
   * @param organizationId - Organization ID
   * @param data - Sync data
   * @returns Synced vendor
   */
  @Post('sync')
  @ApiOperation({
    summary: 'Sync vendor from commitment',
    description: 'Creates or updates a vendor in QuickBooks based on commitment data',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Vendor synced successfully',
    type: QBVendorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Commitment not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Commitment not linked and createIfNotExists is false',
  })
  async syncVendorFromCommitment(
    @Param('organizationId') organizationId: string,
    @Body() data: SyncVendorFromCommitmentDto,
  ): Promise<QBVendorResponseDto> {
    return this.vendorService.syncVendorFromCommitment(organizationId, data);
  }
}
