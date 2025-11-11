import { IsEnum, IsUUID, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RelationshipType } from '../enums/relationship-type.enum';

export class CreateRelationshipDto {
  @ApiProperty({
    description: 'Target project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  targetProjectId!: string;

  @ApiProperty({
    description: 'Type of relationship',
    enum: RelationshipType,
    example: RelationshipType.PARENT_CHILD,
  })
  @IsEnum(RelationshipType)
  relationshipType!: RelationshipType;

  @ApiPropertyOptional({
    description: 'Additional metadata for the relationship',
    example: { notes: 'Critical dependency' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}