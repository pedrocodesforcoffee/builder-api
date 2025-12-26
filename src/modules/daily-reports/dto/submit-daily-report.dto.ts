import { IsString, IsOptional, IsIP } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Submit Daily Report DTO
 * Used when submitting a report for approval with digital signature
 */
export class SubmitDailyReportDto {
  @ApiProperty({ description: 'Base64 encoded signature image data' })
  @IsString()
  signatureData: string;

  @ApiPropertyOptional({ description: 'IP address of signer (auto-captured)' })
  @IsIP()
  @IsOptional()
  signedIp?: string;
}
