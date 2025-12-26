import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like } from 'typeorm';
import {
  ProjectProfile,
  Recommendation,
  LessonLearned,
  ProjectPattern,
  SubcontractorPerformance,
} from '../entities';
import {
  CreateProjectProfileDto,
  UpdateProjectProfileDto,
  FindSimilarProjectsDto,
  CreateRecommendationDto,
  UpdateRecommendationDto,
  CreateLessonLearnedDto,
  GetRecommendationsDto,
  GetLessonsLearnedDto,
  SimilarProjectDto,
  SmartDefaultsResponseDto,
  ProjectProfileResponseDto,
  RecommendationResponseDto,
  LessonLearnedResponseDto,
} from '../dto';
import { RecommendationStatus, RecommendationType } from '../enums';
import { Project } from '../../projects/entities/project.entity';
import { plainToClass } from 'class-transformer';
import { OpenAiClientService } from './openai-client.service';

/**
 * Recommendations Service
 * Core service for AI-powered recommendations and cross-project learning
 *
 * Implements:
 * - Project profile management
 * - Similarity matching algorithm
 * - Contextual recommendations
 * - Smart defaults generation
 * - Lessons learned management
 */
@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    @InjectRepository(ProjectProfile)
    private projectProfileRepo: Repository<ProjectProfile>,

    @InjectRepository(Recommendation)
    private recommendationRepo: Repository<Recommendation>,

    @InjectRepository(LessonLearned)
    private lessonLearnedRepo: Repository<LessonLearned>,

    @InjectRepository(ProjectPattern)
    private projectPatternRepo: Repository<ProjectPattern>,

    @InjectRepository(SubcontractorPerformance)
    private subcontractorPerformanceRepo: Repository<SubcontractorPerformance>,

    @InjectRepository(Project)
    private projectRepo: Repository<Project>,

    private openaiClient: OpenAiClientService,
  ) {}

  // ============================================================================
  // PROJECT PROFILE MANAGEMENT
  // ============================================================================

  /**
   * Create a new project profile
   * Called when a new project is created
   */
  async createProjectProfile(dto: CreateProjectProfileDto): Promise<ProjectProfileResponseDto> {
    this.logger.log(`Creating project profile for project ${dto.projectId}`);

    // Check if profile already exists
    const existing = await this.projectProfileRepo.findOne({
      where: { projectId: dto.projectId },
    });

    if (existing) {
      throw new BadRequestException(`Project profile already exists for project ${dto.projectId}`);
    }

    const profile = this.projectProfileRepo.create(dto);
    const saved = await this.projectProfileRepo.save(profile);

    return plainToClass(ProjectProfileResponseDto, saved, { excludeExtraneousValues: true });
  }

  /**
   * Update a project profile
   * Called when project completes or when updating completion data
   */
  async updateProjectProfile(
    projectId: string,
    dto: UpdateProjectProfileDto,
  ): Promise<ProjectProfileResponseDto> {
    this.logger.log(`Updating project profile for project ${projectId}`);

    const profile = await this.projectProfileRepo.findOne({
      where: { projectId },
    });

    if (!profile) {
      throw new NotFoundException(`Project profile not found for project ${projectId}`);
    }

    Object.assign(profile, dto);
    const saved = await this.projectProfileRepo.save(profile);

    return plainToClass(ProjectProfileResponseDto, saved, { excludeExtraneousValues: true });
  }

  /**
   * Get project profile by project ID
   */
  async getProjectProfile(projectId: string): Promise<ProjectProfileResponseDto> {
    const profile = await this.projectProfileRepo.findOne({
      where: { projectId },
    });

    if (!profile) {
      throw new NotFoundException(`Project profile not found for project ${projectId}`);
    }

    return plainToClass(ProjectProfileResponseDto, profile, { excludeExtraneousValues: true });
  }

  // ============================================================================
  // SIMILARITY MATCHING
  // ============================================================================

  /**
   * Find similar projects using weighted similarity algorithm
   *
   * Algorithm uses 8 factors with weights:
   * - Project Type (weight: 3) - HIGHEST
   * - Building Type (weight: 2)
   * - Size ±50% (weight: 2)
   * - Contract Value ±50% (weight: 2)
   * - Delivery Method (weight: 1.5)
   * - Scope Elements Overlap (weight: 2)
   * - Location (weight: 1)
   * - Embedding Similarity (weight: 3) - if useEmbeddings=true
   *
   * Minimum similarity score: 0.3 to be considered similar
   */
  async findSimilarProjects(dto: FindSimilarProjectsDto): Promise<SimilarProjectDto[]> {
    this.logger.log(`Finding similar projects for project ${dto.projectId}`);

    // Get source project profile
    const sourceProfile = await this.projectProfileRepo.findOne({
      where: { projectId: dto.projectId },
    });

    if (!sourceProfile) {
      throw new NotFoundException(`Project profile not found for project ${dto.projectId}`);
    }

    // Build query for candidate projects
    const queryBuilder = this.projectProfileRepo.createQueryBuilder('profile');

    queryBuilder.where('profile.projectId != :projectId', { projectId: dto.projectId });
    queryBuilder.andWhere('profile.organizationId = :organizationId', {
      organizationId: sourceProfile.organizationId,
    });

    if (dto.onlyCompleted) {
      queryBuilder.andWhere('profile.isComplete = :isComplete', { isComplete: true });
    }

    if (dto.projectTypes && dto.projectTypes.length > 0) {
      queryBuilder.andWhere('profile.projectType IN (:...projectTypes)', {
        projectTypes: dto.projectTypes,
      });
    }

    if (dto.buildingTypes && dto.buildingTypes.length > 0) {
      queryBuilder.andWhere('profile.buildingType IN (:...buildingTypes)', {
        buildingTypes: dto.buildingTypes,
      });
    }

    const candidates = await queryBuilder.getMany();

    this.logger.log(`Found ${candidates.length} candidate projects`);

    // Calculate similarity scores for each candidate
    const scoredProjects = candidates
      .map((candidate) => {
        const similarity = this.calculateSimilarity(sourceProfile, candidate, dto.useEmbeddings);

        if (similarity.score < dto.minSimilarityScore) {
          return null; // Filter out low-scoring projects
        }

        const similarProjectDto: SimilarProjectDto = {
          profile: plainToClass(ProjectProfileResponseDto, candidate, {
            excludeExtraneousValues: true,
          }),
          similarityScore: similarity.score,
          matchingFactors: similarity.factors,
          similaritiesExplanation: this.generateSimilaritiesExplanation(
            sourceProfile,
            candidate,
            similarity.factors,
          ),
          differencesExplanation: this.generateDifferencesExplanation(
            sourceProfile,
            candidate,
            similarity.factors,
          ),
          recommendations: this.generateSimilarProjectRecommendations(
            sourceProfile,
            candidate,
            similarity.factors,
          ),
        };

        return similarProjectDto;
      })
      .filter((p) => p !== null) // Remove filtered projects
      .sort((a, b) => b.similarityScore - a.similarityScore) // Sort by score descending
      .slice(0, dto.limit); // Limit results

    this.logger.log(`Returning ${scoredProjects.length} similar projects`);

    return scoredProjects;
  }

  /**
   * Calculate similarity score between two project profiles
   * Returns score (0.0 - 1.0) and matching factors breakdown
   */
  private calculateSimilarity(
    source: ProjectProfile,
    target: ProjectProfile,
    useEmbeddings: boolean = false,
  ): { score: number; factors: any } {
    let totalWeight = 0;
    let totalScore = 0;

    const factors = {
      projectType: false,
      buildingType: false,
      size: false,
      contractValue: false,
      deliveryMethod: false,
      scopeOverlap: 0,
      location: false,
    };

    // Factor 1: Project Type (weight: 3) - HIGHEST
    const projectTypeWeight = 3;
    if (source.projectType === target.projectType) {
      totalScore += projectTypeWeight;
      factors.projectType = true;
    }
    totalWeight += projectTypeWeight;

    // Factor 2: Building Type (weight: 2)
    const buildingTypeWeight = 2;
    if (source.buildingType && target.buildingType && source.buildingType === target.buildingType) {
      totalScore += buildingTypeWeight;
      factors.buildingType = true;
    }
    totalWeight += buildingTypeWeight;

    // Factor 3: Size - within ±50% (weight: 2)
    const sizeWeight = 2;
    if (source.squareFootage && target.squareFootage) {
      const ratio = Math.abs(source.squareFootage - target.squareFootage) / source.squareFootage;
      if (ratio <= 0.5) {
        const sizeScore = (0.5 - ratio) * 2; // Linear scoring: 0.5=0, 0=1
        totalScore += sizeScore * sizeWeight;
        factors.size = true;
      }
    }
    totalWeight += sizeWeight;

    // Factor 4: Contract Value - within ±50% (weight: 2)
    const contractValueWeight = 2;
    if (source.contractValue && target.contractValue) {
      const ratio = Math.abs(source.contractValue - target.contractValue) / source.contractValue;
      if (ratio <= 0.5) {
        const valueScore = (0.5 - ratio) * 2; // Linear scoring
        totalScore += valueScore * contractValueWeight;
        factors.contractValue = true;
      }
    }
    totalWeight += contractValueWeight;

    // Factor 5: Delivery Method (weight: 1.5)
    const deliveryMethodWeight = 1.5;
    if (
      source.deliveryMethod &&
      target.deliveryMethod &&
      source.deliveryMethod === target.deliveryMethod
    ) {
      totalScore += deliveryMethodWeight;
      factors.deliveryMethod = true;
    }
    totalWeight += deliveryMethodWeight;

    // Factor 6: Scope Elements Overlap (weight: 2)
    const scopeWeight = 2;
    if (source.scopeElements && target.scopeElements && source.scopeElements.length > 0) {
      const sourceSet = new Set(source.scopeElements);
      const targetSet = new Set(target.scopeElements);
      const intersection = new Set([...sourceSet].filter((x) => targetSet.has(x)));
      const union = new Set([...sourceSet, ...targetSet]);

      const overlap = intersection.size / union.size; // Jaccard similarity
      factors.scopeOverlap = Math.round(overlap * 100) / 100;

      totalScore += overlap * scopeWeight;
    }
    totalWeight += scopeWeight;

    // Factor 7: Location (weight: 1)
    const locationWeight = 1;
    if (source.location && target.location) {
      if (source.location.toLowerCase() === target.location.toLowerCase()) {
        totalScore += locationWeight;
        factors.location = true;
      } else if (source.latitude && source.longitude && target.latitude && target.longitude) {
        // Calculate distance if coordinates available (haversine formula)
        const distance = this.calculateDistance(
          source.latitude,
          source.longitude,
          target.latitude,
          target.longitude,
        );

        // Within 50 miles = full score, 100+ miles = no score
        if (distance <= 100) {
          const distanceScore = Math.max(0, (100 - distance) / 100);
          totalScore += distanceScore * locationWeight;
          factors.location = distance <= 50;
        }
      }
    }
    totalWeight += locationWeight;

    // Factor 8: Embedding Similarity (weight: 3) - if enabled
    if (useEmbeddings && source.embedding && target.embedding) {
      const embeddingWeight = 3;
      const cosineSim = this.calculateCosineSimilarity(source.embedding, target.embedding);
      totalScore += cosineSim * embeddingWeight;
      totalWeight += embeddingWeight;
    }

    // Calculate final score
    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    return {
      score: Math.round(finalScore * 100) / 100, // Round to 2 decimals
      factors,
    };
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in miles
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   * Returns score (0.0 - 1.0)
   */
  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      return 0;
    }

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }

    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);

    if (mag1 === 0 || mag2 === 0) {
      return 0;
    }

    return dotProduct / (mag1 * mag2);
  }

  /**
   * Generate similarities explanation text
   */
  private generateSimilaritiesExplanation(
    source: ProjectProfile,
    target: ProjectProfile,
    factors: any,
  ): string {
    const similarities: string[] = [];

    if (factors.projectType) {
      similarities.push(`Both are ${source.projectType} projects`);
    }

    if (factors.buildingType) {
      similarities.push(`Same building type (${source.buildingType})`);
    }

    if (factors.size) {
      similarities.push('Similar square footage');
    }

    if (factors.contractValue) {
      similarities.push('Comparable contract values');
    }

    if (factors.scopeOverlap > 0.5) {
      similarities.push(`${Math.round(factors.scopeOverlap * 100)}% scope overlap`);
    }

    if (factors.deliveryMethod) {
      similarities.push(`Both use ${source.deliveryMethod} delivery method`);
    }

    if (factors.location) {
      similarities.push('Same geographic location');
    }

    return similarities.join(', ');
  }

  /**
   * Generate differences explanation text
   */
  private generateDifferencesExplanation(
    source: ProjectProfile,
    target: ProjectProfile,
    factors: any,
  ): string {
    const differences: string[] = [];

    if (!factors.deliveryMethod && source.deliveryMethod && target.deliveryMethod) {
      differences.push(
        `Different delivery methods (${source.deliveryMethod} vs ${target.deliveryMethod})`,
      );
    }

    if (!factors.buildingType && source.buildingType && target.buildingType) {
      differences.push(`Different building types (${source.buildingType} vs ${target.buildingType})`);
    }

    if (!factors.size && source.squareFootage && target.squareFootage) {
      const pct = Math.round(
        (Math.abs(source.squareFootage - target.squareFootage) / source.squareFootage) * 100,
      );
      differences.push(`Size difference of ${pct}%`);
    }

    return differences.length > 0 ? differences.join(', ') : 'Minimal differences';
  }

  /**
   * Generate recommendations based on similar project
   */
  private generateSimilarProjectRecommendations(
    source: ProjectProfile,
    target: ProjectProfile,
    factors: any,
  ): string[] {
    const recommendations: string[] = [];

    // If target project completed under budget
    if (target.isComplete && target.costVariancePercent && target.costVariancePercent < -5) {
      recommendations.push(
        `This similar project came in ${Math.abs(target.costVariancePercent)}% under budget - consider their approach`,
      );
    }

    // If target project completed early
    if (target.isComplete && target.scheduleVarianceDays && target.scheduleVarianceDays < -7) {
      recommendations.push(
        `This project completed ${Math.abs(target.scheduleVarianceDays)} days early - review their schedule`,
      );
    }

    // If similar scope
    if (factors.scopeOverlap > 0.7) {
      recommendations.push('Review scope breakdown and subcontractor selection from this project');
    }

    // If same delivery method
    if (factors.deliveryMethod) {
      recommendations.push(`Consider similar contract structure and risk allocation`);
    }

    return recommendations;
  }

  // ============================================================================
  // SMART DEFAULTS
  // ============================================================================

  /**
   * Generate smart defaults for a new project based on similar projects
   * Provides AI-suggested budget, duration, and other estimates
   */
  async generateSmartDefaults(projectId: string): Promise<SmartDefaultsResponseDto> {
    this.logger.log(`Generating smart defaults for project ${projectId}`);

    // Find similar projects
    const similarProjects = await this.findSimilarProjects({
      projectId,
      limit: 10,
      minSimilarityScore: 0.4,
      onlyCompleted: true,
      useEmbeddings: false,
    });

    if (similarProjects.length === 0) {
      throw new NotFoundException('No similar projects found to generate smart defaults');
    }

    const profiles = similarProjects.map((sp) => sp.profile);

    // Calculate budget estimate
    const budgets = profiles
      .filter((p) => p.finalCost || p.contractValue)
      .map((p) => p.finalCost || p.contractValue);

    const budgetEstimate = this.calculateRangeEstimate(budgets, 'budget');

    // Calculate duration estimate
    const durations = profiles.filter((p) => p.durationDays).map((p) => p.durationDays);
    const durationEstimate = this.calculateRangeEstimate(durations, 'duration');

    // Calculate RFI count
    const rfiCounts = profiles.filter((p) => p.rfiCount).map((p) => p.rfiCount);
    const expectedRfiCount = rfiCounts.length > 0
      ? {
          value: Math.round(rfiCounts.reduce((a, b) => a + b, 0) / rfiCounts.length),
          confidence: Math.min(0.9, 0.5 + (rfiCounts.length * 0.05)),
          basis: `Average from ${rfiCounts.length} similar projects`,
        }
      : undefined;

    // Calculate change orders
    const changeOrderCounts = profiles.filter((p) => p.changeOrderCount).map((p) => p.changeOrderCount);
    const changeOrderValues = profiles.filter((p) => p.changeOrderValue).map((p) => p.changeOrderValue);

    const expectedChangeOrders = changeOrderCounts.length > 0
      ? {
          value: Math.round(changeOrderCounts.reduce((a, b) => a + b, 0) / changeOrderCounts.length),
          expectedValue: changeOrderValues.length > 0
            ? Math.round(changeOrderValues.reduce((a, b) => a + b, 0) / changeOrderValues.length)
            : 0,
          confidence: Math.min(0.9, 0.5 + (changeOrderCounts.length * 0.05)),
        }
      : undefined;

    // Extract common scope elements
    const allScopeElements = profiles.flatMap((p) => p.scopeElements || []);
    const scopeCounts = new Map<string, number>();
    allScopeElements.forEach((elem) => {
      scopeCounts.set(elem, (scopeCounts.get(elem) || 0) + 1);
    });

    const commonScopeElements = Array.from(scopeCounts.entries())
      .filter(([_, count]) => count >= profiles.length * 0.5) // Appears in 50%+ of projects
      .map(([elem, _]) => elem)
      .sort();

    // Get risk factors from patterns
    const riskFactors = await this.getRiskFactorsForProject(projectId);

    // Get success factors from lessons learned
    const successFactors = await this.getSuccessFactorsForProject(projectId);

    const response: SmartDefaultsResponseDto = {
      budgetEstimate,
      durationEstimate,
      expectedRfiCount,
      expectedChangeOrders,
      commonScopeElements,
      sampleSize: similarProjects.length,
      supportingProjects: similarProjects.map((sp) => sp.profile.projectId),
      riskFactors,
      successFactors,
    };

    return response;
  }

  /**
   * Calculate range estimate with confidence score
   */
  private calculateRangeEstimate(values: number[], type: string) {
    if (values.length === 0) {
      return {
        value: 0,
        confidence: 0,
        basis: 'Insufficient data',
        range: { low: 0, high: 0 },
      };
    }

    const sorted = values.slice().sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];

    // Calculate standard deviation
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Range: mean ± 1 standard deviation
    const low = Math.max(0, Math.round(mean - stdDev));
    const high = Math.round(mean + stdDev);

    // Confidence based on sample size and consistency
    const consistency = 1 - (stdDev / mean); // Lower std dev = higher consistency
    const sampleFactor = Math.min(1, values.length / 10); // More samples = higher confidence
    const confidence = Math.round((consistency * 0.6 + sampleFactor * 0.4) * 100) / 100;

    return {
      value: Math.round(median), // Use median as it's more robust to outliers
      confidence: Math.max(0, Math.min(1, confidence)),
      basis: `${values.length} similar projects`,
      range: { low, high },
    };
  }

  /**
   * Get risk factors from organizational patterns
   */
  private async getRiskFactorsForProject(projectId: string): Promise<string[]> {
    const profile = await this.projectProfileRepo.findOne({
      where: { projectId },
    });

    if (!profile) {
      return [];
    }

    const patterns = await this.projectPatternRepo.find({
      where: {
        organizationId: profile.organizationId,
        isActive: true,
        impactSeverity: In(['HIGH', 'CRITICAL']),
      },
      take: 5,
    });

    return patterns.map((p) => p.patternName);
  }

  /**
   * Get success factors from lessons learned
   */
  private async getSuccessFactorsForProject(projectId: string): Promise<string[]> {
    const profile = await this.projectProfileRepo.findOne({
      where: { projectId },
    });

    if (!profile) {
      return [];
    }

    const lessons = await this.lessonLearnedRepo.find({
      where: {
        organizationId: profile.organizationId,
        isApproved: true,
        isActive: true,
        impactType: 'TIME_SAVINGS', // Or other positive impacts
      },
      order: { effectivenessScore: 'DESC' },
      take: 5,
    });

    return lessons.map((l) => l.recommendedAction).filter((a) => a);
  }

  // ============================================================================
  // RECOMMENDATION MANAGEMENT
  // ============================================================================

  /**
   * Create a new recommendation
   */
  async createRecommendation(dto: CreateRecommendationDto): Promise<RecommendationResponseDto> {
    this.logger.log(`Creating recommendation for project ${dto.projectId}`);

    // Set expiration to 30 days from now if not specified
    const recommendation = this.recommendationRepo.create({
      ...dto,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    const saved = await this.recommendationRepo.save(recommendation);

    return plainToClass(RecommendationResponseDto, saved, { excludeExtraneousValues: true });
  }

  /**
   * Get a single recommendation by ID
   */
  async getRecommendationById(id: string): Promise<RecommendationResponseDto> {
    const recommendation = await this.recommendationRepo.findOne({ where: { id } });

    if (!recommendation) {
      throw new NotFoundException(`Recommendation not found: ${id}`);
    }

    return plainToClass(RecommendationResponseDto, recommendation, { excludeExtraneousValues: true });
  }

  /**
   * Accept a recommendation
   */
  async acceptRecommendation(
    id: string,
    userId: string,
    feedback?: string,
  ): Promise<RecommendationResponseDto> {
    const recommendation = await this.recommendationRepo.findOne({ where: { id } });

    if (!recommendation) {
      throw new NotFoundException(`Recommendation not found: ${id}`);
    }

    recommendation.status = RecommendationStatus.ACCEPTED;
    recommendation.actionTakenAt = new Date();
    recommendation.actionTakenByUserId = userId;
    if (feedback) {
      recommendation.userFeedback = feedback;
    }

    const saved = await this.recommendationRepo.save(recommendation);

    return plainToClass(RecommendationResponseDto, saved, { excludeExtraneousValues: true });
  }

  /**
   * Reject a recommendation
   */
  async rejectRecommendation(
    id: string,
    userId: string,
    reason: string,
  ): Promise<RecommendationResponseDto> {
    const recommendation = await this.recommendationRepo.findOne({ where: { id } });

    if (!recommendation) {
      throw new NotFoundException(`Recommendation not found: ${id}`);
    }

    recommendation.status = RecommendationStatus.REJECTED;
    recommendation.actionTakenAt = new Date();
    recommendation.actionTakenByUserId = userId;
    recommendation.userFeedback = reason;

    const saved = await this.recommendationRepo.save(recommendation);

    return plainToClass(RecommendationResponseDto, saved, { excludeExtraneousValues: true });
  }

  /**
   * Update a recommendation (user interaction)
   */
  async updateRecommendation(
    id: string,
    dto: UpdateRecommendationDto,
    userId?: string,
  ): Promise<RecommendationResponseDto> {
    const recommendation = await this.recommendationRepo.findOne({ where: { id } });

    if (!recommendation) {
      throw new NotFoundException(`Recommendation not found: ${id}`);
    }

    Object.assign(recommendation, dto);

    // Update action taken fields if status changed to accepted/rejected
    if (
      dto.status &&
      (dto.status === RecommendationStatus.ACCEPTED || dto.status === RecommendationStatus.REJECTED)
    ) {
      recommendation.actionTakenAt = new Date();
      if (userId) {
        recommendation.actionTakenByUserId = userId;
      }
    }

    const saved = await this.recommendationRepo.save(recommendation);

    return plainToClass(RecommendationResponseDto, saved, { excludeExtraneousValues: true });
  }

  /**
   * Get recommendations for a project
   */
  async getRecommendations(dto: GetRecommendationsDto): Promise<{
    data: RecommendationResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryBuilder = this.recommendationRepo.createQueryBuilder('rec');

    queryBuilder.where('rec.projectId = :projectId', { projectId: dto.projectId });

    if (dto.types && dto.types.length > 0) {
      queryBuilder.andWhere('rec.type IN (:...types)', { types: dto.types });
    }

    if (dto.statuses && dto.statuses.length > 0) {
      queryBuilder.andWhere('rec.status IN (:...statuses)', { statuses: dto.statuses });
    }

    if (dto.priorities && dto.priorities.length > 0) {
      queryBuilder.andWhere('rec.priority IN (:...priorities)', { priorities: dto.priorities });
    }

    if (dto.actionableOnly) {
      queryBuilder.andWhere('rec.actionSuggestion IS NOT NULL');
    }

    if (dto.contextType) {
      queryBuilder.andWhere('rec.contextType = :contextType', { contextType: dto.contextType });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply sorting
    queryBuilder.orderBy(`rec.${dto.sortBy}`, dto.sortOrder);

    // Apply pagination
    const offset = (dto.page - 1) * dto.limit;
    queryBuilder.skip(offset).take(dto.limit);

    const recommendations = await queryBuilder.getMany();

    return {
      data: recommendations.map((rec) =>
        plainToClass(RecommendationResponseDto, rec, { excludeExtraneousValues: true }),
      ),
      total,
      page: dto.page,
      limit: dto.limit,
    };
  }

  // ============================================================================
  // LESSON LEARNED MANAGEMENT
  // ============================================================================

  /**
   * Create a new lesson learned
   */
  async createLessonLearned(dto: CreateLessonLearnedDto): Promise<LessonLearnedResponseDto> {
    this.logger.log(`Creating lesson learned for organization ${dto.organizationId}`);

    const lesson = this.lessonLearnedRepo.create(dto);
    const saved = await this.lessonLearnedRepo.save(lesson);

    return plainToClass(LessonLearnedResponseDto, saved, { excludeExtraneousValues: true });
  }

  /**
   * Get lessons learned for an organization
   */
  async getLessonsLearned(dto: GetLessonsLearnedDto): Promise<{
    data: LessonLearnedResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryBuilder = this.lessonLearnedRepo.createQueryBuilder('lesson');

    queryBuilder.where('lesson.organizationId = :organizationId', {
      organizationId: dto.organizationId,
    });

    if (dto.projectId) {
      queryBuilder.andWhere('lesson.projectId = :projectId', { projectId: dto.projectId });
    }

    if (dto.categories && dto.categories.length > 0) {
      queryBuilder.andWhere('lesson.category IN (:...categories)', { categories: dto.categories });
    }

    if (dto.tags && dto.tags.length > 0) {
      queryBuilder.andWhere('lesson.tags && ARRAY[:...tags]', { tags: dto.tags });
    }

    if (dto.search) {
      queryBuilder.andWhere(
        '(lesson.title ILIKE :search OR lesson.situation ILIKE :search OR lesson.lesson ILIKE :search)',
        { search: `%${dto.search}%` },
      );
    }

    if (dto.approvedOnly) {
      queryBuilder.andWhere('lesson.isApproved = :isApproved', { isApproved: true });
    }

    if (dto.publicOnly) {
      queryBuilder.andWhere('lesson.isPublic = :isPublic', { isPublic: true });
    }

    queryBuilder.andWhere('lesson.isActive = :isActive', { isActive: true });

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply sorting
    queryBuilder.orderBy(`lesson.${dto.sortBy}`, dto.sortOrder);

    // Apply pagination
    const offset = (dto.page - 1) * dto.limit;
    queryBuilder.skip(offset).take(dto.limit);

    const lessons = await queryBuilder.getMany();

    return {
      data: lessons.map((lesson) =>
        plainToClass(LessonLearnedResponseDto, lesson, { excludeExtraneousValues: true }),
      ),
      total,
      page: dto.page,
      limit: dto.limit,
    };
  }

  // ============================================================================
  // EMBEDDING GENERATION
  // ============================================================================

  /**
   * Generate embedding for a project profile
   * Combines key metadata into text for embedding generation
   */
  async generateProjectProfileEmbedding(profileId: string): Promise<void> {
    this.logger.log(`Generating embedding for project profile ${profileId}`);

    const profile = await this.projectProfileRepo.findOne({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException(`Project profile ${profileId} not found`);
    }

    // Build text representation of project for embedding
    const textParts: string[] = [];

    // Project type and building type are most important
    if (profile.projectType) {
      textParts.push(`Project Type: ${profile.projectType}`);
    }

    if (profile.buildingType) {
      textParts.push(`Building Type: ${profile.buildingType}`);
    }

    // Add scope elements (what work is being done)
    if (profile.scopeElements && profile.scopeElements.length > 0) {
      textParts.push(`Scope: ${profile.scopeElements.join(', ')}`);
    }

    // Add specialty trades (who is involved)
    if (profile.specialtyTrades && profile.specialtyTrades.length > 0) {
      textParts.push(`Trades: ${profile.specialtyTrades.join(', ')}`);
    }

    // Add delivery method
    if (profile.deliveryMethod) {
      textParts.push(`Delivery Method: ${profile.deliveryMethod}`);
    }

    // Add size and value context
    if (profile.squareFootage) {
      textParts.push(`Size: ${profile.squareFootage.toLocaleString()} SF`);
    }

    if (profile.contractValue) {
      textParts.push(`Value: $${profile.contractValue.toLocaleString()}`);
    }

    // Add location context
    if (profile.location) {
      textParts.push(`Location: ${profile.location}`);
    }

    const embeddingText = textParts.join('\n');

    try {
      // Generate embedding using OpenAI
      const embeddingResponse = await this.openaiClient.generateEmbedding({
        text: embeddingText,
      });

      // Update profile with embedding
      profile.embedding = embeddingResponse.embedding;
      profile.embeddingGeneratedAt = new Date();

      await this.projectProfileRepo.save(profile);

      this.logger.log(
        `Embedding generated for project profile ${profileId}: ${embeddingResponse.dimensions} dimensions, ${embeddingResponse.tokensUsed} tokens, $${embeddingResponse.cost.toFixed(6)}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to generate embedding for project profile ${profileId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Generate embedding for a lesson learned
   * Combines title, situation, lesson, and result for embedding
   */
  async generateLessonLearnedEmbedding(lessonId: string): Promise<void> {
    this.logger.log(`Generating embedding for lesson learned ${lessonId}`);

    const lesson = await this.lessonLearnedRepo.findOne({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson learned ${lessonId} not found`);
    }

    // Build text representation combining STAR format fields
    const textParts: string[] = [];

    if (lesson.title) {
      textParts.push(`Title: ${lesson.title}`);
    }

    if (lesson.category) {
      textParts.push(`Category: ${lesson.category}`);
    }

    if (lesson.situation) {
      textParts.push(`Situation: ${lesson.situation}`);
    }

    if (lesson.action) {
      textParts.push(`Action Taken: ${lesson.action}`);
    }

    if (lesson.outcome) {
      textParts.push(`Outcome: ${lesson.outcome}`);
    }

    if (lesson.lesson) {
      textParts.push(`Lesson Learned: ${lesson.lesson}`);
    }

    if (lesson.tags && lesson.tags.length > 0) {
      textParts.push(`Tags: ${lesson.tags.join(', ')}`);
    }

    const embeddingText = textParts.join('\n');

    try {
      // Generate embedding using OpenAI
      const embeddingResponse = await this.openaiClient.generateEmbedding({
        text: embeddingText,
      });

      // Update lesson with embedding
      lesson.embedding = embeddingResponse.embedding;
      lesson.embeddingGeneratedAt = new Date();

      await this.lessonLearnedRepo.save(lesson);

      this.logger.log(
        `Embedding generated for lesson learned ${lessonId}: ${embeddingResponse.dimensions} dimensions, ${embeddingResponse.tokensUsed} tokens, $${embeddingResponse.cost.toFixed(6)}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to generate embedding for lesson learned ${lessonId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Batch generate embeddings for all project profiles without embeddings
   * Useful for backfilling embeddings for existing data
   */
  async generateProjectProfileEmbeddingsBatch(
    organizationId: string,
    limit: number = 50,
  ): Promise<{ processed: number; succeeded: number; failed: number }> {
    this.logger.log(
      `Batch generating embeddings for project profiles in organization ${organizationId} (limit: ${limit})`,
    );

    // Find profiles without embeddings
    const profiles = await this.projectProfileRepo.find({
      where: {
        organizationId,
        embedding: null as any, // TypeORM syntax for IS NULL
      },
      take: limit,
    });

    this.logger.log(`Found ${profiles.length} project profiles without embeddings`);

    let succeeded = 0;
    let failed = 0;

    for (const profile of profiles) {
      try {
        await this.generateProjectProfileEmbedding(profile.id);
        succeeded++;
      } catch (error: any) {
        this.logger.error(
          `Failed to generate embedding for profile ${profile.id}: ${error.message}`,
        );
        failed++;
      }

      // Small delay to avoid rate limiting (16ms = ~60 requests/second)
      await new Promise((resolve) => setTimeout(resolve, 16));
    }

    this.logger.log(
      `Batch embedding generation complete: ${succeeded} succeeded, ${failed} failed out of ${profiles.length} total`,
    );

    return {
      processed: profiles.length,
      succeeded,
      failed,
    };
  }

  /**
   * Batch generate embeddings for all lesson learned without embeddings
   * Useful for backfilling embeddings for existing data
   */
  async generateLessonLearnedEmbeddingsBatch(
    organizationId: string,
    limit: number = 50,
  ): Promise<{ processed: number; succeeded: number; failed: number }> {
    this.logger.log(
      `Batch generating embeddings for lessons learned in organization ${organizationId} (limit: ${limit})`,
    );

    // Find lessons without embeddings
    const lessons = await this.lessonLearnedRepo.find({
      where: {
        organizationId,
        embedding: null as any, // TypeORM syntax for IS NULL
      },
      take: limit,
    });

    this.logger.log(`Found ${lessons.length} lessons learned without embeddings`);

    let succeeded = 0;
    let failed = 0;

    for (const lesson of lessons) {
      try {
        await this.generateLessonLearnedEmbedding(lesson.id);
        succeeded++;
      } catch (error: any) {
        this.logger.error(
          `Failed to generate embedding for lesson ${lesson.id}: ${error.message}`,
        );
        failed++;
      }

      // Small delay to avoid rate limiting (16ms = ~60 requests/second)
      await new Promise((resolve) => setTimeout(resolve, 16));
    }

    this.logger.log(
      `Batch embedding generation complete: ${succeeded} succeeded, ${failed} failed out of ${lessons.length} total`,
    );

    return {
      processed: lessons.length,
      succeeded,
      failed,
    };
  }
}
