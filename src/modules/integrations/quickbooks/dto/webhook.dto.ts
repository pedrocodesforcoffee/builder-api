import { IsString, IsOptional, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * QuickBooks Webhook DTOs
 *
 * Data transfer objects for QuickBooks webhook notifications.
 * QuickBooks uses CloudEvents 1.0 specification format.
 *
 * API Reference: https://developer.intuit.com/app/developer/qbo/docs/develop/webhooks
 */

/**
 * Event data payload
 */
export class WebhookEventDataDto {
  @ApiProperty({ description: 'Realm ID (QuickBooks company ID)' })
  @IsString()
  realmId!: string;

  @ApiProperty({ description: 'Entity name (e.g., Customer, Vendor, Bill)' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Entity ID' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Operation (Create, Update, Delete, Merge)' })
  @IsString()
  operation!: 'Create' | 'Update' | 'Delete' | 'Merge';

  @ApiProperty({ description: 'Last updated timestamp' })
  @IsString()
  lastUpdated!: string;

  @ApiPropertyOptional({ description: 'Deleted ID (for Merge operations)' })
  @IsOptional()
  @IsString()
  deletedId?: string;
}

/**
 * CloudEvents context attributes
 */
export class WebhookEventDto {
  @ApiProperty({ description: 'CloudEvents specification version' })
  @IsString()
  specversion!: string;

  @ApiProperty({ description: 'Event ID (UUID)' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Event source (realm ID)' })
  @IsString()
  source!: string;

  @ApiProperty({ description: 'Event type' })
  @IsString()
  type!: string;

  @ApiProperty({ description: 'Content type of data' })
  @IsString()
  datacontenttype!: string;

  @ApiProperty({ description: 'Event timestamp' })
  @IsString()
  time!: string;

  @ApiPropertyOptional({ description: 'Subject (entity name)' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ description: 'Event data payload' })
  @IsObject()
  data!: WebhookEventDataDto;
}

/**
 * QuickBooks webhook notification payload
 * Contains one or more CloudEvents
 */
export class QuickBooksWebhookDto {
  @ApiProperty({
    description: 'Array of CloudEvents',
    type: [WebhookEventDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookEventDto)
  eventNotifications!: WebhookEventDto[];
}

/**
 * Webhook verification challenge
 * QuickBooks sends this on initial webhook setup to verify endpoint
 */
export class WebhookVerificationDto {
  @ApiPropertyOptional({ description: 'Verification challenge string' })
  @IsOptional()
  @IsString()
  challenge?: string;
}

/**
 * Webhook processing result
 */
export class WebhookProcessingResultDto {
  @ApiProperty({ description: 'Number of events processed' })
  eventsProcessed!: number;

  @ApiProperty({ description: 'Number of events failed' })
  eventsFailed!: number;

  @ApiProperty({ description: 'Processing status' })
  status!: 'success' | 'partial_success' | 'failed';

  @ApiPropertyOptional({ description: 'Error messages if any' })
  errors?: string[];
}
