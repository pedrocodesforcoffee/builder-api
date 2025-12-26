import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitSubmittalDto {
  @ApiPropertyOptional({ description: 'Cover letter or transmittal notes' })
  @IsOptional()
  @IsString()
  transmittalNotes?: string;

  @ApiPropertyOptional({ description: 'Additional attachment IDs to include' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentIds?: string[];

  @ApiPropertyOptional({ description: 'Notify these users on submission' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  notifyUserIds?: string[];
}
