import { IsArray, IsUUID, IsString, IsOptional, ArrayMaxSize, ArrayMinSize } from 'class-validator';

/**
 * DTO for bulk removing project members
 */
export class BulkRemoveMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  userIds!: string[];

  @IsString()
  @IsOptional()
  reason?: string;
}
