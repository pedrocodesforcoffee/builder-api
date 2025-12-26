import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QBAccountMapping } from '../entities';
import {
  CreateAccountMappingDto,
  UpdateAccountMappingDto,
  AccountMappingResponseDto,
  AutoMapAccountsDto,
} from '../dto';
import { QuickBooksAccountService } from '../services';

/**
 * QuickBooks Account Mapping Controller
 *
 * Manages mappings between platform cost codes/categories and QuickBooks accounts.
 * Account mappings are essential for proper expense tracking and journal entry creation.
 *
 * @route /api/v1/organizations/:organizationId/integrations/quickbooks/account-mappings
 */
@ApiTags('QuickBooks - Account Mappings')
@Controller('api/v1/organizations/:organizationId/integrations/quickbooks/account-mappings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuickBooksAccountMappingController {
  constructor(
    @InjectRepository(QBAccountMapping)
    private readonly mappingRepository: Repository<QBAccountMapping>,
    private readonly accountService: QuickBooksAccountService,
  ) {}

  /**
   * Get all account mappings for organization
   */
  @Get()
  @ApiOperation({ summary: 'List all account mappings' })
  @ApiResponse({ status: 200, description: 'Mappings retrieved', type: [AccountMappingResponseDto] })
  async getAccountMappings(
    @Param('organizationId') organizationId: string,
  ): Promise<AccountMappingResponseDto[]> {
    const mappings = await this.mappingRepository.find({
      where: { organizationId },
      order: { mappingType: 'ASC', createdAt: 'ASC' },
    });

    return mappings.map((mapping) => ({
      id: mapping.id,
      organizationId: mapping.organizationId,
      mappingType: mapping.mappingType,
      costCodeId: mapping.costCodeId,
      qbAccountId: mapping.qbAccountId,
      qbAccountName: mapping.qbAccountName,
      qbAccountType: mapping.qbAccountType,
      active: mapping.active,
      createdAt: mapping.createdAt,
      updatedAt: mapping.updatedAt,
    }));
  }

  /**
   * Get specific account mapping by ID
   */
  @Get(':mappingId')
  @ApiOperation({ summary: 'Get account mapping by ID' })
  @ApiResponse({ status: 200, description: 'Mapping retrieved', type: AccountMappingResponseDto })
  @ApiResponse({ status: 404, description: 'Mapping not found' })
  async getAccountMapping(
    @Param('organizationId') organizationId: string,
    @Param('mappingId') mappingId: string,
  ): Promise<AccountMappingResponseDto> {
    const mapping = await this.mappingRepository.findOne({
      where: { id: mappingId, organizationId },
    });

    if (!mapping) {
      throw new Error('Account mapping not found');
    }

    return {
      id: mapping.id,
      organizationId: mapping.organizationId,
      mappingType: mapping.mappingType,
      costCodeId: mapping.costCodeId,
      qbAccountId: mapping.qbAccountId,
      qbAccountName: mapping.qbAccountName,
      qbAccountType: mapping.qbAccountType,
      active: mapping.active,
      createdAt: mapping.createdAt,
      updatedAt: mapping.updatedAt,
    };
  }

  /**
   * Create a new account mapping
   */
  @Post()
  @ApiOperation({ summary: 'Create account mapping' })
  @ApiResponse({ status: 201, description: 'Mapping created', type: AccountMappingResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input or mapping already exists' })
  async createAccountMapping(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateAccountMappingDto,
  ): Promise<AccountMappingResponseDto> {
    // Check if mapping already exists
    const existing = await this.mappingRepository.findOne({
      where: {
        organizationId,
        mappingType: dto.mappingType as any,
        costCodeId: dto.costCodeId,
      },
    });

    if (existing) {
      throw new Error('Account mapping already exists for this cost code');
    }

    // Get QB account details
    const qbAccount = await this.accountService.getAccountById(
      organizationId,
      dto.qbAccountId,
    );

    const mapping = this.mappingRepository.create({
      organizationId,
      mappingType: dto.mappingType as any,
      costCodeId: dto.costCodeId,
      qbAccountId: dto.qbAccountId,
      qbAccountName: qbAccount.name,
      qbAccountType: qbAccount.accountType,
      active: true,
    });

    const saved = await this.mappingRepository.save(mapping);

    return {
      id: saved.id,
      organizationId: saved.organizationId,
      mappingType: saved.mappingType,
      costCodeId: saved.costCodeId,
      qbAccountId: saved.qbAccountId,
      qbAccountName: saved.qbAccountName,
      qbAccountType: saved.qbAccountType,
      active: saved.active,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  /**
   * Update account mappings (bulk operation)
   */
  @Put()
  @ApiOperation({ summary: 'Update account mappings (bulk)' })
  @ApiResponse({ status: 200, description: 'Mappings updated', type: [AccountMappingResponseDto] })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async updateAccountMappings(
    @Param('organizationId') organizationId: string,
    @Body() body: { mappings: UpdateAccountMappingDto[] },
  ): Promise<AccountMappingResponseDto[]> {
    const results: AccountMappingResponseDto[] = [];

    for (const dto of body.mappings) {
      // Find existing mapping
      const existing = await this.mappingRepository.findOne({
        where: {
          id: dto.id,
          organizationId,
        },
      });

      if (!existing) {
        throw new Error(`Account mapping not found: ${dto.id}`);
      }

      // Get QB account details if account changed
      if (dto.qbAccountId && dto.qbAccountId !== existing.qbAccountId) {
        const qbAccount = await this.accountService.getAccountById(
          organizationId,
          dto.qbAccountId,
        );
        existing.qbAccountId = dto.qbAccountId;
        existing.qbAccountName = qbAccount.name;
        existing.qbAccountType = qbAccount.accountType;
      }

      // Update other fields
      if (dto.active !== undefined) {
        existing.active = dto.active;
      }

      const saved = await this.mappingRepository.save(existing);

      results.push({
        id: saved.id,
        organizationId: saved.organizationId,
        mappingType: saved.mappingType,
        costCodeId: saved.costCodeId,
        qbAccountId: saved.qbAccountId,
        qbAccountName: saved.qbAccountName,
        qbAccountType: saved.qbAccountType,
        active: saved.active,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      });
    }

    return results;
  }

  /**
   * Update a single account mapping
   */
  @Put(':mappingId')
  @ApiOperation({ summary: 'Update account mapping' })
  @ApiResponse({ status: 200, description: 'Mapping updated', type: AccountMappingResponseDto })
  @ApiResponse({ status: 404, description: 'Mapping not found' })
  async updateAccountMapping(
    @Param('organizationId') organizationId: string,
    @Param('mappingId') mappingId: string,
    @Body() dto: UpdateAccountMappingDto,
  ): Promise<AccountMappingResponseDto> {
    const existing = await this.mappingRepository.findOne({
      where: { id: mappingId, organizationId },
    });

    if (!existing) {
      throw new Error('Account mapping not found');
    }

    // Update QB account if changed
    if (dto.qbAccountId && dto.qbAccountId !== existing.qbAccountId) {
      const qbAccount = await this.accountService.getAccountById(
        organizationId,
        dto.qbAccountId,
      );
      existing.qbAccountId = dto.qbAccountId;
      existing.qbAccountName = qbAccount.name;
      existing.qbAccountType = qbAccount.accountType;
    }

    if (dto.active !== undefined) {
      existing.active = dto.active;
    }

    const saved = await this.mappingRepository.save(existing);

    return {
      id: saved.id,
      organizationId: saved.organizationId,
      mappingType: saved.mappingType,
      costCodeId: saved.costCodeId,
      qbAccountId: saved.qbAccountId,
      qbAccountName: saved.qbAccountName,
      qbAccountType: saved.qbAccountType,
      active: saved.active,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  /**
   * Auto-map cost codes to QuickBooks accounts
   *
   * This endpoint attempts to automatically create mappings by matching
   * cost code names with QuickBooks account names.
   */
  @Post('auto-map')
  @ApiOperation({ summary: 'Auto-map cost codes to QuickBooks accounts' })
  @ApiResponse({ status: 200, description: 'Auto-mapping completed' })
  async autoMapAccounts(
    @Param('organizationId') organizationId: string,
    @Body() dto: AutoMapAccountsDto,
  ): Promise<{
    matched: number;
    created: number;
    skipped: number;
    errors: string[];
  }> {
    let matched = 0;
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    try {
      // Get all QB accounts
      const qbAccounts = await this.accountService.getAccounts(organizationId);

      // Get all existing mappings
      const existingMappings = await this.mappingRepository.find({
        where: { organizationId },
      });

      // TODO: Get all cost codes from the system
      // For now, this is a placeholder implementation
      // In a real implementation, you would:
      // 1. Get all cost codes from the CostCode entity
      // 2. For each cost code, try to find matching QB account by name similarity
      // 3. Create mapping if match found and no existing mapping
      //
      // Example logic:
      // for (const costCode of costCodes) {
      //   const match = findBestMatch(costCode.name, qbAccounts);
      //   if (match && !hasExistingMapping(costCode.id)) {
      //     createMapping(costCode.id, match.id);
      //   }
      // }

      return {
        matched,
        created,
        skipped,
        errors,
      };
    } catch (error: any) {
      errors.push(`Auto-mapping failed: ${error.message}`);
      return {
        matched,
        created,
        skipped,
        errors,
      };
    }
  }
}
