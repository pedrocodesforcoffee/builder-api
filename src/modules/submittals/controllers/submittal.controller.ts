import {
  Controller,
  Get,
  Post,
  Put,
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
import { SubmittalService } from '../services/submittal.service';
import { CreateSubmittalDto, CreateSubmittalItemDto } from '../dto/create-submittal.dto';
import { UpdateSubmittalDto } from '../dto/update-submittal.dto';
import { SubmittalQueryDto } from '../dto/submittal-query.dto';
import { SubmitSubmittalDto } from '../dto/submit-submittal.dto';
import { RespondSubmittalDto } from '../dto/respond-submittal.dto';
import { CreateRevisionDto } from '../dto/create-revision.dto';

@ApiTags('Submittals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/projects/:projectId/submittals')
export class SubmittalController {
  constructor(private readonly submittalService: SubmittalService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new submittal requirement' })
  @ApiParam({ name: 'projectId', type: 'string' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Submittal created' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateSubmittalDto,
  ) {
    return this.submittalService.create(
      projectId,
      user.organizationId,
      user.id,
      dto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all submittals for a project' })
  @ApiParam({ name: 'projectId', type: 'string' })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: SubmittalQueryDto,
  ) {
    return this.submittalService.findAll(projectId, query);
  }

  @Get('register')
  @ApiOperation({ summary: 'Get submittal register view' })
  @ApiParam({ name: 'projectId', type: 'string' })
  async getRegister(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.submittalService.getSubmittalRegister(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific submittal' })
  @ApiParam({ name: 'projectId', type: 'string' })
  @ApiParam({ name: 'id', type: 'string' })
  async findOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.submittalService.findOne(id, projectId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a submittal' })
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateSubmittalDto,
  ) {
    return this.submittalService.update(id, projectId, user.id, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit a submittal for review' })
  async submit(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: SubmitSubmittalDto,
  ) {
    return this.submittalService.submit(id, projectId, user.id, dto);
  }

  @Post(':id/respond')
  @ApiOperation({ summary: 'Respond to a submittal (approve/reject)' })
  async respond(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: RespondSubmittalDto,
  ) {
    return this.submittalService.respond(id, projectId, user.id, user.organizationId, dto);
  }

  @Post(':id/revisions')
  @ApiOperation({ summary: 'Create a new revision' })
  async createRevision(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateRevisionDto,
  ) {
    return this.submittalService.createRevision(id, projectId, user.id, dto);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close an approved submittal' })
  async close(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.submittalService.close(id, projectId, user.id);
  }

  @Post(':id/void')
  @ApiOperation({ summary: 'Void a submittal' })
  async void(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body('reason') reason: string,
  ) {
    return this.submittalService.void(id, projectId, user.id, reason);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add an item to a submittal' })
  async addItem(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateSubmittalItemDto,
  ) {
    return this.submittalService.addItem(id, projectId, user.id, dto);
  }

  @Get(':id/revisions')
  @ApiOperation({ summary: 'Get all revisions for a submittal' })
  async getRevisions(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.submittalService.getRevisions(id, projectId);
  }

  @Get(':id/responses')
  @ApiOperation({ summary: 'Get all responses for a submittal' })
  async getResponses(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.submittalService.getResponses(id, projectId);
  }
}
