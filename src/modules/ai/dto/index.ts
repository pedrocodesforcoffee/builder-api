/**
 * AI Recommendations DTOs Index
 * Centralized export for all recommendation-related DTOs
 */

// Input DTOs
export { CreateProjectProfileDto } from './create-project-profile.dto';
export { UpdateProjectProfileDto } from './update-project-profile.dto';
export { CreateRecommendationDto } from './create-recommendation.dto';
export { UpdateRecommendationDto } from './update-recommendation.dto';
export { CreateLessonLearnedDto } from './create-lesson-learned.dto';

// Query DTOs
export { FindSimilarProjectsDto } from './find-similar-projects.dto';
export { GetRecommendationsDto } from './get-recommendations.dto';
export { GetLessonsLearnedDto } from './get-lessons-learned.dto';

// Response DTOs
export { ProjectProfileResponseDto } from './project-profile-response.dto';
export { RecommendationResponseDto } from './recommendation-response.dto';
export { LessonLearnedResponseDto } from './lesson-learned-response.dto';
export { SimilarProjectDto } from './similar-project.dto';
export { SmartDefaultsResponseDto } from './smart-defaults-response.dto';
