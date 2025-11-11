import { Test, TestingModule } from '@nestjs/testing';
import { BulkOperationsService } from './bulk-operations.service';
import { ProjectMembershipService } from './project-membership.service';
import { ProjectRole } from '../../users/enums/project-role.enum';

describe('BulkOperationsService', () => {
  let service: BulkOperationsService;
  let projectMembershipService: ProjectMembershipService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkOperationsService,
        {
          provide: ProjectMembershipService,
          useValue: {
            addProjectMember: jest.fn(),
            updateProjectMember: jest.fn(),
            removeProjectMember: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BulkOperationsService>(BulkOperationsService);
    projectMembershipService = module.get<ProjectMembershipService>(
      ProjectMembershipService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('bulkAddMembers', () => {
    const dto = {
      members: [
        { userId: 'user-1', role: ProjectRole.VIEWER },
        { userId: 'user-2', role: ProjectRole.VIEWER },
        { userId: 'user-3', role: ProjectRole.VIEWER },
      ],
    };

    it('should successfully add all members', async () => {
      jest
        .spyOn(projectMembershipService, 'addProjectMember')
        .mockResolvedValue({ id: 'membership' } as any);

      const result = await service.bulkAddMembers('project-1', dto, 'user-admin');

      expect(result.summary.total).toBe(3);
      expect(result.summary.succeeded).toBe(3);
      expect(result.summary.failed).toBe(0);
      expect(result.success).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
    });

    it('should handle partial failures', async () => {
      jest
        .spyOn(projectMembershipService, 'addProjectMember')
        .mockResolvedValueOnce({ id: 'membership-1' } as any)
        .mockRejectedValueOnce(new Error('User already exists'))
        .mockResolvedValueOnce({ id: 'membership-2' } as any);

      const result = await service.bulkAddMembers('project-1', dto, 'user-admin');

      expect(result.summary.total).toBe(3);
      expect(result.summary.succeeded).toBe(2);
      expect(result.summary.failed).toBe(1);
      expect(result.success).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('User already exists');
    });

    it('should continue processing after failures', async () => {
      jest
        .spyOn(projectMembershipService, 'addProjectMember')
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce({ id: 'membership-3' } as any);

      const result = await service.bulkAddMembers('project-1', dto, 'user-admin');

      expect(result.summary.succeeded).toBe(1);
      expect(result.summary.failed).toBe(2);
      expect(projectMembershipService.addProjectMember).toHaveBeenCalledTimes(3);
    });
  });

  describe('bulkUpdateMembers', () => {
    const dto = {
      updates: [
        { userId: 'user-1', role: ProjectRole.PROJECT_ENGINEER },
        { userId: 'user-2', role: ProjectRole.PROJECT_ENGINEER },
      ],
    };

    it('should successfully update all members', async () => {
      jest
        .spyOn(projectMembershipService, 'updateProjectMember')
        .mockResolvedValue({ id: 'membership' } as any);

      const result = await service.bulkUpdateMembers('project-1', dto, 'user-admin');

      expect(result.summary.total).toBe(2);
      expect(result.summary.succeeded).toBe(2);
      expect(result.summary.failed).toBe(0);
    });

    it('should handle partial failures', async () => {
      jest
        .spyOn(projectMembershipService, 'updateProjectMember')
        .mockResolvedValueOnce({ id: 'membership-1' } as any)
        .mockRejectedValueOnce(new Error('Membership not found'));

      const result = await service.bulkUpdateMembers('project-1', dto, 'user-admin');

      expect(result.summary.succeeded).toBe(1);
      expect(result.summary.failed).toBe(1);
    });
  });

  describe('bulkRemoveMembers', () => {
    const dto = {
      userIds: ['user-1', 'user-2', 'user-3'],
      reason: 'Test removal',
    };

    it('should successfully remove all members', async () => {
      jest
        .spyOn(projectMembershipService, 'removeProjectMember')
        .mockResolvedValue(undefined);

      const result = await service.bulkRemoveMembers('project-1', dto, 'user-admin');

      expect(result.summary.total).toBe(3);
      expect(result.summary.succeeded).toBe(3);
      expect(result.summary.failed).toBe(0);
    });

    it('should handle partial failures', async () => {
      jest
        .spyOn(projectMembershipService, 'removeProjectMember')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Cannot remove inherited access'))
        .mockResolvedValueOnce(undefined);

      const result = await service.bulkRemoveMembers('project-1', dto, 'user-admin');

      expect(result.summary.succeeded).toBe(2);
      expect(result.summary.failed).toBe(1);
      expect(result.failed[0].error).toBe('Cannot remove inherited access');
    });

    it('should pass reason to remove method', async () => {
      jest
        .spyOn(projectMembershipService, 'removeProjectMember')
        .mockResolvedValue(undefined);

      await service.bulkRemoveMembers('project-1', dto, 'user-admin');

      expect(projectMembershipService.removeProjectMember).toHaveBeenCalledWith(
        'project-1',
        expect.any(String),
        'user-admin',
        { reason: 'Test removal' },
      );
    });
  });
});
