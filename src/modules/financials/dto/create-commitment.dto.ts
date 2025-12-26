import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsDateString,
  IsEmail,
  Min,
  MaxLength,
} from 'class-validator';
import { CommitmentType } from '../enums/commitment-type.enum';
import { CommitmentStatus } from '../enums/commitment-status.enum';

export class CreateCommitmentDto {
  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  number!: string;

  @IsEnum(CommitmentType)
  @IsNotEmpty()
  type!: CommitmentType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsEnum(CommitmentStatus)
  @IsOptional()
  status?: CommitmentStatus;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  vendorName!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  vendorContact?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  vendorEmail?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  originalAmount!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  currentAmount!: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
