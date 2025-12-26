import { Test, TestingModule } from '@nestjs/testing';
import { QuickBooksAccountMappingController } from '../quickbooks-account-mapping.controller';
import { QuickBooksAccountService } from '../../services';
import { QBAccountMapping } from '../../entities';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  CreateAccountMappingDto,
  UpdateAccountMappingDto,
  AccountMappingResponseDto,
  AutoMapAccountsDto,
  QBAccountResponseDto,
} from '../../dto';

describe('QuickBooksAccountMappingController', () => {
  let controller: QuickBooksAccountMappingController;
  let mappingRepository: jest.Mocked<Repository<QBAccountMapping>>;
  let accountService: jest.Mocked<QuickBooksAccountService>;

  const mockOrganizationId = 'org-123';
  const mockMappingId = 'mapping-456';
  const mockCostCodeId = 'cost-code-789';
  const mockQBAccountId = 'qb-acc-101';

  const mockQBAccount: QBAccountResponseDto = {
    id: mockQBAccountId,
    name: 'Construction Expenses',
    accountType: 'Expense',
    accountSubType: 'JobExpenses',
    fullyQualifiedName: 'Expenses:Construction Expenses',
    active: true,
    balance: 0,
    syncToken: '1',
  };

  const mockAccountMapping: QBAccountMapping = {
    id: mockMappingId,
    organizationId: mockOrganizationId,
    mappingType: 'COST_CODE',
    costCodeId: mockCostCodeId,
    qbAccountId: mockQBAccountId,
    qbAccountName: 'Construction Expenses',
    qbAccountType: 'Expense',
    active: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  };

  const mockAccountMappingResponse: AccountMappingResponseDto = {
    id: mockMappingId,
    organizationId: mockOrganizationId,
    mappingType: 'COST_CODE',
    costCodeId: mockCostCodeId,
    qbAccountId: mockQBAccountId,
    qbAccountName: 'Construction Expenses',
    qbAccountType: 'Expense',
    active: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  };

  beforeEach(async () => {
    const mockMappingRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockAccountService = {
      getAccounts: jest.fn(),
      getAccountById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuickBooksAccountMappingController],
      providers: [
        {
          provide: getRepositoryToken(QBAccountMapping),
          useValue: mockMappingRepo,
        },
        {
          provide: QuickBooksAccountService,
          useValue: mockAccountService,
        },
      ],
    }).compile();

    controller = module.get<QuickBooksAccountMappingController>(
      QuickBooksAccountMappingController,
    );
    mappingRepository = module.get(getRepositoryToken(QBAccountMapping));
    accountService = module.get(QuickBooksAccountService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAccountMappings', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
      expect(controller.getAccountMappings).toBeDefined();
    });

    it('should return all account mappings for organization', async () => {
      const mockMappings = [mockAccountMapping, { ...mockAccountMapping, id: 'mapping-2' }];
      mappingRepository.find.mockResolvedValue(mockMappings);

      const result = await controller.getAccountMappings(mockOrganizationId);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject(mockAccountMappingResponse);
      expect(mappingRepository.find).toHaveBeenCalledWith({
        where: { organizationId: mockOrganizationId },
        order: { mappingType: 'ASC', createdAt: 'ASC' },
      });
    });

    it('should return empty array when no mappings exist', async () => {
      mappingRepository.find.mockResolvedValue([]);

      const result = await controller.getAccountMappings(mockOrganizationId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should order mappings by type and creation date', async () => {
      const mappings = [
        { ...mockAccountMapping, mappingType: 'COST_CODE', createdAt: new Date('2024-01-15') },
        { ...mockAccountMapping, mappingType: 'REVENUE', createdAt: new Date('2024-01-14') },
      ];
      mappingRepository.find.mockResolvedValue(mappings);

      await controller.getAccountMappings(mockOrganizationId);

      expect(mappingRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { mappingType: 'ASC', createdAt: 'ASC' },
        }),
      );
    });
  });

  describe('getAccountMapping', () => {
    it('should return specific account mapping by ID', async () => {
      mappingRepository.findOne.mockResolvedValue(mockAccountMapping);

      const result = await controller.getAccountMapping(mockOrganizationId, mockMappingId);

      expect(result).toMatchObject(mockAccountMappingResponse);
      expect(mappingRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockMappingId, organizationId: mockOrganizationId },
      });
    });

    it('should throw error when mapping not found', async () => {
      mappingRepository.findOne.mockResolvedValue(null);

      await expect(
        controller.getAccountMapping(mockOrganizationId, 'invalid-id'),
      ).rejects.toThrow('Account mapping not found');
    });
  });

  describe('createAccountMapping', () => {
    const createDto: CreateAccountMappingDto = {
      mappingType: 'COST_CODE',
      costCodeId: mockCostCodeId,
      qbAccountId: mockQBAccountId,
    };

    it('should create a new account mapping', async () => {
      mappingRepository.findOne.mockResolvedValue(null); // No existing mapping
      accountService.getAccountById.mockResolvedValue(mockQBAccount);
      mappingRepository.create.mockReturnValue(mockAccountMapping as any);
      mappingRepository.save.mockResolvedValue(mockAccountMapping);

      const result = await controller.createAccountMapping(mockOrganizationId, createDto);

      expect(result).toMatchObject(mockAccountMappingResponse);
      expect(mappingRepository.findOne).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          mappingType: createDto.mappingType,
          costCodeId: createDto.costCodeId,
        },
      });
      expect(accountService.getAccountById).toHaveBeenCalledWith(
        mockOrganizationId,
        mockQBAccountId,
      );
      expect(mappingRepository.create).toHaveBeenCalled();
      expect(mappingRepository.save).toHaveBeenCalled();
    });

    it('should throw error when mapping already exists', async () => {
      mappingRepository.findOne.mockResolvedValue(mockAccountMapping);

      await expect(
        controller.createAccountMapping(mockOrganizationId, createDto),
      ).rejects.toThrow('Account mapping already exists for this cost code');
    });

    it('should fetch QB account details during creation', async () => {
      mappingRepository.findOne.mockResolvedValue(null);
      accountService.getAccountById.mockResolvedValue(mockQBAccount);
      mappingRepository.create.mockReturnValue(mockAccountMapping as any);
      mappingRepository.save.mockResolvedValue(mockAccountMapping);

      await controller.createAccountMapping(mockOrganizationId, createDto);

      expect(accountService.getAccountById).toHaveBeenCalledWith(
        mockOrganizationId,
        mockQBAccountId,
      );
    });

    it('should set active to true by default', async () => {
      mappingRepository.findOne.mockResolvedValue(null);
      accountService.getAccountById.mockResolvedValue(mockQBAccount);
      mappingRepository.create.mockReturnValue(mockAccountMapping as any);
      mappingRepository.save.mockResolvedValue(mockAccountMapping);

      const result = await controller.createAccountMapping(mockOrganizationId, createDto);

      expect(result.active).toBe(true);
    });

    it('should throw error when QB account not found', async () => {
      mappingRepository.findOne.mockResolvedValue(null);
      accountService.getAccountById.mockRejectedValue(new Error('QB account not found'));

      await expect(
        controller.createAccountMapping(mockOrganizationId, createDto),
      ).rejects.toThrow('QB account not found');
    });
  });

  describe('updateAccountMappings (bulk)', () => {
    it('should update multiple account mappings', async () => {
      const updateDtos: UpdateAccountMappingDto[] = [
        { id: 'mapping-1', qbAccountId: 'acc-1', active: true },
        { id: 'mapping-2', qbAccountId: 'acc-2', active: true },
      ];

      const existingMappings = [
        { ...mockAccountMapping, id: 'mapping-1' },
        { ...mockAccountMapping, id: 'mapping-2' },
      ];

      mappingRepository.findOne
        .mockResolvedValueOnce(existingMappings[0])
        .mockResolvedValueOnce(existingMappings[1]);

      accountService.getAccountById
        .mockResolvedValueOnce({ ...mockQBAccount, id: 'acc-1' })
        .mockResolvedValueOnce({ ...mockQBAccount, id: 'acc-2' });

      mappingRepository.save
        .mockResolvedValueOnce(existingMappings[0])
        .mockResolvedValueOnce(existingMappings[1]);

      const result = await controller.updateAccountMappings(mockOrganizationId, {
        mappings: updateDtos,
      });

      expect(result).toHaveLength(2);
      expect(mappingRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should update QB account details when account changed', async () => {
      const updateDto: UpdateAccountMappingDto = {
        id: mockMappingId,
        qbAccountId: 'new-acc-123',
        active: true,
      };

      const existingMapping = { ...mockAccountMapping, qbAccountId: 'old-acc-456' };
      mappingRepository.findOne.mockResolvedValue(existingMapping);

      const newQBAccount = { ...mockQBAccount, id: 'new-acc-123', name: 'New Account' };
      accountService.getAccountById.mockResolvedValue(newQBAccount);
      mappingRepository.save.mockResolvedValue({
        ...existingMapping,
        qbAccountId: 'new-acc-123',
        qbAccountName: 'New Account',
      });

      const result = await controller.updateAccountMappings(mockOrganizationId, {
        mappings: [updateDto],
      });

      expect(accountService.getAccountById).toHaveBeenCalledWith(
        mockOrganizationId,
        'new-acc-123',
      );
      expect(result[0].qbAccountId).toBe('new-acc-123');
    });

    it('should not fetch QB account if account unchanged', async () => {
      const updateDto: UpdateAccountMappingDto = {
        id: mockMappingId,
        active: false,
      };

      mappingRepository.findOne.mockResolvedValue(mockAccountMapping);
      mappingRepository.save.mockResolvedValue({ ...mockAccountMapping, active: false });

      await controller.updateAccountMappings(mockOrganizationId, { mappings: [updateDto] });

      expect(accountService.getAccountById).not.toHaveBeenCalled();
    });

    it('should throw error when mapping not found', async () => {
      const updateDto: UpdateAccountMappingDto = {
        id: 'invalid-id',
        active: true,
      };

      mappingRepository.findOne.mockResolvedValue(null);

      await expect(
        controller.updateAccountMappings(mockOrganizationId, { mappings: [updateDto] }),
      ).rejects.toThrow('Account mapping not found: invalid-id');
    });

    it('should handle empty mappings array', async () => {
      const result = await controller.updateAccountMappings(mockOrganizationId, {
        mappings: [],
      });

      expect(result).toEqual([]);
      expect(mappingRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('updateAccountMapping (single)', () => {
    it('should update a single account mapping', async () => {
      const updateDto: UpdateAccountMappingDto = {
        id: mockMappingId,
        qbAccountId: 'new-acc-123',
        active: false,
      };

      mappingRepository.findOne.mockResolvedValue(mockAccountMapping);
      const newQBAccount = { ...mockQBAccount, id: 'new-acc-123' };
      accountService.getAccountById.mockResolvedValue(newQBAccount);
      mappingRepository.save.mockResolvedValue({
        ...mockAccountMapping,
        qbAccountId: 'new-acc-123',
        active: false,
      });

      const result = await controller.updateAccountMapping(
        mockOrganizationId,
        mockMappingId,
        updateDto,
      );

      expect(result.qbAccountId).toBe('new-acc-123');
      expect(result.active).toBe(false);
      expect(mappingRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockMappingId, organizationId: mockOrganizationId },
      });
    });

    it('should only update active status if provided', async () => {
      const updateDto: UpdateAccountMappingDto = {
        id: mockMappingId,
        active: false,
      };

      mappingRepository.findOne.mockResolvedValue(mockAccountMapping);
      mappingRepository.save.mockResolvedValue({ ...mockAccountMapping, active: false });

      const result = await controller.updateAccountMapping(
        mockOrganizationId,
        mockMappingId,
        updateDto,
      );

      expect(result.active).toBe(false);
      expect(accountService.getAccountById).not.toHaveBeenCalled();
    });

    it('should throw error when mapping not found', async () => {
      const updateDto: UpdateAccountMappingDto = {
        id: mockMappingId,
        active: true,
      };

      mappingRepository.findOne.mockResolvedValue(null);

      await expect(
        controller.updateAccountMapping(mockOrganizationId, mockMappingId, updateDto),
      ).rejects.toThrow('Account mapping not found');
    });
  });

  describe('autoMapAccounts', () => {
    const autoMapDto: AutoMapAccountsDto = {
      overwriteExisting: false,
    };

    it('should return auto-mapping statistics', async () => {
      accountService.getAccounts.mockResolvedValue({
        accounts: [mockQBAccount],
        count: 1,
      });
      mappingRepository.find.mockResolvedValue([]);

      const result = await controller.autoMapAccounts(mockOrganizationId, autoMapDto);

      expect(result).toHaveProperty('matched');
      expect(result).toHaveProperty('created');
      expect(result).toHaveProperty('skipped');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should fetch all QB accounts', async () => {
      accountService.getAccounts.mockResolvedValue({
        accounts: [mockQBAccount],
        count: 1,
      });
      mappingRepository.find.mockResolvedValue([]);

      await controller.autoMapAccounts(mockOrganizationId, autoMapDto);

      expect(accountService.getAccounts).toHaveBeenCalledWith(mockOrganizationId);
    });

    it('should fetch existing mappings', async () => {
      accountService.getAccounts.mockResolvedValue({
        accounts: [mockQBAccount],
        count: 1,
      });
      mappingRepository.find.mockResolvedValue([mockAccountMapping]);

      await controller.autoMapAccounts(mockOrganizationId, autoMapDto);

      expect(mappingRepository.find).toHaveBeenCalledWith({
        where: { organizationId: mockOrganizationId },
      });
    });

    it('should handle errors during auto-mapping', async () => {
      accountService.getAccounts.mockRejectedValue(new Error('Connection failed'));

      const result = await controller.autoMapAccounts(mockOrganizationId, autoMapDto);

      expect(result.errors).toContain('Auto-mapping failed: Connection failed');
    });

    it('should return zero counts on error', async () => {
      accountService.getAccounts.mockRejectedValue(new Error('Connection failed'));

      const result = await controller.autoMapAccounts(mockOrganizationId, autoMapDto);

      expect(result.matched).toBe(0);
      expect(result.created).toBe(0);
      expect(result.skipped).toBe(0);
    });
  });
});
