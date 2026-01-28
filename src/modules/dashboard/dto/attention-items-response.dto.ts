import { IsString, IsNumber, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Attention item types
 */
export enum AttentionItemType {
  RFI = 'rfi',
  INSPECTION = 'inspection',
  APPROVAL = 'approval',
  SAFETY = 'safety',
  PUNCHLIST = 'punchlist',
}

/**
 * Urgency levels for attention items
 */
export enum AttentionItemUrgency {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Project info in attention item
 */
export class AttentionItemProjectDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;
}

/**
 * Aggregated attention item by type
 */
export class AttentionItemDto {
  @IsEnum(AttentionItemType)
  type!: AttentionItemType;

  @IsNumber()
  count!: number;

  @IsString()
  label!: string;

  @IsEnum(AttentionItemUrgency)
  urgency!: AttentionItemUrgency;

  @IsString()
  viewAllUrl!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttentionItemProjectDto)
  projects!: AttentionItemProjectDto[];
}

/**
 * Response DTO for attention items endpoint
 */
export class AttentionItemsResponseDto {
  @IsNumber()
  totalCount!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttentionItemDto)
  items!: AttentionItemDto[];
}
