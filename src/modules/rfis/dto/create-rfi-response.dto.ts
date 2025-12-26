import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RfiResponseType } from '../entities/rfi-response.entity';

export class CreateRfiResponseDto {
  @ApiProperty({ description: 'Response text' })
  @IsString()
  @MinLength(5)
  response: string;

  @ApiPropertyOptional({ description: 'Rich HTML response' })
  @IsOptional()
  @IsString()
  responseHtml?: string;

  @ApiPropertyOptional({ enum: RfiResponseType })
  @IsOptional()
  @IsEnum(RfiResponseType)
  responseType?: RfiResponseType;

  @ApiPropertyOptional({ description: 'Attachment document IDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentIds?: string[];

  @ApiPropertyOptional({ description: 'Mark as official response' })
  @IsOptional()
  @IsBoolean()
  isOfficial?: boolean;

  @ApiPropertyOptional({ description: 'Mark as internal only' })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @ApiPropertyOptional({ description: 'Forward to user ID' })
  @IsOptional()
  @IsUUID()
  forwardedToId?: string;

  @ApiPropertyOptional({ description: 'Note when forwarding' })
  @IsOptional()
  @IsString()
  forwardNote?: string;
}
