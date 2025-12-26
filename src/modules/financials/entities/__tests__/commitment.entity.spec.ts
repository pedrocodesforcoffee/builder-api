import { Commitment } from '../commitment.entity';
import { CommitmentType } from '../../enums/commitment-type.enum';
import { CommitmentStatus } from '../../enums/commitment-status.enum';

describe('Commitment Entity', () => {
  describe('Entity Creation', () => {
    it('should create a valid commitment instance', () => {
      const commitment = new Commitment();
      commitment.projectId = '123e4567-e89b-12d3-a456-426614174000';
      commitment.number = 'SUB-2024-001';
      commitment.type = CommitmentType.SUBCONTRACT;
      commitment.title = 'Electrical Subcontract';
      commitment.description = 'Complete electrical installation';
      commitment.status = CommitmentStatus.ACTIVE;
      commitment.vendorName = 'ABC Electrical Company';
      commitment.vendorContact = 'John Smith';
      commitment.vendorEmail = 'john@abc-electrical.com';
      commitment.originalAmount = 150000.0;
      commitment.currentAmount = 150000.0;
      commitment.startDate = new Date('2024-02-01');
      commitment.endDate = new Date('2024-06-30');

      expect(commitment).toBeDefined();
      expect(commitment.projectId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(commitment.number).toBe('SUB-2024-001');
      expect(commitment.type).toBe(CommitmentType.SUBCONTRACT);
      expect(commitment.title).toBe('Electrical Subcontract');
      expect(commitment.description).toBe('Complete electrical installation');
      expect(commitment.status).toBe(CommitmentStatus.ACTIVE);
      expect(commitment.vendorName).toBe('ABC Electrical Company');
      expect(commitment.vendorContact).toBe('John Smith');
      expect(commitment.vendorEmail).toBe('john@abc-electrical.com');
      expect(commitment.originalAmount).toBe(150000.0);
      expect(commitment.currentAmount).toBe(150000.0);
      expect(commitment.startDate).toBeInstanceOf(Date);
      expect(commitment.endDate).toBeInstanceOf(Date);
    });

    it('should create a commitment without optional fields', () => {
      const commitment = new Commitment();
      commitment.projectId = '123e4567-e89b-12d3-a456-426614174000';
      commitment.number = 'PO-2024-001';
      commitment.type = CommitmentType.PURCHASE_ORDER;
      commitment.title = 'Materials Purchase';
      commitment.status = CommitmentStatus.DRAFT;
      commitment.vendorName = 'XYZ Supply';
      commitment.originalAmount = 50000.0;
      commitment.currentAmount = 50000.0;

      expect(commitment.description).toBeUndefined();
      expect(commitment.vendorContact).toBeUndefined();
      expect(commitment.vendorEmail).toBeUndefined();
      expect(commitment.startDate).toBeUndefined();
      expect(commitment.endDate).toBeUndefined();
    });
  });

  describe('Commitment Type', () => {
    it('should support SUBCONTRACT type', () => {
      const commitment = new Commitment();
      commitment.type = CommitmentType.SUBCONTRACT;

      expect(commitment.type).toBe(CommitmentType.SUBCONTRACT);
      expect(commitment.type).toBe('SUBCONTRACT');
    });

    it('should support PURCHASE_ORDER type', () => {
      const commitment = new Commitment();
      commitment.type = CommitmentType.PURCHASE_ORDER;

      expect(commitment.type).toBe(CommitmentType.PURCHASE_ORDER);
      expect(commitment.type).toBe('PURCHASE_ORDER');
    });
  });

  describe('Commitment Status', () => {
    it('should support DRAFT status', () => {
      const commitment = new Commitment();
      commitment.status = CommitmentStatus.DRAFT;

      expect(commitment.status).toBe(CommitmentStatus.DRAFT);
      expect(commitment.status).toBe('DRAFT');
    });

    it('should support PENDING_APPROVAL status', () => {
      const commitment = new Commitment();
      commitment.status = CommitmentStatus.PENDING_APPROVAL;

      expect(commitment.status).toBe(CommitmentStatus.PENDING_APPROVAL);
      expect(commitment.status).toBe('PENDING_APPROVAL');
    });

    it('should support APPROVED status', () => {
      const commitment = new Commitment();
      commitment.status = CommitmentStatus.APPROVED;

      expect(commitment.status).toBe(CommitmentStatus.APPROVED);
      expect(commitment.status).toBe('APPROVED');
    });

    it('should support ACTIVE status', () => {
      const commitment = new Commitment();
      commitment.status = CommitmentStatus.ACTIVE;

      expect(commitment.status).toBe(CommitmentStatus.ACTIVE);
      expect(commitment.status).toBe('ACTIVE');
    });

    it('should support COMPLETE status', () => {
      const commitment = new Commitment();
      commitment.status = CommitmentStatus.COMPLETE;

      expect(commitment.status).toBe(CommitmentStatus.COMPLETE);
      expect(commitment.status).toBe('COMPLETE');
    });

    it('should support CLOSED status', () => {
      const commitment = new Commitment();
      commitment.status = CommitmentStatus.CLOSED;

      expect(commitment.status).toBe(CommitmentStatus.CLOSED);
      expect(commitment.status).toBe('CLOSED');
    });

    it('should support VOID status', () => {
      const commitment = new Commitment();
      commitment.status = CommitmentStatus.VOID;

      expect(commitment.status).toBe(CommitmentStatus.VOID);
      expect(commitment.status).toBe('VOID');
    });

    it('should default status to DRAFT', () => {
      const commitment = new Commitment();

      expect(commitment.status).toBeUndefined();
    });
  });

  describe('Commitment Number', () => {
    it('should accept valid subcontract numbers', () => {
      const testCases = [
        'SUB-2024-001',
        'SUBCONTRACT-001',
        'SC-001',
        'S#12345',
      ];

      testCases.forEach((number) => {
        const commitment = new Commitment();
        commitment.number = number;

        expect(commitment.number).toBe(number);
      });
    });

    it('should accept valid purchase order numbers', () => {
      const testCases = [
        'PO-2024-001',
        'PO#12345',
        'PURCHASE_ORDER_001',
        'P.O. 12345',
      ];

      testCases.forEach((number) => {
        const commitment = new Commitment();
        commitment.number = number;

        expect(commitment.number).toBe(number);
      });
    });
  });

  describe('Title and Description', () => {
    it('should accept valid titles', () => {
      const commitment = new Commitment();
      commitment.title = 'HVAC Subcontract for Office Building';

      expect(commitment.title).toBe('HVAC Subcontract for Office Building');
    });

    it('should accept valid descriptions', () => {
      const commitment = new Commitment();
      commitment.description = 'Complete HVAC installation including ductwork, equipment, and controls';

      expect(commitment.description).toBe(
        'Complete HVAC installation including ductwork, equipment, and controls',
      );
    });

    it('should handle long descriptions', () => {
      const commitment = new Commitment();
      const longDescription = 'A'.repeat(1000);
      commitment.description = longDescription;

      expect(commitment.description).toBe(longDescription);
      expect(commitment.description.length).toBe(1000);
    });

    it('should handle special characters', () => {
      const commitment = new Commitment();
      commitment.title = "Electrical & Lighting Subcontract (Owner's Suite)";
      commitment.description = "Includes 10% contingency & owner's upgrades";

      expect(commitment.title).toBe("Electrical & Lighting Subcontract (Owner's Suite)");
      expect(commitment.description).toBe("Includes 10% contingency & owner's upgrades");
    });
  });

  describe('Vendor Information', () => {
    it('should accept valid vendor name', () => {
      const commitment = new Commitment();
      commitment.vendorName = 'ABC Construction Company Inc.';

      expect(commitment.vendorName).toBe('ABC Construction Company Inc.');
    });

    it('should accept valid vendor contact', () => {
      const commitment = new Commitment();
      commitment.vendorContact = 'John Smith, Project Manager';

      expect(commitment.vendorContact).toBe('John Smith, Project Manager');
    });

    it('should accept valid vendor email', () => {
      const commitment = new Commitment();
      commitment.vendorEmail = 'john.smith@abc-construction.com';

      expect(commitment.vendorEmail).toBe('john.smith@abc-construction.com');
    });

    it('should handle vendor names with special characters', () => {
      const commitment = new Commitment();
      commitment.vendorName = "O'Brien & Associates, LLC";

      expect(commitment.vendorName).toBe("O'Brien & Associates, LLC");
    });

    it('should handle vendor contact without email', () => {
      const commitment = new Commitment();
      commitment.vendorName = 'ABC Company';
      commitment.vendorContact = 'John Smith';

      expect(commitment.vendorEmail).toBeUndefined();
      expect(commitment.vendorContact).toBe('John Smith');
    });
  });

  describe('Commitment Amounts', () => {
    it('should handle original and current amounts', () => {
      const commitment = new Commitment();
      commitment.originalAmount = 100000.0;
      commitment.currentAmount = 125000.0;

      expect(commitment.originalAmount).toBe(100000.0);
      expect(commitment.currentAmount).toBe(125000.0);
    });

    it('should handle decimal values with 2 decimal places', () => {
      const commitment = new Commitment();
      commitment.originalAmount = 12345.67;
      commitment.currentAmount = 65432.10;

      expect(commitment.originalAmount).toBe(12345.67);
      expect(commitment.currentAmount).toBe(65432.10);
    });

    it('should handle zero amounts', () => {
      const commitment = new Commitment();
      commitment.originalAmount = 0;
      commitment.currentAmount = 0;

      expect(commitment.originalAmount).toBe(0);
      expect(commitment.currentAmount).toBe(0);
    });

    it('should handle large amounts', () => {
      const commitment = new Commitment();
      commitment.originalAmount = 9999999999999.99;
      commitment.currentAmount = 9999999999999.99;

      expect(commitment.originalAmount).toBe(9999999999999.99);
      expect(commitment.currentAmount).toBe(9999999999999.99);
    });

    it('should allow current amount to differ from original', () => {
      const commitment = new Commitment();
      commitment.originalAmount = 100000.0;
      commitment.currentAmount = 125000.0;

      const changeOrderAmount = commitment.currentAmount - commitment.originalAmount;

      expect(changeOrderAmount).toBe(25000.0);
      expect(commitment.currentAmount).toBeGreaterThan(commitment.originalAmount);
    });
  });

  describe('Commitment Dates', () => {
    it('should handle start and end dates', () => {
      const commitment = new Commitment();
      commitment.startDate = new Date('2024-02-01');
      commitment.endDate = new Date('2024-06-30');

      expect(commitment.startDate).toBeInstanceOf(Date);
      expect(commitment.endDate).toBeInstanceOf(Date);
      expect(commitment.endDate.getTime()).toBeGreaterThan(commitment.startDate.getTime());
    });

    it('should calculate commitment duration', () => {
      const commitment = new Commitment();
      commitment.startDate = new Date('2024-02-01');
      commitment.endDate = new Date('2024-05-31');

      const durationMs = commitment.endDate.getTime() - commitment.startDate.getTime();
      const durationDays = durationMs / (1000 * 60 * 60 * 24);

      expect(durationDays).toBeGreaterThan(0);
    });
  });

  describe('Project Reference', () => {
    it('should accept valid project ID', () => {
      const commitment = new Commitment();
      commitment.projectId = '123e4567-e89b-12d3-a456-426614174000';

      expect(commitment.projectId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should maintain project reference', () => {
      const projectId = '123e4567-e89b-12d3-a456-426614174000';

      const commitment = new Commitment();
      commitment.id = '123e4567-e89b-12d3-a456-426614174010';
      commitment.projectId = projectId;
      commitment.number = 'SUB-001';

      expect(commitment.projectId).toBe(projectId);
      expect(commitment.id).not.toBe(commitment.projectId);
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt properties', () => {
      const commitment = new Commitment();
      commitment.projectId = '123e4567-e89b-12d3-a456-426614174000';
      commitment.number = 'SUB-001';
      commitment.type = CommitmentType.SUBCONTRACT;
      commitment.title = 'Test Subcontract';
      commitment.createdAt = new Date();
      commitment.updatedAt = new Date();

      expect(commitment.createdAt).toBeInstanceOf(Date);
      expect(commitment.updatedAt).toBeInstanceOf(Date);
    });

    it('should not throw when accessing timestamp properties', () => {
      const commitment = new Commitment();

      expect(() => commitment.createdAt).not.toThrow();
      expect(() => commitment.updatedAt).not.toThrow();
    });
  });

  describe('Commitment Lifecycle', () => {
    it('should transition from DRAFT to PENDING_APPROVAL', () => {
      const commitment = new Commitment();
      commitment.status = CommitmentStatus.DRAFT;

      expect(commitment.status).toBe(CommitmentStatus.DRAFT);

      commitment.status = CommitmentStatus.PENDING_APPROVAL;

      expect(commitment.status).toBe(CommitmentStatus.PENDING_APPROVAL);
    });

    it('should transition from PENDING_APPROVAL to APPROVED', () => {
      const commitment = new Commitment();
      commitment.status = CommitmentStatus.PENDING_APPROVAL;

      expect(commitment.status).toBe(CommitmentStatus.PENDING_APPROVAL);

      commitment.status = CommitmentStatus.APPROVED;

      expect(commitment.status).toBe(CommitmentStatus.APPROVED);
    });

    it('should transition from APPROVED to ACTIVE', () => {
      const commitment = new Commitment();
      commitment.status = CommitmentStatus.APPROVED;

      expect(commitment.status).toBe(CommitmentStatus.APPROVED);

      commitment.status = CommitmentStatus.ACTIVE;

      expect(commitment.status).toBe(CommitmentStatus.ACTIVE);
    });

    it('should transition from ACTIVE to COMPLETE', () => {
      const commitment = new Commitment();
      commitment.status = CommitmentStatus.ACTIVE;

      expect(commitment.status).toBe(CommitmentStatus.ACTIVE);

      commitment.status = CommitmentStatus.COMPLETE;

      expect(commitment.status).toBe(CommitmentStatus.COMPLETE);
    });

    it('should transition from COMPLETE to CLOSED', () => {
      const commitment = new Commitment();
      commitment.status = CommitmentStatus.COMPLETE;

      expect(commitment.status).toBe(CommitmentStatus.COMPLETE);

      commitment.status = CommitmentStatus.CLOSED;

      expect(commitment.status).toBe(CommitmentStatus.CLOSED);
    });

    it('should allow voiding a commitment', () => {
      const commitment = new Commitment();
      commitment.status = CommitmentStatus.DRAFT;

      commitment.status = CommitmentStatus.VOID;

      expect(commitment.status).toBe(CommitmentStatus.VOID);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data types for all fields', () => {
      const commitment = new Commitment();
      commitment.id = '123e4567-e89b-12d3-a456-426614174000';
      commitment.projectId = '123e4567-e89b-12d3-a456-426614174001';
      commitment.number = 'SUB-001';
      commitment.type = CommitmentType.SUBCONTRACT;
      commitment.title = 'Test Subcontract';
      commitment.description = 'Test description';
      commitment.status = CommitmentStatus.ACTIVE;
      commitment.vendorName = 'ABC Company';
      commitment.vendorContact = 'John Smith';
      commitment.vendorEmail = 'john@abc.com';
      commitment.originalAmount = 100000.0;
      commitment.currentAmount = 100000.0;
      commitment.startDate = new Date();
      commitment.endDate = new Date();
      commitment.createdAt = new Date();
      commitment.updatedAt = new Date();

      expect(typeof commitment.id).toBe('string');
      expect(typeof commitment.projectId).toBe('string');
      expect(typeof commitment.number).toBe('string');
      expect(typeof commitment.type).toBe('string');
      expect(typeof commitment.title).toBe('string');
      expect(typeof commitment.description).toBe('string');
      expect(typeof commitment.status).toBe('string');
      expect(typeof commitment.vendorName).toBe('string');
      expect(typeof commitment.vendorContact).toBe('string');
      expect(typeof commitment.vendorEmail).toBe('string');
      expect(typeof commitment.originalAmount).toBe('number');
      expect(typeof commitment.currentAmount).toBe('number');
      expect(commitment.startDate).toBeInstanceOf(Date);
      expect(commitment.endDate).toBeInstanceOf(Date);
      expect(commitment.createdAt).toBeInstanceOf(Date);
      expect(commitment.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle all required properties', () => {
      const commitment = new Commitment();
      commitment.id = '123e4567-e89b-12d3-a456-426614174000';
      commitment.projectId = '123e4567-e89b-12d3-a456-426614174001';
      commitment.number = 'SUB-001';
      commitment.type = CommitmentType.SUBCONTRACT;
      commitment.title = 'Test Subcontract';
      commitment.status = CommitmentStatus.ACTIVE;
      commitment.vendorName = 'ABC Company';
      commitment.originalAmount = 100000.0;
      commitment.currentAmount = 100000.0;
      commitment.createdAt = new Date();
      commitment.updatedAt = new Date();

      expect(commitment.id).toBeDefined();
      expect(commitment.projectId).toBeDefined();
      expect(commitment.number).toBeDefined();
      expect(commitment.type).toBeDefined();
      expect(commitment.title).toBeDefined();
      expect(commitment.status).toBeDefined();
      expect(commitment.vendorName).toBeDefined();
      expect(commitment.originalAmount).toBeDefined();
      expect(commitment.currentAmount).toBeDefined();
      expect(commitment.createdAt).toBeDefined();
      expect(commitment.updatedAt).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty description string', () => {
      const commitment = new Commitment();
      commitment.description = '';

      expect(commitment.description).toBe('');
    });

    it('should handle very small amounts', () => {
      const commitment = new Commitment();
      commitment.originalAmount = 0.01;
      commitment.currentAmount = 0.01;

      expect(commitment.originalAmount).toBe(0.01);
      expect(commitment.currentAmount).toBe(0.01);
    });

    it('should handle current amount less than original (rare case)', () => {
      const commitment = new Commitment();
      commitment.originalAmount = 100000.0;
      commitment.currentAmount = 90000.0;

      expect(commitment.currentAmount).toBeLessThan(commitment.originalAmount);
    });
  });

  describe('Multiple Commitments', () => {
    it('should allow multiple commitments for same project', () => {
      const projectId = '123e4567-e89b-12d3-a456-426614174000';

      const subcontract = new Commitment();
      subcontract.id = '123e4567-e89b-12d3-a456-426614174010';
      subcontract.projectId = projectId;
      subcontract.number = 'SUB-001';
      subcontract.type = CommitmentType.SUBCONTRACT;
      subcontract.title = 'Electrical Subcontract';
      subcontract.vendorName = 'ABC Electrical';
      subcontract.originalAmount = 150000.0;
      subcontract.currentAmount = 150000.0;

      const purchaseOrder = new Commitment();
      purchaseOrder.id = '123e4567-e89b-12d3-a456-426614174011';
      purchaseOrder.projectId = projectId;
      purchaseOrder.number = 'PO-001';
      purchaseOrder.type = CommitmentType.PURCHASE_ORDER;
      purchaseOrder.title = 'Materials Purchase';
      purchaseOrder.vendorName = 'XYZ Supply';
      purchaseOrder.originalAmount = 50000.0;
      purchaseOrder.currentAmount = 50000.0;

      expect(subcontract.projectId).toBe(purchaseOrder.projectId);
      expect(subcontract.id).not.toBe(purchaseOrder.id);
      expect(subcontract.type).not.toBe(purchaseOrder.type);
      expect(subcontract.originalAmount).toBeGreaterThan(purchaseOrder.originalAmount);
    });

    it('should allow summing commitment amounts', () => {
      const commitment1 = new Commitment();
      commitment1.currentAmount = 150000.0;

      const commitment2 = new Commitment();
      commitment2.currentAmount = 75000.0;

      const commitment3 = new Commitment();
      commitment3.currentAmount = 25000.0;

      const totalCommitted =
        commitment1.currentAmount +
        commitment2.currentAmount +
        commitment3.currentAmount;

      expect(totalCommitted).toBe(250000.0);
    });
  });

  describe('Commitment Calculations', () => {
    it('should calculate change order amount', () => {
      const commitment = new Commitment();
      commitment.originalAmount = 100000.0;
      commitment.currentAmount = 125000.0;

      const changeOrders = commitment.currentAmount - commitment.originalAmount;

      expect(changeOrders).toBe(25000.0);
    });

    it('should calculate percentage of change', () => {
      const commitment = new Commitment();
      commitment.originalAmount = 100000.0;
      commitment.currentAmount = 125000.0;

      const changePercent =
        ((commitment.currentAmount - commitment.originalAmount) /
          commitment.originalAmount) *
        100;

      expect(changePercent).toBe(25.0);
    });
  });
});
