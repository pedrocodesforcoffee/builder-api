import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseBoolPipe,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { PaymentApplicationService } from '../services/payment-application.service';
import { PaymentApplicationPdfService } from '../services/payment-application-pdf.service';
import {
  CreatePaymentApplicationDto,
  PaymentApplicationResponseDto,
  SubmitPaymentApplicationDto,
  ApprovePaymentApplicationDto,
  RejectPaymentApplicationDto,
  MarkPaymentApplicationPaidDto,
} from '../dto';
import { Response } from 'express';

/**
 * Payment Application Controller
 *
 * Handles HTTP requests for payment application management (AIA G702/G703).
 * All endpoints require authentication and project access.
 *
 * Base URL: /api/v1/projects/:projectId/payment-applications
 */
@ApiTags('Payment Applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/payment-applications')
export class PaymentApplicationController {
  constructor(
    private readonly paymentApplicationService: PaymentApplicationService,
    private readonly pdfService: PaymentApplicationPdfService,
  ) {}

  /**
   * Create a new payment application (DRAFT status)
   * POST /api/v1/projects/:projectId/payment-applications
   */
  @Post()
  @ApiOperation({ summary: 'Create a new payment application' })
  @ApiResponse({
    status: 201,
    description: 'Payment application created successfully',
    type: PaymentApplicationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Schedule of Values not found' })
  async create(
    @Param('projectId') projectId: string,
    @Body() createDto: CreatePaymentApplicationDto,
    @CurrentUser('id') userId: string,
  ): Promise<PaymentApplicationResponseDto> {
    return this.paymentApplicationService.create(projectId, createDto, userId);
  }

  /**
   * Get all payment applications for a project
   * GET /api/v1/projects/:projectId/payment-applications
   */
  @Get()
  @ApiOperation({ summary: 'Get all payment applications for a project' })
  @ApiResponse({
    status: 200,
    description: 'Payment applications retrieved successfully',
    type: [PaymentApplicationResponseDto],
  })
  async findAll(
    @Param('projectId') projectId: string,
    @Query('includeItems', new ParseBoolPipe({ optional: true })) includeItems?: boolean,
  ): Promise<PaymentApplicationResponseDto[]> {
    return this.paymentApplicationService.findAll(
      projectId,
      includeItems ?? false,
    );
  }

  /**
   * Get a payment application by ID
   * GET /api/v1/projects/:projectId/payment-applications/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a payment application by ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment application retrieved successfully',
    type: PaymentApplicationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Payment application not found' })
  async findOne(
    @Param('projectId') projectId: string,
    @Param('id') payAppId: string,
    @Query('includeItems', new ParseBoolPipe({ optional: true })) includeItems?: boolean,
  ): Promise<PaymentApplicationResponseDto> {
    return this.paymentApplicationService.findOne(
      projectId,
      payAppId,
      includeItems ?? false,
    );
  }

  /**
   * Get payment applications by commitment ID
   * GET /api/v1/projects/:projectId/payment-applications/commitment/:commitmentId
   */
  @Get('commitment/:commitmentId')
  @ApiOperation({ summary: 'Get payment applications by commitment ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment applications retrieved successfully',
    type: [PaymentApplicationResponseDto],
  })
  async findByCommitment(
    @Param('projectId') projectId: string,
    @Param('commitmentId') commitmentId: string,
    @Query('includeItems', new ParseBoolPipe({ optional: true })) includeItems?: boolean,
  ): Promise<PaymentApplicationResponseDto[]> {
    return this.paymentApplicationService.findByCommitment(
      projectId,
      commitmentId,
      includeItems ?? false,
    );
  }

  /**
   * Submit payment application for review (DRAFT → SUBMITTED)
   * PUT /api/v1/projects/:projectId/payment-applications/:id/submit
   */
  @Put(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit payment application for review' })
  @ApiResponse({
    status: 200,
    description: 'Payment application submitted successfully',
    type: PaymentApplicationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Payment application must be in DRAFT status',
  })
  @ApiResponse({ status: 404, description: 'Payment application not found' })
  async submit(
    @Param('projectId') projectId: string,
    @Param('id') payAppId: string,
    @Body() submitDto: SubmitPaymentApplicationDto,
    @CurrentUser('id') userId: string,
  ): Promise<PaymentApplicationResponseDto> {
    return this.paymentApplicationService.submit(
      projectId,
      payAppId,
      submitDto,
      userId,
    );
  }

  /**
   * Approve payment application (UNDER_REVIEW → APPROVED)
   * Updates commitment.invoicedAmount and budget actualCost
   * PUT /api/v1/projects/:projectId/payment-applications/:id/approve
   */
  @Put(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve payment application' })
  @ApiResponse({
    status: 200,
    description: 'Payment application approved successfully',
    type: PaymentApplicationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Payment application must be in UNDER_REVIEW status',
  })
  @ApiResponse({ status: 404, description: 'Payment application not found' })
  async approve(
    @Param('projectId') projectId: string,
    @Param('id') payAppId: string,
    @Body() approveDto: ApprovePaymentApplicationDto,
    @CurrentUser('id') userId: string,
  ): Promise<PaymentApplicationResponseDto> {
    return this.paymentApplicationService.approve(
      projectId,
      payAppId,
      approveDto,
      userId,
    );
  }

  /**
   * Reject payment application (UNDER_REVIEW → REJECTED)
   * PUT /api/v1/projects/:projectId/payment-applications/:id/reject
   */
  @Put(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject payment application' })
  @ApiResponse({
    status: 200,
    description: 'Payment application rejected successfully',
    type: PaymentApplicationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Payment application must be in UNDER_REVIEW status',
  })
  @ApiResponse({ status: 404, description: 'Payment application not found' })
  async reject(
    @Param('projectId') projectId: string,
    @Param('id') payAppId: string,
    @Body() rejectDto: RejectPaymentApplicationDto,
    @CurrentUser('id') userId: string,
  ): Promise<PaymentApplicationResponseDto> {
    return this.paymentApplicationService.reject(
      projectId,
      payAppId,
      rejectDto,
      userId,
    );
  }

  /**
   * Mark payment application as paid (APPROVED → PAID)
   * Updates commitment.paidAmount
   * PUT /api/v1/projects/:projectId/payment-applications/:id/mark-paid
   */
  @Put(':id/mark-paid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark payment application as paid' })
  @ApiResponse({
    status: 200,
    description: 'Payment application marked as paid successfully',
    type: PaymentApplicationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Payment application must be in APPROVED status',
  })
  @ApiResponse({ status: 404, description: 'Payment application not found' })
  async markPaid(
    @Param('projectId') projectId: string,
    @Param('id') payAppId: string,
    @Body() markPaidDto: MarkPaymentApplicationPaidDto,
    @CurrentUser('id') userId: string,
  ): Promise<PaymentApplicationResponseDto> {
    return this.paymentApplicationService.markPaid(
      projectId,
      payAppId,
      markPaidDto,
      userId,
    );
  }

  /**
   * Generate and download AIA G702 PDF
   * GET /api/v1/projects/:projectId/payment-applications/:id/g702
   */
  @Get(':id/g702')
  @ApiOperation({ summary: 'Generate AIA G702 PDF' })
  @ApiResponse({
    status: 200,
    description: 'G702 PDF generated successfully',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Payment application not found' })
  async getG702(
    @Param('id') payAppId: string,
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.pdfService.generateG702(payAppId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=G702-${payAppId}.pdf`,
      'Content-Length': pdf.length.toString(),
    });
    res.end(pdf);
  }

  /**
   * Generate and download AIA G703 PDF
   * GET /api/v1/projects/:projectId/payment-applications/:id/g703
   */
  @Get(':id/g703')
  @ApiOperation({ summary: 'Generate AIA G703 PDF' })
  @ApiResponse({
    status: 200,
    description: 'G703 PDF generated successfully',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Payment application not found' })
  async getG703(
    @Param('id') payAppId: string,
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.pdfService.generateG703(payAppId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=G703-${payAppId}.pdf`,
      'Content-Length': pdf.length.toString(),
    });
    res.end(pdf);
  }
}
