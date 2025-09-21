import { describe, it, expect } from 'vitest';
import { 
  createPollSchema, 
  updatePollSchema, 
  loginSchema, 
  registerSchema, 
  voteSchema, 
  updateProfileSchema 
} from '@/lib/validations';

describe('Validation Schemas', () => {
  describe('createPollSchema', () => {
    it('should validate valid poll data', () => {
      const validData = {
        title: 'What is your favorite color?',
        description: 'Please choose your favorite color',
        options: ['Red', 'Blue', 'Green'],
        isPublic: true,
        allowMultipleVotes: false
      };

      const result = createPollSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty title', () => {
      const invalidData = {
        title: '',
        options: ['Red', 'Blue']
      };

      const result = createPollSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Please enter a poll title');
      }
    });

    it('should reject whitespace-only title', () => {
      const invalidData = {
        title: '   ',
        options: ['Red', 'Blue']
      };

      const result = createPollSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Poll title cannot be empty');
      }
    });

    it('should reject title that is too long', () => {
      const invalidData = {
        title: 'A'.repeat(201),
        options: ['Red', 'Blue']
      };

      const result = createPollSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Title is too long (maximum 200 characters)');
      }
    });

    it('should reject empty options array', () => {
      const invalidData = {
        title: 'Test Poll',
        options: []
      };

      const result = createPollSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Please provide at least 2 poll options');
      }
    });

    it('should reject options with empty strings', () => {
      const invalidData = {
        title: 'Test Poll',
        options: ['Red', '']
      };

      const result = createPollSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Poll option cannot be empty');
      }
    });

    it('should reject options with only whitespace', () => {
      const invalidData = {
        title: 'Test Poll',
        options: ['Red', '   ']
      };

      const result = createPollSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Poll option cannot be empty');
      }
    });

    it('should reject duplicate options (case-insensitive)', () => {
      const invalidData = {
        title: 'Test Poll',
        options: ['Red', 'red']
      };

      const result = createPollSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Duplicate options are not allowed. Please make each option unique.');
      }
    });

    it('should reject options that are too long', () => {
      const invalidData = {
        title: 'Test Poll',
        options: ['Red', 'A'.repeat(101)]
      };

      const result = createPollSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Option is too long (maximum 100 characters)');
      }
    });

    it('should reject too many options', () => {
      const invalidData = {
        title: 'Test Poll',
        options: Array.from({ length: 11 }, (_, i) => `Option ${i + 1}`)
      };

      const result = createPollSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Maximum 10 options allowed');
      }
    });

    it('should reject description that is too long', () => {
      const invalidData = {
        title: 'Test Poll',
        options: ['Red', 'Blue'],
        description: 'A'.repeat(1001)
      };

      const result = createPollSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Description is too long (maximum 1000 characters)');
      }
    });

    it('should reject expiration date in the past', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const invalidData = {
        title: 'Test Poll',
        options: ['Red', 'Blue'],
        expiresAt: pastDate
      };

      const result = createPollSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Expiration date must be in the future');
      }
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123'
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Please enter a valid email address');
      }
    });

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '123'
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Password must be at least 6 characters long');
      }
    });
  });

  describe('registerSchema', () => {
    it('should validate valid registration data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        confirmPassword: 'different123'
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Passwords don't match. Please try again.");
      }
    });

    it('should reject short name', () => {
      const invalidData = {
        name: 'J',
        email: 'john@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Name must be at least 2 characters');
      }
    });
  });

  describe('voteSchema', () => {
    it('should validate valid vote data', () => {
      const validData = {
        optionId: '123e4567-e89b-12d3-a456-426614174000'
      };

      const result = voteSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty optionId', () => {
      const invalidData = {
        optionId: ''
      };

      const result = voteSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Please select an option to vote');
      }
    });

    it('should reject invalid UUID format', () => {
      const invalidData = {
        optionId: 'invalid-uuid'
      };

      const result = voteSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid option ID format');
      }
    });
  });

  describe('updateProfileSchema', () => {
    it('should validate valid profile update data', () => {
      const validData = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        name: 'Updated Name',
        email: 'invalid-email'
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Please enter a valid email address');
      }
    });
  });
});