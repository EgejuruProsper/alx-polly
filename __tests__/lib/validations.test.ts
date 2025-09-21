import { describe, it, expect } from 'vitest';
import { 
  createPollSchema, 
  updatePollSchema, 
  loginSchema, 
  registerSchema, 
  voteSchema 
} from '@/lib/validations';

describe('Validation Schemas', () => {
  describe('createPollSchema', () => {
    it('should validate a valid poll', () => {
      const validPoll = {
        title: 'What is your favorite color?',
        options: ['Red', 'Blue', 'Green'],
        isPublic: true,
        allowMultipleVotes: false
      };

      const result = createPollSchema.safeParse(validPoll);
      expect(result.success).toBe(true);
    });

    it('should reject empty title', () => {
      const invalidPoll = {
        title: '',
        options: ['Red', 'Blue'],
        isPublic: true,
        allowMultipleVotes: false
      };

      const result = createPollSchema.safeParse(invalidPoll);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Give your poll a catchy title');
      }
    });

    it('should reject title that is too long', () => {
      const invalidPoll = {
        title: 'A'.repeat(201), // 201 characters
        options: ['Red', 'Blue'],
        isPublic: true,
        allowMultipleVotes: false
      };

      const result = createPollSchema.safeParse(invalidPoll);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Title is too long');
      }
    });

    it('should reject poll with less than 2 options', () => {
      const invalidPoll = {
        title: 'Test Poll',
        options: ['Only one option'],
        isPublic: true,
        allowMultipleVotes: false
      };

      const result = createPollSchema.safeParse(invalidPoll);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('You need at least 2 options');
      }
    });

    it('should reject poll with more than 10 options', () => {
      const invalidPoll = {
        title: 'Test Poll',
        options: Array.from({ length: 11 }, (_, i) => `Option ${i + 1}`),
        isPublic: true,
        allowMultipleVotes: false
      };

      const result = createPollSchema.safeParse(invalidPoll);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Maximum 10 options allowed');
      }
    });

    it('should reject empty options', () => {
      const invalidPoll = {
        title: 'Test Poll',
        options: ['Valid Option', ''],
        isPublic: true,
        allowMultipleVotes: false
      };

      const result = createPollSchema.safeParse(invalidPoll);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('This option is empty');
      }
    });

    it('should reject whitespace-only options', () => {
      const invalidPoll = {
        title: 'Test Poll',
        options: ['Valid Option', '   '],
        isPublic: true,
        allowMultipleVotes: false
      };

      const result = createPollSchema.safeParse(invalidPoll);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Option cannot be just spaces');
      }
    });

    it('should reject duplicate options', () => {
      const invalidPoll = {
        title: 'Test Poll',
        options: ['Red', 'Blue', 'Red'],
        isPublic: true,
        allowMultipleVotes: false
      };

      const result = createPollSchema.safeParse(invalidPoll);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Duplicate options detected');
      }
    });

    it('should reject case-insensitive duplicate options', () => {
      const invalidPoll = {
        title: 'Test Poll',
        options: ['Red', 'Blue', 'red'],
        isPublic: true,
        allowMultipleVotes: false
      };

      const result = createPollSchema.safeParse(invalidPoll);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Duplicate options detected');
      }
    });

    it('should reject similar options (fuzzy matching)', () => {
      const invalidPoll = {
        title: 'Test Poll',
        options: ['Very similar option', 'Very similar optoin'], // Typo in second option
        isPublic: true,
        allowMultipleVotes: false
      };

      const result = createPollSchema.safeParse(invalidPoll);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('These options look very similar');
      }
    });

    it('should reject expiration date in the past', () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      const invalidPoll = {
        title: 'Test Poll',
        options: ['Red', 'Blue'],
        isPublic: true,
        allowMultipleVotes: false,
        expiresAt: pastDate
      };

      const result = createPollSchema.safeParse(invalidPoll);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Expiration date must be at least 1 hour in the future');
      }
    });

    it('should accept valid expiration date', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 2); // 2 hours from now
      const validPoll = {
        title: 'Test Poll',
        options: ['Red', 'Blue'],
        isPublic: true,
        allowMultipleVotes: false,
        expiresAt: futureDate
      };

      const result = createPollSchema.safeParse(validPoll);
      expect(result.success).toBe(true);
    });

    it('should trim whitespace from inputs', () => {
      const pollWithWhitespace = {
        title: '  Test Poll  ',
        options: ['  Red  ', '  Blue  '],
        isPublic: true,
        allowMultipleVotes: false
      };

      const result = createPollSchema.safeParse(pollWithWhitespace);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Test Poll');
        expect(result.data.options).toEqual(['Red', 'Blue']);
      }
    });
  });

  describe('updatePollSchema', () => {
    it('should validate partial updates', () => {
      const partialUpdate = {
        title: 'Updated Poll Title'
      };

      const result = updatePollSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should validate full updates', () => {
      const fullUpdate = {
        title: 'Updated Poll',
        options: ['New Option 1', 'New Option 2'],
        isPublic: false,
        allowMultipleVotes: true
      };

      const result = updatePollSchema.safeParse(fullUpdate);
      expect(result.success).toBe(true);
    });

    it('should reject invalid options in updates', () => {
      const invalidUpdate = {
        options: ['Valid Option', '']
      };

      const result = updatePollSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login credentials', () => {
      const validLogin = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = loginSchema.safeParse(validLogin);
      expect(result.success).toBe(true);
    });

    it('should reject empty email', () => {
      const invalidLogin = {
        email: '',
        password: 'password123'
      };

      const result = loginSchema.safeParse(invalidLogin);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Please enter your email address');
      }
    });

    it('should reject invalid email format', () => {
      const invalidLogin = {
        email: 'invalid-email',
        password: 'password123'
      };

      const result = loginSchema.safeParse(invalidLogin);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Please enter a valid email address');
      }
    });

    it('should reject short password', () => {
      const invalidLogin = {
        email: 'test@example.com',
        password: '12345' // Less than 6 characters
      };

      const result = loginSchema.safeParse(invalidLogin);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Password must be at least 6 characters long');
      }
    });
  });

  describe('registerSchema', () => {
    it('should validate valid registration data', () => {
      const validRegister = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      };

      const result = registerSchema.safeParse(validRegister);
      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const invalidRegister = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        confirmPassword: 'different123'
      };

      const result = registerSchema.safeParse(invalidRegister);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Passwords don't match");
      }
    });

    it('should reject short name', () => {
      const invalidRegister = {
        name: 'J', // Less than 2 characters
        email: 'john@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      };

      const result = registerSchema.safeParse(invalidRegister);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Name must be at least 2 characters');
      }
    });
  });

  describe('voteSchema', () => {
    it('should validate valid vote', () => {
      const validVote = {
        optionId: '123e4567-e89b-12d3-a456-426614174000'
      };

      const result = voteSchema.safeParse(validVote);
      expect(result.success).toBe(true);
    });

    it('should reject empty option ID', () => {
      const invalidVote = {
        optionId: ''
      };

      const result = voteSchema.safeParse(invalidVote);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Please select an option to vote');
      }
    });

    it('should reject invalid UUID format', () => {
      const invalidVote = {
        optionId: 'not-a-uuid'
      };

      const result = voteSchema.safeParse(invalidVote);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid option ID format');
      }
    });
  });
});
