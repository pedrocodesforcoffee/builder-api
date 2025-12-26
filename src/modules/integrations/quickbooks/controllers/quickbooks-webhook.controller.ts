import {
  Controller,
  Post,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  UnauthorizedException,
  BadRequestException,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';
import { QuickBooksWebhookService } from '../services';
import { WebhookVerifierUtil } from '../utils';
import {
  QuickBooksWebhookDto,
  WebhookVerificationDto,
  WebhookProcessingResultDto,
} from '../dto';

/**
 * QuickBooks Webhook Controller
 *
 * Handles incoming webhook notifications from QuickBooks.
 * Implements CloudEvents 1.0 specification format.
 *
 * Features:
 * - Webhook verification challenge for endpoint setup
 * - HMAC-SHA256 signature verification
 * - Webhook event processing
 * - Background job queueing
 *
 * @controller
 */
@ApiTags('QuickBooks Webhooks')
@Controller('integrations/quickbooks/webhooks')
export class QuickBooksWebhookController {
  private readonly logger = new Logger(QuickBooksWebhookController.name);
  private readonly webhookVerifier = new WebhookVerifierUtil();

  constructor(
    private readonly webhookService: QuickBooksWebhookService,
  ) {}

  /**
   * Receive webhook notification from QuickBooks
   *
   * This endpoint handles two scenarios:
   * 1. Webhook verification challenge (initial setup)
   * 2. Actual webhook notifications (entity changes)
   *
   * @param req - Request with raw body
   * @param body - Parsed webhook payload
   * @param signature - Signature from 'intuit-signature' header
   * @returns Webhook processing result or challenge echo
   */
  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Receive QuickBooks webhook notification',
    description:
      'Processes webhook notifications from QuickBooks. ' +
      'Handles both verification challenge and entity change notifications. ' +
      'Validates webhook signature using HMAC-SHA256.',
  })
  @ApiHeader({
    name: 'intuit-signature',
    description: 'HMAC-SHA256 signature for webhook verification',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    type: WebhookProcessingResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook payload',
  })
  @ApiResponse({
    status: 401,
    description: 'Webhook signature verification failed',
  })
  async receiveWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: QuickBooksWebhookDto | WebhookVerificationDto,
    @Headers('intuit-signature') signature?: string,
  ): Promise<WebhookProcessingResultDto | { challenge: string }> {
    this.logger.log('Received webhook notification from QuickBooks');

    // Handle verification challenge (initial webhook setup)
    if (this.isVerificationChallenge(body)) {
      return this.handleVerificationChallenge(body as WebhookVerificationDto);
    }

    // Verify webhook signature
    if (!signature) {
      this.logger.warn('Webhook received without signature header');
      throw new UnauthorizedException('Missing webhook signature');
    }

    const rawBody = this.getRawBody(req);
    if (!this.verifyWebhookSignature(rawBody, signature)) {
      this.logger.warn('Webhook signature verification failed');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Process webhook
    try {
      const webhookDto = body as QuickBooksWebhookDto;

      // Validate webhook structure
      if (!webhookDto.eventNotifications || !Array.isArray(webhookDto.eventNotifications)) {
        throw new BadRequestException('Invalid webhook payload: missing eventNotifications');
      }

      const result = await this.webhookService.processWebhook(webhookDto);

      this.logger.log(
        `Webhook processed: ${result.eventsProcessed} succeeded, ${result.eventsFailed} failed`,
      );

      return result;
    } catch (error: any) {
      this.logger.error(
        `Failed to process webhook: ${error?.message}`,
        error?.stack,
      );
      throw error;
    }
  }

  /**
   * Check if payload is a verification challenge
   *
   * @param body - Webhook payload
   * @returns True if verification challenge
   */
  private isVerificationChallenge(
    body: QuickBooksWebhookDto | WebhookVerificationDto,
  ): boolean {
    return 'challenge' in body && typeof body.challenge === 'string';
  }

  /**
   * Handle verification challenge
   *
   * QuickBooks sends a challenge string during initial webhook setup
   * that must be echoed back to verify the endpoint.
   *
   * @param dto - Verification challenge DTO
   * @returns Challenge echo response
   */
  private handleVerificationChallenge(
    dto: WebhookVerificationDto,
  ): { challenge: string } {
    if (!dto.challenge) {
      throw new BadRequestException('Invalid verification challenge');
    }

    this.logger.log('Handling webhook verification challenge');
    return this.webhookVerifier.validateChallenge(dto.challenge);
  }

  /**
   * Verify webhook signature
   *
   * @param rawBody - Raw request body string
   * @param signature - Signature from header
   * @returns True if signature is valid
   */
  private verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const verifierToken = process.env.QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN;

    if (!verifierToken) {
      this.logger.error(
        'QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN not configured in environment',
      );
      throw new BadRequestException('Webhook verification not configured');
    }

    return this.webhookVerifier.verify(rawBody, signature, verifierToken);
  }

  /**
   * Extract raw body from request
   *
   * NestJS provides raw body via req.rawBody when using RawBodyRequest
   *
   * @param req - Request with raw body
   * @returns Raw body as string
   */
  private getRawBody(req: RawBodyRequest<Request>): string {
    if (req.rawBody) {
      return req.rawBody.toString('utf8');
    }

    // Fallback: try to stringify body (less reliable for signature verification)
    this.logger.warn('Raw body not available, using JSON.stringify fallback');
    return JSON.stringify(req.body);
  }
}
