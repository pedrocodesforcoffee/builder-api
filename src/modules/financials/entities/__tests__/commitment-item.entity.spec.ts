import { CommitmentItem } from '../commitment-item.entity';
import { BudgetCategory } from '../../enums/budget-category.enum';

describe('CommitmentItem Entity', () => {
  describe('Entity Creation', () => {
    it('should create a valid commitment item instance', () => {
      const item = new CommitmentItem();
      item.commitmentId = '123e4567-e89b-12d3-a456-426614174000';
      item.costCodeId = '123e4567-e89b-12d3-a456-426614174001';
      item.category = BudgetCategory.LABOR;
      item.description = 'Electrical installation labor';
      item.quantity = 100;
      item.unitCost = 50.25;
      item.amount = 5025.0;

      expect(item).toBeDefined();
      expect(item.commitmentId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(item.costCodeId).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(item.category).toBe(BudgetCategory.LABOR);
      expect(item.description).toBe('Electrical installation labor');
      expect(item.quantity).toBe(100);
      expect(item.unitCost).toBe(50.25);
      expect(item.amount).toBe(5025.0);
    });

    it('should create an item without optional fields', () => {
      const item = new CommitmentItem();
      item.commitmentId = '123e4567-e89b-12d3-a456-426614174000';
      item.costCodeId = '123e4567-e89b-12d3-a456-426614174001';
      item.category = BudgetCategory.MATERIAL;
      item.amount = 10000.0;

      expect(item.description).toBeUndefined();
      expect(item.quantity).toBeUndefined();
      expect(item.unitCost).toBeUndefined();
      expect(item.amount).toBe(10000.0);
    });
  });

  describe('Budget Category', () => {
    it('should support LABOR category', () => {
      const item = new CommitmentItem();
      item.category = BudgetCategory.LABOR;

      expect(item.category).toBe(BudgetCategory.LABOR);
      expect(item.category).toBe('LABOR');
    });

    it('should support MATERIAL category', () => {
      const item = new CommitmentItem();
      item.category = BudgetCategory.MATERIAL;

      expect(item.category).toBe(BudgetCategory.MATERIAL);
      expect(item.category).toBe('MATERIAL');
    });

    it('should support EQUIPMENT category', () => {
      const item = new CommitmentItem();
      item.category = BudgetCategory.EQUIPMENT;

      expect(item.category).toBe(BudgetCategory.EQUIPMENT);
      expect(item.category).toBe('EQUIPMENT');
    });

    it('should support SUBCONTRACT category', () => {
      const item = new CommitmentItem();
      item.category = BudgetCategory.SUBCONTRACT;

      expect(item.category).toBe(BudgetCategory.SUBCONTRACT);
      expect(item.category).toBe('SUBCONTRACT');
    });

    it('should support OTHER category', () => {
      const item = new CommitmentItem();
      item.category = BudgetCategory.OTHER;

      expect(item.category).toBe(BudgetCategory.OTHER);
      expect(item.category).toBe('OTHER');
    });
  });

  describe('Description', () => {
    it('should accept valid descriptions', () => {
      const item = new CommitmentItem();
      item.description = 'Labor for electrical panel installation';

      expect(item.description).toBe('Labor for electrical panel installation');
    });

    it('should handle long descriptions', () => {
      const item = new CommitmentItem();
      const longDescription = 'A'.repeat(1000);
      item.description = longDescription;

      expect(item.description).toBe(longDescription);
      expect(item.description.length).toBe(1000);
    });

    it('should handle special characters in description', () => {
      const item = new CommitmentItem();
      item.description = "Labor & materials for owner's electrical upgrades";

      expect(item.description).toBe("Labor & materials for owner's electrical upgrades");
    });
  });

  describe('Quantity and Unit Cost', () => {
    it('should handle quantity with up to 4 decimal places', () => {
      const item = new CommitmentItem();
      item.quantity = 123.4567;

      expect(item.quantity).toBe(123.4567);
    });

    it('should handle unit cost with up to 4 decimal places', () => {
      const item = new CommitmentItem();
      item.unitCost = 45.6789;

      expect(item.unitCost).toBe(45.6789);
    });

    it('should handle integer quantities', () => {
      const item = new CommitmentItem();
      item.quantity = 100;

      expect(item.quantity).toBe(100);
    });

    it('should handle integer unit costs', () => {
      const item = new CommitmentItem();
      item.unitCost = 50;

      expect(item.unitCost).toBe(50);
    });

    it('should handle zero quantity', () => {
      const item = new CommitmentItem();
      item.quantity = 0;

      expect(item.quantity).toBe(0);
    });

    it('should handle zero unit cost', () => {
      const item = new CommitmentItem();
      item.unitCost = 0;

      expect(item.unitCost).toBe(0);
    });

    it('should calculate amount from quantity and unit cost', () => {
      const item = new CommitmentItem();
      item.quantity = 100;
      item.unitCost = 50.25;
      item.amount = item.quantity * item.unitCost;

      expect(item.amount).toBe(5025.0);
    });
  });

  describe('Amount', () => {
    it('should handle decimal values with 2 decimal places', () => {
      const item = new CommitmentItem();
      item.amount = 123456.78;

      expect(item.amount).toBe(123456.78);
    });

    it('should handle zero amount', () => {
      const item = new CommitmentItem();
      item.amount = 0;

      expect(item.amount).toBe(0);
    });

    it('should handle large amounts', () => {
      const item = new CommitmentItem();
      item.amount = 9999999999999.99;

      expect(item.amount).toBe(9999999999999.99);
    });

    it('should handle amount with cents', () => {
      const item = new CommitmentItem();
      item.amount = 1000.01;

      expect(item.amount).toBe(1000.01);
    });
  });

  describe('Commitment and Cost Code References', () => {
    it('should accept valid commitment ID', () => {
      const item = new CommitmentItem();
      item.commitmentId = '123e4567-e89b-12d3-a456-426614174000';

      expect(item.commitmentId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should accept valid cost code ID', () => {
      const item = new CommitmentItem();
      item.costCodeId = '123e4567-e89b-12d3-a456-426614174001';

      expect(item.costCodeId).toBe('123e4567-e89b-12d3-a456-426614174001');
    });

    it('should maintain separate commitment and cost code IDs', () => {
      const item = new CommitmentItem();
      item.commitmentId = '123e4567-e89b-12d3-a456-426614174000';
      item.costCodeId = '123e4567-e89b-12d3-a456-426614174001';

      expect(item.commitmentId).not.toBe(item.costCodeId);
      expect(item.commitmentId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(item.costCodeId).toBe('123e4567-e89b-12d3-a456-426614174001');
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt properties', () => {
      const item = new CommitmentItem();
      item.commitmentId = '123e4567-e89b-12d3-a456-426614174000';
      item.costCodeId = '123e4567-e89b-12d3-a456-426614174001';
      item.category = BudgetCategory.LABOR;
      item.amount = 5000.0;
      item.createdAt = new Date();
      item.updatedAt = new Date();

      expect(item.createdAt).toBeInstanceOf(Date);
      expect(item.updatedAt).toBeInstanceOf(Date);
    });

    it('should not throw when accessing timestamp properties', () => {
      const item = new CommitmentItem();

      expect(() => item.createdAt).not.toThrow();
      expect(() => item.updatedAt).not.toThrow();
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data types for all fields', () => {
      const item = new CommitmentItem();
      item.id = '123e4567-e89b-12d3-a456-426614174000';
      item.commitmentId = '123e4567-e89b-12d3-a456-426614174001';
      item.costCodeId = '123e4567-e89b-12d3-a456-426614174002';
      item.category = BudgetCategory.LABOR;
      item.description = 'Test item';
      item.quantity = 100;
      item.unitCost = 50.25;
      item.amount = 5025.0;
      item.createdAt = new Date();
      item.updatedAt = new Date();

      expect(typeof item.id).toBe('string');
      expect(typeof item.commitmentId).toBe('string');
      expect(typeof item.costCodeId).toBe('string');
      expect(typeof item.category).toBe('string');
      expect(typeof item.description).toBe('string');
      expect(typeof item.quantity).toBe('number');
      expect(typeof item.unitCost).toBe('number');
      expect(typeof item.amount).toBe('number');
      expect(item.createdAt).toBeInstanceOf(Date);
      expect(item.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle all required properties', () => {
      const item = new CommitmentItem();
      item.id = '123e4567-e89b-12d3-a456-426614174000';
      item.commitmentId = '123e4567-e89b-12d3-a456-426614174001';
      item.costCodeId = '123e4567-e89b-12d3-a456-426614174002';
      item.category = BudgetCategory.LABOR;
      item.amount = 5000.0;
      item.createdAt = new Date();
      item.updatedAt = new Date();

      expect(item.id).toBeDefined();
      expect(item.commitmentId).toBeDefined();
      expect(item.costCodeId).toBeDefined();
      expect(item.category).toBeDefined();
      expect(item.amount).toBeDefined();
      expect(item.createdAt).toBeDefined();
      expect(item.updatedAt).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty description string', () => {
      const item = new CommitmentItem();
      item.description = '';

      expect(item.description).toBe('');
    });

    it('should handle very small decimal amounts', () => {
      const item = new CommitmentItem();
      item.amount = 0.01;
      item.unitCost = 0.0001;
      item.quantity = 0.0001;

      expect(item.amount).toBe(0.01);
      expect(item.unitCost).toBe(0.0001);
      expect(item.quantity).toBe(0.0001);
    });

    it('should handle items for different categories', () => {
      const categories = [
        BudgetCategory.LABOR,
        BudgetCategory.MATERIAL,
        BudgetCategory.EQUIPMENT,
        BudgetCategory.SUBCONTRACT,
        BudgetCategory.OTHER,
      ];

      categories.forEach((category) => {
        const item = new CommitmentItem();
        item.category = category;
        item.amount = 1000.0;

        expect(item.category).toBe(category);
      });
    });
  });

  describe('Item Calculations', () => {
    it('should allow manual calculation of amount', () => {
      const item = new CommitmentItem();
      item.quantity = 50;
      item.unitCost = 100.5;
      item.amount = item.quantity * item.unitCost;

      expect(item.amount).toBe(5025.0);
    });

    it('should handle fractional quantities and costs', () => {
      const item = new CommitmentItem();
      item.quantity = 12.5;
      item.unitCost = 8.5;
      item.amount = item.quantity * item.unitCost;

      expect(item.amount).toBe(106.25);
    });

    it('should allow updating amount independently', () => {
      const item = new CommitmentItem();
      item.quantity = 100;
      item.unitCost = 50;
      item.amount = 6000.0;

      expect(item.amount).not.toBe(item.quantity * item.unitCost);
      expect(item.amount).toBe(6000.0);
    });
  });

  describe('Multiple Items', () => {
    it('should allow multiple items for same commitment', () => {
      const commitmentId = '123e4567-e89b-12d3-a456-426614174000';

      const laborItem = new CommitmentItem();
      laborItem.id = '123e4567-e89b-12d3-a456-426614174010';
      laborItem.commitmentId = commitmentId;
      laborItem.costCodeId = '123e4567-e89b-12d3-a456-426614174001';
      laborItem.category = BudgetCategory.LABOR;
      laborItem.amount = 5000.0;

      const materialItem = new CommitmentItem();
      materialItem.id = '123e4567-e89b-12d3-a456-426614174011';
      materialItem.commitmentId = commitmentId;
      materialItem.costCodeId = '123e4567-e89b-12d3-a456-426614174002';
      materialItem.category = BudgetCategory.MATERIAL;
      materialItem.amount = 3000.0;

      expect(laborItem.commitmentId).toBe(materialItem.commitmentId);
      expect(laborItem.id).not.toBe(materialItem.id);
      expect(laborItem.category).not.toBe(materialItem.category);
    });

    it('should allow summing items', () => {
      const item1 = new CommitmentItem();
      item1.amount = 5000.0;

      const item2 = new CommitmentItem();
      item2.amount = 3000.0;

      const item3 = new CommitmentItem();
      item3.amount = 2000.0;

      const total = item1.amount + item2.amount + item3.amount;

      expect(total).toBe(10000.0);
    });
  });

  describe('Commitment Item Types', () => {
    it('should create labor item for subcontract', () => {
      const item = new CommitmentItem();
      item.category = BudgetCategory.LABOR;
      item.description = 'Electrician labor for panel installation';
      item.quantity = 40;
      item.unitCost = 75.5;
      item.amount = item.quantity * item.unitCost;

      expect(item.category).toBe(BudgetCategory.LABOR);
      expect(item.amount).toBe(3020.0);
    });

    it('should create material item for purchase order', () => {
      const item = new CommitmentItem();
      item.category = BudgetCategory.MATERIAL;
      item.description = 'Electrical wire - 500 feet';
      item.quantity = 500;
      item.unitCost = 2.5;
      item.amount = item.quantity * item.unitCost;

      expect(item.category).toBe(BudgetCategory.MATERIAL);
      expect(item.amount).toBe(1250.0);
    });

    it('should create equipment item', () => {
      const item = new CommitmentItem();
      item.category = BudgetCategory.EQUIPMENT;
      item.description = 'Scissor lift rental - 2 weeks';
      item.quantity = 2;
      item.unitCost = 850.0;
      item.amount = item.quantity * item.unitCost;

      expect(item.category).toBe(BudgetCategory.EQUIPMENT);
      expect(item.amount).toBe(1700.0);
    });

    it('should create subcontract item', () => {
      const item = new CommitmentItem();
      item.category = BudgetCategory.SUBCONTRACT;
      item.description = 'Electrical inspection services';
      item.amount = 500.0;

      expect(item.category).toBe(BudgetCategory.SUBCONTRACT);
      expect(item.amount).toBe(500.0);
    });

    it('should create other category item', () => {
      const item = new CommitmentItem();
      item.category = BudgetCategory.OTHER;
      item.description = 'Permit fees and miscellaneous costs';
      item.amount = 750.0;

      expect(item.category).toBe(BudgetCategory.OTHER);
      expect(item.amount).toBe(750.0);
    });
  });

  describe('Item Comparison', () => {
    it('should allow comparing items by amount', () => {
      const item1 = new CommitmentItem();
      item1.amount = 5000.0;

      const item2 = new CommitmentItem();
      item2.amount = 3000.0;

      expect(item1.amount).toBeGreaterThan(item2.amount);
      expect(item1.amount - item2.amount).toBe(2000.0);
    });

    it('should allow comparing items by category', () => {
      const laborItem = new CommitmentItem();
      laborItem.category = BudgetCategory.LABOR;

      const materialItem = new CommitmentItem();
      materialItem.category = BudgetCategory.MATERIAL;

      expect(laborItem.category).not.toBe(materialItem.category);
      expect(laborItem.category).toBe(BudgetCategory.LABOR);
      expect(materialItem.category).toBe(BudgetCategory.MATERIAL);
    });
  });

  describe('Complex Calculations', () => {
    it('should calculate unit cost from amount and quantity', () => {
      const item = new CommitmentItem();
      item.amount = 5000.0;
      item.quantity = 100;

      const calculatedUnitCost = item.amount / item.quantity;

      expect(calculatedUnitCost).toBe(50.0);
    });

    it('should handle markup calculations', () => {
      const item = new CommitmentItem();
      item.unitCost = 100.0;
      const markupPercent = 10;
      const markedUpUnitCost = item.unitCost * (1 + markupPercent / 100);

      expect(markedUpUnitCost).toBeCloseTo(110.0, 2);
    });

    it('should calculate percentage of total commitment', () => {
      const item1 = new CommitmentItem();
      item1.amount = 5000.0;

      const item2 = new CommitmentItem();
      item2.amount = 3000.0;

      const item3 = new CommitmentItem();
      item3.amount = 2000.0;

      const totalAmount = item1.amount + item2.amount + item3.amount;
      const item1Percentage = (item1.amount / totalAmount) * 100;

      expect(totalAmount).toBe(10000.0);
      expect(item1Percentage).toBe(50.0);
    });
  });
});
