import { BudgetLineItem } from '../budget-line-item.entity';
import { BudgetCategory } from '../../enums/budget-category.enum';

describe('BudgetLineItem Entity', () => {
  describe('Entity Creation', () => {
    it('should create a valid budget line item instance', () => {
      const lineItem = new BudgetLineItem();
      lineItem.budgetId = '123e4567-e89b-12d3-a456-426614174000';
      lineItem.costCodeId = '123e4567-e89b-12d3-a456-426614174001';
      lineItem.category = BudgetCategory.LABOR;
      lineItem.description = 'Framing labor';
      lineItem.quantity = 100;
      lineItem.unitCost = 50.25;
      lineItem.budgetedCost = 5025.0;

      expect(lineItem).toBeDefined();
      expect(lineItem.budgetId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(lineItem.costCodeId).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(lineItem.category).toBe(BudgetCategory.LABOR);
      expect(lineItem.description).toBe('Framing labor');
      expect(lineItem.quantity).toBe(100);
      expect(lineItem.unitCost).toBe(50.25);
      expect(lineItem.budgetedCost).toBe(5025.0);
    });

    it('should create a line item without optional fields', () => {
      const lineItem = new BudgetLineItem();
      lineItem.budgetId = '123e4567-e89b-12d3-a456-426614174000';
      lineItem.costCodeId = '123e4567-e89b-12d3-a456-426614174001';
      lineItem.category = BudgetCategory.MATERIAL;
      lineItem.budgetedCost = 10000.0;

      expect(lineItem.description).toBeUndefined();
      expect(lineItem.quantity).toBeUndefined();
      expect(lineItem.unitCost).toBeUndefined();
      expect(lineItem.budgetedCost).toBe(10000.0);
    });
  });

  describe('Budget Category', () => {
    it('should support LABOR category', () => {
      const lineItem = new BudgetLineItem();
      lineItem.category = BudgetCategory.LABOR;

      expect(lineItem.category).toBe(BudgetCategory.LABOR);
      expect(lineItem.category).toBe('LABOR');
    });

    it('should support MATERIAL category', () => {
      const lineItem = new BudgetLineItem();
      lineItem.category = BudgetCategory.MATERIAL;

      expect(lineItem.category).toBe(BudgetCategory.MATERIAL);
      expect(lineItem.category).toBe('MATERIAL');
    });

    it('should support EQUIPMENT category', () => {
      const lineItem = new BudgetLineItem();
      lineItem.category = BudgetCategory.EQUIPMENT;

      expect(lineItem.category).toBe(BudgetCategory.EQUIPMENT);
      expect(lineItem.category).toBe('EQUIPMENT');
    });

    it('should support SUBCONTRACT category', () => {
      const lineItem = new BudgetLineItem();
      lineItem.category = BudgetCategory.SUBCONTRACT;

      expect(lineItem.category).toBe(BudgetCategory.SUBCONTRACT);
      expect(lineItem.category).toBe('SUBCONTRACT');
    });

    it('should support OTHER category', () => {
      const lineItem = new BudgetLineItem();
      lineItem.category = BudgetCategory.OTHER;

      expect(lineItem.category).toBe(BudgetCategory.OTHER);
      expect(lineItem.category).toBe('OTHER');
    });
  });

  describe('Description', () => {
    it('should accept valid descriptions', () => {
      const lineItem = new BudgetLineItem();
      lineItem.description = 'Labor for concrete foundation work';

      expect(lineItem.description).toBe('Labor for concrete foundation work');
    });

    it('should handle long descriptions', () => {
      const lineItem = new BudgetLineItem();
      const longDescription = 'A'.repeat(1000);
      lineItem.description = longDescription;

      expect(lineItem.description).toBe(longDescription);
      expect(lineItem.description.length).toBe(1000);
    });

    it('should handle special characters in description', () => {
      const lineItem = new BudgetLineItem();
      lineItem.description = "Labor & materials for owner's suite";

      expect(lineItem.description).toBe("Labor & materials for owner's suite");
    });
  });

  describe('Quantity and Unit Cost', () => {
    it('should handle quantity with up to 4 decimal places', () => {
      const lineItem = new BudgetLineItem();
      lineItem.quantity = 123.4567;

      expect(lineItem.quantity).toBe(123.4567);
    });

    it('should handle unit cost with up to 4 decimal places', () => {
      const lineItem = new BudgetLineItem();
      lineItem.unitCost = 45.6789;

      expect(lineItem.unitCost).toBe(45.6789);
    });

    it('should handle integer quantities', () => {
      const lineItem = new BudgetLineItem();
      lineItem.quantity = 100;

      expect(lineItem.quantity).toBe(100);
    });

    it('should handle integer unit costs', () => {
      const lineItem = new BudgetLineItem();
      lineItem.unitCost = 50;

      expect(lineItem.unitCost).toBe(50);
    });

    it('should handle zero quantity', () => {
      const lineItem = new BudgetLineItem();
      lineItem.quantity = 0;

      expect(lineItem.quantity).toBe(0);
    });

    it('should handle zero unit cost', () => {
      const lineItem = new BudgetLineItem();
      lineItem.unitCost = 0;

      expect(lineItem.unitCost).toBe(0);
    });

    it('should calculate budgeted cost from quantity and unit cost', () => {
      const lineItem = new BudgetLineItem();
      lineItem.quantity = 100;
      lineItem.unitCost = 50.25;
      lineItem.budgetedCost = lineItem.quantity * lineItem.unitCost;

      expect(lineItem.budgetedCost).toBe(5025.0);
    });
  });

  describe('Budgeted Cost', () => {
    it('should handle decimal values with 2 decimal places', () => {
      const lineItem = new BudgetLineItem();
      lineItem.budgetedCost = 123456.78;

      expect(lineItem.budgetedCost).toBe(123456.78);
    });

    it('should handle zero budgeted cost', () => {
      const lineItem = new BudgetLineItem();
      lineItem.budgetedCost = 0;

      expect(lineItem.budgetedCost).toBe(0);
    });

    it('should handle large budgeted cost amounts', () => {
      const lineItem = new BudgetLineItem();
      lineItem.budgetedCost = 9999999999999.99;

      expect(lineItem.budgetedCost).toBe(9999999999999.99);
    });

    it('should handle budgeted cost with cents', () => {
      const lineItem = new BudgetLineItem();
      lineItem.budgetedCost = 1000.01;

      expect(lineItem.budgetedCost).toBe(1000.01);
    });
  });

  describe('Budget and Cost Code References', () => {
    it('should accept valid budget ID', () => {
      const lineItem = new BudgetLineItem();
      lineItem.budgetId = '123e4567-e89b-12d3-a456-426614174000';

      expect(lineItem.budgetId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should accept valid cost code ID', () => {
      const lineItem = new BudgetLineItem();
      lineItem.costCodeId = '123e4567-e89b-12d3-a456-426614174001';

      expect(lineItem.costCodeId).toBe('123e4567-e89b-12d3-a456-426614174001');
    });

    it('should maintain separate budget and cost code IDs', () => {
      const lineItem = new BudgetLineItem();
      lineItem.budgetId = '123e4567-e89b-12d3-a456-426614174000';
      lineItem.costCodeId = '123e4567-e89b-12d3-a456-426614174001';

      expect(lineItem.budgetId).not.toBe(lineItem.costCodeId);
      expect(lineItem.budgetId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(lineItem.costCodeId).toBe('123e4567-e89b-12d3-a456-426614174001');
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt properties', () => {
      const lineItem = new BudgetLineItem();
      lineItem.budgetId = '123e4567-e89b-12d3-a456-426614174000';
      lineItem.costCodeId = '123e4567-e89b-12d3-a456-426614174001';
      lineItem.category = BudgetCategory.LABOR;
      lineItem.budgetedCost = 5000.0;
      lineItem.createdAt = new Date();
      lineItem.updatedAt = new Date();

      expect(lineItem.createdAt).toBeInstanceOf(Date);
      expect(lineItem.updatedAt).toBeInstanceOf(Date);
    });

    it('should not throw when accessing timestamp properties', () => {
      const lineItem = new BudgetLineItem();

      expect(() => lineItem.createdAt).not.toThrow();
      expect(() => lineItem.updatedAt).not.toThrow();
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data types for all fields', () => {
      const lineItem = new BudgetLineItem();
      lineItem.id = '123e4567-e89b-12d3-a456-426614174000';
      lineItem.budgetId = '123e4567-e89b-12d3-a456-426614174001';
      lineItem.costCodeId = '123e4567-e89b-12d3-a456-426614174002';
      lineItem.category = BudgetCategory.LABOR;
      lineItem.description = 'Test item';
      lineItem.quantity = 100;
      lineItem.unitCost = 50.25;
      lineItem.budgetedCost = 5025.0;
      lineItem.createdAt = new Date();
      lineItem.updatedAt = new Date();

      expect(typeof lineItem.id).toBe('string');
      expect(typeof lineItem.budgetId).toBe('string');
      expect(typeof lineItem.costCodeId).toBe('string');
      expect(typeof lineItem.category).toBe('string');
      expect(typeof lineItem.description).toBe('string');
      expect(typeof lineItem.quantity).toBe('number');
      expect(typeof lineItem.unitCost).toBe('number');
      expect(typeof lineItem.budgetedCost).toBe('number');
      expect(lineItem.createdAt).toBeInstanceOf(Date);
      expect(lineItem.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle all required properties', () => {
      const lineItem = new BudgetLineItem();
      lineItem.id = '123e4567-e89b-12d3-a456-426614174000';
      lineItem.budgetId = '123e4567-e89b-12d3-a456-426614174001';
      lineItem.costCodeId = '123e4567-e89b-12d3-a456-426614174002';
      lineItem.category = BudgetCategory.LABOR;
      lineItem.budgetedCost = 5000.0;
      lineItem.createdAt = new Date();
      lineItem.updatedAt = new Date();

      expect(lineItem.id).toBeDefined();
      expect(lineItem.budgetId).toBeDefined();
      expect(lineItem.costCodeId).toBeDefined();
      expect(lineItem.category).toBeDefined();
      expect(lineItem.budgetedCost).toBeDefined();
      expect(lineItem.createdAt).toBeDefined();
      expect(lineItem.updatedAt).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty description string', () => {
      const lineItem = new BudgetLineItem();
      lineItem.description = '';

      expect(lineItem.description).toBe('');
    });

    it('should handle very small decimal amounts', () => {
      const lineItem = new BudgetLineItem();
      lineItem.budgetedCost = 0.01;
      lineItem.unitCost = 0.0001;
      lineItem.quantity = 0.0001;

      expect(lineItem.budgetedCost).toBe(0.01);
      expect(lineItem.unitCost).toBe(0.0001);
      expect(lineItem.quantity).toBe(0.0001);
    });

    it('should handle line items for different categories', () => {
      const categories = [
        BudgetCategory.LABOR,
        BudgetCategory.MATERIAL,
        BudgetCategory.EQUIPMENT,
        BudgetCategory.SUBCONTRACT,
        BudgetCategory.OTHER,
      ];

      categories.forEach((category) => {
        const lineItem = new BudgetLineItem();
        lineItem.category = category;
        lineItem.budgetedCost = 1000.0;

        expect(lineItem.category).toBe(category);
      });
    });
  });

  describe('Line Item Calculations', () => {
    it('should allow manual calculation of budgeted cost', () => {
      const lineItem = new BudgetLineItem();
      lineItem.quantity = 50;
      lineItem.unitCost = 100.5;
      lineItem.budgetedCost = lineItem.quantity * lineItem.unitCost;

      expect(lineItem.budgetedCost).toBe(5025.0);
    });

    it('should handle fractional quantities and costs', () => {
      const lineItem = new BudgetLineItem();
      lineItem.quantity = 12.5;
      lineItem.unitCost = 8.5;
      lineItem.budgetedCost = lineItem.quantity * lineItem.unitCost;

      expect(lineItem.budgetedCost).toBe(106.25);
    });

    it('should allow updating budgeted cost independently', () => {
      const lineItem = new BudgetLineItem();
      lineItem.quantity = 100;
      lineItem.unitCost = 50;
      lineItem.budgetedCost = 6000.0;

      expect(lineItem.budgetedCost).not.toBe(lineItem.quantity * lineItem.unitCost);
      expect(lineItem.budgetedCost).toBe(6000.0);
    });
  });

  describe('Multiple Line Items', () => {
    it('should allow multiple line items for same budget', () => {
      const budgetId = '123e4567-e89b-12d3-a456-426614174000';

      const laborItem = new BudgetLineItem();
      laborItem.id = '123e4567-e89b-12d3-a456-426614174010';
      laborItem.budgetId = budgetId;
      laborItem.costCodeId = '123e4567-e89b-12d3-a456-426614174001';
      laborItem.category = BudgetCategory.LABOR;
      laborItem.budgetedCost = 5000.0;

      const materialItem = new BudgetLineItem();
      materialItem.id = '123e4567-e89b-12d3-a456-426614174011';
      materialItem.budgetId = budgetId;
      materialItem.costCodeId = '123e4567-e89b-12d3-a456-426614174002';
      materialItem.category = BudgetCategory.MATERIAL;
      materialItem.budgetedCost = 3000.0;

      expect(laborItem.budgetId).toBe(materialItem.budgetId);
      expect(laborItem.id).not.toBe(materialItem.id);
      expect(laborItem.category).not.toBe(materialItem.category);
    });

    it('should allow summing line items', () => {
      const lineItem1 = new BudgetLineItem();
      lineItem1.budgetedCost = 5000.0;

      const lineItem2 = new BudgetLineItem();
      lineItem2.budgetedCost = 3000.0;

      const lineItem3 = new BudgetLineItem();
      lineItem3.budgetedCost = 2000.0;

      const total =
        lineItem1.budgetedCost +
        lineItem2.budgetedCost +
        lineItem3.budgetedCost;

      expect(total).toBe(10000.0);
    });
  });
});
