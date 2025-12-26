import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectProfileResponseDto } from './project-profile-response.dto';

/**
 * Response DTO for similar project matching
 * Includes the project profile plus similarity metrics
 */
export class SimilarProjectDto {
  @ApiProperty({ description: 'Project profile', type: ProjectProfileResponseDto })
  profile: ProjectProfileResponseDto;

  @ApiProperty({ description: 'Similarity score (0.0 - 1.0)', example: 0.85 })
  similarityScore: number;

  @ApiProperty({ description: 'Matching factors breakdown' })
  matchingFactors: {
    projectType: boolean;
    buildingType: boolean;
    size: boolean;
    contractValue: boolean;
    deliveryMethod: boolean;
    scopeOverlap: number; // Percentage of scope elements in common
    location: boolean;
  };

  @ApiPropertyOptional({ description: 'Key similarities explanation', example: 'Both commercial office buildings with similar square footage and structural scope' })
  similaritiesExplanation?: string;

  @ApiPropertyOptional({ description: 'Key differences explanation', example: 'Different delivery methods (Design-Bid-Build vs Design-Build)' })
  differencesExplanation?: string;

  @ApiPropertyOptional({ description: 'Recommendations based on this project', type: [String], example: ['Consider using same HVAC subcontractor', 'Similar timeline achievable'] })
  recommendations?: string[];
}
