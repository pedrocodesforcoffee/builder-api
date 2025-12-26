import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * DTO for creating a new cost code
 *
 * Cost codes follow CSI MasterFormat structure with hierarchical organization.
 * Example: "03-30-00" represents "Cast-in-Place Concrete"
 */
export class CreateCostCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[0-9]{2}-[0-9]{2}-[0-9]{2}$/, {
    message: 'Code must follow format XX-XX-XX (e.g., 03-30-00)',
  })
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description!: string;

  @IsInt()
  @Min(0)
  @Max(50)
  division!: number;

  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
