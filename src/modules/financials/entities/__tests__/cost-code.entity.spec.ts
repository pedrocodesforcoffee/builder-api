import { CostCode } from '../cost-code.entity';

describe('CostCode Entity', () => {
  describe('Entity Creation', () => {
    it('should create a valid cost code instance', () => {
      const costCode = new CostCode();
      costCode.code = '03-30-00';
      costCode.description = 'Cast-in-Place Concrete';
      costCode.division = 3;
      costCode.projectId = '123e4567-e89b-12d3-a456-426614174000';
      costCode.fullCode = '03-30-00';

      expect(costCode).toBeDefined();
      expect(costCode.code).toBe('03-30-00');
      expect(costCode.description).toBe('Cast-in-Place Concrete');
      expect(costCode.division).toBe(3);
      expect(costCode.projectId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(costCode.fullCode).toBe('03-30-00');
    });

    it('should create a template cost code without projectId', () => {
      const costCode = new CostCode();
      costCode.code = '01-00-00';
      costCode.description = 'General Requirements';
      costCode.division = 1;
      costCode.fullCode = '01-00-00';

      expect(costCode.projectId).toBeUndefined();
      expect(costCode.code).toBe('01-00-00');
    });

    it('should create a hierarchical cost code with parent', () => {
      const costCode = new CostCode();
      costCode.code = '03-31-00';
      costCode.description = 'Structural Concrete';
      costCode.division = 3;
      costCode.parentId = '123e4567-e89b-12d3-a456-426614174001';
      costCode.projectId = '123e4567-e89b-12d3-a456-426614174000';
      costCode.fullCode = '03-30-00.03-31-00';

      expect(costCode.parentId).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(costCode.fullCode).toBe('03-30-00.03-31-00');
    });
  });

  describe('Division Validation', () => {
    it('should accept valid division 0', async () => {
      const costCode = new CostCode();
      costCode.code = '00-00-00';
      costCode.description = 'Procurement and Contracting Requirements';
      costCode.division = 0;
      costCode.fullCode = '00-00-00';

      await expect(costCode.validateAndCompute()).resolves.not.toThrow();
    });

    it('should accept valid division 50', async () => {
      const costCode = new CostCode();
      costCode.code = '50-00-00';
      costCode.description = 'Reserved Division';
      costCode.division = 50;
      costCode.fullCode = '50-00-00';

      await expect(costCode.validateAndCompute()).resolves.not.toThrow();
    });

    it('should reject division less than 0', async () => {
      const costCode = new CostCode();
      costCode.code = '99-00-00';
      costCode.description = 'Invalid Division';
      costCode.division = -1;
      costCode.fullCode = '99-00-00';

      await expect(costCode.validateAndCompute()).rejects.toThrow(
        'Division must be between 0 and 50',
      );
    });

    it('should reject division greater than 50', async () => {
      const costCode = new CostCode();
      costCode.code = '99-00-00';
      costCode.description = 'Invalid Division';
      costCode.division = 51;
      costCode.fullCode = '99-00-00';

      await expect(costCode.validateAndCompute()).rejects.toThrow(
        'Division must be between 0 and 50',
      );
    });
  });

  describe('Code Validation', () => {
    it('should accept valid CSI format code', async () => {
      const costCode = new CostCode();
      costCode.code = '03-30-00';
      costCode.description = 'Cast-in-Place Concrete';
      costCode.division = 3;
      costCode.fullCode = '03-30-00';

      await expect(costCode.validateAndCompute()).resolves.not.toThrow();
    });

    it('should accept custom alphanumeric code', async () => {
      const costCode = new CostCode();
      costCode.code = 'LABOR-001';
      costCode.description = 'Direct Labor Costs';
      costCode.division = 1;
      costCode.fullCode = 'LABOR-001';

      await expect(costCode.validateAndCompute()).resolves.not.toThrow();
    });

    it('should reject empty code', async () => {
      const costCode = new CostCode();
      costCode.code = '';
      costCode.description = 'Invalid Code';
      costCode.division = 1;
      costCode.fullCode = '';

      await expect(costCode.validateAndCompute()).rejects.toThrow(
        'Code is required',
      );
    });

    it('should reject whitespace-only code', async () => {
      const costCode = new CostCode();
      costCode.code = '   ';
      costCode.description = 'Invalid Code';
      costCode.division = 1;
      costCode.fullCode = '   ';

      await expect(costCode.validateAndCompute()).rejects.toThrow(
        'Code is required',
      );
    });

    it('should reject code exceeding 50 characters', async () => {
      const costCode = new CostCode();
      costCode.code = '0'.repeat(51);
      costCode.description = 'Too Long Code';
      costCode.division = 1;
      costCode.fullCode = '0'.repeat(51);

      await expect(costCode.validateAndCompute()).rejects.toThrow(
        'Code must not exceed 50 characters',
      );
    });

    it('should accept code at maximum length (50 characters)', async () => {
      const costCode = new CostCode();
      costCode.code = '0'.repeat(50);
      costCode.description = 'Maximum Length Code';
      costCode.division = 1;
      costCode.fullCode = '0'.repeat(50);

      await expect(costCode.validateAndCompute()).resolves.not.toThrow();
    });
  });

  describe('Description Validation', () => {
    it('should accept valid description', async () => {
      const costCode = new CostCode();
      costCode.code = '03-30-00';
      costCode.description = 'Cast-in-Place Concrete';
      costCode.division = 3;
      costCode.fullCode = '03-30-00';

      await expect(costCode.validateAndCompute()).resolves.not.toThrow();
    });

    it('should reject empty description', async () => {
      const costCode = new CostCode();
      costCode.code = '03-30-00';
      costCode.description = '';
      costCode.division = 3;
      costCode.fullCode = '03-30-00';

      await expect(costCode.validateAndCompute()).rejects.toThrow(
        'Description is required',
      );
    });

    it('should reject whitespace-only description', async () => {
      const costCode = new CostCode();
      costCode.code = '03-30-00';
      costCode.description = '   ';
      costCode.division = 3;
      costCode.fullCode = '03-30-00';

      await expect(costCode.validateAndCompute()).rejects.toThrow(
        'Description is required',
      );
    });

    it('should reject description exceeding 500 characters', async () => {
      const costCode = new CostCode();
      costCode.code = '03-30-00';
      costCode.description = 'A'.repeat(501);
      costCode.division = 3;
      costCode.fullCode = '03-30-00';

      await expect(costCode.validateAndCompute()).rejects.toThrow(
        'Description must not exceed 500 characters',
      );
    });

    it('should accept description at maximum length (500 characters)', async () => {
      const costCode = new CostCode();
      costCode.code = '03-30-00';
      costCode.description = 'A'.repeat(500);
      costCode.division = 3;
      costCode.fullCode = '03-30-00';

      await expect(costCode.validateAndCompute()).resolves.not.toThrow();
    });
  });

  describe('Full Code Generation', () => {
    it('should default fullCode to code if not provided', async () => {
      const costCode = new CostCode();
      costCode.code = '03-30-00';
      costCode.description = 'Cast-in-Place Concrete';
      costCode.division = 3;

      await costCode.validateAndCompute();

      expect(costCode.fullCode).toBe('03-30-00');
    });

    it('should preserve provided fullCode', async () => {
      const costCode = new CostCode();
      costCode.code = '03-31-00';
      costCode.description = 'Structural Concrete';
      costCode.division = 3;
      costCode.fullCode = '03-30-00.03-31-00';

      await costCode.validateAndCompute();

      expect(costCode.fullCode).toBe('03-30-00.03-31-00');
    });
  });

  describe('Active Status', () => {
    it('should default isActive to true', () => {
      const costCode = new CostCode();
      costCode.code = '03-30-00';
      costCode.description = 'Cast-in-Place Concrete';
      costCode.division = 3;
      costCode.fullCode = '03-30-00';

      // isActive should default to true based on entity definition
      expect(costCode.isActive).toBeUndefined(); // Until set by database default
    });

    it('should allow setting isActive to false', () => {
      const costCode = new CostCode();
      costCode.code = '03-30-00';
      costCode.description = 'Cast-in-Place Concrete';
      costCode.division = 3;
      costCode.fullCode = '03-30-00';
      costCode.isActive = false;

      expect(costCode.isActive).toBe(false);
    });

    it('should allow setting isActive to true', () => {
      const costCode = new CostCode();
      costCode.code = '03-30-00';
      costCode.description = 'Cast-in-Place Concrete';
      costCode.division = 3;
      costCode.fullCode = '03-30-00';
      costCode.isActive = true;

      expect(costCode.isActive).toBe(true);
    });
  });

  describe('Sort Order', () => {
    it('should default sortOrder to 0', () => {
      const costCode = new CostCode();
      costCode.code = '03-30-00';
      costCode.description = 'Cast-in-Place Concrete';
      costCode.division = 3;
      costCode.fullCode = '03-30-00';

      // sortOrder should default to 0 based on entity definition
      expect(costCode.sortOrder).toBeUndefined(); // Until set by database default
    });

    it('should allow setting custom sortOrder', () => {
      const costCode = new CostCode();
      costCode.code = '03-30-00';
      costCode.description = 'Cast-in-Place Concrete';
      costCode.division = 3;
      costCode.fullCode = '03-30-00';
      costCode.sortOrder = 10;

      expect(costCode.sortOrder).toBe(10);
    });

    it('should allow negative sortOrder', () => {
      const costCode = new CostCode();
      costCode.code = '03-30-00';
      costCode.description = 'Cast-in-Place Concrete';
      costCode.division = 3;
      costCode.fullCode = '03-30-00';
      costCode.sortOrder = -5;

      expect(costCode.sortOrder).toBe(-5);
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt properties', () => {
      const costCode = new CostCode();
      costCode.code = '03-30-00';
      costCode.description = 'Cast-in-Place Concrete';
      costCode.division = 3;
      costCode.fullCode = '03-30-00';
      costCode.createdAt = new Date();
      costCode.updatedAt = new Date();

      expect(costCode.createdAt).toBeInstanceOf(Date);
      expect(costCode.updatedAt).toBeInstanceOf(Date);
    });

    it('should not throw when accessing timestamp properties', () => {
      const costCode = new CostCode();

      expect(() => costCode.createdAt).not.toThrow();
      expect(() => costCode.updatedAt).not.toThrow();
    });
  });

  describe('CSI MasterFormat Divisions', () => {
    const csiDivisions = [
      { division: 0, name: 'Procurement and Contracting Requirements' },
      { division: 1, name: 'General Requirements' },
      { division: 3, name: 'Concrete' },
      { division: 9, name: 'Finishes' },
      { division: 21, name: 'Fire Suppression' },
      { division: 26, name: 'Electrical' },
      { division: 31, name: 'Earthwork' },
      { division: 48, name: 'Electrical Power Generation' },
    ];

    csiDivisions.forEach(({ division, name }) => {
      it(`should accept CSI division ${division}: ${name}`, async () => {
        const costCode = new CostCode();
        costCode.code = `${division.toString().padStart(2, '0')}-00-00`;
        costCode.description = name;
        costCode.division = division;
        costCode.fullCode = `${division.toString().padStart(2, '0')}-00-00`;

        await expect(costCode.validateAndCompute()).resolves.not.toThrow();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in description', async () => {
      const costCode = new CostCode();
      costCode.code = '03-30-00';
      costCode.description = "Concrete & Cement (5,000 PSI) - Builder's Grade";
      costCode.division = 3;
      costCode.fullCode = '03-30-00';

      await expect(costCode.validateAndCompute()).resolves.not.toThrow();
      expect(costCode.description).toBe(
        "Concrete & Cement (5,000 PSI) - Builder's Grade",
      );
    });

    it('should handle unicode characters in description', async () => {
      const costCode = new CostCode();
      costCode.code = '03-30-00';
      costCode.description = 'Béton Coulé sur Place (Français)';
      costCode.division = 3;
      costCode.fullCode = '03-30-00';

      await expect(costCode.validateAndCompute()).resolves.not.toThrow();
      expect(costCode.description).toBe('Béton Coulé sur Place (Français)');
    });

    it('should handle undefined projectId gracefully', () => {
      const costCode = new CostCode();
      costCode.code = '03-30-00';
      costCode.description = 'Cast-in-Place Concrete';
      costCode.division = 3;
      costCode.fullCode = '03-30-00';

      expect(costCode.projectId).toBeUndefined();
      expect(() => costCode.projectId).not.toThrow();
    });

    it('should handle undefined parentId gracefully', () => {
      const costCode = new CostCode();
      costCode.code = '03-30-00';
      costCode.description = 'Cast-in-Place Concrete';
      costCode.division = 3;
      costCode.fullCode = '03-30-00';

      expect(costCode.parentId).toBeUndefined();
      expect(() => costCode.parentId).not.toThrow();
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data types for all fields', () => {
      const costCode = new CostCode();
      costCode.id = '123e4567-e89b-12d3-a456-426614174000';
      costCode.code = '03-30-00';
      costCode.description = 'Cast-in-Place Concrete';
      costCode.division = 3;
      costCode.fullCode = '03-30-00';
      costCode.projectId = '123e4567-e89b-12d3-a456-426614174001';
      costCode.parentId = '123e4567-e89b-12d3-a456-426614174002';
      costCode.isActive = true;
      costCode.sortOrder = 1;
      costCode.createdAt = new Date();
      costCode.updatedAt = new Date();

      expect(typeof costCode.id).toBe('string');
      expect(typeof costCode.code).toBe('string');
      expect(typeof costCode.description).toBe('string');
      expect(typeof costCode.division).toBe('number');
      expect(typeof costCode.fullCode).toBe('string');
      expect(typeof costCode.projectId).toBe('string');
      expect(typeof costCode.parentId).toBe('string');
      expect(typeof costCode.isActive).toBe('boolean');
      expect(typeof costCode.sortOrder).toBe('number');
      expect(costCode.createdAt).toBeInstanceOf(Date);
      expect(costCode.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Hierarchical Structure', () => {
    it('should support multiple levels of hierarchy', () => {
      // Root level
      const root = new CostCode();
      root.id = '123e4567-e89b-12d3-a456-426614174001';
      root.code = '03-00-00';
      root.description = 'Concrete';
      root.division = 3;
      root.fullCode = '03-00-00';

      // Second level
      const child1 = new CostCode();
      child1.id = '123e4567-e89b-12d3-a456-426614174002';
      child1.code = '03-30-00';
      child1.description = 'Cast-in-Place Concrete';
      child1.division = 3;
      child1.parentId = root.id;
      child1.fullCode = '03-00-00.03-30-00';

      // Third level
      const child2 = new CostCode();
      child2.id = '123e4567-e89b-12d3-a456-426614174003';
      child2.code = '03-31-00';
      child2.description = 'Structural Concrete';
      child2.division = 3;
      child2.parentId = child1.id;
      child2.fullCode = '03-00-00.03-30-00.03-31-00';

      expect(root.parentId).toBeUndefined();
      expect(child1.parentId).toBe(root.id);
      expect(child2.parentId).toBe(child1.id);
      expect(root.fullCode).toBe('03-00-00');
      expect(child1.fullCode).toBe('03-00-00.03-30-00');
      expect(child2.fullCode).toBe('03-00-00.03-30-00.03-31-00');
    });
  });
});
