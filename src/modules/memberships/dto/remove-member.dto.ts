import { IsString, IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO for removing member
 */
export class RemoveMemberDto {
  @IsString()
  @IsOptional()
  reason?: string;

  @IsBoolean()
  @IsOptional()
  notifyUser?: boolean = true;
}
