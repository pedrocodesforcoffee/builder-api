import { ApiProperty } from '@nestjs/swagger';

/**
 * Cost Code Tree Node DTO
 *
 * Represents a single node in the cost code hierarchy tree.
 * Includes all ancestors and descendants for tree visualization.
 */
export class CostCodeTreeNodeDto {
  @ApiProperty({
    description: 'Cost code ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Cost code',
    example: '01-1000',
  })
  code!: string;

  @ApiProperty({
    description: 'Cost code name',
    example: 'General Requirements',
  })
  name!: string;

  @ApiProperty({
    description: 'Description',
    required: false,
    example: 'General project requirements and site management',
  })
  description?: string;

  @ApiProperty({
    description: 'Parent cost code ID',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174111',
  })
  parentId?: string;

  @ApiProperty({
    description: 'Display order for sorting',
    example: 1,
  })
  displayOrder!: number;

  @ApiProperty({
    description: 'Whether this cost code is active',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: 'Depth level in the tree (0 = root)',
    example: 0,
  })
  level!: number;

  @ApiProperty({
    description: 'Path from root to this node (array of IDs)',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  path!: string[];

  @ApiProperty({
    description: 'Whether this node has children',
    example: true,
  })
  hasChildren!: boolean;

  @ApiProperty({
    description: 'Child cost codes (if loaded)',
    type: [CostCodeTreeNodeDto],
    required: false,
  })
  children?: CostCodeTreeNodeDto[];
}

/**
 * Cost Code Tree DTO
 *
 * Complete hierarchical tree structure of cost codes.
 */
export class CostCodeTreeDto {
  @ApiProperty({
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  projectId!: string;

  @ApiProperty({
    description: 'Root cost codes (top level)',
    type: [CostCodeTreeNodeDto],
  })
  roots!: CostCodeTreeNodeDto[];

  @ApiProperty({
    description: 'Total number of cost codes in the tree',
    example: 150,
  })
  totalCount!: number;

  @ApiProperty({
    description: 'Maximum depth of the tree',
    example: 3,
  })
  maxDepth!: number;
}
