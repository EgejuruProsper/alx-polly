import { useState, useCallback } from 'react';
import { PollService, type ServiceResult, type PollFilters, type VoteData } from '@/lib/poll-service';
import { Poll } from '@/types';
import { useAuth } from '@/app/contexts/auth-context';
import { createPollSchema, type CreatePollFormData } from '@/lib/validations';

/**
 * Enhanced poll actions hook with improved security and type safety
 * 
 * WHY: Provides secure poll management with proper validation and error handling.
 * Centralizes poll operations with client-side validation and server-side enforcement.
 * 
 * Security considerations:
 * - Input validation with Zod schemas
 * - Authentication checks for all write operations
 * - Sanitized error messages
 * - Type-safe operations
 * 
 * Edge cases:
 * - Network failures → graceful error handling
 * - Invalid data → validation errors
 * - Authentication failures → clear error messages
 */
interface UsePollActionsReturn {
  // State
  polls: Poll[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;

  // Actions
  fetchPolls: (filters?: PollFilters) => Promise<void>;
  fetchPollById: (id: string) => Promise<Poll | null>;
  createPoll: (pollData: CreatePollFormData) => Promise<boolean>;
  updatePoll: (id: string, updates: Partial<CreatePollFormData>) => Promise<boolean>;
  deletePoll: (id: string) => Promise<boolean>;
  submitVote: (pollId: string, optionIndex: number) => Promise<boolean>;
  
  // Utilities
  clearError: () => void;
  refetch: () => Promise<void>;
}

export function usePollActions(initialFilters?: PollFilters): UsePollActionsReturn {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<PollFilters>(initialFilters || {});

  /**
   * Clear error state
   * 
   * WHY: Allows users to dismiss errors and retry operations.
   * Provides clean state management for error handling.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Sanitize error messages to prevent information disclosure
   * 
   * WHY: Prevents sensitive server information from being exposed to clients.
   * Maintains security while providing useful feedback.
   * 
   * @param error - Raw error message from server
   * @returns Sanitized error message safe for client display
   */
  const sanitizeError = useCallback((error: string): string => {
    // Remove database-specific error details
    const sanitized = error
      .replace(/password[=:]\s*\S+/gi, 'password=***')
      .replace(/connection[=:]\s*\S+/gi, 'connection=***')
      .replace(/database[=:]\s*\S+/gi, 'database=***')
      .replace(/host[=:]\s*\S+/gi, 'host=***')
      .replace(/port[=:]\s*\S+/gi, 'port=***')
      .replace(/user[=:]\s*\S+/gi, 'user=***')
      .replace(/at line \d+/gi, 'at line ***')
      .replace(/position \d+/gi, 'position ***');
    
    // If message contains sensitive patterns, return generic message
    if (error.includes('password') || error.includes('connection') || error.includes('database')) {
      return 'An error occurred while processing your request';
    }
    
    return sanitized;
  }, []);

  /**
   * Fetch polls with filtering and pagination
   * 
   * WHY: Provides secure access to public polls with proper error handling.
   * Implements client-side caching and state management.
   * 
   * Security considerations:
   * - No sensitive data exposed
   * - Sanitized error messages
   * - Proper loading states
   * 
   * @param filters - Optional filters for poll query
   */
  const fetchPolls = useCallback(async (filters?: PollFilters) => {
    setIsLoading(true);
    setError(null);

    try {
      const filtersToUse = filters || currentFilters;
      const result = await PollService.getPolls(filtersToUse);

      if (result.success && result.data) {
        setPolls(result.data);
        setHasMore(result.data.length === (filtersToUse.limit || 20));
        setCurrentFilters(filtersToUse);
      } else {
        setError(sanitizeError(result.error || 'Failed to fetch polls'));
      }
    } catch (err) {
      setError('Failed to fetch polls');
    } finally {
      setIsLoading(false);
    }
  }, [currentFilters, sanitizeError]);

  /**
   * Fetch a single poll by ID
   * 
   * WHY: Provides secure access to individual poll data.
   * Handles errors gracefully and maintains loading states.
   * 
   * @param id - Poll ID to fetch
   * @returns Poll data or null if not found
   */
  const fetchPollById = useCallback(async (id: string): Promise<Poll | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await PollService.getPollById(id);

      if (result.success && result.data) {
        return result.data;
      } else {
        setError(sanitizeError(result.error || 'Failed to fetch poll'));
        return null;
      }
    } catch (err) {
      setError('Failed to fetch poll');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sanitizeError]);

