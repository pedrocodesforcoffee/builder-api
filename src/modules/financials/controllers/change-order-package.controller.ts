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
import { ChangeOrderPackageService } from '../services/change-order-package.service';
import {
  CreateChangeOrderPackageDto,
  UpdateChangeOrderPackageDto,
  ChangeOrderPackageResponseDto,
  AddPackageItemDto,
  SubmitPackageDto,
  ApprovePackageDto,
} from '../dto';
import { CoPackageStatus } from '../enums/co-package-status.enum';

/**
 * Change Order Package Controller
 *
 * Handles HTTP requests for package management.
 * Base URL: /api/v1/projects/:projectId/co-packages
 */
@ApiTags('Change Order Packages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/co-packages')
export class ChangeOrderPackageController {
  constructor(private readonly packageService: ChangeOrderPackageService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new package' })
  @ApiResponse({ status: 201, description: 'Package created successfully' })
  async create(
    @Param('projectId') projectId: string,
    @Body() createDto: CreateChangeOrderPackageDto,
    @CurrentUser('id') userId: string,
  ): Promise<ChangeOrderPackageResponseDto> {
    const dto = { ...createDto, projectId, createdById: userId };
    return this.packageService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all packages for a project' })
  @ApiResponse({ status: 200, description: 'Packages retrieved successfully' })
  async findAll(
    @Param('projectId') projectId: string,
    @Query('status') status?: CoPackageStatus,
  ): Promise<ChangeOrderPackageResponseDto[]> {
    return this.packageService.findAll(projectId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a package by ID' })
  @ApiResponse({ status: 200, description: 'Package retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  async findOne(
    @Param('id') id: string,
  ): Promise<ChangeOrderPackageResponseDto> {
    return this.packageService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a package' })
  @ApiResponse({ status: 200, description: 'Package updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateChangeOrderPackageDto,
  ): Promise<ChangeOrderPackageResponseDto> {
    return this.packageService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a package' })
  @ApiResponse({ status: 204, description: 'Package deleted successfully' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.packageService.remove(id);
  }

  @Post(':id/items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add an item to the package' })
  @ApiResponse({ status: 201, description: 'Item added to package' })
  async addItem(
    @Param('id') packageId: string,
    @Body() addItemDto: AddPackageItemDto,
  ): Promise<void> {
    const dto = { ...addItemDto, packageId };
    return this.packageService.addItem(dto);
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an item from the package' })
  @ApiResponse({ status: 204, description: 'Item removed from package' })
  async removeItem(
    @Param('id') packageId: string,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    return this.packageService.removeItem(packageId, itemId);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit package for approval' })
  @ApiResponse({ status: 200, description: 'Package submitted successfully' })
  async submit(
    @Param('id') id: string,
    @Body() submitDto: SubmitPackageDto,
  ): Promise<ChangeOrderPackageResponseDto> {
    return this.packageService.submit(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a package' })
  @ApiResponse({ status: 200, description: 'Package approved successfully' })
  async approve(
    @Param('id') id: string,
    @Body() approveDto: ApprovePackageDto,
  ): Promise<ChangeOrderPackageResponseDto> {
    return this.packageService.approve(id);
  }
}
