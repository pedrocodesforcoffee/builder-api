/**
 * Integration tests for Organization Member validators with real database
 *
 * These tests verify validators work correctly with actual TypeORM repositories
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
import { OrganizationMember } from '@modules/organizations/entities/organization-member.entity';
import { OrganizationRole } from '@modules/users/enums/organization-role.enum';
import { SystemRole } from '@modules/users/enums/system-role.enum';
import {
  validateNotRemovingLastOwner,
  validateNotDemotingLastOwner,
} from '@modules/organizations/utils/organization-member.validator';
import { ConflictException } from '@nestjs/common';

describe('Membership Validators Integration Tests', () => {
  let dbHelper: TestDatabaseHelper;
  let dataSource: DataSource;

  beforeAll(async () => {
    dbHelper = createTestDatabase({
      strategy: getDatabaseStrategy(),
      entities: [User, Organization, OrganizationMember],
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

  describe('validateNotRemovingLastOwner', () => {
    it('should allow removing non-owner member', async () => {
      const userRepo = dbHelper.getRepository(User);
      const orgRepo = dbHelper.getRepository(Organization);
      const memberRepo = dbHelper.getRepository(OrganizationMember);

      // Create organization
      const org = await orgRepo.save({
        name: 'Test Org',
        slug: 'test-org',
      });

      // Create owner
      const owner = await userRepo.save({
        email: 'owner@example.com',
        password: 'hashed',
        firstName: 'Owner',
        lastName: 'User',
        systemRole: SystemRole.USER,
      });

      await memberRepo.save({
        userId: owner.id,
        organizationId: org.id,
        role: OrganizationRole.OWNER,
      });

      // Create regular member
      const member = await userRepo.save({
        email: 'member@example.com',
        password: 'hashed',
        firstName: 'Regular',
        lastName: 'Member',
        systemRole: SystemRole.USER,
      });

      await memberRepo.save({
        userId: member.id,
        organizationId: org.id,
        role: OrganizationRole.ORG_MEMBER,
      });

      // Should allow removing the non-owner
      await expect(
        validateNotRemovingLastOwner(org.id, member.id, memberRepo)
      ).resolves.not.toThrow();
    });

    it('should allow removing owner when multiple owners exist', async () => {
      const userRepo = dbHelper.getRepository(User);
      const orgRepo = dbHelper.getRepository(Organization);
      const memberRepo = dbHelper.getRepository(OrganizationMember);

      // Create organization
      const org = await orgRepo.save({
        name: 'Test Org',
        slug: 'test-org',
      });

      // Create first owner
      const owner1 = await userRepo.save({
        email: 'owner1@example.com',
        password: 'hashed',
        firstName: 'Owner',
        lastName: 'One',
        systemRole: SystemRole.USER,
      });

      await memberRepo.save({
        userId: owner1.id,
        organizationId: org.id,
        role: OrganizationRole.OWNER,
      });

      // Create second owner
      const owner2 = await userRepo.save({
        email: 'owner2@example.com',
        password: 'hashed',
        firstName: 'Owner',
        lastName: 'Two',
        systemRole: SystemRole.USER,
      });

      await memberRepo.save({
        userId: owner2.id,
        organizationId: org.id,
        role: OrganizationRole.OWNER,
      });

      // Should allow removing one owner
      await expect(
        validateNotRemovingLastOwner(org.id, owner1.id, memberRepo)
      ).resolves.not.toThrow();
    });

    it('should throw when removing the last owner', async () => {
      const userRepo = dbHelper.getRepository(User);
      const orgRepo = dbHelper.getRepository(Organization);
      const memberRepo = dbHelper.getRepository(OrganizationMember);

      // Create organization
      const org = await orgRepo.save({
        name: 'Test Org',
        slug: 'test-org',
      });

      // Create single owner
      const owner = await userRepo.save({
        email: 'owner@example.com',
        password: 'hashed',
        firstName: 'Only',
        lastName: 'Owner',
        systemRole: SystemRole.USER,
      });

      await memberRepo.save({
        userId: owner.id,
        organizationId: org.id,
        role: OrganizationRole.OWNER,
      });

      // Should throw when trying to remove the last owner
      await expect(
        validateNotRemovingLastOwner(org.id, owner.id, memberRepo)
      ).rejects.toThrow(ConflictException);

      await expect(
        validateNotRemovingLastOwner(org.id, owner.id, memberRepo)
      ).rejects.toThrow('Cannot remove the last owner');
    });
  });

  describe('validateNotDemotingLastOwner', () => {
    it('should allow promoting to owner', async () => {
      const userRepo = dbHelper.getRepository(User);
      const orgRepo = dbHelper.getRepository(Organization);
      const memberRepo = dbHelper.getRepository(OrganizationMember);

      // Create organization
      const org = await orgRepo.save({
        name: 'Test Org',
        slug: 'test-org',
      });

      // Create owner
      const owner = await userRepo.save({
        email: 'owner@example.com',
        password: 'hashed',
        firstName: 'Owner',
        lastName: 'User',
        systemRole: SystemRole.USER,
      });

      await memberRepo.save({
        userId: owner.id,
        organizationId: org.id,
        role: OrganizationRole.OWNER,
      });

      // Create member to promote
      const member = await userRepo.save({
        email: 'member@example.com',
        password: 'hashed',
        firstName: 'Regular',
        lastName: 'Member',
        systemRole: SystemRole.USER,
      });

      await memberRepo.save({
        userId: member.id,
        organizationId: org.id,
        role: OrganizationRole.ORG_MEMBER,
      });

      // Should allow promoting to owner
      await expect(
        validateNotDemotingLastOwner(org.id, member.id, OrganizationRole.OWNER, memberRepo)
      ).resolves.not.toThrow();
    });

    it('should allow demoting non-owner', async () => {
      const userRepo = dbHelper.getRepository(User);
      const orgRepo = dbHelper.getRepository(Organization);
      const memberRepo = dbHelper.getRepository(OrganizationMember);

      // Create organization
      const org = await orgRepo.save({
        name: 'Test Org',
        slug: 'test-org',
      });

      // Create owner
      const owner = await userRepo.save({
        email: 'owner@example.com',
        password: 'hashed',
        firstName: 'Owner',
        lastName: 'User',
        systemRole: SystemRole.USER,
      });

      await memberRepo.save({
        userId: owner.id,
        organizationId: org.id,
        role: OrganizationRole.OWNER,
      });

      // Create admin to demote
      const admin = await userRepo.save({
        email: 'admin@example.com',
        password: 'hashed',
        firstName: 'Admin',
        lastName: 'User',
        systemRole: SystemRole.USER,
      });

      await memberRepo.save({
        userId: admin.id,
        organizationId: org.id,
        role: OrganizationRole.ORG_ADMIN,
      });

      // Should allow demoting admin to member
      await expect(
        validateNotDemotingLastOwner(org.id, admin.id, OrganizationRole.ORG_MEMBER, memberRepo)
      ).resolves.not.toThrow();
    });

    it('should allow demoting owner when multiple owners exist', async () => {
      const userRepo = dbHelper.getRepository(User);
      const orgRepo = dbHelper.getRepository(Organization);
      const memberRepo = dbHelper.getRepository(OrganizationMember);

      // Create organization
      const org = await orgRepo.save({
        name: 'Test Org',
        slug: 'test-org',
      });

      // Create first owner
      const owner1 = await userRepo.save({
        email: 'owner1@example.com',
        password: 'hashed',
        firstName: 'Owner',
        lastName: 'One',
        systemRole: SystemRole.USER,
      });

      await memberRepo.save({
        userId: owner1.id,
        organizationId: org.id,
        role: OrganizationRole.OWNER,
      });

      // Create second owner
      const owner2 = await userRepo.save({
        email: 'owner2@example.com',
        password: 'hashed',
        firstName: 'Owner',
        lastName: 'Two',
        systemRole: SystemRole.USER,
      });

      await memberRepo.save({
        userId: owner2.id,
        organizationId: org.id,
        role: OrganizationRole.OWNER,
      });

      // Should allow demoting one owner
      await expect(
        validateNotDemotingLastOwner(org.id, owner1.id, OrganizationRole.ORG_ADMIN, memberRepo)
      ).resolves.not.toThrow();
    });

    it('should throw when demoting the last owner', async () => {
      const userRepo = dbHelper.getRepository(User);
      const orgRepo = dbHelper.getRepository(Organization);
      const memberRepo = dbHelper.getRepository(OrganizationMember);

      // Create organization
      const org = await orgRepo.save({
        name: 'Test Org',
        slug: 'test-org',
      });

      // Create single owner
      const owner = await userRepo.save({
        email: 'owner@example.com',
        password: 'hashed',
        firstName: 'Only',
        lastName: 'Owner',
        systemRole: SystemRole.USER,
      });

      await memberRepo.save({
        userId: owner.id,
        organizationId: org.id,
        role: OrganizationRole.OWNER,
      });

      // Should throw when trying to demote the last owner
      await expect(
        validateNotDemotingLastOwner(org.id, owner.id, OrganizationRole.ORG_ADMIN, memberRepo)
      ).rejects.toThrow(ConflictException);

      await expect(
        validateNotDemotingLastOwner(org.id, owner.id, OrganizationRole.ORG_ADMIN, memberRepo)
      ).rejects.toThrow('Cannot demote the last owner');
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle complete organization lifecycle', async () => {
      const userRepo = dbHelper.getRepository(User);
      const orgRepo = dbHelper.getRepository(Organization);
      const memberRepo = dbHelper.getRepository(OrganizationMember);

      // Create organization
      const org = await orgRepo.save({
        name: 'Growing Company',
        slug: 'growing-company',
      });

      // Founder creates organization (becomes owner)
      const founder = await userRepo.save({
        email: 'founder@example.com',
        password: 'hashed',
        firstName: 'Founder',
        lastName: 'Person',
        systemRole: SystemRole.USER,
      });

      await memberRepo.save({
        userId: founder.id,
        organizationId: org.id,
        role: OrganizationRole.OWNER,
        joinedAt: new Date(),
      });

      // Founder invites first employee
      const employee1 = await userRepo.save({
        email: 'employee1@example.com',
        password: 'hashed',
        firstName: 'Employee',
        lastName: 'One',
        systemRole: SystemRole.USER,
      });

      const invitedAt = new Date();
      await memberRepo.save({
        userId: employee1.id,
        organizationId: org.id,
        role: OrganizationRole.ORG_MEMBER,
        invitedAt,
      });

      // Employee accepts invitation
      const acceptedAt = new Date();
      await memberRepo.update(
        { userId: employee1.id, organizationId: org.id },
        { acceptedAt, joinedAt: acceptedAt }
      );

      // Promote employee to admin
      await memberRepo.update(
        { userId: employee1.id, organizationId: org.id },
        { role: OrganizationRole.ORG_ADMIN }
      );

      // Add co-founder as second owner
      const coFounder = await userRepo.save({
        email: 'cofounder@example.com',
        password: 'hashed',
        firstName: 'CoFounder',
        lastName: 'Person',
        systemRole: SystemRole.USER,
      });

      await memberRepo.save({
        userId: coFounder.id,
        organizationId: org.id,
        role: OrganizationRole.OWNER,
        joinedAt: new Date(),
      });

      // Now can demote original founder (2 owners exist)
      await expect(
        validateNotDemotingLastOwner(org.id, founder.id, OrganizationRole.ORG_ADMIN, memberRepo)
      ).resolves.not.toThrow();

      // Verify final state
      const allMembers = await memberRepo.find({
        where: { organizationId: org.id },
      });

      expect(allMembers).toHaveLength(3);
      const owners = allMembers.filter(m => m.role === OrganizationRole.OWNER);
      expect(owners).toHaveLength(2);
    });
  });
});