  /**
   * Create a new poll with validation
   * 
   * WHY: Ensures only authenticated users can create polls with valid data.
   * Provides client-side validation before server submission.
   * 
   * Security considerations:
   * - Authentication required
   * - Input validation with Zod
   * - Server-side user ID enforcement
   * 
   * @param pollData - Validated poll data
   * @returns Success status
   */
  const createPoll = useCallback(async (pollData: CreatePollFormData): Promise<boolean> => {
    if (!user) {
      setError('You must be logged in to create a poll');
      return false;
    }

    // Client-side validation
    try {
      createPollSchema.parse(pollData);
    } catch (validationError) {
      setError('Invalid poll data. Please check your input.');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await PollService.createPoll(pollData, user.id);

      if (result.success && result.data) {
        // Add new poll to the beginning of the list
        setPolls(prev => [result.data!, ...prev]);
        return true;
      } else {
        setError(sanitizeError(result.error || 'Failed to create poll'));
        return false;
      }
    } catch (err) {
      setError('Failed to create poll');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, sanitizeError]);

  /**
   * Update an existing poll
   * 
   * WHY: Allows poll owners to modify their polls with proper validation.
   * Ensures data integrity and ownership verification.
   * 
   * @param id - Poll ID to update
   * @param updates - Partial poll data to update
   * @returns Success status
   */
  const updatePoll = useCallback(async (id: string, updates: Partial<CreatePollFormData>): Promise<boolean> => {
    if (!user) {
      setError('You must be logged in to update a poll');
      return false;
    }

    // Validate updates if provided
    if (updates && Object.keys(updates).length > 0) {
      try {
        createPollSchema.partial().parse(updates);
      } catch (validationError) {
        setError('Invalid poll data. Please check your input.');
        return false;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await PollService.updatePoll(id, updates, user.id);

      if (result.success && result.data) {
        // Update poll in the list
        setPolls(prev => prev.map(poll => 
          poll.id === id ? result.data! : poll
        ));
        return true;
      } else {
        setError(sanitizeError(result.error || 'Failed to update poll'));
        return false;
      }
    } catch (err) {
      setError('Failed to update poll');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, sanitizeError]);

  /**
   * Delete a poll
   * 
   * WHY: Allows poll owners to remove their polls with proper authorization.
   * Maintains data consistency and user experience.
   * 
   * @param id - Poll ID to delete
   * @returns Success status
   */
  const deletePoll = useCallback(async (id: string): Promise<boolean> => {
    if (!user) {
      setError('You must be logged in to delete a poll');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await PollService.deletePoll(id, user.id);

      if (result.success) {
        // Remove poll from the list
        setPolls(prev => prev.filter(poll => poll.id !== id));
        return true;
      } else {
        setError(sanitizeError(result.error || 'Failed to delete poll'));
        return false;
      }
    } catch (err) {
      setError('Failed to delete poll');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, sanitizeError]);

  /**
   * Submit a vote for a poll option
   * 
   * WHY: Handles voting with proper validation and state updates.
   * Ensures one vote per user per poll (unless multiple votes allowed).
   * 
   * Security considerations:
   * - Authentication required
   * - Option index validation
   * - Server-side vote enforcement
   * 
   * @param pollId - Poll ID to vote on
   * @param optionIndex - Index of the selected option
   * @returns Success status
   */
  const submitVote = useCallback(async (pollId: string, optionIndex: number): Promise<boolean> => {
    if (!user) {
      setError('You must be logged in to vote');
      return false;
    }

    // Validate option index
    if (optionIndex < 0 || !Number.isInteger(optionIndex)) {
      setError('Invalid option selection');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const voteData: VoteData = {
        pollId,
        optionIndex,
        userId: user.id
      };

      const result = await PollService.submitVote(voteData);

      if (result.success && result.data) {
        // Update poll in the list with new vote counts
        setPolls(prev => prev.map(poll => 
          poll.id === pollId ? result.data! : poll
        ));
        return true;
      } else {
        setError(sanitizeError(result.error || 'Failed to submit vote'));
        return false;
      }
    } catch (err) {
      setError('Failed to submit vote');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, sanitizeError]);

  /**
   * Refetch polls with current filters
   * 
   * WHY: Provides easy way to refresh data without changing filters.
   * Useful for manual refresh or after external changes.
   */
  const refetch = useCallback(async () => {
    await fetchPolls();
  }, [fetchPolls]);

  return {
    // State
    polls,
    isLoading,
    error,
    hasMore,

    // Actions
    fetchPolls,
    fetchPollById,
    createPoll,
    updatePoll,
    deletePoll,
    submitVote,
    
    // Utilities
    clearError,
    refetch,
  };
}
