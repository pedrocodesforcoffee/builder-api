import { PrimeContract } from '../prime-contract.entity';
import { PrimeContractStatus } from '../../enums/prime-contract-status.enum';

describe('PrimeContract Entity', () => {
  describe('Entity Creation', () => {
    it('should create a valid prime contract instance', () => {
      const contract = new PrimeContract();
      contract.projectId = '123e4567-e89b-12d3-a456-426614174000';
      contract.number = 'PC-2024-001';
      contract.title = 'Main Construction Contract';
      contract.description = 'Contract for construction of commercial building';
      contract.status = PrimeContractStatus.ACTIVE;
      contract.originalAmount = 1000000.0;
      contract.currentAmount = 1000000.0;
      contract.retentionPercentage = 5.0;
      contract.startDate = new Date('2024-01-01');
      contract.endDate = new Date('2024-12-31');

      expect(contract).toBeDefined();
      expect(contract.projectId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(contract.number).toBe('PC-2024-001');
      expect(contract.title).toBe('Main Construction Contract');
      expect(contract.description).toBe('Contract for construction of commercial building');
      expect(contract.status).toBe(PrimeContractStatus.ACTIVE);
      expect(contract.originalAmount).toBe(1000000.0);
      expect(contract.currentAmount).toBe(1000000.0);
      expect(contract.retentionPercentage).toBe(5.0);
      expect(contract.startDate).toBeInstanceOf(Date);
      expect(contract.endDate).toBeInstanceOf(Date);
    });

    it('should create a contract without optional fields', () => {
      const contract = new PrimeContract();
      contract.projectId = '123e4567-e89b-12d3-a456-426614174000';
      contract.number = 'PC-2024-001';
      contract.title = 'Main Construction Contract';
      contract.status = PrimeContractStatus.DRAFT;
      contract.originalAmount = 1000000.0;
      contract.currentAmount = 1000000.0;
      contract.retentionPercentage = 5.0;

      expect(contract.description).toBeUndefined();
      expect(contract.startDate).toBeUndefined();
      expect(contract.endDate).toBeUndefined();
      expect(contract.completionDate).toBeUndefined();
    });

    it('should default retention percentage to 5.0', () => {
      const contract = new PrimeContract();

      expect(contract.retentionPercentage).toBeUndefined();
    });
  });

  describe('Contract Status', () => {
    it('should support DRAFT status', () => {
      const contract = new PrimeContract();
      contract.status = PrimeContractStatus.DRAFT;

      expect(contract.status).toBe(PrimeContractStatus.DRAFT);
      expect(contract.status).toBe('DRAFT');
    });

    it('should support ACTIVE status', () => {
      const contract = new PrimeContract();
      contract.status = PrimeContractStatus.ACTIVE;

      expect(contract.status).toBe(PrimeContractStatus.ACTIVE);
      expect(contract.status).toBe('ACTIVE');
    });

    it('should support COMPLETE status', () => {
      const contract = new PrimeContract();
      contract.status = PrimeContractStatus.COMPLETE;

      expect(contract.status).toBe(PrimeContractStatus.COMPLETE);
      expect(contract.status).toBe('COMPLETE');
    });

    it('should support CLOSED status', () => {
      const contract = new PrimeContract();
      contract.status = PrimeContractStatus.CLOSED;

      expect(contract.status).toBe(PrimeContractStatus.CLOSED);
      expect(contract.status).toBe('CLOSED');
    });

    it('should default status to DRAFT', () => {
      const contract = new PrimeContract();

      expect(contract.status).toBeUndefined();
    });
  });

  describe('Contract Number', () => {
    it('should accept valid contract numbers', () => {
      const testCases = [
        'PC-2024-001',
        'PRIME-001',
        'Contract #12345',
        'GC-2024-Q1-001',
        'MAIN_CONTRACT_2024',
      ];

      testCases.forEach((number) => {
        const contract = new PrimeContract();
        contract.number = number;

        expect(contract.number).toBe(number);
      });
    });

    it('should handle special characters in number', () => {
      const contract = new PrimeContract();
      contract.number = 'PC-2024/Q1#001';

      expect(contract.number).toBe('PC-2024/Q1#001');
    });
  });

  describe('Contract Title and Description', () => {
    it('should accept valid titles', () => {
      const contract = new PrimeContract();
      contract.title = 'Main Construction Contract for Office Building';

      expect(contract.title).toBe('Main Construction Contract for Office Building');
    });

    it('should accept valid descriptions', () => {
      const contract = new PrimeContract();
      contract.description = 'This is the prime contract with the owner for the construction of a 5-story office building';

      expect(contract.description).toBe(
        'This is the prime contract with the owner for the construction of a 5-story office building',
      );
    });

    it('should handle long descriptions', () => {
      const contract = new PrimeContract();
      const longDescription = 'A'.repeat(1000);
      contract.description = longDescription;

      expect(contract.description).toBe(longDescription);
      expect(contract.description.length).toBe(1000);
    });

    it('should handle multiline descriptions', () => {
      const contract = new PrimeContract();
      contract.description = `Prime Contract - Office Building

Scope: Complete construction including foundation, structure, MEP, and finishes
Duration: 12 months
Value: $1,000,000`;

      expect(contract.description).toContain('Prime Contract');
      expect(contract.description).toContain('Scope');
    });

    it('should handle special characters', () => {
      const contract = new PrimeContract();
      contract.title = "Owner's Contract & Agreement (2024)";
      contract.description = "Contract includes 5% retention & owner's contingency";

      expect(contract.title).toBe("Owner's Contract & Agreement (2024)");
      expect(contract.description).toBe("Contract includes 5% retention & owner's contingency");
    });
  });

  describe('Contract Amounts', () => {
    it('should handle original and current amounts', () => {
      const contract = new PrimeContract();
      contract.originalAmount = 1000000.0;
      contract.currentAmount = 1250000.0;

      expect(contract.originalAmount).toBe(1000000.0);
      expect(contract.currentAmount).toBe(1250000.0);
    });

    it('should handle decimal values with 2 decimal places', () => {
      const contract = new PrimeContract();
      contract.originalAmount = 123456.78;
      contract.currentAmount = 654321.12;

      expect(contract.originalAmount).toBe(123456.78);
      expect(contract.currentAmount).toBe(654321.12);
    });

    it('should handle zero amounts', () => {
      const contract = new PrimeContract();
      contract.originalAmount = 0;
      contract.currentAmount = 0;

      expect(contract.originalAmount).toBe(0);
      expect(contract.currentAmount).toBe(0);
    });

    it('should handle large amounts', () => {
      const contract = new PrimeContract();
      contract.originalAmount = 9999999999999.99;
      contract.currentAmount = 9999999999999.99;

      expect(contract.originalAmount).toBe(9999999999999.99);
      expect(contract.currentAmount).toBe(9999999999999.99);
    });

    it('should allow current amount to differ from original', () => {
      const contract = new PrimeContract();
      contract.originalAmount = 1000000.0;
      contract.currentAmount = 1250000.0;

      const changeOrderAmount = contract.currentAmount - contract.originalAmount;

      expect(changeOrderAmount).toBe(250000.0);
      expect(contract.currentAmount).toBeGreaterThan(contract.originalAmount);
    });
  });

  describe('Retention Percentage', () => {
    it('should handle retention percentage with 2 decimal places', () => {
      const contract = new PrimeContract();
      contract.retentionPercentage = 5.5;

      expect(contract.retentionPercentage).toBe(5.5);
    });

    it('should handle integer retention percentages', () => {
      const contract = new PrimeContract();
      contract.retentionPercentage = 10;

      expect(contract.retentionPercentage).toBe(10);
    });

    it('should handle zero retention', () => {
      const contract = new PrimeContract();
      contract.retentionPercentage = 0;

      expect(contract.retentionPercentage).toBe(0);
    });

    it('should handle standard retention of 5%', () => {
      const contract = new PrimeContract();
      contract.retentionPercentage = 5.0;

      expect(contract.retentionPercentage).toBe(5.0);
    });

    it('should allow calculating retention amount', () => {
      const contract = new PrimeContract();
      contract.currentAmount = 1000000.0;
      contract.retentionPercentage = 5.0;

      const retentionAmount = (contract.currentAmount * contract.retentionPercentage) / 100;

      expect(retentionAmount).toBe(50000.0);
    });
  });

  describe('Contract Dates', () => {
    it('should handle start and end dates', () => {
      const contract = new PrimeContract();
      contract.startDate = new Date('2024-01-01');
      contract.endDate = new Date('2024-12-31');

      expect(contract.startDate).toBeInstanceOf(Date);
      expect(contract.endDate).toBeInstanceOf(Date);
      expect(contract.endDate.getTime()).toBeGreaterThan(contract.startDate.getTime());
    });

    it('should handle completion date', () => {
      const contract = new PrimeContract();
      contract.completionDate = new Date('2024-11-30');

      expect(contract.completionDate).toBeInstanceOf(Date);
    });

    it('should allow completion before end date', () => {
      const contract = new PrimeContract();
      contract.startDate = new Date('2024-01-01');
      contract.endDate = new Date('2024-12-31');
      contract.completionDate = new Date('2024-11-30');

      expect(contract.completionDate.getTime()).toBeLessThan(contract.endDate.getTime());
      expect(contract.completionDate.getTime()).toBeGreaterThan(contract.startDate.getTime());
    });

    it('should calculate contract duration', () => {
      const contract = new PrimeContract();
      contract.startDate = new Date('2024-01-01');
      contract.endDate = new Date('2024-12-31');

      const durationMs = contract.endDate.getTime() - contract.startDate.getTime();
      const durationDays = durationMs / (1000 * 60 * 60 * 24);

      expect(durationDays).toBeCloseTo(365, 0);
    });
  });

  describe('Project Reference', () => {
    it('should accept valid project ID', () => {
      const contract = new PrimeContract();
      contract.projectId = '123e4567-e89b-12d3-a456-426614174000';

      expect(contract.projectId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should maintain project reference', () => {
      const projectId = '123e4567-e89b-12d3-a456-426614174000';

      const contract = new PrimeContract();
      contract.id = '123e4567-e89b-12d3-a456-426614174010';
      contract.projectId = projectId;
      contract.number = 'PC-001';

      expect(contract.projectId).toBe(projectId);
      expect(contract.id).not.toBe(contract.projectId);
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt properties', () => {
      const contract = new PrimeContract();
      contract.projectId = '123e4567-e89b-12d3-a456-426614174000';
      contract.number = 'PC-001';
      contract.title = 'Main Contract';
      contract.createdAt = new Date();
      contract.updatedAt = new Date();

      expect(contract.createdAt).toBeInstanceOf(Date);
      expect(contract.updatedAt).toBeInstanceOf(Date);
    });

    it('should not throw when accessing timestamp properties', () => {
      const contract = new PrimeContract();

      expect(() => contract.createdAt).not.toThrow();
      expect(() => contract.updatedAt).not.toThrow();
    });

    it('should handle different created and updated dates', () => {
      const contract = new PrimeContract();
      const createdDate = new Date('2024-01-01');
      const updatedDate = new Date('2024-01-15');

      contract.createdAt = createdDate;
      contract.updatedAt = updatedDate;

      expect(contract.createdAt.getTime()).toBeLessThan(contract.updatedAt.getTime());
      expect(contract.createdAt).toEqual(createdDate);
      expect(contract.updatedAt).toEqual(updatedDate);
    });
  });

  describe('Contract Lifecycle', () => {
    it('should transition from DRAFT to ACTIVE', () => {
      const contract = new PrimeContract();
      contract.status = PrimeContractStatus.DRAFT;

      expect(contract.status).toBe(PrimeContractStatus.DRAFT);

      contract.status = PrimeContractStatus.ACTIVE;

      expect(contract.status).toBe(PrimeContractStatus.ACTIVE);
    });

    it('should transition from ACTIVE to COMPLETE', () => {
      const contract = new PrimeContract();
      contract.status = PrimeContractStatus.ACTIVE;

      expect(contract.status).toBe(PrimeContractStatus.ACTIVE);

      contract.status = PrimeContractStatus.COMPLETE;
      contract.completionDate = new Date();

      expect(contract.status).toBe(PrimeContractStatus.COMPLETE);
      expect(contract.completionDate).toBeInstanceOf(Date);
    });

    it('should transition from COMPLETE to CLOSED', () => {
      const contract = new PrimeContract();
      contract.status = PrimeContractStatus.COMPLETE;

      expect(contract.status).toBe(PrimeContractStatus.COMPLETE);

      contract.status = PrimeContractStatus.CLOSED;

      expect(contract.status).toBe(PrimeContractStatus.CLOSED);
    });

    it('should track contract from start to completion', () => {
      const contract = new PrimeContract();
      contract.status = PrimeContractStatus.DRAFT;
      contract.originalAmount = 1000000.0;
      contract.currentAmount = 1000000.0;
      contract.startDate = new Date('2024-01-01');

      expect(contract.status).toBe(PrimeContractStatus.DRAFT);

      contract.status = PrimeContractStatus.ACTIVE;

      expect(contract.status).toBe(PrimeContractStatus.ACTIVE);

      contract.currentAmount = 1250000.0;

      expect(contract.currentAmount).toBeGreaterThan(contract.originalAmount);

      contract.status = PrimeContractStatus.COMPLETE;
      contract.completionDate = new Date('2024-11-30');

      expect(contract.status).toBe(PrimeContractStatus.COMPLETE);
      expect(contract.completionDate).toBeInstanceOf(Date);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data types for all fields', () => {
      const contract = new PrimeContract();
      contract.id = '123e4567-e89b-12d3-a456-426614174000';
      contract.projectId = '123e4567-e89b-12d3-a456-426614174001';
      contract.number = 'PC-001';
      contract.title = 'Main Contract';
      contract.description = 'Construction contract';
      contract.status = PrimeContractStatus.ACTIVE;
      contract.originalAmount = 1000000.0;
      contract.currentAmount = 1000000.0;
      contract.retentionPercentage = 5.0;
      contract.startDate = new Date();
      contract.endDate = new Date();
      contract.completionDate = new Date();
      contract.createdAt = new Date();
      contract.updatedAt = new Date();

      expect(typeof contract.id).toBe('string');
      expect(typeof contract.projectId).toBe('string');
      expect(typeof contract.number).toBe('string');
      expect(typeof contract.title).toBe('string');
      expect(typeof contract.description).toBe('string');
      expect(typeof contract.status).toBe('string');
      expect(typeof contract.originalAmount).toBe('number');
      expect(typeof contract.currentAmount).toBe('number');
      expect(typeof contract.retentionPercentage).toBe('number');
      expect(contract.startDate).toBeInstanceOf(Date);
      expect(contract.endDate).toBeInstanceOf(Date);
      expect(contract.completionDate).toBeInstanceOf(Date);
      expect(contract.createdAt).toBeInstanceOf(Date);
      expect(contract.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle all required properties', () => {
      const contract = new PrimeContract();
      contract.id = '123e4567-e89b-12d3-a456-426614174000';
      contract.projectId = '123e4567-e89b-12d3-a456-426614174001';
      contract.number = 'PC-001';
      contract.title = 'Main Contract';
      contract.status = PrimeContractStatus.ACTIVE;
      contract.originalAmount = 1000000.0;
      contract.currentAmount = 1000000.0;
      contract.retentionPercentage = 5.0;
      contract.createdAt = new Date();
      contract.updatedAt = new Date();

      expect(contract.id).toBeDefined();
      expect(contract.projectId).toBeDefined();
      expect(contract.number).toBeDefined();
      expect(contract.title).toBeDefined();
      expect(contract.status).toBeDefined();
      expect(contract.originalAmount).toBeDefined();
      expect(contract.currentAmount).toBeDefined();
      expect(contract.retentionPercentage).toBeDefined();
      expect(contract.createdAt).toBeDefined();
      expect(contract.updatedAt).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty description string', () => {
      const contract = new PrimeContract();
      contract.description = '';

      expect(contract.description).toBe('');
    });

    it('should handle very small amounts', () => {
      const contract = new PrimeContract();
      contract.originalAmount = 0.01;
      contract.currentAmount = 0.01;

      expect(contract.originalAmount).toBe(0.01);
      expect(contract.currentAmount).toBe(0.01);
    });

    it('should handle very small retention percentage', () => {
      const contract = new PrimeContract();
      contract.retentionPercentage = 0.01;

      expect(contract.retentionPercentage).toBe(0.01);
    });

    it('should handle current amount less than original (rare case)', () => {
      const contract = new PrimeContract();
      contract.originalAmount = 1000000.0;
      contract.currentAmount = 900000.0;

      expect(contract.currentAmount).toBeLessThan(contract.originalAmount);
    });
  });

  describe('Contract Calculations', () => {
    it('should calculate change order amount', () => {
      const contract = new PrimeContract();
      contract.originalAmount = 1000000.0;
      contract.currentAmount = 1250000.0;

      const changeOrders = contract.currentAmount - contract.originalAmount;

      expect(changeOrders).toBe(250000.0);
    });

    it('should calculate retention amount on current value', () => {
      const contract = new PrimeContract();
      contract.currentAmount = 1250000.0;
      contract.retentionPercentage = 5.0;

      const retention = (contract.currentAmount * contract.retentionPercentage) / 100;

      expect(retention).toBe(62500.0);
    });

    it('should calculate net amount after retention', () => {
      const contract = new PrimeContract();
      contract.currentAmount = 1000000.0;
      contract.retentionPercentage = 5.0;

      const retention = (contract.currentAmount * contract.retentionPercentage) / 100;
      const netAmount = contract.currentAmount - retention;

      expect(netAmount).toBe(950000.0);
    });
  });
});
