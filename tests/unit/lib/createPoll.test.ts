import { describe, it, expect, vi } from 'vitest';
import { createPoll, type CreatePollOptions } from '../../../lib/createPoll';

describe('createPoll', () => {
  describe('Happy Path Tests', () => {
    it('should create a poll with valid data', async () => {
      const pollData: CreatePollOptions = {
        title: 'What is your favorite color?',
        description: 'Please choose your favorite color from the options below.',
        options: ['Red', 'Blue', 'Green', 'Yellow'],
        isPublic: true,
        allowMultipleVotes: false
      };

      const result = await createPoll(pollData);

      expect(result.success).toBe(true);
      expect(result.poll).toBeDefined();
      expect(result.poll?.title).toBe('What is your favorite color?');
      expect(result.poll?.description).toBe('Please choose your favorite color from the options below.');
      expect(result.poll?.options).toEqual(['Red', 'Blue', 'Green', 'Yellow']);
      expect(result.poll?.votes).toEqual([0, 0, 0, 0]);
      expect(result.poll?.isPublic).toBe(true);
      expect(result.poll?.allowMultipleVotes).toBe(false);
      expect(result.poll?.id).toMatch(/^poll_\d+_[a-z0-9]+$/);
      expect(result.poll?.createdAt).toBeInstanceOf(Date);
      expect(result.error).toBeUndefined();
    });

    it('should create a poll with minimal required data', async () => {
      const pollData: CreatePollOptions = {
        title: 'Simple Poll',
        options: ['Option 1', 'Option 2']
      };

      const result = await createPoll(pollData);

      expect(result.success).toBe(true);
      expect(result.poll).toBeDefined();
      expect(result.poll?.title).toBe('Simple Poll');
      expect(result.poll?.options).toEqual(['Option 1', 'Option 2']);
      expect(result.poll?.isPublic).toBe(true); // default value
      expect(result.poll?.allowMultipleVotes).toBe(false); // default value
      expect(result.poll?.description).toBeUndefined();
      expect(result.poll?.expiresAt).toBeUndefined();
    });

    it('should create a poll with expiration date', async () => {
      const expiresAt = new Date('2024-12-31T23:59:59Z');
      const pollData: CreatePollOptions = {
        title: 'Time-limited Poll',
        options: ['Yes', 'No'],
        expiresAt
      };

      const result = await createPoll(pollData);

      expect(result.success).toBe(true);
      expect(result.poll?.expiresAt).toEqual(expiresAt);
    });

    it('should create a poll with maximum allowed options (10)', async () => {
      const options = Array.from({ length: 10 }, (_, i) => `Option ${i + 1}`);
      const pollData: CreatePollOptions = {
        title: 'Poll with 10 options',
        options
      };

      const result = await createPoll(pollData);

      expect(result.success).toBe(true);
      expect(result.poll?.options).toHaveLength(10);
      expect(result.poll?.votes).toHaveLength(10);
    });

    it('should create a private poll with multiple votes allowed', async () => {
      const pollData: CreatePollOptions = {
        title: 'Private Multi-vote Poll',
        options: ['A', 'B', 'C'],
        isPublic: false,
        allowMultipleVotes: true
      };

      const result = await createPoll(pollData);

      expect(result.success).toBe(true);
      expect(result.poll?.isPublic).toBe(false);
      expect(result.poll?.allowMultipleVotes).toBe(true);
    });
  });

  describe('Error Case Tests', () => {
    it('should fail with empty options array', async () => {
      const pollData: CreatePollOptions = {
        title: 'Poll with no options',
        options: []
      };

      const result = await createPoll(pollData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('At least 2 options are required');
      expect(result.poll).toBeUndefined();
    });

    it('should fail with options containing empty strings', async () => {
      const pollData: CreatePollOptions = {
        title: 'Poll with empty option strings',
        options: ['Valid Option', '', 'Another Valid Option']
      };

      const result = await createPoll(pollData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Option cannot be empty');
      expect(result.poll).toBeUndefined();
    });

    it('should fail with options containing only whitespace', async () => {
      const pollData: CreatePollOptions = {
        title: 'Poll with whitespace-only options',
        options: ['Valid Option', '   ', 'Another Valid Option']
      };

      const result = await createPoll(pollData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Option cannot be empty');
      expect(result.poll).toBeUndefined();
    });

    it('should fail with less than 2 options', async () => {
      const pollData: CreatePollOptions = {
        title: 'Poll with only one option',
        options: ['Only Option']
      };

      const result = await createPoll(pollData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('At least 2 options are required');
      expect(result.poll).toBeUndefined();
    });

    it('should fail with more than 10 options', async () => {
      const options = Array.from({ length: 11 }, (_, i) => `Option ${i + 1}`);
      const pollData: CreatePollOptions = {
        title: 'Poll with too many options',
        options
      };

      const result = await createPoll(pollData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum 10 options allowed');
      expect(result.poll).toBeUndefined();
    });

    it('should fail with empty title', async () => {
      const pollData: CreatePollOptions = {
        title: '',
        options: ['Option 1', 'Option 2']
      };

      const result = await createPoll(pollData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Title is required');
      expect(result.poll).toBeUndefined();
    });

    it('should fail with title exceeding maximum length', async () => {
      const longTitle = 'A'.repeat(201); // 201 characters
      const pollData: CreatePollOptions = {
        title: longTitle,
        options: ['Option 1', 'Option 2']
      };

      const result = await createPoll(pollData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Title must be less than 200 characters');
      expect(result.poll).toBeUndefined();
    });

    it('should fail with description exceeding maximum length', async () => {
      const longDescription = 'A'.repeat(1001); // 1001 characters
      const pollData: CreatePollOptions = {
        title: 'Valid Title',
        description: longDescription,
        options: ['Option 1', 'Option 2']
      };

      const result = await createPoll(pollData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Description must be less than 1000 characters');
      expect(result.poll).toBeUndefined();
    });

    it('should fail with option exceeding maximum length', async () => {
      const longOption = 'A'.repeat(101); // 101 characters
      const pollData: CreatePollOptions = {
        title: 'Valid Title',
        options: ['Valid Option', longOption]
      };

      const result = await createPoll(pollData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Option must be less than 100 characters');
      expect(result.poll).toBeUndefined();
    });

    it('should handle unexpected errors gracefully', async () => {
      // Mock the createPollSchema.parse to throw an unexpected error
      const originalConsoleError = console.error;
      console.error = vi.fn(); // Suppress error logging in test

      // Create a poll data that would cause an unexpected error
      const pollData = {
        title: 'Test Poll',
        options: ['Option 1', 'Option 2']
      } as any;

      // Mock Date.now to throw an error
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => {
        throw new Error('Unexpected error');
      });

      const result = await createPoll(pollData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
      expect(result.poll).toBeUndefined();

      // Restore mocks
      Date.now = originalDateNow;
      console.error = originalConsoleError;
    });
  });

  describe('Edge Cases', () => {
    it('should handle exactly 2 options (minimum)', async () => {
      const pollData: CreatePollOptions = {
        title: 'Binary Choice Poll',
        options: ['Yes', 'No']
      };

      const result = await createPoll(pollData);

      expect(result.success).toBe(true);
      expect(result.poll?.options).toHaveLength(2);
    });

    it('should handle exactly 10 options (maximum)', async () => {
      const options = Array.from({ length: 10 }, (_, i) => `Option ${i + 1}`);
      const pollData: CreatePollOptions = {
        title: 'Maximum Options Poll',
        options
      };

      const result = await createPoll(pollData);

      expect(result.success).toBe(true);
      expect(result.poll?.options).toHaveLength(10);
    });

    it('should handle options with special characters', async () => {
      const pollData: CreatePollOptions = {
        title: 'Special Characters Poll',
        options: ['Option with émojis 🎉', 'Option with symbols @#$%', 'Normal Option']
      };

      const result = await createPoll(pollData);

      expect(result.success).toBe(true);
      expect(result.poll?.options).toEqual(['Option with émojis 🎉', 'Option with symbols @#$%', 'Normal Option']);
    });

    it('should handle options with numbers and mixed case', async () => {
      const pollData: CreatePollOptions = {
        title: 'Mixed Content Poll',
        options: ['Option 1', 'OPTION 2', 'option 3', 'Option 4']
      };

      const result = await createPoll(pollData);

      expect(result.success).toBe(true);
      expect(result.poll?.options).toEqual(['Option 1', 'OPTION 2', 'option 3', 'Option 4']);
    });
  });

  describe('Data Validation', () => {
    it('should validate that votes array matches options length', async () => {
      const pollData: CreatePollOptions = {
        title: 'Vote Array Test',
        options: ['A', 'B', 'C', 'D']
      };

      const result = await createPoll(pollData);

      expect(result.success).toBe(true);
      expect(result.poll?.votes).toHaveLength(4);
      expect(result.poll?.votes).toEqual([0, 0, 0, 0]);
    });

    it('should generate unique poll IDs', async () => {
      const pollData: CreatePollOptions = {
        title: 'Unique ID Test',
        options: ['Option 1', 'Option 2']
      };

      const result1 = await createPoll(pollData);
      const result2 = await createPoll(pollData);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.poll?.id).not.toBe(result2.poll?.id);
    });

    it('should set createdAt to current date', async () => {
      const before = new Date();
      const pollData: CreatePollOptions = {
        title: 'Date Test',
        options: ['Option 1', 'Option 2']
      };

      const result = await createPoll(pollData);
      const after = new Date();

      expect(result.success).toBe(true);
      expect(result.poll?.createdAt).toBeInstanceOf(Date);
      expect(result.poll?.createdAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.poll?.createdAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
