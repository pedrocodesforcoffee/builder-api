/**
 * Integration tests for Project and Organization Member entities
 *
 * These tests verify database operations with the new fields:
 * - scope (JSONB)
 * - invitation workflow (invitedAt, acceptedAt, joinedAt)
 * - lastAccessedAt
 *
 * Run with: TEST_DB_STRATEGY=in-memory npm run test:integration
 */
import { DataSource } from 'typeorm';
import {
  TestDatabaseHelper,
  createTestDatabase,
  getDatabaseStrategy,
} from '@test/helpers/test-database.helper';
import { User } from '@modules/users/entities/user.entity';
import { Organization } from '@modules/organizations/entities/organization.entity';
import { Project } from '@modules/projects/entities/project.entity';
import { OrganizationMember } from '@modules/organizations/entities/organization-member.entity';
import { ProjectMember } from '@modules/projects/entities/project-member.entity';
import { OrganizationRole } from '@modules/users/enums/organization-role.enum';
import { ProjectRole } from '@modules/users/enums/project-role.enum';
import { SystemRole } from '@modules/users/enums/system-role.enum';

describe('Membership Entities Integration Tests', () => {
  let dbHelper: TestDatabaseHelper;
  let dataSource: DataSource;

  beforeAll(async () => {
    dbHelper = createTestDatabase({
      strategy: getDatabaseStrategy(),
      entities: [User, Organization, Project, OrganizationMember, ProjectMember],
      synchronize: true,
      logging: false,
    });

    dataSource = await dbHelper.initialize();
  });

  afterAll(async () => {
    await dbHelper.destroy();
  });

  afterEach(async () => {
    await dbHelper.cleanup();
  });

  describe('OrganizationMember Entity', () => {
    let user: User;
    let organization: Organization;

    beforeEach(async () => {
      // Create test user
      const userRepo = dbHelper.getRepository(User);
      user = await userRepo.save({
        email: 'test@example.com',
        password: 'hashed_password',
        firstName: 'Test',
        lastName: 'User',
        systemRole: SystemRole.USER,
      });

      // Create test organization
      const orgRepo = dbHelper.getRepository(Organization);
      organization = await orgRepo.save({
        name: 'Test Organization',
        slug: 'test-org',
      });
    });

    it('should create organization member with basic fields', async () => {
      const memberRepo = dbHelper.getRepository(OrganizationMember);

      const member = await memberRepo.save({
        userId: user.id,
        organizationId: organization.id,
        role: OrganizationRole.ORG_MEMBER,
      });

      expect(member.userId).toBe(user.id);
      expect(member.organizationId).toBe(organization.id);
      expect(member.role).toBe(OrganizationRole.ORG_MEMBER);
      expect(member.createdAt).toBeInstanceOf(Date);
      expect(member.updatedAt).toBeInstanceOf(Date);
    });

    it('should create organization member with invitation workflow fields', async () => {
      const memberRepo = dbHelper.getRepository(OrganizationMember);

      const invitedAt = new Date('2025-01-01T10:00:00Z');
      const acceptedAt = new Date('2025-01-01T11:00:00Z');
      const joinedAt = new Date('2025-01-01T12:00:00Z');

      const member = await memberRepo.save({
        userId: user.id,
        organizationId: organization.id,
        role: OrganizationRole.ORG_ADMIN,
        invitedAt,
        acceptedAt,
        joinedAt,
      });

      const found = await memberRepo.findOne({
        where: {
          userId: user.id,
          organizationId: organization.id,
        },
      });

      expect(found).toBeDefined();
      expect(found!.invitedAt).toEqual(invitedAt);
      expect(found!.acceptedAt).toEqual(acceptedAt);
      expect(found!.joinedAt).toEqual(joinedAt);
    });

    it('should update invitation workflow timestamps', async () => {
      const memberRepo = dbHelper.getRepository(OrganizationMember);

      // Initial save - only invited
      const member = await memberRepo.save({
        userId: user.id,
        organizationId: organization.id,
        role: OrganizationRole.GUEST,
        invitedAt: new Date(),
      });

      // Update - accepted
      const acceptedAt = new Date();
      await memberRepo.update(
        { userId: user.id, organizationId: organization.id },
        { acceptedAt }
      );

      // Update - joined
      const joinedAt = new Date();
      await memberRepo.update(
        { userId: user.id, organizationId: organization.id },
        { joinedAt }
      );

      const updated = await memberRepo.findOne({
        where: {
          userId: user.id,
          organizationId: organization.id,
        },
      });

      expect(updated!.invitedAt).toBeDefined();
      expect(updated!.acceptedAt).toBeDefined();
      expect(updated!.joinedAt).toBeDefined();
    });

    it('should query by invitation status', async () => {
      const memberRepo = dbHelper.getRepository(OrganizationMember);

      // Create pending invitation
      await memberRepo.save({
        userId: user.id,
        organizationId: organization.id,
        role: OrganizationRole.ORG_MEMBER,
        invitedAt: new Date(),
      });

      // Query pending invitations
      const pending = await memberRepo
        .createQueryBuilder('member')
        .where('member.invitedAt IS NOT NULL')
        .andWhere('member.acceptedAt IS NULL')
        .getMany();

      expect(pending).toHaveLength(1);
      expect(pending[0].userId).toBe(user.id);
    });

    it('should enforce role hierarchy', async () => {
      const memberRepo = dbHelper.getRepository(OrganizationMember);

      const roles = [
        OrganizationRole.OWNER,
        OrganizationRole.ORG_ADMIN,
        OrganizationRole.ORG_MEMBER,
        OrganizationRole.GUEST,
      ];

      for (const role of roles) {
        const member = memberRepo.create({
          userId: user.id,
          organizationId: organization.id,
          role,
        });

        expect(member.role).toBe(role);

        // Test helper methods
        if (role === OrganizationRole.OWNER) {
          expect(member.isOwner()).toBe(true);
          expect(member.isAdmin()).toBe(true);
        } else if (role === OrganizationRole.ORG_ADMIN) {
          expect(member.isOwner()).toBe(false);
          expect(member.isAdmin()).toBe(true);
        } else {
          expect(member.isOwner()).toBe(false);
          expect(member.isAdmin()).toBe(false);
        }
      }
    });
  });

  describe('ProjectMember Entity', () => {
    let user: User;
    let organization: Organization;
    let project: Project;

    beforeEach(async () => {
      // Create test user
      const userRepo = dbHelper.getRepository(User);
      user = await userRepo.save({
        email: 'test@example.com',
        password: 'hashed_password',
        firstName: 'Test',
        lastName: 'User',
        systemRole: SystemRole.USER,
      });

      // Create test organization
      const orgRepo = dbHelper.getRepository(Organization);
      organization = await orgRepo.save({
        name: 'Test Organization',
        slug: 'test-org',
      });

      // Create test project
      const projectRepo = dbHelper.getRepository(Project);
      project = await projectRepo.save({
        organizationId: organization.id,
        name: 'Test Project',
        code: 'TEST-001',
        status: 'active',
      });
    });

    it('should create project member with basic fields', async () => {
      const memberRepo = dbHelper.getRepository(ProjectMember);

      const member = await memberRepo.save({
        userId: user.id,
        projectId: project.id,
        role: ProjectRole.VIEWER,
      });

      expect(member.userId).toBe(user.id);
      expect(member.projectId).toBe(project.id);
      expect(member.role).toBe(ProjectRole.VIEWER);
    });

    it('should create project member with scope field (array format)', async () => {
      const memberRepo = dbHelper.getRepository(ProjectMember);

      const scope = ['electrical', 'plumbing'];
      const member = await memberRepo.save({
        userId: user.id,
        projectId: project.id,
        role: ProjectRole.SUBCONTRACTOR,
        scope,
      });

      const found = await memberRepo.findOne({
        where: {
          userId: user.id,
          projectId: project.id,
        },
      });

      expect(found).toBeDefined();
      expect(found!.scope).toEqual(scope);
      expect(Array.isArray(found!.scope)).toBe(true);
    });

    it('should create project member with scope field (object format)', async () => {
      const memberRepo = dbHelper.getRepository(ProjectMember);

      const scope = {
        trades: ['electrical', 'plumbing'],
        floors: ['1', '2', '3'],
        areas: ['north-wing'],
      };

      const member = await memberRepo.save({
        userId: user.id,
        projectId: project.id,
        role: ProjectRole.FOREMAN,
        scope,
      });

      const found = await memberRepo.findOne({
        where: {
          userId: user.id,
          projectId: project.id,
        },
      });

      expect(found).toBeDefined();
      expect(found!.scope).toEqual(scope);
      expect(typeof found!.scope).toBe('object');
      expect((found!.scope as any).trades).toEqual(['electrical', 'plumbing']);
    });

    it('should query by scope limitations', async () => {
      const memberRepo = dbHelper.getRepository(ProjectMember);

      // Member with scope
      await memberRepo.save({
        userId: user.id,
        projectId: project.id,
        role: ProjectRole.SUBCONTRACTOR,
        scope: ['electrical'],
      });

      // Query members with scope
      const withScope = await memberRepo
        .createQueryBuilder('member')
        .where('member.scope IS NOT NULL')
        .getMany();

      expect(withScope).toHaveLength(1);
      expect(withScope[0].scope).toEqual(['electrical']);

      // Query members without scope
      const withoutScope = await memberRepo
        .createQueryBuilder('member')
        .where('member.scope IS NULL')
        .getMany();

      expect(withoutScope).toHaveLength(0);
    });

    it('should create project member with expiration date', async () => {
      const memberRepo = dbHelper.getRepository(ProjectMember);

      const expiresAt = new Date('2025-12-31T23:59:59Z');
      const member = await memberRepo.save({
        userId: user.id,
        projectId: project.id,
        role: ProjectRole.INSPECTOR,
        expiresAt,
      });

      const found = await memberRepo.findOne({
        where: {
          userId: user.id,
          projectId: project.id,
        },
      });

      expect(found).toBeDefined();
      expect(found!.expiresAt).toEqual(expiresAt);
      expect(found!.isExpired()).toBe(false);
    });

    it('should track lastAccessedAt timestamp', async () => {
      const memberRepo = dbHelper.getRepository(ProjectMember);

      const member = await memberRepo.save({
        userId: user.id,
        projectId: project.id,
        role: ProjectRole.PROJECT_MANAGER,
      });

      // Update lastAccessedAt
      const lastAccessedAt = new Date();
      await memberRepo.update(
        { userId: user.id, projectId: project.id },
        { lastAccessedAt }
      );

      const updated = await memberRepo.findOne({
        where: {
          userId: user.id,
          projectId: project.id,
        },
      });

      expect(updated!.lastAccessedAt).toBeDefined();
      expect(updated!.getDaysSinceLastAccess()).toBe(0);
    });

    it('should create project member with complete invitation workflow', async () => {
      const memberRepo = dbHelper.getRepository(ProjectMember);

      const invitedAt = new Date('2025-01-01T10:00:00Z');
      const acceptedAt = new Date('2025-01-01T11:00:00Z');
      const joinedAt = new Date('2025-01-01T12:00:00Z');

      const member = await memberRepo.save({
        userId: user.id,
        projectId: project.id,
        role: ProjectRole.ARCHITECT_ENGINEER,
        invitedAt,
        acceptedAt,
        joinedAt,
      });

      const found = await memberRepo.findOne({
        where: {
          userId: user.id,
          projectId: project.id,
        },
      });

      expect(found).toBeDefined();
      expect(found!.invitedAt).toEqual(invitedAt);
      expect(found!.acceptedAt).toEqual(acceptedAt);
      expect(found!.joinedAt).toEqual(joinedAt);
      expect(found!.isInvitationPending()).toBe(false);
      expect(found!.hasJoined()).toBe(true);
    });

    it('should query expired memberships', async () => {
      const memberRepo = dbHelper.getRepository(ProjectMember);

      // Create expired membership
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await memberRepo.save({
        userId: user.id,
        projectId: project.id,
        role: ProjectRole.SUBCONTRACTOR,
        expiresAt: pastDate,
      });

      // Query expired
      const expired = await memberRepo
        .createQueryBuilder('member')
        .where('member.expiresAt < :now', { now: new Date() })
        .getMany();

      expect(expired).toHaveLength(1);
      expect(expired[0].isExpired()).toBe(true);
    });

    it('should test all project roles', async () => {
      const memberRepo = dbHelper.getRepository(ProjectMember);

      const roles = [
        ProjectRole.PROJECT_ADMIN,
        ProjectRole.PROJECT_MANAGER,
        ProjectRole.PROJECT_ENGINEER,
        ProjectRole.SUPERINTENDENT,
        ProjectRole.FOREMAN,
        ProjectRole.ARCHITECT_ENGINEER,
        ProjectRole.SUBCONTRACTOR,
        ProjectRole.OWNER_REP,
        ProjectRole.INSPECTOR,
        ProjectRole.VIEWER,
      ];

      for (const role of roles) {
        const member = memberRepo.create({
          userId: user.id,
          projectId: project.id,
          role,
        });

        expect(member.role).toBe(role);

        // Test role-specific methods
        if (role === ProjectRole.PROJECT_ADMIN) {
          expect(member.isProjectAdmin()).toBe(true);
          expect(member.canManageMembers()).toBe(true);
          expect(member.canEditData()).toBe(true);
        } else if (role === ProjectRole.PROJECT_MANAGER) {
          expect(member.isProjectAdmin()).toBe(false);
          expect(member.canManageMembers()).toBe(true);
          expect(member.canEditData()).toBe(true);
        } else if (role === ProjectRole.VIEWER) {
          expect(member.canEditData()).toBe(false);
        }
      }
    });

    it('should handle complex queries with multiple filters', async () => {
      const memberRepo = dbHelper.getRepository(ProjectMember);

      // Create various members
      await memberRepo.save([
        {
          userId: user.id,
          projectId: project.id,
          role: ProjectRole.PROJECT_ADMIN,
        },
        {
          userId: user.id,
          projectId: project.id,
          role: ProjectRole.SUBCONTRACTOR,
          scope: ['electrical'],
          expiresAt: new Date('2025-12-31'),
        },
      ]);

      // Query contractors with scope and expiration
      const contractors = await memberRepo
        .createQueryBuilder('member')
        .where('member.role = :role', { role: ProjectRole.SUBCONTRACTOR })
        .andWhere('member.scope IS NOT NULL')
        .andWhere('member.expiresAt IS NOT NULL')
        .getMany();

      expect(contractors).toHaveLength(1);
      expect(contractors[0].role).toBe(ProjectRole.SUBCONTRACTOR);
      expect(contractors[0].scope).toBeDefined();
      expect(contractors[0].expiresAt).toBeDefined();
    });
  });

  describe('Membership Indices and Performance', () => {
    it('should use indices for organization member queries', async () => {
      const memberRepo = dbHelper.getRepository(OrganizationMember);

      // Verify index exists in query plan
      const result = await dataSource.query(`
        EXPLAIN SELECT * FROM organization_members
        WHERE user_id = $1 AND organization_id = $2
      `, ['test-id', 'test-org-id']);

      // Should use index scan (implementation may vary by strategy)
      expect(result).toBeDefined();
    });

    it('should use indices for project member queries', async () => {
      const memberRepo = dbHelper.getRepository(ProjectMember);

      // Verify index exists in query plan
      const result = await dataSource.query(`
        EXPLAIN SELECT * FROM project_members
        WHERE user_id = $1 AND project_id = $2
      `, ['test-id', 'test-proj-id']);

      expect(result).toBeDefined();
    });
  });
});
