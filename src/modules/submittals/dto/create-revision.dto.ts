import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateSubmittalItemDto } from './create-submittal.dto';

export class CreateRevisionDto {
  @ApiProperty({ description: 'Reason for this revision' })
  @IsString()
  revisionReason: string;

  @ApiPropertyOptional({ description: 'Description of changes made' })
  @IsOptional()
  @IsString()
  changeDescription?: string;

  @ApiPropertyOptional({ description: 'Updated items for this revision' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSubmittalItemDto)
  items?: CreateSubmittalItemDto[];

  @ApiPropertyOptional({ description: 'New attachment IDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentIds?: string[];
}
