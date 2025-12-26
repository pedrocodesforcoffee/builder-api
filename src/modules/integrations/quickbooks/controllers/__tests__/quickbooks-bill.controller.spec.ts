import { Test, TestingModule } from '@nestjs/testing';
import { QuickBooksBillController } from '../quickbooks-bill.controller';
import { QuickBooksBillService } from '../../services';
import {
  CreateQBBillDto,
  QueryBillsDto,
  QBBillResponseDto,
  QBBillsListResponseDto,
  CreateBillFromPaymentApplicationDto,
} from '../../dto';
import { Repository } from 'typeorm';
import { QBEntityLink } from '../../entities';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('QuickBooksBillController', () => {
  let controller: QuickBooksBillController;
  let billService: jest.Mocked<QuickBooksBillService>;
  let entityLinkRepository: jest.Mocked<Repository<QBEntityLink>>;

  const mockOrganizationId = 'org-123';
  const mockBillId = 'bill-456';
  const mockPayAppId = 'payapp-789';

  const mockBillResponse: QBBillResponseDto = {
    id: mockBillId,
    syncToken: '1',
    vendorId: 'vendor-123',
    vendorName: 'Test Vendor',
    txnDate: '2024-01-15',
    dueDate: '2024-02-15',
    totalAmount: 5000.0,
    balance: 5000.0,
    privateNote: 'Test bill',
    lineItems: [
      {
        description: 'Line item 1',
        amount: 5000.0,
        accountId: 'acc-123',
        accountName: 'Expenses',
      },
    ],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  };

  const mockBillsList: QBBillsListResponseDto = {
    bills: [mockBillResponse],
    count: 1,
    maxResults: 100,
  };

  const mockCreateBillDto: CreateQBBillDto = {
    vendorId: 'vendor-123',
    txnDate: '2024-01-15',
    dueDate: '2024-02-15',
    lineItems: [
      {
        description: 'Line item 1',
        amount: 5000.0,
        accountId: 'acc-123',
      },
    ],
    privateNote: 'Test bill',
  };

  const mockEntityLink: QBEntityLink = {
    id: 'link-123',
    organizationId: mockOrganizationId,
    platformEntityType: 'PAYMENT_APPLICATION',
    platformEntityId: mockPayAppId,
    qbEntityType: 'BILL',
    qbEntityId: mockBillId,
    syncStatus: 'SYNCED',
    lastSyncedAt: new Date('2024-01-15'),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  };

  beforeEach(async () => {
    const mockBillService = {
      getBills: jest.fn(),
      getBillById: jest.fn(),
      createBill: jest.fn(),
      createBillFromPaymentApplication: jest.fn(),
      entityLinkRepository: {
        findOne: jest.fn(),
        find: jest.fn(),
      },
    };

    const mockEntityLinkRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuickBooksBillController],
      providers: [
        {
          provide: QuickBooksBillService,
          useValue: mockBillService,
        },
        {
          provide: getRepositoryToken(QBEntityLink),
          useValue: mockEntityLinkRepo,
        },
      ],
    }).compile();

    controller = module.get<QuickBooksBillController>(QuickBooksBillController);
    billService = module.get(QuickBooksBillService) as jest.Mocked<QuickBooksBillService>;
    entityLinkRepository = module.get(getRepositoryToken(QBEntityLink));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBills', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
      expect(controller.getBills).toBeDefined();
    });

    it('should return list of bills', async () => {
      const filters: QueryBillsDto = { maxResults: 100 };
      billService.getBills.mockResolvedValue(mockBillsList);

      const result = await controller.getBills(mockOrganizationId, filters);

      expect(result).toEqual(mockBillsList);
      expect(billService.getBills).toHaveBeenCalledWith(mockOrganizationId, filters);
      expect(billService.getBills).toHaveBeenCalledTimes(1);
    });

    it('should handle filters with vendor ID', async () => {
      const filters: QueryBillsDto = { vendorId: 'vendor-123', maxResults: 50 };
      billService.getBills.mockResolvedValue(mockBillsList);

      await controller.getBills(mockOrganizationId, filters);

      expect(billService.getBills).toHaveBeenCalledWith(mockOrganizationId, filters);
    });

    it('should handle empty results', async () => {
      const emptyList: QBBillsListResponseDto = { bills: [], count: 0, maxResults: 100 };
      billService.getBills.mockResolvedValue(emptyList);

      const result = await controller.getBills(mockOrganizationId, {});

      expect(result.bills).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });

  describe('getBillById', () => {
    it('should return a specific bill by ID', async () => {
      billService.getBillById.mockResolvedValue(mockBillResponse);

      const result = await controller.getBillById(mockOrganizationId, mockBillId);

      expect(result).toEqual(mockBillResponse);
      expect(billService.getBillById).toHaveBeenCalledWith(mockOrganizationId, mockBillId);
    });

    it('should throw error when bill not found', async () => {
      billService.getBillById.mockRejectedValue(new Error('Bill not found'));

      await expect(controller.getBillById(mockOrganizationId, 'invalid-id')).rejects.toThrow(
        'Bill not found',
      );
    });
  });

  describe('createBill', () => {
    it('should create a new bill', async () => {
      billService.createBill.mockResolvedValue(mockBillResponse);

      const result = await controller.createBill(mockOrganizationId, mockCreateBillDto);

      expect(result).toEqual(mockBillResponse);
      expect(billService.createBill).toHaveBeenCalledWith(mockOrganizationId, mockCreateBillDto);
    });

    it('should handle bill creation with multiple line items', async () => {
      const dtoWithMultipleLines: CreateQBBillDto = {
        ...mockCreateBillDto,
        lineItems: [
          { description: 'Item 1', amount: 1000.0, accountId: 'acc-1' },
          { description: 'Item 2', amount: 2000.0, accountId: 'acc-2' },
          { description: 'Item 3', amount: 3000.0, accountId: 'acc-3' },
        ],
      };
      billService.createBill.mockResolvedValue(mockBillResponse);

      await controller.createBill(mockOrganizationId, dtoWithMultipleLines);

      expect(billService.createBill).toHaveBeenCalledWith(
        mockOrganizationId,
        dtoWithMultipleLines,
      );
    });

    it('should throw error on invalid bill data', async () => {
      billService.createBill.mockRejectedValue(new Error('Invalid bill data'));

      await expect(
        controller.createBill(mockOrganizationId, mockCreateBillDto),
      ).rejects.toThrow('Invalid bill data');
    });
  });

  describe('exportPayAppAsBill', () => {
    it('should export payment application as bill', async () => {
      const dto: CreateBillFromPaymentApplicationDto = {
        paymentApplicationId: mockPayAppId,
      };
      billService.createBillFromPaymentApplication.mockResolvedValue(mockBillResponse);

      const result = await controller.exportPayAppAsBill(mockOrganizationId, mockPayAppId, dto);

      expect(result).toEqual({
        success: true,
        billId: mockBillId,
        message: `Bill successfully created for payment application ${mockPayAppId}`,
      });
      expect(billService.createBillFromPaymentApplication).toHaveBeenCalledWith(
        mockOrganizationId,
        mockPayAppId,
      );
    });

    it('should use payAppId from DTO if provided', async () => {
      const dto: CreateBillFromPaymentApplicationDto = {
        paymentApplicationId: 'different-payapp',
      };
      billService.createBillFromPaymentApplication.mockResolvedValue(mockBillResponse);

      await controller.exportPayAppAsBill(mockOrganizationId, mockPayAppId, dto);

      expect(billService.createBillFromPaymentApplication).toHaveBeenCalledWith(
        mockOrganizationId,
        'different-payapp',
      );
    });

    it('should throw error when payment application not found', async () => {
      const dto: CreateBillFromPaymentApplicationDto = {
        paymentApplicationId: mockPayAppId,
      };
      billService.createBillFromPaymentApplication.mockRejectedValue(
        new Error('Payment application not found'),
      );

      await expect(
        controller.exportPayAppAsBill(mockOrganizationId, mockPayAppId, dto),
      ).rejects.toThrow('Payment application not found');
    });

    it('should throw error when payment application already exported', async () => {
      const dto: CreateBillFromPaymentApplicationDto = {
        paymentApplicationId: mockPayAppId,
      };
      billService.createBillFromPaymentApplication.mockRejectedValue(
        new Error('Payment application already exported'),
      );

      await expect(
        controller.exportPayAppAsBill(mockOrganizationId, mockPayAppId, dto),
      ).rejects.toThrow('Payment application already exported');
    });
  });

  describe('getPayAppBillStatus', () => {
    it('should return status when payment app is exported', async () => {
      (billService as any).entityLinkRepository.findOne.mockResolvedValue(mockEntityLink);

      const result = await controller.getPayAppBillStatus(mockOrganizationId, mockPayAppId);

      expect(result).toEqual({
        isExported: true,
        billId: mockBillId,
        lastSyncedAt: mockEntityLink.lastSyncedAt?.toISOString(),
        syncStatus: 'SYNCED',
      });
      expect(billService['entityLinkRepository'].findOne).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          platformEntityType: 'PAYMENT_APPLICATION',
          platformEntityId: mockPayAppId,
          qbEntityType: 'BILL',
        },
      });
    });

    it('should return not exported when no link exists', async () => {
      (billService as any).entityLinkRepository.findOne.mockResolvedValue(null);

      const result = await controller.getPayAppBillStatus(mockOrganizationId, mockPayAppId);

      expect(result).toEqual({
        isExported: false,
      });
    });

    it('should handle entity link with pending status', async () => {
      const pendingLink = { ...mockEntityLink, syncStatus: 'PENDING' };
      (billService as any).entityLinkRepository.findOne.mockResolvedValue(pendingLink);

      const result = await controller.getPayAppBillStatus(mockOrganizationId, mockPayAppId);

      expect(result.syncStatus).toBe('PENDING');
      expect(result.isExported).toBe(true);
    });

    it('should handle entity link with error status', async () => {
      const errorLink = { ...mockEntityLink, syncStatus: 'ERROR' };
      (billService as any).entityLinkRepository.findOne.mockResolvedValue(errorLink);

      const result = await controller.getPayAppBillStatus(mockOrganizationId, mockPayAppId);

      expect(result.syncStatus).toBe('ERROR');
      expect(result.isExported).toBe(true);
    });
  });

  describe('syncBills', () => {
    it('should sync multiple payment applications successfully', async () => {
      const payAppIds = ['payapp-1', 'payapp-2', 'payapp-3'];
      billService.createBillFromPaymentApplication.mockResolvedValue(mockBillResponse);

      const result = await controller.syncBills(mockOrganizationId, {
        paymentApplicationIds: payAppIds,
      });

      expect(result).toEqual({
        processed: 3,
        succeeded: 3,
        failed: 0,
        errors: undefined,
      });
      expect(billService.createBillFromPaymentApplication).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures during batch sync', async () => {
      const payAppIds = ['payapp-1', 'payapp-2', 'payapp-3'];
      billService.createBillFromPaymentApplication
        .mockResolvedValueOnce(mockBillResponse)
        .mockRejectedValueOnce(new Error('Sync failed'))
        .mockResolvedValueOnce(mockBillResponse);

      const result = await controller.syncBills(mockOrganizationId, {
        paymentApplicationIds: payAppIds,
      });

      expect(result).toEqual({
        processed: 3,
        succeeded: 2,
        failed: 1,
        errors: ['payapp-2: Sync failed'],
      });
    });

    it('should handle complete failure during batch sync', async () => {
      const payAppIds = ['payapp-1', 'payapp-2'];
      billService.createBillFromPaymentApplication.mockRejectedValue(
        new Error('Connection error'),
      );

      const result = await controller.syncBills(mockOrganizationId, {
        paymentApplicationIds: payAppIds,
      });

      expect(result).toEqual({
        processed: 2,
        succeeded: 0,
        failed: 2,
        errors: ['payapp-1: Connection error', 'payapp-2: Connection error'],
      });
    });

    it('should handle empty array', async () => {
      const result = await controller.syncBills(mockOrganizationId, {
        paymentApplicationIds: [],
      });

      expect(result).toEqual({
        processed: 0,
        succeeded: 0,
        failed: 0,
        errors: undefined,
      });
      expect(billService.createBillFromPaymentApplication).not.toHaveBeenCalled();
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync status overview', async () => {
      const mockLinks: Partial<QBEntityLink>[] = [
        { ...mockEntityLink, id: '1', syncStatus: 'SYNCED' },
        { ...mockEntityLink, id: '2', syncStatus: 'SYNCED' },
        { ...mockEntityLink, id: '3', syncStatus: 'PENDING' },
        { ...mockEntityLink, id: '4', syncStatus: 'ERROR' },
      ];
      (billService as any).entityLinkRepository.find.mockResolvedValue(mockLinks);

      const result = await controller.getSyncStatus(mockOrganizationId);

      expect(result).toEqual({
        totalBills: 4,
        syncedBills: 2,
        pendingBills: 1,
        errorBills: 1,
      });
      expect(billService['entityLinkRepository'].find).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          qbEntityType: 'BILL',
        },
      });
    });

    it('should handle no synced bills', async () => {
      (billService as any).entityLinkRepository.find.mockResolvedValue([]);

      const result = await controller.getSyncStatus(mockOrganizationId);

      expect(result).toEqual({
        totalBills: 0,
        syncedBills: 0,
        pendingBills: 0,
        errorBills: 0,
      });
    });

    it('should count only synced bills correctly', async () => {
      const mockLinks: Partial<QBEntityLink>[] = [
        { ...mockEntityLink, id: '1', syncStatus: 'SYNCED' },
        { ...mockEntityLink, id: '2', syncStatus: 'SYNCED' },
        { ...mockEntityLink, id: '3', syncStatus: 'SYNCED' },
      ];
      (billService as any).entityLinkRepository.find.mockResolvedValue(mockLinks);

      const result = await controller.getSyncStatus(mockOrganizationId);

      expect(result.syncedBills).toBe(3);
      expect(result.pendingBills).toBe(0);
      expect(result.errorBills).toBe(0);
    });
  });
});
