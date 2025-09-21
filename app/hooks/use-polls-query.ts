"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PollService } from '@/lib/poll-service';
import { Poll } from '@/types';
import { CreatePollFormData, UpdatePollFormData } from '@/lib/validations';

// Query keys
export const pollKeys = {
  all: ['polls'] as const,
  lists: () => [...pollKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...pollKeys.lists(), filters] as const,
  details: () => [...pollKeys.all, 'detail'] as const,
  detail: (id: string) => [...pollKeys.details(), id] as const,
};

// Hook for fetching polls with filters
export function usePolls(filters: {
  search?: string;
  sortBy?: "newest" | "oldest" | "most-voted" | "least-voted";
  limit?: number;
  offset?: number;
} = {}) {
  return useQuery({
    queryKey: pollKeys.list(filters),
    queryFn: async () => {
      const result = await PollService.getPolls(filters);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch polls');
      }
      return result.data || [];
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook for fetching a single poll
export function usePoll(id: string) {
  return useQuery({
    queryKey: pollKeys.detail(id),
    queryFn: async () => {
      const result = await PollService.getPollById(id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch poll');
      }
      return result.data;
    },
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Hook for creating a poll
export function useCreatePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pollData, userId }: { pollData: CreatePollFormData; userId: string }) => {
      const result = await PollService.createPoll(pollData, userId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create poll');
      }
      return result.data;
    },
    onSuccess: (newPoll) => {
      // Invalidate and refetch polls list
      queryClient.invalidateQueries({ queryKey: pollKeys.lists() });
      
      // Add the new poll to the cache
      if (newPoll) {
        queryClient.setQueryData(pollKeys.detail(newPoll.id), newPoll);
      }
    },
    onError: (error) => {
      console.error('Failed to create poll:', error);
    },
  });
}

// Hook for updating a poll
export function useUpdatePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      pollId, 
      updates, 
      userId 
    }: { 
      pollId: string; 
      updates: UpdatePollFormData; 
      userId: string; 
    }) => {
      const result = await PollService.updatePoll(pollId, updates, userId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update poll');
      }
      return result.data;
    },
    onSuccess: (updatedPoll) => {
      // Update the specific poll in cache
      if (updatedPoll) {
        queryClient.setQueryData(pollKeys.detail(updatedPoll.id), updatedPoll);
      }
      
      // Invalidate polls list to reflect changes
      queryClient.invalidateQueries({ queryKey: pollKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to update poll:', error);
    },
  });
}

// Hook for deleting a poll
export function useDeletePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pollId, userId }: { pollId: string; userId: string }) => {
      const result = await PollService.deletePoll(pollId, userId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete poll');
      }
      return result.data;
    },
    onSuccess: (_, { pollId }) => {
      // Remove the poll from cache
      queryClient.removeQueries({ queryKey: pollKeys.detail(pollId) });
      
      // Invalidate polls list
      queryClient.invalidateQueries({ queryKey: pollKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to delete poll:', error);
    },
  });
}

// Hook for submitting a vote
export function useSubmitVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      pollId, 
      optionIndex, 
      userId 
    }: { 
      pollId: string; 
      optionIndex: number; 
      userId: string; 
    }) => {
      const result = await PollService.submitVote({
        pollId,
        optionIndex,
        userId
      });
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit vote');
      }
      return result.data;
    },
    onSuccess: (updatedPoll) => {
      // Update the poll in cache with new vote counts
      if (updatedPoll) {
        queryClient.setQueryData(pollKeys.detail(updatedPoll.id), updatedPoll);
      }
      
      // Invalidate polls list to reflect vote changes
      queryClient.invalidateQueries({ queryKey: pollKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to submit vote:', error);
    },
  });
}

// Hook for prefetching a poll
export function usePrefetchPoll() {
  const queryClient = useQueryClient();

  return (pollId: string) => {
    queryClient.prefetchQuery({
      queryKey: pollKeys.detail(pollId),
      queryFn: async () => {
        const result = await PollService.getPollById(pollId);
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch poll');
        }
        return result.data;
      },
      staleTime: 60 * 1000, // 1 minute
    });
  };
}

// Hook for optimistic updates
export function useOptimisticPolls() {
  const queryClient = useQueryClient();

  const addPoll = (newPoll: Poll) => {
    queryClient.setQueryData(pollKeys.detail(newPoll.id), newPoll);
    queryClient.invalidateQueries({ queryKey: pollKeys.lists() });
  };

  const updatePoll = (pollId: string, updates: Partial<Poll>) => {
    queryClient.setQueryData(pollKeys.detail(pollId), (old: Poll | undefined) => {
      if (!old) return old;
      return { ...old, ...updates };
    });
  };

  const removePoll = (pollId: string) => {
    queryClient.removeQueries({ queryKey: pollKeys.detail(pollId) });
    queryClient.invalidateQueries({ queryKey: pollKeys.lists() });
  };

  return { addPoll, updatePoll, removePoll };
}
