import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO for smart defaults
 * Provides AI-suggested default values based on similar projects
 */
export class SmartDefaultsResponseDto {
  @ApiProperty({ description: 'Budget estimate', example: { value: 5250000, confidence: 0.82, basis: '5 similar projects', range: { low: 4800000, high: 5700000 } } })
  budgetEstimate: {
    value: number;
    confidence: number;
    basis: string;
    range: {
      low: number;
      high: number;
    };
  };

  @ApiProperty({ description: 'Duration estimate in days', example: { value: 365, confidence: 0.78, basis: '5 similar projects', range: { low: 330, high: 400 } } })
  durationEstimate: {
    value: number;
    confidence: number;
    basis: string;
    range: {
      low: number;
      high: number;
    };
  };

  @ApiPropertyOptional({ description: 'Manpower estimate', example: { peakHeadcount: 45, averageHeadcount: 32, confidence: 0.75 } })
  manpowerEstimate?: {
    peakHeadcount: number;
    averageHeadcount: number;
    confidence: number;
  };

  @ApiPropertyOptional({ description: 'Expected RFI count', example: { value: 42, confidence: 0.70, basis: 'Average from 5 similar projects' } })
  expectedRfiCount?: {
    value: number;
    confidence: number;
    basis: string;
  };

  @ApiPropertyOptional({ description: 'Expected change order count', example: { value: 12, expectedValue: 185000, confidence: 0.68 } })
  expectedChangeOrders?: {
    value: number; // Count
    expectedValue: number; // Dollar value
    confidence: number;
  };

  @ApiPropertyOptional({ description: 'Recommended subcontractors', type: [String], example: ['ABC Steel Corporation', 'Premier Concrete Supply'] })
  recommendedSubcontractors?: string[];

  @ApiPropertyOptional({ description: 'Common scope elements', type: [String], example: ['Foundation', 'Structural Steel', 'MEP', 'Site Work'] })
  commonScopeElements?: string[];

  @ApiProperty({ description: 'Number of similar projects analyzed', example: 5 })
  sampleSize: number;

  @ApiProperty({ description: 'Supporting project IDs', type: [String] })
  supportingProjects: string[];

  @ApiPropertyOptional({ description: 'Risk factors to consider', type: [String], example: ['Structural costs tend to run 10% over budget', 'RFI velocity typically higher in months 3-6'] })
  riskFactors?: string[];

  @ApiPropertyOptional({ description: 'Success factors from similar projects', type: [String], example: ['Early subcontractor engagement reduced delays', 'Weekly coordination meetings improved quality'] })
  successFactors?: string[];
}
