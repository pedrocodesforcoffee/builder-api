import { IsArray, IsOptional, IsUUID } from 'class-validator';

/**
 * Share Saved Search DTO
 */
export class ShareSavedSearchDto {
  /**
   * User IDs to share with
   */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  userIds?: string[];

  /**
   * Role IDs to share with
   */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[];
}