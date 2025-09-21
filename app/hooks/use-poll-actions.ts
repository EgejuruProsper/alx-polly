import { useState, useCallback } from 'react';
import { PollService, type ServiceResult, type PollFilters, type VoteData } from '@/lib/poll-service';
import { Poll } from '@/types';
import { useAuth } from '@/app/contexts/auth-context';

interface UsePollActionsReturn {
  // State
  polls: Poll[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;

  // Actions
  fetchPolls: (filters?: PollFilters) => Promise<void>;
  fetchPollById: (id: string) => Promise<Poll | null>;
  createPoll: (pollData: any) => Promise<boolean>;
  updatePoll: (id: string, updates: any) => Promise<boolean>;
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

  const clearError = useCallback(() => {
    setError(null);
  }, []);

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
        setError(result.error || 'Failed to fetch polls');
      }
    } catch (err) {
      setError('Failed to fetch polls');
    } finally {
      setIsLoading(false);
    }
  }, [currentFilters]);

  const fetchPollById = useCallback(async (id: string): Promise<Poll | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await PollService.getPollById(id);

      if (result.success && result.data) {
        return result.data;
      } else {
        setError(result.error || 'Failed to fetch poll');
        return null;
      }
    } catch (err) {
      setError('Failed to fetch poll');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPoll = useCallback(async (pollData: any): Promise<boolean> => {
    if (!user) {
      setError('You must be logged in to create a poll');
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
        setError(result.error || 'Failed to create poll');
        return false;
      }
    } catch (err) {
      setError('Failed to create poll');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updatePoll = useCallback(async (id: string, updates: any): Promise<boolean> => {
    if (!user) {
      setError('You must be logged in to update a poll');
      return false;
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
        setError(result.error || 'Failed to update poll');
        return false;
      }
    } catch (err) {
      setError('Failed to update poll');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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
        setError(result.error || 'Failed to delete poll');
        return false;
      }
    } catch (err) {
      setError('Failed to delete poll');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const submitVote = useCallback(async (pollId: string, optionIndex: number): Promise<boolean> => {
    if (!user) {
      setError('You must be logged in to vote');
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
        setError(result.error || 'Failed to submit vote');
        return false;
      }
    } catch (err) {
      setError('Failed to submit vote');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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
