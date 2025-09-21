import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PollService } from '@/lib/poll-service';
import { createPollSchema } from '@/lib/validations';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn()
    }))
  }))
};

vi.mock('@/app/lib/supabase', () => ({
  createServerSupabaseClient: () => mockSupabaseClient,
  supabase: mockSupabaseClient
}));

describe('PollService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPoll', () => {
    it('should create a poll successfully', async () => {
      const pollData = {
        title: 'Test Poll',
        options: ['Option 1', 'Option 2'],
        isPublic: true,
        allowMultipleVotes: false
      };
      const userId = 'user-123';

      const mockPoll = {
        id: 'poll-123',
        question: 'Test Poll',
        options: ['Option 1', 'Option 2'],
        votes: [0, 0],
        created_by: userId,
        is_public: true,
        is_active: true,
        allow_multiple_votes: false,
        description: null,
        expires_at: null,
        created_at: new Date().toISOString(),
        author: {
          id: userId,
          email: 'test@example.com',
          raw_user_meta_data: { name: 'Test User' }
        }
      };

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: mockPoll,
        error: null
      });

      const result = await PollService.createPoll(pollData, userId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.question).toBe('Test Poll');
    });

    it('should handle validation errors', async () => {
      const invalidPollData = {
        title: '', // Invalid: empty title
        options: ['Option 1'], // Invalid: only one option
        isPublic: true,
        allowMultipleVotes: false
      };
      const userId = 'user-123';

      const result = await PollService.createPoll(invalidPollData, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle database errors', async () => {
      const pollData = {
        title: 'Test Poll',
        options: ['Option 1', 'Option 2'],
        isPublic: true,
        allowMultipleVotes: false
      };
      const userId = 'user-123';

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await PollService.createPoll(pollData, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('getPolls', () => {
    it('should fetch polls with filters', async () => {
      const filters = {
        search: 'test',
        sortBy: 'newest',
        limit: 10,
        offset: 0
      };

      const mockPolls = [
        {
          id: 'poll-1',
          question: 'Test Poll 1',
          options: ['Option 1', 'Option 2'],
          votes: [5, 3],
          created_by: 'user-1',
          is_public: true,
          is_active: true,
          allow_multiple_votes: false,
          description: null,
          expires_at: null,
          created_at: new Date().toISOString(),
          author: {
            id: 'user-1',
            email: 'user1@example.com',
            raw_user_meta_data: { name: 'User 1' }
          }
        }
      ];

      mockSupabaseClient.from().select().eq().eq().or().order().range.mockResolvedValue({
        data: mockPolls,
        error: null
      });

      const result = await PollService.getPolls(filters);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getPollById', () => {
    it('should fetch a single poll by ID', async () => {
      const pollId = 'poll-123';
      const mockPoll = {
        id: pollId,
        question: 'Test Poll',
        options: ['Option 1', 'Option 2'],
        votes: [5, 3],
        created_by: 'user-123',
        is_public: true,
        is_active: true,
        allow_multiple_votes: false,
        description: null,
        expires_at: null,
        created_at: new Date().toISOString(),
        author: {
          id: 'user-123',
          email: 'test@example.com',
          raw_user_meta_data: { name: 'Test User' }
        }
      };

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockPoll,
        error: null
      });

      const result = await PollService.getPollById(pollId);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(pollId);
    });

    it('should handle poll not found', async () => {
      const pollId = 'non-existent';

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'No rows found' }
      });

      const result = await PollService.getPollById(pollId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Poll not found');
    });
  });

  describe('updatePoll', () => {
    it('should update a poll successfully', async () => {
      const pollId = 'poll-123';
      const userId = 'user-123';
      const updates = {
        title: 'Updated Poll',
        options: ['New Option 1', 'New Option 2']
      };

      const mockUpdatedPoll = {
        id: pollId,
        question: 'Updated Poll',
        options: ['New Option 1', 'New Option 2'],
        votes: [0, 0],
        created_by: userId,
        is_public: true,
        is_active: true,
        allow_multiple_votes: false,
        description: null,
        expires_at: null,
        created_at: new Date().toISOString(),
        author: {
          id: userId,
          email: 'test@example.com',
          raw_user_meta_data: { name: 'Test User' }
        }
      };

      // Mock ownership check
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: { created_by: userId },
        error: null
      });

      // Mock update
      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: mockUpdatedPoll,
        error: null
      });

      const result = await PollService.updatePoll(pollId, updates, userId);

      expect(result.success).toBe(true);
      expect(result.data?.question).toBe('Updated Poll');
    });

    it('should handle unauthorized update', async () => {
      const pollId = 'poll-123';
      const userId = 'user-123';
      const otherUserId = 'user-456';
      const updates = {
        title: 'Updated Poll'
      };

      // Mock ownership check - user doesn't own poll
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: { created_by: otherUserId },
        error: null
      });

      const result = await PollService.updatePoll(pollId, updates, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('You are not authorized to update this poll');
    });
  });

  describe('deletePoll', () => {
    it('should delete a poll successfully', async () => {
      const pollId = 'poll-123';
      const userId = 'user-123';

      // Mock ownership check
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: { created_by: userId },
        error: null
      });

      // Mock delete
      mockSupabaseClient.from().delete().eq.mockResolvedValue({
        error: null
      });

      const result = await PollService.deletePoll(pollId, userId);

      expect(result.success).toBe(true);
    });

    it('should handle unauthorized deletion', async () => {
      const pollId = 'poll-123';
      const userId = 'user-123';
      const otherUserId = 'user-456';

      // Mock ownership check - user doesn't own poll
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: { created_by: otherUserId },
        error: null
      });

      const result = await PollService.deletePoll(pollId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('You are not authorized to delete this poll');
    });
  });

  describe('submitVote', () => {
    it('should submit a vote successfully', async () => {
      const voteData = {
        pollId: 'poll-123',
        optionIndex: 0,
        userId: 'user-123'
      };

      const mockPoll = {
        id: 'poll-123',
        question: 'Test Poll',
        options: ['Option 1', 'Option 2'],
        votes: [0, 0],
        created_by: 'user-456',
        is_public: true,
        is_active: true,
        allow_multiple_votes: false,
        description: null,
        expires_at: null,
        created_at: new Date().toISOString(),
        author: {
          id: 'user-456',
          email: 'creator@example.com',
          raw_user_meta_data: { name: 'Creator' }
        }
      };

      // Mock poll fetch
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: mockPoll,
        error: null
      });

      // Mock vote check (no existing vote)
      mockSupabaseClient.from().select().eq().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' } // No rows found
      });

      // Mock vote insert
      mockSupabaseClient.from().insert.mockResolvedValue({
        error: null
      });

      // Mock updated poll fetch
      const updatedPoll = { ...mockPoll, votes: [1, 0] };
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: updatedPoll,
        error: null
      });

      const result = await PollService.submitVote(voteData);

      expect(result.success).toBe(true);
      expect(result.data?.options[0].votes).toBe(1);
    });

    it('should handle duplicate vote', async () => {
      const voteData = {
        pollId: 'poll-123',
        optionIndex: 0,
        userId: 'user-123'
      };

      const mockPoll = {
        id: 'poll-123',
        question: 'Test Poll',
        options: ['Option 1', 'Option 2'],
        votes: [0, 0],
        created_by: 'user-456',
        is_public: true,
        is_active: true,
        allow_multiple_votes: false,
        description: null,
        expires_at: null,
        created_at: new Date().toISOString(),
        author: {
          id: 'user-456',
          email: 'creator@example.com',
          raw_user_meta_data: { name: 'Creator' }
        }
      };

      // Mock poll fetch
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: mockPoll,
        error: null
      });

      // Mock vote check (existing vote found)
      mockSupabaseClient.from().select().eq().eq().single.mockResolvedValueOnce({
        data: { id: 'vote-123' },
        error: null
      });

      const result = await PollService.submitVote(voteData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('You have already voted on this poll');
    });
  });
});
