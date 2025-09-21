import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePollActions } from '@/app/hooks/use-poll-actions';
import { PollService } from '@/lib/poll-service';

// Mock the auth context
const mockUseAuth = vi.fn();
vi.mock('@/app/contexts/auth-context', () => ({
  useAuth: () => mockUseAuth()
}));

// Mock PollService
vi.mock('@/lib/poll-service', () => ({
  PollService: {
    getPolls: vi.fn(),
    getPollById: vi.fn(),
    createPoll: vi.fn(),
    updatePoll: vi.fn(),
    deletePoll: vi.fn(),
    submitVote: vi.fn()
  }
}));

describe('usePollActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123' },
      isAuthenticated: true
    });
  });

  describe('fetchPolls', () => {
    it('should fetch polls successfully', async () => {
      const mockPolls = [
        {
          id: 'poll-1',
          question: 'Test Poll 1',
          options: [
            { id: 'opt-1', text: 'Option 1', votes: 5, pollId: 'poll-1' },
            { id: 'opt-2', text: 'Option 2', votes: 3, pollId: 'poll-1' }
          ],
          votes: [5, 3],
          created_at: new Date().toISOString(),
          created_by: 'user-123',
          is_public: true,
          is_active: true,
          expires_at: undefined,
          allow_multiple_votes: false,
          description: undefined,
          author: {
            id: 'user-123',
            name: 'Test User',
            email: 'test@example.com',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      ];

      vi.mocked(PollService.getPolls).mockResolvedValue({
        success: true,
        data: mockPolls
      });

      const { result } = renderHook(() => usePollActions());

      await act(async () => {
        await result.current.fetchPolls();
      });

      expect(result.current.polls).toEqual(mockPolls);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle fetch polls error', async () => {
      vi.mocked(PollService.getPolls).mockResolvedValue({
        success: false,
        error: 'Failed to fetch polls'
      });

      const { result } = renderHook(() => usePollActions());

      await act(async () => {
        await result.current.fetchPolls();
      });

      expect(result.current.polls).toEqual([]);
      expect(result.current.error).toBe('Failed to fetch polls');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('createPoll', () => {
    it('should create poll successfully', async () => {
      const pollData = {
        title: 'New Poll',
        options: ['Option 1', 'Option 2'],
        isPublic: true,
        allowMultipleVotes: false
      };

      const mockCreatedPoll = {
        id: 'poll-new',
        question: 'New Poll',
        options: [
          { id: 'opt-1', text: 'Option 1', votes: 0, pollId: 'poll-new' },
          { id: 'opt-2', text: 'Option 2', votes: 0, pollId: 'poll-new' }
        ],
        votes: [0, 0],
        created_at: new Date().toISOString(),
        created_by: 'user-123',
        is_public: true,
        is_active: true,
        expires_at: undefined,
        allow_multiple_votes: false,
        description: undefined,
        author: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };

      vi.mocked(PollService.createPoll).mockResolvedValue({
        success: true,
        data: mockCreatedPoll
      });

      const { result } = renderHook(() => usePollActions());

      let createResult;
      await act(async () => {
        createResult = await result.current.createPoll(pollData);
      });

      expect(createResult?.success).toBe(true);
      expect(result.current.polls).toContain(mockCreatedPoll);
      expect(result.current.error).toBe(null);
    });

    it('should handle create poll error', async () => {
      const pollData = {
        title: 'New Poll',
        options: ['Option 1', 'Option 2'],
        isPublic: true,
        allowMultipleVotes: false
      };

      vi.mocked(PollService.createPoll).mockResolvedValue({
        success: false,
        error: 'Failed to create poll'
      });

      const { result } = renderHook(() => usePollActions());

      let createResult;
      await act(async () => {
        createResult = await result.current.createPoll(pollData);
      });

      expect(createResult?.success).toBe(false);
      expect(result.current.error).toBe('Failed to create poll');
    });

    it('should handle unauthenticated user', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false
      });

      const pollData = {
        title: 'New Poll',
        options: ['Option 1', 'Option 2'],
        isPublic: true,
        allowMultipleVotes: false
      };

      const { result } = renderHook(() => usePollActions());

      let createResult;
      await act(async () => {
        createResult = await result.current.createPoll(pollData);
      });

      expect(createResult?.success).toBe(false);
      expect(result.current.error).toBe('You must be logged in to create a poll');
    });
  });

  describe('updatePoll', () => {
    it('should update poll successfully', async () => {
      const pollId = 'poll-1';
      const updates = {
        title: 'Updated Poll'
      };

      const mockUpdatedPoll = {
        id: pollId,
        question: 'Updated Poll',
        options: [
          { id: 'opt-1', text: 'Option 1', votes: 5, pollId },
          { id: 'opt-2', text: 'Option 2', votes: 3, pollId }
        ],
        votes: [5, 3],
        created_at: new Date().toISOString(),
        created_by: 'user-123',
        is_public: true,
        is_active: true,
        expires_at: undefined,
        allow_multiple_votes: false,
        description: undefined,
        author: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };

      vi.mocked(PollService.updatePoll).mockResolvedValue({
        success: true,
        data: mockUpdatedPoll
      });

      const { result } = renderHook(() => usePollActions());

      // Set initial polls
      act(() => {
        result.current.polls = [{
          id: pollId,
          question: 'Original Poll',
          options: [],
          votes: [],
          created_at: new Date().toISOString(),
          created_by: 'user-123',
          is_public: true,
          is_active: true,
          expires_at: undefined,
          allow_multiple_votes: false,
          description: undefined
        }];
      });

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updatePoll(pollId, updates);
      });

      expect(updateResult?.success).toBe(true);
      expect(result.current.polls.find(p => p.id === pollId)?.question).toBe('Updated Poll');
    });
  });

  describe('deletePoll', () => {
    it('should delete poll successfully', async () => {
      const pollId = 'poll-1';

      vi.mocked(PollService.deletePoll).mockResolvedValue({
        success: true,
        data: null
      });

      const { result } = renderHook(() => usePollActions());

      // Set initial polls
      act(() => {
        result.current.polls = [{
          id: pollId,
          question: 'Test Poll',
          options: [],
          votes: [],
          created_at: new Date().toISOString(),
          created_by: 'user-123',
          is_public: true,
          is_active: true,
          expires_at: undefined,
          allow_multiple_votes: false,
          description: undefined
        }];
      });

      let deleteResult;
      await act(async () => {
        deleteResult = await result.current.deletePoll(pollId);
      });

      expect(deleteResult?.success).toBe(true);
      expect(result.current.polls).toHaveLength(0);
    });
  });

  describe('submitVote', () => {
    it('should submit vote successfully', async () => {
      const pollId = 'poll-1';
      const optionIndex = 0;

      const mockUpdatedPoll = {
        id: pollId,
        question: 'Test Poll',
        options: [
          { id: 'opt-1', text: 'Option 1', votes: 6, pollId },
          { id: 'opt-2', text: 'Option 2', votes: 3, pollId }
        ],
        votes: [6, 3],
        created_at: new Date().toISOString(),
        created_by: 'user-456',
        is_public: true,
        is_active: true,
        expires_at: undefined,
        allow_multiple_votes: false,
        description: undefined,
        author: {
          id: 'user-456',
          name: 'Creator',
          email: 'creator@example.com',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };

      vi.mocked(PollService.submitVote).mockResolvedValue({
        success: true,
        data: mockUpdatedPoll
      });

      const { result } = renderHook(() => usePollActions());

      // Set initial polls
      act(() => {
        result.current.polls = [{
          id: pollId,
          question: 'Test Poll',
          options: [
            { id: 'opt-1', text: 'Option 1', votes: 5, pollId },
            { id: 'opt-2', text: 'Option 2', votes: 3, pollId }
          ],
          votes: [5, 3],
          created_at: new Date().toISOString(),
          created_by: 'user-456',
          is_public: true,
          is_active: true,
          expires_at: undefined,
          allow_multiple_votes: false,
          description: undefined
        }];
      });

      let voteResult;
      await act(async () => {
        voteResult = await result.current.submitVote(pollId, optionIndex);
      });

      expect(voteResult?.success).toBe(true);
      expect(result.current.polls.find(p => p.id === pollId)?.options[0].votes).toBe(6);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => usePollActions());

      // Set an error
      act(() => {
        result.current.error = 'Some error';
      });

      expect(result.current.error).toBe('Some error');

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });
});
