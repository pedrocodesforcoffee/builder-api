import { IsString, IsOptional, IsObject, IsArray, IsBoolean, IsEnum, MaxLength } from 'class-validator';
import { NotificationFrequency } from '../enums/notification-frequency.enum';

/**
 * Create Saved Search DTO
 */
export class CreateSavedSearchDto {
  /**
   * Name of the saved search
   */
  @IsString()
  @MaxLength(200)
  name!: string;

  /**
   * Description of the saved search
   */
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Search criteria
   */
  @IsObject()
  criteria!: Record<string, any>;

  /**
   * Sort field
   */
  @IsOptional()
  @IsString()
  sortBy?: string;

  /**
   * Sort order
   */
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  /**
   * Columns to display
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  columns?: string[];

  /**
   * Make search public
   */
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  /**
   * Enable notifications
   */
  @IsOptional()
  @IsBoolean()
  enableNotifications?: boolean;

  /**
   * Notification frequency
   */
  @IsOptional()
  @IsEnum(NotificationFrequency)
  notificationFrequency?: NotificationFrequency;

  /**
   * Tags for categorization
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  /**
   * Color for UI display
   */
  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  /**
   * Icon for UI display
   */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;
}