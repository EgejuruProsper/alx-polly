import { renderHook, act, waitFor } from '@testing-library/react';
import { usePollActions } from '@/app/hooks/use-poll-actions';
import { PollService } from '@/lib/poll-service';
import { useAuth } from '@/app/contexts/auth-context';
import { Poll } from '@/types';

// Mock dependencies
jest.mock('@/lib/poll-service');
jest.mock('@/app/contexts/auth-context');

const mockPollService = PollService as jest.Mocked<typeof PollService>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock poll data
const mockPoll: Poll = {
  id: '1',
  question: 'Test Poll',
  options: [
    { id: '1-0', text: 'Option 1', votes: 5, pollId: '1' },
    { id: '1-1', text: 'Option 2', votes: 3, pollId: '1' }
  ],
  votes: [5, 3],
  created_at: '2024-01-01T00:00:00Z',
  created_by: 'user-1',
  is_public: true,
  is_active: true,
  allow_multiple_votes: false,
  author: {
    id: 'user-1',
    name: 'Test User',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
};

describe('usePollActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default auth mock
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User', createdAt: new Date(), updatedAt: new Date() },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateProfile: jest.fn()
    });
  });

  describe('Security Tests', () => {
    it('should require authentication for createPoll', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        updateProfile: jest.fn()
      });

      const { result } = renderHook(() => usePollActions());

      await act(async () => {
        const success = await result.current.createPoll({
          title: 'Test Poll',
          options: ['Option 1', 'Option 2'],
          isPublic: true,
          allowMultipleVotes: false
        });

        expect(success).toBe(false);
        expect(result.current.error).toBe('You must be logged in to create a poll');
      });
    });

    it('should require authentication for updatePoll', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        updateProfile: jest.fn()
      });

      const { result } = renderHook(() => usePollActions());

      await act(async () => {
        const success = await result.current.updatePoll('poll-1', { title: 'Updated Poll' });

        expect(success).toBe(false);
        expect(result.current.error).toBe('You must be logged in to update a poll');
      });
    });

    it('should require authentication for deletePoll', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        updateProfile: jest.fn()
      });

      const { result } = renderHook(() => usePollActions());

      await act(async () => {
        const success = await result.current.deletePoll('poll-1');

        expect(success).toBe(false);
        expect(result.current.error).toBe('You must be logged in to delete a poll');
      });
    });

    it('should require authentication for submitVote', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        updateProfile: jest.fn()
      });

      const { result } = renderHook(() => usePollActions());

      await act(async () => {
        const success = await result.current.submitVote('poll-1', 0);

        expect(success).toBe(false);
        expect(result.current.error).toBe('You must be logged in to vote');
      });
    });

    it('should handle invalid option index for voting', async () => {
      const { result } = renderHook(() => usePollActions());

      await act(async () => {
        const success = await result.current.submitVote('poll-1', -1);

        expect(success).toBe(false);
        expect(result.current.error).toBe('Invalid option selection');
      });
    });
  });

  describe('Functionality Tests', () => {
    it('should fetch polls successfully', async () => {
      mockPollService.getPolls.mockResolvedValue({
        success: true,
        data: [mockPoll]
      });

      const { result } = renderHook(() => usePollActions());

      await act(async () => {
        await result.current.fetchPolls();
      });

      expect(result.current.polls).toEqual([mockPoll]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should create poll successfully', async () => {
      mockPollService.createPoll.mockResolvedValue({
        success: true,
        data: mockPoll
      });

      const { result } = renderHook(() => usePollActions());

      await act(async () => {
        const success = await result.current.createPoll({
          title: 'Test Poll',
          options: ['Option 1', 'Option 2'],
          isPublic: true,
          allowMultipleVotes: false
        });

        expect(success).toBe(true);
        expect(result.current.polls).toContain(mockPoll);
      });
    });

    it('should update poll successfully', async () => {
      const updatedPoll = { ...mockPoll, question: 'Updated Poll' };
      mockPollService.updatePoll.mockResolvedValue({
        success: true,
        data: updatedPoll
      });

      const { result } = renderHook(() => usePollActions({
        polls: [mockPoll],
        isLoading: false,
        error: null,
        hasMore: false,
        fetchPolls: jest.fn(),
        fetchPollById: jest.fn(),
        createPoll: jest.fn(),
        updatePoll: jest.fn(),
        deletePoll: jest.fn(),
        submitVote: jest.fn(),
        clearError: jest.fn(),
        refetch: jest.fn()
      }));

      await act(async () => {
        const success = await result.current.updatePoll('1', { title: 'Updated Poll' });

        expect(success).toBe(true);
      });
    });

    it('should delete poll successfully', async () => {
      mockPollService.deletePoll.mockResolvedValue({
        success: true
      });

      const { result } = renderHook(() => usePollActions());

      // Set initial polls
      act(() => {
        result.current.polls = [mockPoll];
      });

      await act(async () => {
        const success = await result.current.deletePoll('1');

        expect(success).toBe(true);
        expect(result.current.polls).not.toContain(mockPoll);
      });
    });

    it('should submit vote successfully', async () => {
      const updatedPoll = { ...mockPoll, votes: [6, 3] };
      mockPollService.submitVote.mockResolvedValue({
        success: true,
        data: updatedPoll
      });

      const { result } = renderHook(() => usePollActions());

      // Set initial polls
      act(() => {
        result.current.polls = [mockPoll];
      });

      await act(async () => {
        const success = await result.current.submitVote('1', 0);

        expect(success).toBe(true);
      });
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle network errors gracefully', async () => {
      mockPollService.getPolls.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePollActions());

      await act(async () => {
        await result.current.fetchPolls();
      });

      expect(result.current.error).toBe('Failed to fetch polls');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle server errors gracefully', async () => {
      mockPollService.getPolls.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      const { result } = renderHook(() => usePollActions());

      await act(async () => {
        await result.current.fetchPolls();
      });

      expect(result.current.error).toBe('Database connection failed');
      expect(result.current.polls).toEqual([]);
    });

    it('should clear errors when clearError is called', async () => {
      const { result } = renderHook(() => usePollActions());

      // Set an error
      act(() => {
        result.current.error = 'Test error';
      });

      expect(result.current.error).toBe('Test error');

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty poll list', async () => {
      mockPollService.getPolls.mockResolvedValue({
        success: true,
        data: []
      });

      const { result } = renderHook(() => usePollActions());

      await act(async () => {
        await result.current.fetchPolls();
      });

      expect(result.current.polls).toEqual([]);
      expect(result.current.hasMore).toBe(false);
    });

    it('should handle concurrent operations', async () => {
      mockPollService.getPolls.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: [mockPoll]
        }), 100))
      );

      const { result } = renderHook(() => usePollActions());

      // Start multiple concurrent operations
      await act(async () => {
        const promises = [
          result.current.fetchPolls(),
          result.current.fetchPolls(),
          result.current.fetchPolls()
        ];
        await Promise.all(promises);
      });

      expect(result.current.polls).toEqual([mockPoll]);
    });

    it('should handle invalid poll ID', async () => {
      mockPollService.getPollById.mockResolvedValue({
        success: false,
        error: 'Poll not found'
      });

      const { result } = renderHook(() => usePollActions());

      await act(async () => {
        const poll = await result.current.fetchPollById('invalid-id');

        expect(poll).toBeNull();
        expect(result.current.error).toBe('Poll not found');
      });
    });
  });

  describe('Loading States', () => {
    it('should set loading state during operations', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockPollService.getPolls.mockReturnValue(promise);

      const { result } = renderHook(() => usePollActions());

      // Start operation
      act(() => {
        result.current.fetchPolls();
      });

      expect(result.current.isLoading).toBe(true);

      // Complete operation
      await act(async () => {
        resolvePromise!({
          success: true,
          data: [mockPoll]
        });
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});