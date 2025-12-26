import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { ChangeOrderCalculationService, COCostBreakdown } from './change-order-calculation.service';
import { OwnerChangeOrder } from '../entities/owner-change-order.entity';
import { CommitmentChangeOrder } from '../entities/commitment-change-order.entity';
import { OcoCostBreakdown } from '../entities/oco-cost-breakdown.entity';
import { CcoLineItem } from '../entities/cco-line-item.entity';
import { Budget } from '../entities/budget.entity';
import { BudgetLineItem } from '../entities/budget-line-item.entity';
import { CostCode } from '../entities/cost-code.entity';
import { OcoStatus } from '../enums/oco-status.enum';
import { CcoStatus } from '../enums/cco-status.enum';
import { BudgetStatus } from '../enums/budget-status.enum';
import { MarkupConfigDto } from '../dto';

describe('ChangeOrderCalculationService', () => {
  let service: ChangeOrderCalculationService;
  let ocoRepo: jest.Mocked<Repository<OwnerChangeOrder>>;
  let ccoRepo: jest.Mocked<Repository<CommitmentChangeOrder>>;
  let ocoCostBreakdownRepo: jest.Mocked<Repository<OcoCostBreakdown>>;
  let ccoLineItemRepo: jest.Mocked<Repository<CcoLineItem>>;
  let budgetRepo: jest.Mocked<Repository<Budget>>;
  let budgetLineItemRepo: jest.Mocked<Repository<BudgetLineItem>>;
  let costCodeRepo: jest.Mocked<Repository<CostCode>>;

  const mockOcoRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockCcoRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockOcoCostBreakdownRepo = {
    findOne: jest.fn(),
  };

  const mockCcoLineItemRepo = {
    findOne: jest.fn(),
  };

  const mockBudgetRepo = {
    findOne: jest.fn(),
  };

  const mockBudgetLineItemRepo = {
    findOne: jest.fn(),
  };

  const mockCostCodeRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChangeOrderCalculationService,
        {
          provide: getRepositoryToken(OwnerChangeOrder),
          useValue: mockOcoRepo,
        },
        {
          provide: getRepositoryToken(CommitmentChangeOrder),
          useValue: mockCcoRepo,
        },
        {
          provide: getRepositoryToken(OcoCostBreakdown),
          useValue: mockOcoCostBreakdownRepo,
        },
        {
          provide: getRepositoryToken(CcoLineItem),
          useValue: mockCcoLineItemRepo,
        },
        {
          provide: getRepositoryToken(Budget),
          useValue: mockBudgetRepo,
        },
        {
          provide: getRepositoryToken(BudgetLineItem),
          useValue: mockBudgetLineItemRepo,
        },
        {
          provide: getRepositoryToken(CostCode),
          useValue: mockCostCodeRepo,
        },
      ],
    }).compile();

    service = module.get<ChangeOrderCalculationService>(ChangeOrderCalculationService);
    ocoRepo = module.get(getRepositoryToken(OwnerChangeOrder));
    ccoRepo = module.get(getRepositoryToken(CommitmentChangeOrder));
    ocoCostBreakdownRepo = module.get(getRepositoryToken(OcoCostBreakdown));
    ccoLineItemRepo = module.get(getRepositoryToken(CcoLineItem));
    budgetRepo = module.get(getRepositoryToken(Budget));
    budgetLineItemRepo = module.get(getRepositoryToken(BudgetLineItem));
    costCodeRepo = module.get(getRepositoryToken(CostCode));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateTotal', () => {
    it('should calculate total from all cost categories', () => {
      const breakdown: COCostBreakdown = {
        laborCost: 1000,
        materialCost: 2000,
        equipmentCost: 500,
        subcontractCost: 3000,
        otherCost: 250,
      };

      const result = service.calculateTotal(breakdown);

      expect(result.toNumber()).toBe(6750);
    });

    it('should handle missing cost categories as zero', () => {
      const breakdown: COCostBreakdown = {
        laborCost: 1000,
        materialCost: 2000,
      };

      const result = service.calculateTotal(breakdown);

      expect(result.toNumber()).toBe(3000);
    });

    it('should handle empty breakdown', () => {
      const breakdown: COCostBreakdown = {};

      const result = service.calculateTotal(breakdown);

      expect(result.toNumber()).toBe(0);
    });

    it('should maintain decimal precision', () => {
      const breakdown: COCostBreakdown = {
        laborCost: 1000.01,
        materialCost: 2000.02,
        equipmentCost: 500.03,
      };

      const result = service.calculateTotal(breakdown);

      expect(result.toFixed(2)).toBe('3500.06');
    });

    it('should handle negative values', () => {
      const breakdown: COCostBreakdown = {
        laborCost: 1000,
        materialCost: -500,
      };

      const result = service.calculateTotal(breakdown);

      expect(result.toNumber()).toBe(500);
    });
  });

  describe('calculateMarkup', () => {
    it('should calculate markup with all percentages', () => {
      const breakdown: COCostBreakdown = {
        laborCost: 10000,
      };

      const markupConfig: MarkupConfigDto = {
        overheadPercent: 10,
        profitPercent: 10,
        bondPercent: 2,
        insurancePercent: 1,
      };

      const result = service.calculateMarkup(breakdown, markupConfig);

      // Direct: 10000
      // Overhead: 10000 * 0.10 = 1000
      // Profit: 11000 * 0.10 = 1100
      // Bond: 12100 * 0.02 = 242
      // Insurance: 12100 * 0.01 = 121
      // Total markup: 1000 + 1100 + 242 + 121 = 2463

      expect(result.toFixed(2)).toBe('2463.00');
    });

    it('should handle zero percentages', () => {
      const breakdown: COCostBreakdown = {
        laborCost: 10000,
      };

      const markupConfig: MarkupConfigDto = {
        overheadPercent: 0,
        profitPercent: 0,
        bondPercent: 0,
        insurancePercent: 0,
      };

      const result = service.calculateMarkup(breakdown, markupConfig);

      expect(result.toNumber()).toBe(0);
    });

    it('should handle missing percentages as zero', () => {
      const breakdown: COCostBreakdown = {
        laborCost: 10000,
      };

      const markupConfig: MarkupConfigDto = {};

      const result = service.calculateMarkup(breakdown, markupConfig);

      expect(result.toNumber()).toBe(0);
    });

    it('should calculate overhead only', () => {
      const breakdown: COCostBreakdown = {
        laborCost: 10000,
      };

      const markupConfig: MarkupConfigDto = {
        overheadPercent: 15,
      };

      const result = service.calculateMarkup(breakdown, markupConfig);

      expect(result.toNumber()).toBe(1500);
    });

    it('should compound profit on overhead', () => {
      const breakdown: COCostBreakdown = {
        laborCost: 10000,
      };

      const markupConfig: MarkupConfigDto = {
        overheadPercent: 10,
        profitPercent: 10,
      };

      const result = service.calculateMarkup(breakdown, markupConfig);

      // Overhead: 1000
      // Profit: 11000 * 0.10 = 1100
      // Total: 2100
      expect(result.toNumber()).toBe(2100);
    });

    it('should apply bond and insurance on same base', () => {
      const breakdown: COCostBreakdown = {
        laborCost: 10000,
      };

      const markupConfig: MarkupConfigDto = {
        overheadPercent: 10,
        profitPercent: 10,
        bondPercent: 2,
        insurancePercent: 1,
      };

      const result = service.calculateMarkup(breakdown, markupConfig);

      // Base for bond/insurance: 12100
      // Bond: 242
      // Insurance: 121
      expect(result.toFixed(2)).toBe('2463.00');
    });

    it('should maintain decimal precision', () => {
      const breakdown: COCostBreakdown = {
        laborCost: 9999.99,
      };

      const markupConfig: MarkupConfigDto = {
        overheadPercent: 12.5,
        profitPercent: 8.75,
      };

      const result = service.calculateMarkup(breakdown, markupConfig);

      // Overhead: 9999.99 * 0.125 = 1249.998750
      // Base: 11249.988750
      // Profit: 11249.988750 * 0.0875 = 984.374015625
      // Total: 2234.372765625
      expect(result.toFixed(2)).toBe('2234.37');
    });
  });

  describe('calculateWithMarkup', () => {
    it('should calculate total with markup', () => {
      const breakdown: COCostBreakdown = {
        laborCost: 10000,
      };

      const markupConfig: MarkupConfigDto = {
        overheadPercent: 10,
        profitPercent: 10,
      };

      const result = service.calculateWithMarkup(breakdown, markupConfig);

      // Direct: 10000
      // Markup: 2100
      // Total: 12100
      expect(result.toNumber()).toBe(12100);
    });

    it('should return direct cost when no markup', () => {
      const breakdown: COCostBreakdown = {
        laborCost: 5000,
        materialCost: 3000,
      };

      const markupConfig: MarkupConfigDto = {};

      const result = service.calculateWithMarkup(breakdown, markupConfig);

      expect(result.toNumber()).toBe(8000);
    });

    it('should handle complex breakdown with full markup', () => {
      const breakdown: COCostBreakdown = {
        laborCost: 10000,
        materialCost: 5000,
        equipmentCost: 2000,
        subcontractCost: 8000,
        otherCost: 1000,
      };

      const markupConfig: MarkupConfigDto = {
        overheadPercent: 10,
        profitPercent: 10,
        bondPercent: 2,
        insurancePercent: 1,
      };

      const result = service.calculateWithMarkup(breakdown, markupConfig);

      // Direct: 26000
      // Overhead: 2600
      // Profit: 2860
      // Bond: 314.6
      // Insurance: 314.6
      // Total: 26000 + 2600 + 2860 + 314.6 + 314.6 = 32403.8
      expect(result.toFixed(2)).toBe('32403.80');
    });
  });

  describe('calculateBudgetImpact', () => {
    const mockProjectId = '123e4567-e89b-12d3-a456-426614174000';
    const mockOcoId = '223e4567-e89b-12d3-a456-426614174001';
    const mockCcoId = '323e4567-e89b-12d3-a456-426614174002';
    const mockBudgetId = '423e4567-e89b-12d3-a456-426614174003';
    const mockCostCodeId = '523e4567-e89b-12d3-a456-426614174004';

    it('should calculate budget impact for OCO with cost breakdown', async () => {
      const mockCostCode = {
        id: mockCostCodeId,
        code: '01-100',
        name: 'Site Work',
      } as CostCode;

      const mockOco = {
        id: mockOcoId,
        projectId: mockProjectId,
        amount: 50000,
        costBreakdowns: [
          {
            id: '1',
            costCodeId: mockCostCodeId,
            costCode: mockCostCode,
            amount: 30000,
          },
          {
            id: '2',
            costCodeId: mockCostCodeId,
            costCode: mockCostCode,
            amount: 20000,
          },
        ],
      } as OwnerChangeOrder;

      const mockBudget = {
        id: mockBudgetId,
        projectId: mockProjectId,
        totalBudget: 1000000,
        status: BudgetStatus.ACTIVE,
      } as Budget;

      const mockLineItem = {
        id: '1',
        budgetId: mockBudgetId,
        costCodeId: mockCostCodeId,
        budgetedCost: 100000,
      } as BudgetLineItem;

      ocoRepo.findOne.mockResolvedValue(mockOco);
      budgetRepo.findOne.mockResolvedValue(mockBudget);
      budgetLineItemRepo.findOne.mockResolvedValue(mockLineItem);

      const result = await service.calculateBudgetImpact(mockOcoId, 'OCO');

      expect(result.changeOrderId).toBe(mockOcoId);
      expect(result.changeOrderType).toBe('OCO');
      expect(result.changeOrderAmount).toBe(50000);
      expect(result.currentBudgetTotal).toBe(1000000);
      expect(result.projectedBudgetTotal).toBe(1050000);
      expect(result.budgetImpact).toBe(50000);
      expect(result.percentageImpact).toBe(5);
      expect(result.costCodeBreakdown).toHaveLength(2);
      expect(result.costCodeBreakdown[0].amount).toBe(30000);
      expect(result.costCodeBreakdown[0].currentBudget).toBe(100000);
      expect(result.costCodeBreakdown[0].projectedBudget).toBe(130000);
    });

    it('should calculate budget impact for CCO with line items', async () => {
      const mockCostCode = {
        id: mockCostCodeId,
        code: '03-300',
        name: 'Concrete',
      } as CostCode;

      const mockCco = {
        id: mockCcoId,
        projectId: mockProjectId,
        amount: 25000,
        lineItems: [
          {
            id: '1',
            costCodeId: mockCostCodeId,
            costCode: mockCostCode,
            amount: 25000,
          },
        ],
      } as CommitmentChangeOrder;

      const mockBudget = {
        id: mockBudgetId,
        projectId: mockProjectId,
        totalBudget: 800000,
        status: BudgetStatus.ACTIVE,
      } as Budget;

      const mockLineItem = {
        id: '1',
        budgetId: mockBudgetId,
        costCodeId: mockCostCodeId,
        budgetedCost: 50000,
      } as BudgetLineItem;

      ccoRepo.findOne.mockResolvedValue(mockCco);
      budgetRepo.findOne.mockResolvedValue(mockBudget);
      budgetLineItemRepo.findOne.mockResolvedValue(mockLineItem);

      const result = await service.calculateBudgetImpact(mockCcoId, 'CCO');

      expect(result.changeOrderId).toBe(mockCcoId);
      expect(result.changeOrderType).toBe('CCO');
      expect(result.changeOrderAmount).toBe(25000);
      expect(result.currentBudgetTotal).toBe(800000);
      expect(result.projectedBudgetTotal).toBe(825000);
      expect(result.budgetImpact).toBe(25000);
      expect(result.percentageImpact).toBeCloseTo(3.125, 2);
      expect(result.costCodeBreakdown).toHaveLength(1);
    });

    it('should throw NotFoundException when OCO not found', async () => {
      ocoRepo.findOne.mockResolvedValue(null);

      await expect(
        service.calculateBudgetImpact(mockOcoId, 'OCO')
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.calculateBudgetImpact(mockOcoId, 'OCO')
      ).rejects.toThrow(`OCO with ID ${mockOcoId} not found`);
    });

    it('should throw NotFoundException when CCO not found', async () => {
      ccoRepo.findOne.mockResolvedValue(null);

      await expect(
        service.calculateBudgetImpact(mockCcoId, 'CCO')
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.calculateBudgetImpact(mockCcoId, 'CCO')
      ).rejects.toThrow(`CCO with ID ${mockCcoId} not found`);
    });

    it('should handle missing budget', async () => {
      const mockOco = {
        id: mockOcoId,
        projectId: mockProjectId,
        amount: 10000,
        costBreakdowns: [],
      } as OwnerChangeOrder;

      ocoRepo.findOne.mockResolvedValue(mockOco);
      budgetRepo.findOne.mockResolvedValue(null);

      const result = await service.calculateBudgetImpact(mockOcoId, 'OCO');

      expect(result.currentBudgetTotal).toBe(0);
      expect(result.projectedBudgetTotal).toBe(10000);
      expect(result.percentageImpact).toBe(0);
    });

    it('should handle cost breakdown without cost code', async () => {
      const mockOco = {
        id: mockOcoId,
        projectId: mockProjectId,
        amount: 15000,
        costBreakdowns: [
          {
            id: '1',
            costCodeId: null,
            amount: 15000,
          },
        ],
      } as OwnerChangeOrder;

      const mockBudget = {
        id: mockBudgetId,
        projectId: mockProjectId,
        totalBudget: 500000,
        status: BudgetStatus.ACTIVE,
      } as Budget;

      ocoRepo.findOne.mockResolvedValue(mockOco);
      budgetRepo.findOne.mockResolvedValue(mockBudget);

      const result = await service.calculateBudgetImpact(mockOcoId, 'OCO');

      expect(result.costCodeBreakdown).toHaveLength(0);
    });
  });

  describe('calculateProjectCOSummary', () => {
    const mockProjectId = '123e4567-e89b-12d3-a456-426614174000';

    it('should calculate summary with multiple OCOs and CCOs', async () => {
      const mockOcos = [
        { id: '1', projectId: mockProjectId, amount: 10000, status: OcoStatus.DRAFT },
        { id: '2', projectId: mockProjectId, amount: 20000, status: OcoStatus.PENDING_APPROVAL },
        { id: '3', projectId: mockProjectId, amount: 30000, status: OcoStatus.APPROVED },
        { id: '4', projectId: mockProjectId, amount: 40000, status: OcoStatus.EXECUTED },
        { id: '5', projectId: mockProjectId, amount: 5000, status: OcoStatus.REJECTED },
      ] as OwnerChangeOrder[];

      const mockCcos = [
        { id: '1', projectId: mockProjectId, amount: 8000, status: CcoStatus.DRAFT },
        { id: '2', projectId: mockProjectId, amount: 12000, status: CcoStatus.PENDING_APPROVAL },
        { id: '3', projectId: mockProjectId, amount: 15000, status: CcoStatus.APPROVED },
        { id: '4', projectId: mockProjectId, amount: 18000, status: CcoStatus.EXECUTED },
      ] as CommitmentChangeOrder[];

      const mockBudget = {
        id: '1',
        projectId: mockProjectId,
        totalBudget: 1000000,
        status: BudgetStatus.ACTIVE,
      } as Budget;

      ocoRepo.find.mockResolvedValue(mockOcos);
      ccoRepo.find.mockResolvedValue(mockCcos);
      budgetRepo.findOne.mockResolvedValue(mockBudget);

      const result = await service.calculateProjectCOSummary(mockProjectId);

      expect(result.projectId).toBe(mockProjectId);
      expect(result.totalOcoCount).toBe(5);
      expect(result.totalOcoAmount).toBe(105000);
      expect(result.ocoDraftCount).toBe(1);
      expect(result.ocoPendingCount).toBe(1);
      expect(result.ocoApprovedCount).toBe(1);
      expect(result.ocoRejectedCount).toBe(1);
      expect(result.ocoExecutedCount).toBe(1);
      expect(result.ocoApprovedAmount).toBe(30000);
      expect(result.ocoExecutedAmount).toBe(40000);

      expect(result.totalCcoCount).toBe(4);
      expect(result.totalCcoAmount).toBe(53000);
      expect(result.ccoDraftCount).toBe(1);
      expect(result.ccoPendingCount).toBe(1);
      expect(result.ccoApprovedCount).toBe(1);
      expect(result.ccoExecutedCount).toBe(1);
      expect(result.ccoApprovedAmount).toBe(15000);
      expect(result.ccoExecutedAmount).toBe(18000);

      expect(result.totalChangeOrderCount).toBe(9);
      expect(result.totalChangeOrderAmount).toBe(158000);
      expect(result.totalApprovedAmount).toBe(45000);
      expect(result.totalExecutedAmount).toBe(58000);
      expect(result.budgetImpactPercentage).toBeCloseTo(4.5, 2);
    });

    it('should handle empty project', async () => {
      ocoRepo.find.mockResolvedValue([]);
      ccoRepo.find.mockResolvedValue([]);
      budgetRepo.findOne.mockResolvedValue(null);

      const result = await service.calculateProjectCOSummary(mockProjectId);

      expect(result.totalOcoCount).toBe(0);
      expect(result.totalCcoCount).toBe(0);
      expect(result.totalChangeOrderCount).toBe(0);
      expect(result.totalChangeOrderAmount).toBe(0);
      expect(result.budgetImpactPercentage).toBe(0);
    });

    it('should handle project with no budget', async () => {
      const mockOcos = [
        { id: '1', projectId: mockProjectId, amount: 10000, status: OcoStatus.APPROVED },
      ] as OwnerChangeOrder[];

      ocoRepo.find.mockResolvedValue(mockOcos);
      ccoRepo.find.mockResolvedValue([]);
      budgetRepo.findOne.mockResolvedValue(null);

      const result = await service.calculateProjectCOSummary(mockProjectId);

      expect(result.totalOcoAmount).toBe(10000);
      expect(result.budgetImpactPercentage).toBe(0);
    });

    it('should count only executed amounts in executed totals', async () => {
      const mockOcos = [
        { id: '1', projectId: mockProjectId, amount: 10000, status: OcoStatus.APPROVED },
        { id: '2', projectId: mockProjectId, amount: 20000, status: OcoStatus.EXECUTED },
      ] as OwnerChangeOrder[];

      ocoRepo.find.mockResolvedValue(mockOcos);
      ccoRepo.find.mockResolvedValue([]);
      budgetRepo.findOne.mockResolvedValue(null);

      const result = await service.calculateProjectCOSummary(mockProjectId);

      expect(result.ocoApprovedAmount).toBe(10000);
      expect(result.ocoExecutedAmount).toBe(20000);
      expect(result.totalApprovedAmount).toBe(10000);
      expect(result.totalExecutedAmount).toBe(20000);
    });
  });
});
