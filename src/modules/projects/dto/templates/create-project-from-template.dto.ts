import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsOptional,
  IsObject,
  MaxLength,
} from 'class-validator';

export class CreateProjectFromTemplateDto {
  @IsUUID()
  @IsNotEmpty()
  templateId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  projectName!: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  projectNumber?: string;

  @IsUUID()
  @IsNotEmpty()
  organizationId!: string;

  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsObject()
  @IsOptional()
  overrides?: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    squareFootage?: number;
    originalContract?: number;
    currentContract?: number;
    customFields?: Record<string, any>;
    [key: string]: any;
  };
}
