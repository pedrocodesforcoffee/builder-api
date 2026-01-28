import { IsString, IsUUID, IsEnum, IsBoolean, IsOptional, IsDateString } from 'class-validator';

/**
 * Action item types
 */
export enum ActionItemType {
  RFI = 'rfi',
  INSPECTION = 'inspection',
  APPROVAL = 'approval',
  SAFETY = 'safety',
  PUNCH_LIST = 'punch_list',
}

/**
 * Action item priority levels
 */
export enum ActionItemPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Action Item DTO
 *
 * Represents an actionable item requiring user attention
 */
export class ActionItemDto {
  @IsUUID()
  id!: string;

  @IsEnum(ActionItemType)
  type!: ActionItemType;

  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  projectId!: string;

  @IsString()
  projectName!: string;

  @IsEnum(ActionItemPriority)
  priority!: ActionItemPriority;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsBoolean()
  isOverdue!: boolean;

  @IsBoolean()
  assignedToMe!: boolean;

  @IsDateString()
  createdAt!: string;

  @IsString()
  url!: string;
}
