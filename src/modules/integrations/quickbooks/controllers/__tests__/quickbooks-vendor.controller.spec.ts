import { Test, TestingModule } from '@nestjs/testing';
import { QuickBooksVendorController } from '../quickbooks-vendor.controller';
import { QuickBooksVendorService } from '../../services';
import {
  CreateQBVendorDto,
  UpdateQBVendorDto,
  QueryVendorsDto,
  QBVendorResponseDto,
  QBVendorsListResponseDto,
  LinkVendorToCommitmentDto,
  SyncVendorFromCommitmentDto,
} from '../../dto';
import { Repository } from 'typeorm';
import { QBEntityLink } from '../../entities';

describe('QuickBooksVendorController', () => {
  let controller: QuickBooksVendorController;
  let vendorService: jest.Mocked<QuickBooksVendorService>;

  const mockOrganizationId = 'org-123';
  const mockVendorId = 'vendor-456';
  const mockCommitmentId = 'commitment-789';

  const mockVendorResponse: QBVendorResponseDto = {
    id: mockVendorId,
    syncToken: '1',
    displayName: 'Test Vendor LLC',
    companyName: 'Test Vendor LLC',
    givenName: 'John',
    familyName: 'Doe',
    printOnCheckName: 'Test Vendor',
    active: true,
    balance: 5000.0,
    vendor1099: false,
    billAddr: {
      line1: '123 Main St',
      city: 'New York',
      countrySubDivisionCode: 'NY',
      postalCode: '10001',
    },
    primaryPhone: '+1234567890',
    primaryEmailAddr: 'vendor@test.com',
    webAddr: 'https://testvendor.com',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  };

  const mockVendorsList: QBVendorsListResponseDto = {
    vendors: [mockVendorResponse],
    count: 1,
    maxResults: 100,
  };

  const mockEntityLink: QBEntityLink = {
    id: 'link-123',
    organizationId: mockOrganizationId,
    platformEntityType: 'COMMITMENT',
    platformEntityId: mockCommitmentId,
    qbEntityType: 'VENDOR',
    qbEntityId: mockVendorId,
    syncStatus: 'SYNCED',
    lastSyncedAt: new Date('2024-01-15'),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  };

  beforeEach(async () => {
    const mockVendorService = {
      getVendors: jest.fn(),
      getVendorById: jest.fn(),
      createVendor: jest.fn(),
      updateVendor: jest.fn(),
      linkVendorToCommitment: jest.fn(),
      syncVendorFromCommitment: jest.fn(),
      entityLinkRepository: {
        findOne: jest.fn(),
        remove: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuickBooksVendorController],
      providers: [
        {
          provide: QuickBooksVendorService,
          useValue: mockVendorService,
        },
      ],
    }).compile();

    controller = module.get<QuickBooksVendorController>(QuickBooksVendorController);
    vendorService = module.get(QuickBooksVendorService) as jest.Mocked<QuickBooksVendorService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getVendors', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
      expect(controller.getVendors).toBeDefined();
    });

    it('should return list of vendors', async () => {
      const filters: QueryVendorsDto = { maxResults: 100 };
      vendorService.getVendors.mockResolvedValue(mockVendorsList);

      const result = await controller.getVendors(mockOrganizationId, filters);

      expect(result).toEqual(mockVendorsList);
      expect(vendorService.getVendors).toHaveBeenCalledWith(mockOrganizationId, filters);
    });

    it('should handle filters with active status', async () => {
      const filters: QueryVendorsDto = { active: true, maxResults: 50 };
      vendorService.getVendors.mockResolvedValue(mockVendorsList);

      await controller.getVendors(mockOrganizationId, filters);

      expect(vendorService.getVendors).toHaveBeenCalledWith(mockOrganizationId, filters);
    });

    it('should handle empty results', async () => {
      const emptyList: QBVendorsListResponseDto = { vendors: [], count: 0, maxResults: 100 };
      vendorService.getVendors.mockResolvedValue(emptyList);

      const result = await controller.getVendors(mockOrganizationId, {});

      expect(result.vendors).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });

  describe('getVendorById', () => {
    it('should return a specific vendor by ID', async () => {
      vendorService.getVendorById.mockResolvedValue(mockVendorResponse);

      const result = await controller.getVendorById(mockOrganizationId, mockVendorId);

      expect(result).toEqual(mockVendorResponse);
      expect(vendorService.getVendorById).toHaveBeenCalledWith(mockOrganizationId, mockVendorId);
    });

    it('should throw error when vendor not found', async () => {
      vendorService.getVendorById.mockRejectedValue(new Error('Vendor not found'));

      await expect(
        controller.getVendorById(mockOrganizationId, 'invalid-id'),
      ).rejects.toThrow('Vendor not found');
    });
  });

  describe('createVendor', () => {
    const createDto: CreateQBVendorDto = {
      displayName: 'New Vendor LLC',
      companyName: 'New Vendor LLC',
      printOnCheckName: 'New Vendor',
      active: true,
      primaryEmailAddr: 'newvendor@test.com',
    };

    it('should create a new vendor', async () => {
      vendorService.createVendor.mockResolvedValue(mockVendorResponse);

      const result = await controller.createVendor(mockOrganizationId, createDto);

      expect(result).toEqual(mockVendorResponse);
      expect(vendorService.createVendor).toHaveBeenCalledWith(mockOrganizationId, createDto);
    });

    it('should handle vendor creation with full address', async () => {
      const dtoWithAddress: CreateQBVendorDto = {
        ...createDto,
        billAddr: {
          line1: '456 Oak Ave',
          city: 'Los Angeles',
          countrySubDivisionCode: 'CA',
          postalCode: '90001',
        },
      };
      vendorService.createVendor.mockResolvedValue(mockVendorResponse);

      await controller.createVendor(mockOrganizationId, dtoWithAddress);

      expect(vendorService.createVendor).toHaveBeenCalledWith(mockOrganizationId, dtoWithAddress);
    });

    it('should throw error on invalid vendor data', async () => {
      vendorService.createVendor.mockRejectedValue(new Error('Invalid vendor data'));

      await expect(controller.createVendor(mockOrganizationId, createDto)).rejects.toThrow(
        'Invalid vendor data',
      );
    });
  });

  describe('updateVendor', () => {
    const updateDto: UpdateQBVendorDto = {
      syncToken: '1',
      displayName: 'Updated Vendor LLC',
      active: true,
    };

    it('should update an existing vendor', async () => {
      const updatedVendor = { ...mockVendorResponse, displayName: 'Updated Vendor LLC' };
      vendorService.updateVendor.mockResolvedValue(updatedVendor);

      const result = await controller.updateVendor(mockOrganizationId, mockVendorId, updateDto);

      expect(result.displayName).toBe('Updated Vendor LLC');
      expect(vendorService.updateVendor).toHaveBeenCalledWith(
        mockOrganizationId,
        mockVendorId,
        updateDto,
      );
    });

    it('should throw error when vendor not found', async () => {
      vendorService.updateVendor.mockRejectedValue(new Error('Vendor not found'));

      await expect(
        controller.updateVendor(mockOrganizationId, 'invalid-id', updateDto),
      ).rejects.toThrow('Vendor not found');
    });

    it('should throw error on stale syncToken', async () => {
      vendorService.updateVendor.mockRejectedValue(new Error('Stale SyncToken'));

      await expect(
        controller.updateVendor(mockOrganizationId, mockVendorId, updateDto),
      ).rejects.toThrow('Stale SyncToken');
    });
  });

  describe('linkVendorToCommitment', () => {
    const linkDto: LinkVendorToCommitmentDto = {
      commitmentId: mockCommitmentId,
      qbVendorId: mockVendorId,
    };

    it('should link vendor to commitment', async () => {
      vendorService.linkVendorToCommitment.mockResolvedValue(undefined);

      await controller.linkVendorToCommitment(mockOrganizationId, linkDto);

      expect(vendorService.linkVendorToCommitment).toHaveBeenCalledWith(
        mockOrganizationId,
        linkDto,
      );
    });

    it('should return void on successful link', async () => {
      vendorService.linkVendorToCommitment.mockResolvedValue(undefined);

      const result = await controller.linkVendorToCommitment(mockOrganizationId, linkDto);

      expect(result).toBeUndefined();
    });

    it('should throw error when commitment not found', async () => {
      vendorService.linkVendorToCommitment.mockRejectedValue(new Error('Commitment not found'));

      await expect(
        controller.linkVendorToCommitment(mockOrganizationId, linkDto),
      ).rejects.toThrow('Commitment not found');
    });

    it('should throw error when vendor not found', async () => {
      vendorService.linkVendorToCommitment.mockRejectedValue(new Error('Vendor not found'));

      await expect(
        controller.linkVendorToCommitment(mockOrganizationId, linkDto),
      ).rejects.toThrow('Vendor not found');
    });
  });

  describe('unlinkVendor', () => {
    it('should be defined', () => {
      expect(controller.unlinkVendor).toBeDefined();
    });

    it('should unlink vendor from commitment when link exists', async () => {
      (vendorService as any).entityLinkRepository.findOne.mockResolvedValue(mockEntityLink);
      (vendorService as any).entityLinkRepository.remove.mockResolvedValue(mockEntityLink);

      const result = await controller.unlinkVendor(mockOrganizationId, mockCommitmentId);

      expect(result).toBeUndefined();
      expect(vendorService['entityLinkRepository'].findOne).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          platformEntityType: 'COMMITMENT',
          platformEntityId: mockCommitmentId,
          qbEntityType: 'VENDOR',
        },
      });
      expect(vendorService['entityLinkRepository'].remove).toHaveBeenCalledWith(mockEntityLink);
    });

    it('should handle case when no link exists', async () => {
      (vendorService as any).entityLinkRepository.findOne.mockResolvedValue(null);

      const result = await controller.unlinkVendor(mockOrganizationId, mockCommitmentId);

      expect(result).toBeUndefined();
      expect(vendorService['entityLinkRepository'].findOne).toHaveBeenCalled();
      expect(vendorService['entityLinkRepository'].remove).not.toHaveBeenCalled();
    });

    it('should not throw error when link not found', async () => {
      (vendorService as any).entityLinkRepository.findOne.mockResolvedValue(null);

      await expect(
        controller.unlinkVendor(mockOrganizationId, mockCommitmentId),
      ).resolves.toBeUndefined();
    });

    it('should query link by correct entity types', async () => {
      (vendorService as any).entityLinkRepository.findOne.mockResolvedValue(null);

      await controller.unlinkVendor(mockOrganizationId, mockCommitmentId);

      expect(vendorService['entityLinkRepository'].findOne).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          platformEntityType: 'COMMITMENT',
          platformEntityId: mockCommitmentId,
          qbEntityType: 'VENDOR',
        },
      });
    });

    it('should handle multiple commitments with different vendors', async () => {
      const commitment1 = 'commitment-1';
      const commitment2 = 'commitment-2';

      const link1 = { ...mockEntityLink, platformEntityId: commitment1 };
      const link2 = { ...mockEntityLink, platformEntityId: commitment2 };

      (vendorService as any).entityLinkRepository.findOne
        .mockResolvedValueOnce(link1)
        .mockResolvedValueOnce(link2);
      (vendorService as any).entityLinkRepository.remove.mockResolvedValue(undefined);

      await controller.unlinkVendor(mockOrganizationId, commitment1);
      await controller.unlinkVendor(mockOrganizationId, commitment2);

      expect(vendorService['entityLinkRepository'].remove).toHaveBeenCalledTimes(2);
      expect(vendorService['entityLinkRepository'].remove).toHaveBeenCalledWith(link1);
      expect(vendorService['entityLinkRepository'].remove).toHaveBeenCalledWith(link2);
    });

    it('should return void (HTTP 204)', async () => {
      (vendorService as any).entityLinkRepository.findOne.mockResolvedValue(mockEntityLink);
      (vendorService as any).entityLinkRepository.remove.mockResolvedValue(mockEntityLink);

      const result = await controller.unlinkVendor(mockOrganizationId, mockCommitmentId);

      expect(result).toBeUndefined();
    });
  });

  describe('syncVendorFromCommitment', () => {
    const syncDto: SyncVendorFromCommitmentDto = {
      commitmentId: mockCommitmentId,
      createIfNotExists: true,
    };

    it('should sync vendor from commitment', async () => {
      vendorService.syncVendorFromCommitment.mockResolvedValue(mockVendorResponse);

      const result = await controller.syncVendorFromCommitment(mockOrganizationId, syncDto);

      expect(result).toEqual(mockVendorResponse);
      expect(vendorService.syncVendorFromCommitment).toHaveBeenCalledWith(
        mockOrganizationId,
        syncDto,
      );
    });

    it('should create vendor if not exists when flag is true', async () => {
      const dto = { ...syncDto, createIfNotExists: true };
      vendorService.syncVendorFromCommitment.mockResolvedValue(mockVendorResponse);

      await controller.syncVendorFromCommitment(mockOrganizationId, dto);

      expect(vendorService.syncVendorFromCommitment).toHaveBeenCalledWith(
        mockOrganizationId,
        dto,
      );
    });

    it('should not create vendor if flag is false', async () => {
      const dto = { ...syncDto, createIfNotExists: false };
      vendorService.syncVendorFromCommitment.mockRejectedValue(
        new Error('Commitment not linked and createIfNotExists is false'),
      );

      await expect(
        controller.syncVendorFromCommitment(mockOrganizationId, dto),
      ).rejects.toThrow('Commitment not linked and createIfNotExists is false');
    });

    it('should throw error when commitment not found', async () => {
      vendorService.syncVendorFromCommitment.mockRejectedValue(new Error('Commitment not found'));

      await expect(
        controller.syncVendorFromCommitment(mockOrganizationId, syncDto),
      ).rejects.toThrow('Commitment not found');
    });

    it('should update existing vendor', async () => {
      const updatedVendor = { ...mockVendorResponse, displayName: 'Updated via Sync' };
      vendorService.syncVendorFromCommitment.mockResolvedValue(updatedVendor);

      const result = await controller.syncVendorFromCommitment(mockOrganizationId, syncDto);

      expect(result.displayName).toBe('Updated via Sync');
    });
  });
});
