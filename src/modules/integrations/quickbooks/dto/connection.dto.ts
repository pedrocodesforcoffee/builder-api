import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { QBConnectionStatus } from '../enums';

/**
 * QuickBooks Connection Response DTO
 */
export class QBConnectionResponseDto {
  @ApiProperty({ description: 'Connection ID' })
  id!: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId!: string;

  @ApiProperty({ description: 'Connection status', enum: QBConnectionStatus })
  status!: QBConnectionStatus;

  @ApiProperty({ description: 'QuickBooks Realm ID (Company ID)' })
  qbRealmId!: string;

  @ApiPropertyOptional({ description: 'QuickBooks Company Name' })
  qbCompanyName?: string;

  @ApiProperty({ description: 'Access token expiration date' })
  accessTokenExpiresAt!: Date;

  @ApiProperty({ description: 'Refresh token expiration date' })
  refreshTokenExpiresAt!: Date;

  @ApiPropertyOptional({ description: 'When connection was established' })
  connectedAt?: Date;

  @ApiPropertyOptional({ description: 'When connection was disconnected' })
  disconnectedAt?: Date;

  @ApiPropertyOptional({ description: 'Last successful sync timestamp' })
  lastSyncedAt?: Date;

  @ApiPropertyOptional({ description: 'Last error message' })
  lastError?: string;

  @ApiProperty({ description: 'QuickBooks environment', enum: ['production', 'sandbox'] })
  qbEnvironment!: 'production' | 'sandbox';

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;
}

/**
 * OAuth Authorization URL Response
 */
export class QBAuthUrlResponseDto {
  @ApiProperty({ description: 'QuickBooks OAuth authorization URL' })
  authorizationUrl!: string;

  @ApiProperty({ description: 'State parameter for CSRF protection' })
  state!: string;
}

/**
 * OAuth Callback Query Parameters
 */
export class QBOAuthCallbackDto {
  @ApiProperty({ description: 'Authorization code from QuickBooks' })
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Realm ID (Company ID) from QuickBooks' })
  @IsString()
  realmId!: string;

  @ApiProperty({ description: 'State parameter for CSRF validation' })
  @IsString()
  state!: string;
}

/**
 * Disconnect Request DTO
 */
export class QBDisconnectDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsUUID()
  organizationId!: string;
}

/**
 * Connection Status Query DTO
 */
export class QBConnectionStatusDto {
  @ApiProperty({ description: 'Connection ID' })
  id!: string;

  @ApiProperty({ description: 'Connection status', enum: QBConnectionStatus })
  status!: QBConnectionStatus;

  @ApiProperty({ description: 'Is connection active and tokens valid' })
  isActive!: boolean;

  @ApiProperty({ description: 'Days until access token expires' })
  accessTokenExpiresInDays!: number;

  @ApiProperty({ description: 'Days until refresh token expires' })
  refreshTokenExpiresInDays!: number;

  @ApiPropertyOptional({ description: 'Last error if any' })
  lastError?: string;
}
