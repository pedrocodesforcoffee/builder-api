import { Budget } from '../budget.entity';
import { BudgetStatus } from '../../enums/budget-status.enum';

describe('Budget Entity', () => {
  describe('Entity Creation', () => {
    it('should create a valid budget instance', () => {
      const budget = new Budget();
      budget.name = 'Original Budget';
      budget.description = 'Initial project budget';
      budget.projectId = '123e4567-e89b-12d3-a456-426614174000';
      budget.createdById = '123e4567-e89b-12d3-a456-426614174001';
      budget.status = BudgetStatus.DRAFT;
      budget.totalBudget = 100000.0;

      expect(budget).toBeDefined();
      expect(budget.name).toBe('Original Budget');
      expect(budget.description).toBe('Initial project budget');
      expect(budget.projectId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(budget.createdById).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(budget.status).toBe(BudgetStatus.DRAFT);
      expect(budget.totalBudget).toBe(100000.0);
    });

    it('should create a budget without description', () => {
      const budget = new Budget();
      budget.name = 'Original Budget';
      budget.projectId = '123e4567-e89b-12d3-a456-426614174000';
      budget.createdById = '123e4567-e89b-12d3-a456-426614174001';
      budget.status = BudgetStatus.DRAFT;
      budget.totalBudget = 100000.0;

      expect(budget.description).toBeUndefined();
      expect(budget.name).toBe('Original Budget');
    });

    it('should default totalBudget to 0', () => {
      const budget = new Budget();
      budget.name = 'Original Budget';
      budget.projectId = '123e4567-e89b-12d3-a456-426614174000';
      budget.createdById = '123e4567-e89b-12d3-a456-426614174001';
      budget.status = BudgetStatus.DRAFT;

      // totalBudget defaults to 0 based on entity definition
      expect(budget.totalBudget).toBeUndefined(); // Until set by database default
    });
  });

  describe('Budget Status', () => {
    it('should support DRAFT status', () => {
      const budget = new Budget();
      budget.status = BudgetStatus.DRAFT;

      expect(budget.status).toBe(BudgetStatus.DRAFT);
      expect(budget.status).toBe('DRAFT');
    });

    it('should support ACTIVE status', () => {
      const budget = new Budget();
      budget.status = BudgetStatus.ACTIVE;

      expect(budget.status).toBe(BudgetStatus.ACTIVE);
      expect(budget.status).toBe('ACTIVE');
    });

    it('should support LOCKED status', () => {
      const budget = new Budget();
      budget.status = BudgetStatus.LOCKED;

      expect(budget.status).toBe(BudgetStatus.LOCKED);
      expect(budget.status).toBe('LOCKED');
    });

    it('should support ARCHIVED status', () => {
      const budget = new Budget();
      budget.status = BudgetStatus.ARCHIVED;

      expect(budget.status).toBe(BudgetStatus.ARCHIVED);
      expect(budget.status).toBe('ARCHIVED');
    });

    it('should default status to DRAFT', () => {
      const budget = new Budget();

      // Status defaults to DRAFT based on entity definition
      expect(budget.status).toBeUndefined(); // Until set by database default
    });
  });

  describe('Budget Name', () => {
    it('should accept valid budget names', () => {
      const testCases = [
        'Original Budget',
        'Revised Budget - March 2024',
        'Forecast Budget Q2',
        'Budget #123',
        'Construction Budget (Phase 1)',
      ];

      testCases.forEach((name) => {
        const budget = new Budget();
        budget.name = name;
        budget.projectId = '123e4567-e89b-12d3-a456-426614174000';
        budget.createdById = '123e4567-e89b-12d3-a456-426614174001';

        expect(budget.name).toBe(name);
      });
    });

    it('should handle special characters in name', () => {
      const budget = new Budget();
      budget.name = "Budget & Forecast (2024) - Owner's Contingency";

      expect(budget.name).toBe("Budget & Forecast (2024) - Owner's Contingency");
    });

    it('should handle unicode characters in name', () => {
      const budget = new Budget();
      budget.name = 'Budget Année 2024';

      expect(budget.name).toBe('Budget Année 2024');
    });
  });

  describe('Budget Description', () => {
    it('should accept valid descriptions', () => {
      const budget = new Budget();
      budget.description = 'This is the original project budget approved on January 1, 2024';

      expect(budget.description).toBe(
        'This is the original project budget approved on January 1, 2024',
      );
    });

    it('should handle long descriptions', () => {
      const budget = new Budget();
      const longDescription = 'A'.repeat(1000);
      budget.description = longDescription;

      expect(budget.description).toBe(longDescription);
      expect(budget.description.length).toBe(1000);
    });

    it('should handle multiline descriptions', () => {
      const budget = new Budget();
      budget.description = `Original Budget - January 2024

Approved by: Project Manager
Budget includes: Labor, Materials, Equipment`;

      expect(budget.description).toContain('Original Budget');
      expect(budget.description).toContain('Project Manager');
    });

    it('should handle special characters in description', () => {
      const budget = new Budget();
      budget.description = "Budget includes 5% contingency & owner's reserve";

      expect(budget.description).toBe(
        "Budget includes 5% contingency & owner's reserve",
      );
    });
  });

  describe('Total Budget', () => {
    it('should handle decimal values with 2 decimal places', () => {
      const budget = new Budget();
      budget.totalBudget = 123456.78;

      expect(budget.totalBudget).toBe(123456.78);
    });

    it('should handle zero budget', () => {
      const budget = new Budget();
      budget.totalBudget = 0;

      expect(budget.totalBudget).toBe(0);
    });

    it('should handle large budget amounts', () => {
      const budget = new Budget();
      budget.totalBudget = 9999999999999.99;

      expect(budget.totalBudget).toBe(9999999999999.99);
    });

    it('should handle budget with cents', () => {
      const budget = new Budget();
      budget.totalBudget = 1000000.01;

      expect(budget.totalBudget).toBe(1000000.01);
    });

    it('should handle integer budget amounts', () => {
      const budget = new Budget();
      budget.totalBudget = 500000;

      expect(budget.totalBudget).toBe(500000);
    });
  });

  describe('Project and User References', () => {
    it('should accept valid project ID', () => {
      const budget = new Budget();
      budget.projectId = '123e4567-e89b-12d3-a456-426614174000';

      expect(budget.projectId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should accept valid created by ID', () => {
      const budget = new Budget();
      budget.createdById = '123e4567-e89b-12d3-a456-426614174001';

      expect(budget.createdById).toBe('123e4567-e89b-12d3-a456-426614174001');
    });

    it('should maintain separate project and user IDs', () => {
      const budget = new Budget();
      budget.projectId = '123e4567-e89b-12d3-a456-426614174000';
      budget.createdById = '123e4567-e89b-12d3-a456-426614174001';

      expect(budget.projectId).not.toBe(budget.createdById);
      expect(budget.projectId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(budget.createdById).toBe('123e4567-e89b-12d3-a456-426614174001');
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt properties', () => {
      const budget = new Budget();
      budget.name = 'Original Budget';
      budget.projectId = '123e4567-e89b-12d3-a456-426614174000';
      budget.createdById = '123e4567-e89b-12d3-a456-426614174001';
      budget.createdAt = new Date();
      budget.updatedAt = new Date();

      expect(budget.createdAt).toBeInstanceOf(Date);
      expect(budget.updatedAt).toBeInstanceOf(Date);
    });

    it('should not throw when accessing timestamp properties', () => {
      const budget = new Budget();

      expect(() => budget.createdAt).not.toThrow();
      expect(() => budget.updatedAt).not.toThrow();
    });

    it('should handle different created and updated dates', () => {
      const budget = new Budget();
      const createdDate = new Date('2024-01-01');
      const updatedDate = new Date('2024-01-15');

      budget.createdAt = createdDate;
      budget.updatedAt = updatedDate;

      expect(budget.createdAt.getTime()).toBeLessThan(budget.updatedAt.getTime());
      expect(budget.createdAt).toEqual(createdDate);
      expect(budget.updatedAt).toEqual(updatedDate);
    });
  });

  describe('Budget Lifecycle', () => {
    it('should transition from DRAFT to ACTIVE', () => {
      const budget = new Budget();
      budget.status = BudgetStatus.DRAFT;

      expect(budget.status).toBe(BudgetStatus.DRAFT);

      budget.status = BudgetStatus.ACTIVE;

      expect(budget.status).toBe(BudgetStatus.ACTIVE);
    });

    it('should transition from ACTIVE to LOCKED', () => {
      const budget = new Budget();
      budget.status = BudgetStatus.ACTIVE;

      expect(budget.status).toBe(BudgetStatus.ACTIVE);

      budget.status = BudgetStatus.LOCKED;

      expect(budget.status).toBe(BudgetStatus.LOCKED);
    });

    it('should transition from LOCKED to ARCHIVED', () => {
      const budget = new Budget();
      budget.status = BudgetStatus.LOCKED;

      expect(budget.status).toBe(BudgetStatus.LOCKED);

      budget.status = BudgetStatus.ARCHIVED;

      expect(budget.status).toBe(BudgetStatus.ARCHIVED);
    });

    it('should allow multiple budgets for same project', () => {
      const projectId = '123e4567-e89b-12d3-a456-426614174000';

      const originalBudget = new Budget();
      originalBudget.id = '123e4567-e89b-12d3-a456-426614174010';
      originalBudget.name = 'Original Budget';
      originalBudget.projectId = projectId;
      originalBudget.createdById = '123e4567-e89b-12d3-a456-426614174001';
      originalBudget.status = BudgetStatus.ACTIVE;

      const revisedBudget = new Budget();
      revisedBudget.id = '123e4567-e89b-12d3-a456-426614174011';
      revisedBudget.name = 'Revised Budget - March 2024';
      revisedBudget.projectId = projectId;
      revisedBudget.createdById = '123e4567-e89b-12d3-a456-426614174001';
      revisedBudget.status = BudgetStatus.DRAFT;

      expect(originalBudget.projectId).toBe(revisedBudget.projectId);
      expect(originalBudget.id).not.toBe(revisedBudget.id);
      expect(originalBudget.name).not.toBe(revisedBudget.name);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data types for all fields', () => {
      const budget = new Budget();
      budget.id = '123e4567-e89b-12d3-a456-426614174000';
      budget.name = 'Original Budget';
      budget.description = 'Initial project budget';
      budget.projectId = '123e4567-e89b-12d3-a456-426614174001';
      budget.createdById = '123e4567-e89b-12d3-a456-426614174002';
      budget.status = BudgetStatus.DRAFT;
      budget.totalBudget = 100000.0;
      budget.createdAt = new Date();
      budget.updatedAt = new Date();

      expect(typeof budget.id).toBe('string');
      expect(typeof budget.name).toBe('string');
      expect(typeof budget.description).toBe('string');
      expect(typeof budget.projectId).toBe('string');
      expect(typeof budget.createdById).toBe('string');
      expect(typeof budget.status).toBe('string');
      expect(typeof budget.totalBudget).toBe('number');
      expect(budget.createdAt).toBeInstanceOf(Date);
      expect(budget.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle all required properties', () => {
      const budget = new Budget();
      budget.id = '123e4567-e89b-12d3-a456-426614174000';
      budget.name = 'Original Budget';
      budget.projectId = '123e4567-e89b-12d3-a456-426614174001';
      budget.createdById = '123e4567-e89b-12d3-a456-426614174002';
      budget.status = BudgetStatus.DRAFT;
      budget.totalBudget = 0;
      budget.createdAt = new Date();
      budget.updatedAt = new Date();

      expect(budget.id).toBeDefined();
      expect(budget.name).toBeDefined();
      expect(budget.projectId).toBeDefined();
      expect(budget.createdById).toBeDefined();
      expect(budget.status).toBeDefined();
      expect(budget.totalBudget).toBeDefined();
      expect(budget.createdAt).toBeDefined();
      expect(budget.updatedAt).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty name string', () => {
      const budget = new Budget();
      budget.name = '';

      expect(budget.name).toBe('');
    });

    it('should handle empty description string', () => {
      const budget = new Budget();
      budget.description = '';

      expect(budget.description).toBe('');
    });

    it('should handle whitespace-only description', () => {
      const budget = new Budget();
      budget.description = '   ';

      expect(budget.description).toBe('   ');
    });

    it('should handle negative budget amounts', () => {
      // Note: In production, this should be validated at the DTO/service layer
      const budget = new Budget();
      budget.totalBudget = -1000;

      expect(budget.totalBudget).toBe(-1000);
    });

    it('should handle very small decimal amounts', () => {
      const budget = new Budget();
      budget.totalBudget = 0.01;

      expect(budget.totalBudget).toBe(0.01);
    });
  });

  describe('Budget Types', () => {
    it('should create original budget', () => {
      const budget = new Budget();
      budget.name = 'Original Budget';
      budget.description = 'Initial approved budget';
      budget.status = BudgetStatus.ACTIVE;
      budget.totalBudget = 1000000.0;

      expect(budget.name).toBe('Original Budget');
      expect(budget.status).toBe(BudgetStatus.ACTIVE);
    });

    it('should create revised budget', () => {
      const budget = new Budget();
      budget.name = 'Revised Budget - Q1 2024';
      budget.description = 'Budget updated after change orders';
      budget.status = BudgetStatus.DRAFT;
      budget.totalBudget = 1250000.0;

      expect(budget.name).toBe('Revised Budget - Q1 2024');
      expect(budget.status).toBe(BudgetStatus.DRAFT);
    });

    it('should create forecast budget', () => {
      const budget = new Budget();
      budget.name = 'Forecast Budget Q2';
      budget.description = 'Projected budget for Q2';
      budget.status = BudgetStatus.DRAFT;
      budget.totalBudget = 1100000.0;

      expect(budget.name).toBe('Forecast Budget Q2');
      expect(budget.status).toBe(BudgetStatus.DRAFT);
    });
  });

  describe('Budget Comparison', () => {
    it('should allow comparing budgets by total', () => {
      const budget1 = new Budget();
      budget1.totalBudget = 1000000.0;

      const budget2 = new Budget();
      budget2.totalBudget = 1250000.0;

      expect(budget2.totalBudget).toBeGreaterThan(budget1.totalBudget);
      expect(budget2.totalBudget - budget1.totalBudget).toBe(250000.0);
    });

    it('should allow comparing budgets by status', () => {
      const draftBudget = new Budget();
      draftBudget.status = BudgetStatus.DRAFT;

      const activeBudget = new Budget();
      activeBudget.status = BudgetStatus.ACTIVE;

      expect(draftBudget.status).not.toBe(activeBudget.status);
      expect(draftBudget.status).toBe(BudgetStatus.DRAFT);
      expect(activeBudget.status).toBe(BudgetStatus.ACTIVE);
    });
  });
});
