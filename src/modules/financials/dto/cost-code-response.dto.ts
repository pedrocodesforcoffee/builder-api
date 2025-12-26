import { Expose, Type } from 'class-transformer';

/**
 * Response DTO for cost code data
 *
 * Used for API responses. Exposes only the fields that should be sent to clients.
 */
export class CostCodeResponseDto {
  @Expose()
  id!: string;

  @Expose()
  code!: string;

  @Expose()
  description?: string;

  @Expose()
  division!: number;

  @Expose()
  projectId!: string;

  @Expose()
  parentId?: string;

  @Expose()
  notes?: string;

  @Expose()
  isActive!: boolean;

  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @Expose()
  @Type(() => Date)
  updatedAt!: Date;
}
