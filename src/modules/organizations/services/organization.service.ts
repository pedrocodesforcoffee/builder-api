import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Organization } from '../entities/organization.entity';
import { OrganizationMember } from '../entities/organization-member.entity';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationResponseDto,
} from '../dto';
import { OrganizationRole } from '../../users/enums/organization-role.enum';

/**
 * Organization Service
 *
 * Handles all business logic for organization management including:
 * - CRUD operations
 * - Slug generation and uniqueness
 * - Member counting
 * - Soft deletion
 */
@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepo: Repository<OrganizationMember>,
  ) {}

  /**
   * Create a new organization
   *
   * @param createDto - Organization creation data
   * @param creatorUserId - ID of user creating the organization (will be made OWNER)
   * @returns Created organization
   */
  async create(
    createDto: CreateOrganizationDto,
    creatorUserId: string,
  ): Promise<OrganizationResponseDto> {
    this.logger.log(`Creating organization: ${createDto.name}`);

    // Generate slug if not provided
    let slug = createDto.slug;
    if (!slug) {
      slug = this.generateSlug(createDto.name);
    }

    // Check if slug is already taken
    const existing = await this.organizationRepo.findOne({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException(
        `Organization with slug "${slug}" already exists`,
      );
    }

    // Create organization
    const organization = this.organizationRepo.create({
      ...createDto,
      slug,
      isActive: true,
    });

    const savedOrg = await this.organizationRepo.save(organization);

    // Add creator as OWNER
    const ownerMember = this.organizationMemberRepo.create({
      organizationId: savedOrg.id,
      userId: creatorUserId,
      role: OrganizationRole.OWNER,
      addedByUserId: creatorUserId,
    });

    await this.organizationMemberRepo.save(ownerMember);

    this.logger.log(
      `Organization created successfully - ID: ${savedOrg.id}, Creator: ${creatorUserId}`,
    );

    return this.toResponseDto(savedOrg);
  }

  /**
   * Find all organizations
   *
   * @param userId - Optional user ID to filter organizations the user belongs to
   * @param includeInactive - Whether to include inactive organizations (default: false)
   * @returns Array of organizations
   */
  async findAll(
    userId?: string,
    includeInactive = false,
  ): Promise<OrganizationResponseDto[]> {
    this.logger.log(`Finding organizations - User: ${userId || 'all'}`);

    let organizations: Organization[];

    if (userId) {
      // Find organizations where user is a member
      const memberships = await this.organizationMemberRepo.find({
        where: { userId },
        relations: ['organization'],
      });

      organizations = memberships
        .map((m) => m.organization)
        .filter((org) => org && (includeInactive || org.isActive));
    } else {
      // Find all organizations
      const where: FindOptionsWhere<Organization> = {};
      if (!includeInactive) {
        where.isActive = true;
      }

      organizations = await this.organizationRepo.find({
        where,
        order: { name: 'ASC' },
      });
    }

    this.logger.log(`Found ${organizations.length} organizations`);

    // Get member counts for each organization
    const orgsWithCounts = await Promise.all(
      organizations.map(async (org) => {
        const memberCount = await this.organizationMemberRepo.count({
          where: { organizationId: org.id },
        });

        return {
          ...this.toResponseDto(org),
          memberCount,
        };
      }),
    );

    return orgsWithCounts;
  }

  /**
   * Find organization by ID
   *
   * @param id - Organization ID
   * @param includeCounts - Whether to include member/project counts
   * @returns Organization
   * @throws NotFoundException if organization not found
   */
  async findOne(
    id: string,
    includeCounts = false,
  ): Promise<OrganizationResponseDto> {
    this.logger.log(`Finding organization by ID: ${id}`);

    const organization = await this.organizationRepo.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    const response = this.toResponseDto(organization);

    if (includeCounts) {
      response.memberCount = await this.organizationMemberRepo.count({
        where: { organizationId: id },
      });
    }

    return response;
  }

  /**
   * Find organization by slug
   *
   * @param slug - Organization slug
   * @returns Organization
   * @throws NotFoundException if organization not found
   */
  async findBySlug(slug: string): Promise<OrganizationResponseDto> {
    this.logger.log(`Finding organization by slug: ${slug}`);

    const organization = await this.organizationRepo.findOne({
      where: { slug },
    });

    if (!organization) {
      throw new NotFoundException(
        `Organization with slug "${slug}" not found`,
      );
    }

    return this.toResponseDto(organization);
  }

  /**
   * Update organization
   *
   * @param id - Organization ID
   * @param updateDto - Update data
   * @returns Updated organization
   * @throws NotFoundException if organization not found
   * @throws ConflictException if slug already taken
   */
  async update(
    id: string,
    updateDto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    this.logger.log(`Updating organization: ${id}`);

    const organization = await this.organizationRepo.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    // Check if slug is being changed and if new slug is available
    if (updateDto.slug && updateDto.slug !== organization.slug) {
      const existing = await this.organizationRepo.findOne({
        where: { slug: updateDto.slug },
      });

      if (existing) {
        throw new ConflictException(
          `Organization with slug "${updateDto.slug}" already exists`,
        );
      }
    }

    // Update organization
    Object.assign(organization, updateDto);
    const updated = await this.organizationRepo.save(organization);

    this.logger.log(`Organization updated successfully - ID: ${id}`);

    return this.toResponseDto(updated);
  }

  /**
   * Delete organization (soft delete by default)
   *
   * @param id - Organization ID
   * @param hardDelete - Whether to permanently delete (default: false)
   */
  async remove(id: string, hardDelete = false): Promise<void> {
    this.logger.log(
      `Deleting organization: ${id} (hard: ${hardDelete})`,
    );

    const organization = await this.organizationRepo.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    if (hardDelete) {
      await this.organizationRepo.remove(organization);
      this.logger.log(`Organization hard deleted - ID: ${id}`);
    } else {
      organization.isActive = false;
      await this.organizationRepo.save(organization);
      this.logger.log(`Organization soft deleted - ID: ${id}`);
    }
  }

  /**
   * Check if user is a member of organization
   *
   * @param organizationId - Organization ID
   * @param userId - User ID
   * @returns true if user is a member
   */
  async isMember(organizationId: string, userId: string): Promise<boolean> {
    const membership = await this.organizationMemberRepo.findOne({
      where: {
        organizationId,
        userId,
      },
    });

    return !!membership;
  }

  /**
   * Check if user has a specific role in organization
   *
   * @param organizationId - Organization ID
   * @param userId - User ID
   * @param role - Required role
   * @returns true if user has the role
   */
  async hasRole(
    organizationId: string,
    userId: string,
    role: OrganizationRole,
  ): Promise<boolean> {
    const membership = await this.organizationMemberRepo.findOne({
      where: {
        organizationId,
        userId,
        role,
      },
    });

    return !!membership;
  }

  /**
   * Generate URL-friendly slug from organization name
   *
   * @param name - Organization name
   * @returns Slug
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Convert Organization entity to response DTO
   *
   * @param organization - Organization entity
   * @returns Response DTO
   */
  private toResponseDto(organization: Organization): OrganizationResponseDto {
    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      type: organization.type,
      email: organization.email,
      phone: organization.phone,
      address: organization.address,
      website: organization.website,
      taxId: organization.taxId,
      isActive: organization.isActive,
      settings: organization.settings,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }
}
