import { renderHook, act } from '@testing-library/react';
import { usePollActions } from '@/app/hooks/use-poll-actions';
import { PollService } from '@/lib/poll-service';
import { useAuth } from '@/app/contexts/auth-context';

// Mock dependencies
jest.mock('@/lib/poll-service');
jest.mock('@/app/contexts/auth-context');

const mockPollService = PollService as jest.Mocked<typeof PollService>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('usePollActions Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Security', () => {
    it('should prevent unauthenticated poll creation', async () => {
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
          title: 'Malicious Poll',
          options: ['Option 1', 'Option 2'],
          isPublic: true,
          allowMultipleVotes: false
        });

        expect(success).toBe(false);
        expect(result.current.error).toBe('You must be logged in to create a poll');
      });

      // Verify no API call was made
      expect(mockPollService.createPoll).not.toHaveBeenCalled();
    });

    it('should prevent unauthenticated poll updates', async () => {
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
        const success = await result.current.updatePoll('poll-1', { title: 'Hacked Poll' });

        expect(success).toBe(false);
        expect(result.current.error).toBe('You must be logged in to update a poll');
      });

      expect(mockPollService.updatePoll).not.toHaveBeenCalled();
    });

    it('should prevent unauthenticated poll deletion', async () => {
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

      expect(mockPollService.deletePoll).not.toHaveBeenCalled();
    });

    it('should prevent unauthenticated voting', async () => {
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

      expect(mockPollService.submitVote).not.toHaveBeenCalled();
    });
  });

  describe('Input Validation Security', () => {
    beforeEach(() => {
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

    it('should reject invalid option indices', async () => {
      const { result } = renderHook(() => usePollActions());

      // Test negative index
      await act(async () => {
        const success = await result.current.submitVote('poll-1', -1);
        expect(success).toBe(false);
        expect(result.current.error).toBe('Invalid option selection');
      });

      // Test non-integer index
      await act(async () => {
        const success = await result.current.submitVote('poll-1', 1.5);
        expect(success).toBe(false);
        expect(result.current.error).toBe('Invalid option selection');
      });

      expect(mockPollService.submitVote).not.toHaveBeenCalled();
    });

    it('should handle malformed poll data gracefully', async () => {
      const { result } = renderHook(() => usePollActions());

      // Test with invalid poll data
      await act(async () => {
        const success = await result.current.createPoll({
          title: '', // Empty title should fail validation
          options: ['Option 1'], // Only one option should fail validation
          isPublic: true,
          allowMultipleVotes: false
        });

        expect(success).toBe(false);
        expect(result.current.error).toContain('Invalid poll data');
      });

      expect(mockPollService.createPoll).not.toHaveBeenCalled();
    });
  });

  describe('Error Information Disclosure', () => {
    beforeEach(() => {
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

    it('should sanitize database error messages', async () => {
      mockPollService.getPolls.mockResolvedValue({
        success: false,
        error: 'Database connection failed: host=localhost port=5432 user=admin password=secret'
      });

      const { result } = renderHook(() => usePollActions());

      await act(async () => {
        await result.current.fetchPolls();
      });

      // Should not contain sensitive information
      expect(result.current.error).not.toContain('password=secret');
      expect(result.current.error).not.toContain('host=localhost');
      expect(result.current.error).not.toContain('port=5432');
    });

    it('should sanitize connection error messages', async () => {
      mockPollService.createPoll.mockResolvedValue({
        success: false,
        error: 'Connection failed: user=admin password=secret123 database=polls'
      });

      const { result } = renderHook(() => usePollActions());

      await act(async () => {
        await result.current.createPoll({
          title: 'Test Poll',
          options: ['Option 1', 'Option 2'],
          isPublic: true,
          allowMultipleVotes: false
        });
      });

      // Should return generic error message for sensitive patterns
      expect(result.current.error).toBe('An error occurred while processing your request');
    });

    it('should preserve non-sensitive error messages', async () => {
      mockPollService.getPolls.mockResolvedValue({
        success: false,
        error: 'Poll not found'
      });

      const { result } = renderHook(() => usePollActions());

      await act(async () => {
        await result.current.fetchPolls();
      });

      expect(result.current.error).toBe('Poll not found');
    });
  });

  describe('Rate Limiting Awareness', () => {
    beforeEach(() => {
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

    it('should handle rate limiting responses gracefully', async () => {
      mockPollService.createPoll.mockResolvedValue({
        success: false,
        error: 'Too many requests'
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
        expect(result.current.error).toBe('Too many requests');
      });
    });
  });

  describe('State Management Security', () => {
    it('should not expose sensitive data in state', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User', createdAt: new Date(), updatedAt: new Date() },
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        updateProfile: jest.fn()
      });

      const { result } = renderHook(() => usePollActions());

      // State should not contain sensitive information
      expect(result.current.polls).toBeDefined();
      expect(result.current.isLoading).toBeDefined();
      expect(result.current.error).toBeDefined();
      expect(result.current.hasMore).toBeDefined();

      // Should not expose internal implementation details
      expect(result.current).not.toHaveProperty('user');
      expect(result.current).not.toHaveProperty('currentFilters');
    });

    it('should clear sensitive data on error', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User', createdAt: new Date(), updatedAt: new Date() },
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        updateProfile: jest.fn()
      });

      mockPollService.getPolls.mockRejectedValue(new Error('Sensitive error details'));

      const { result } = renderHook(() => usePollActions());

      await act(async () => {
        await result.current.fetchPolls();
      });

      // Error should be sanitized
      expect(result.current.error).toBe('Failed to fetch polls');
      expect(result.current.error).not.toContain('Sensitive error details');
    });
  });

  describe('Concurrent Operation Security', () => {
    beforeEach(() => {
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

    it('should handle concurrent operations safely', async () => {
      const { result } = renderHook(() => usePollActions());

      // Start multiple operations simultaneously
      await act(async () => {
        const promises = [
          result.current.fetchPolls(),
          result.current.fetchPolls(),
          result.current.fetchPolls()
        ];

        await Promise.all(promises);
      });

      // Should not cause state corruption
      expect(result.current.polls).toBeDefined();
      expect(result.current.isLoading).toBe(false);
    });

    it('should prevent race conditions in state updates', async () => {
      const { result } = renderHook(() => usePollActions());

      // Simulate rapid state changes
      await act(async () => {
        result.current.clearError();
        result.current.clearError();
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
