import { User } from '../user.entity';

describe('User Entity', () => {
  describe('User Creation', () => {
    it('should create a valid user instance', () => {
      const user = new User();
      user.email = 'test@example.com';
      user.password = 'hashedPassword123';
      user.firstName = 'John';
      user.lastName = 'Doe';
      user.role = 'user';

      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.password).toBe('hashedPassword123');
      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Doe');
      expect(user.role).toBe('user');
    });

    it('should create a user with optional phone number', () => {
      const user = new User();
      user.email = 'test@example.com';
      user.password = 'hashedPassword123';
      user.firstName = 'John';
      user.lastName = 'Doe';
      user.phoneNumber = '+1234567890';
      user.role = 'user';

      expect(user.phoneNumber).toBe('+1234567890');
    });

    it('should create a user without phone number', () => {
      const user = new User();
      user.email = 'test@example.com';
      user.password = 'hashedPassword123';
      user.firstName = 'John';
      user.lastName = 'Doe';
      user.role = 'user';

      expect(user.phoneNumber).toBeUndefined();
    });
  });

  describe('Email Normalization', () => {
    it('should normalize email to lowercase on beforeInsert hook', () => {
      const user = new User();
      user.email = 'TEST@EXAMPLE.COM';
      user.firstName = 'John';
      user.lastName = 'Doe';

      user.normalizeEmailBeforeInsert();

      expect(user.email).toBe('test@example.com');
    });

    it('should normalize email to lowercase on beforeUpdate hook', () => {
      const user = new User();
      user.email = 'TEST@EXAMPLE.COM';
      user.firstName = 'John';
      user.lastName = 'Doe';

      user.normalizeEmailBeforeUpdate();

      expect(user.email).toBe('test@example.com');
    });

    it('should trim whitespace from email on beforeInsert', () => {
      const user = new User();
      user.email = '  test@example.com  ';
      user.firstName = 'John';
      user.lastName = 'Doe';

      user.normalizeEmailBeforeInsert();

      expect(user.email).toBe('test@example.com');
    });

    it('should handle mixed case email normalization', () => {
      const user = new User();
      user.email = 'TeSt@ExAmPlE.CoM';
      user.firstName = 'John';
      user.lastName = 'Doe';

      user.normalizeEmailBeforeInsert();

      expect(user.email).toBe('test@example.com');
    });
  });

  describe('Name Trimming', () => {
    it('should trim whitespace from firstName on beforeInsert', () => {
      const user = new User();
      user.email = 'test@example.com';
      user.firstName = '  John  ';
      user.lastName = 'Doe';

      user.normalizeEmailBeforeInsert();

      expect(user.firstName).toBe('John');
    });

    it('should trim whitespace from lastName on beforeInsert', () => {
      const user = new User();
      user.email = 'test@example.com';
      user.firstName = 'John';
      user.lastName = '  Doe  ';

      user.normalizeEmailBeforeInsert();

      expect(user.lastName).toBe('Doe');
    });

    it('should trim whitespace from names on beforeUpdate', () => {
      const user = new User();
      user.email = 'test@example.com';
      user.firstName = '  John  ';
      user.lastName = '  Doe  ';

      user.normalizeEmailBeforeUpdate();

      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Doe');
    });
  });

  describe('Role Management', () => {
    it('should support user role', () => {
      const user = new User();
      user.role = 'user';

      expect(user.role).toBe('user');
    });

    it('should support admin role', () => {
      const user = new User();
      user.role = 'admin';

      expect(user.role).toBe('admin');
    });

    it('should support moderator role', () => {
      const user = new User();
      user.role = 'moderator';

      expect(user.role).toBe('moderator');
    });
  });

  describe('Password Security', () => {
    it('should not expose password in toJSON', () => {
      const user = new User();
      user.id = '123e4567-e89b-12d3-a456-426614174000';
      user.email = 'test@example.com';
      user.password = 'hashedPassword123';
      user.firstName = 'John';
      user.lastName = 'Doe';
      user.role = 'user';
      user.createdAt = new Date();
      user.updatedAt = new Date();

      const json = user.toJSON();

      expect(json).toBeDefined();
      expect(json.email).toBe('test@example.com');
      expect(json.firstName).toBe('John');
      expect(json.lastName).toBe('Doe');
      expect(json.password).toBeUndefined();
    });

    it('should exclude password from JSON stringification', () => {
      const user = new User();
      user.id = '123e4567-e89b-12d3-a456-426614174000';
      user.email = 'test@example.com';
      user.password = 'hashedPassword123';
      user.firstName = 'John';
      user.lastName = 'Doe';
      user.role = 'user';
      user.createdAt = new Date();
      user.updatedAt = new Date();

      const jsonString = JSON.stringify(user);

      expect(jsonString).not.toContain('password');
      expect(jsonString).not.toContain('hashedPassword123');
    });
  });

  describe('Full Name Getter', () => {
    it('should return full name', () => {
      const user = new User();
      user.firstName = 'John';
      user.lastName = 'Doe';

      expect(user.fullName).toBe('John Doe');
    });

    it('should return full name with multiple word first name', () => {
      const user = new User();
      user.firstName = 'Mary Jane';
      user.lastName = 'Watson';

      expect(user.fullName).toBe('Mary Jane Watson');
    });

    it('should return full name with multiple word last name', () => {
      const user = new User();
      user.firstName = 'John';
      user.lastName = 'Van Der Berg';

      expect(user.fullName).toBe('John Van Der Berg');
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt properties', () => {
      const user = new User();
      user.email = 'test@example.com';
      user.password = 'hashedPassword123';
      user.firstName = 'John';
      user.lastName = 'Doe';
      user.role = 'user';

      // Note: In actual database operations, TypeORM will set these automatically
      user.createdAt = new Date();
      user.updatedAt = new Date();

      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should not throw when accessing timestamp properties', () => {
      const user = new User();

      expect(() => user.createdAt).not.toThrow();
      expect(() => user.updatedAt).not.toThrow();
    });
  });

  describe('Entity Properties', () => {
    it('should have all required properties defined', () => {
      const user = new User();
      user.id = '123e4567-e89b-12d3-a456-426614174000';
      user.email = 'test@example.com';
      user.password = 'hashedPassword123';
      user.firstName = 'John';
      user.lastName = 'Doe';
      user.role = 'user';
      user.createdAt = new Date();
      user.updatedAt = new Date();

      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.password).toBeDefined();
      expect(user.firstName).toBeDefined();
      expect(user.lastName).toBeDefined();
      expect(user.role).toBeDefined();
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should handle all three role types', () => {
      const userRole = new User();
      userRole.role = 'user';
      expect(userRole.role).toBe('user');

      const adminRole = new User();
      adminRole.role = 'admin';
      expect(adminRole.role).toBe('admin');

      const moderatorRole = new User();
      moderatorRole.role = 'moderator';
      expect(moderatorRole.role).toBe('moderator');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty email string in lifecycle hooks', () => {
      const user = new User();
      user.email = '';
      user.firstName = 'John';
      user.lastName = 'Doe';

      expect(() => user.normalizeEmailBeforeInsert()).not.toThrow();
    });

    it('should handle undefined values in lifecycle hooks gracefully', () => {
      const user = new User();
      user.email = undefined as any;
      user.firstName = undefined as any;
      user.lastName = undefined as any;

      expect(() => user.normalizeEmailBeforeInsert()).not.toThrow();
      expect(() => user.normalizeEmailBeforeUpdate()).not.toThrow();
    });

    it('should handle email with only spaces', () => {
      const user = new User();
      user.email = '   ';
      user.firstName = 'John';
      user.lastName = 'Doe';

      user.normalizeEmailBeforeInsert();

      expect(user.email).toBe('');
    });

    it('should preserve international phone number formats', () => {
      const user = new User();
      user.phoneNumber = '+351 123 456 789';

      expect(user.phoneNumber).toBe('+351 123 456 789');
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data types for all fields', () => {
      const user = new User();
      user.id = '123e4567-e89b-12d3-a456-426614174000';
      user.email = 'test@example.com';
      user.password = 'hashedPassword123';
      user.firstName = 'John';
      user.lastName = 'Doe';
      user.phoneNumber = '+1234567890';
      user.role = 'user';
      user.createdAt = new Date();
      user.updatedAt = new Date();

      expect(typeof user.id).toBe('string');
      expect(typeof user.email).toBe('string');
      expect(typeof user.password).toBe('string');
      expect(typeof user.firstName).toBe('string');
      expect(typeof user.lastName).toBe('string');
      expect(typeof user.phoneNumber).toBe('string');
      expect(typeof user.role).toBe('string');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle special characters in names', () => {
      const user = new User();
      user.firstName = "O'Brien";
      user.lastName = 'De La Cruz';

      expect(user.firstName).toBe("O'Brien");
      expect(user.lastName).toBe('De La Cruz');
      expect(user.fullName).toBe("O'Brien De La Cruz");
    });

    it('should handle unicode characters in names', () => {
      const user = new User();
      user.firstName = 'José';
      user.lastName = 'Müller';

      expect(user.firstName).toBe('José');
      expect(user.lastName).toBe('Müller');
      expect(user.fullName).toBe('José Müller');
    });
  });
});
