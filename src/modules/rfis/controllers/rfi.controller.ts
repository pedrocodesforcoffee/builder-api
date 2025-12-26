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
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RfiService } from '../services/rfi.service';
import { CreateRfiDto } from '../dto/create-rfi.dto';
import { UpdateRfiDto } from '../dto/update-rfi.dto';
import { RfiQueryDto } from '../dto/rfi-query.dto';
import { CreateRfiResponseDto } from '../dto/create-rfi-response.dto';
import { AddReferenceDto } from '../dto/add-reference.dto';

@ApiTags('RFIs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/projects/:projectId/rfis')
export class RfiController {
  constructor(private readonly rfiService: RfiService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new RFI' })
  @ApiParam({ name: 'projectId', type: 'string' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'RFI created successfully' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateRfiDto,
  ) {
    return this.rfiService.create(
      projectId,
      user.id,
      dto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all RFIs for a project' })
  @ApiParam({ name: 'projectId', type: 'string' })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: RfiQueryDto,
  ) {
    return this.rfiService.findAll(projectId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific RFI' })
  @ApiParam({ name: 'projectId', type: 'string' })
  @ApiParam({ name: 'id', type: 'string' })
  async findOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rfiService.findOne(id, projectId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an RFI' })
  @ApiParam({ name: 'projectId', type: 'string' })
  @ApiParam({ name: 'id', type: 'string' })
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateRfiDto,
  ) {
    return this.rfiService.update(id, projectId, user.id, dto);
  }

  @Post(':id/open')
  @ApiOperation({ summary: 'Open/send an RFI' })
  @ApiParam({ name: 'projectId', type: 'string' })
  @ApiParam({ name: 'id', type: 'string' })
  async open(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.rfiService.open(id, projectId, user.id);
  }

  @Post(':id/responses')
  @ApiOperation({ summary: 'Add a response to an RFI' })
  @ApiParam({ name: 'projectId', type: 'string' })
  @ApiParam({ name: 'id', type: 'string' })
  async addResponse(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateRfiResponseDto,
  ) {
    return this.rfiService.addResponse(id, projectId, user.id, dto);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close an RFI' })
  @ApiParam({ name: 'projectId', type: 'string' })
  @ApiParam({ name: 'id', type: 'string' })
  async close(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.rfiService.close(id, projectId, user.id);
  }

  @Post(':id/void')
  @ApiOperation({ summary: 'Void an RFI' })
  @ApiParam({ name: 'projectId', type: 'string' })
  @ApiParam({ name: 'id', type: 'string' })
  async void(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body('reason') reason: string,
  ) {
    return this.rfiService.void(id, projectId, user.id, reason);
  }

  @Post(':id/references')
  @ApiOperation({ summary: 'Add a reference to an RFI' })
  @ApiParam({ name: 'projectId', type: 'string' })
  @ApiParam({ name: 'id', type: 'string' })
  async addReference(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: AddReferenceDto,
  ) {
    return this.rfiService.addReference(id, projectId, user.id, dto);
  }

  @Delete(':id/references/:referenceId')
  @ApiOperation({ summary: 'Remove a reference from an RFI' })
  @ApiParam({ name: 'projectId', type: 'string' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiParam({ name: 'referenceId', type: 'string' })
  async removeReference(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('referenceId', ParseUUIDPipe) referenceId: string,
    @CurrentUser() user: any,
  ) {
    return this.rfiService.removeReference(id, referenceId, projectId, user.id);
  }
}
