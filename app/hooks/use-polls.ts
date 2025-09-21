"use client";

import { useState, useEffect } from "react";
import { Poll } from "@/types";

interface UsePollsOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
}

interface UsePollsReturn {
  polls: Poll[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

export function usePolls(options: UsePollsOptions = {}): UsePollsReturn {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const loadPolls = async (reset = false) => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement actual API call
      console.log("Loading polls with options:", options);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data - replace with actual API response
      const mockPolls: Poll[] = [
        {
          id: "1",
          question: "What's your favorite programming language?",
          description: "Help us understand the community's preferences",
          options: [
            { id: "1-1", text: "JavaScript", votes: 45, pollId: "1" },
            { id: "1-2", text: "Python", votes: 38, pollId: "1" },
            { id: "1-3", text: "TypeScript", votes: 25, pollId: "1" },
          ],
          author: {
            id: "user-1",
            name: "John Doe",
            email: "john@example.com",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          is_active: true,
          is_public: true,
          allow_multiple_votes: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      
      if (reset) {
        setPolls(mockPolls);
      } else {
        setPolls(prev => [...prev, ...mockPolls]);
      }
      
      setHasMore(false); // Mock: no more data
    } catch (err) {
      setError("Failed to load polls");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadPolls(false);
    }
  };

  const refetch = () => {
    loadPolls(true);
  };

  useEffect(() => {
    loadPolls(true);
  }, [options.search, options.sortBy]);

  return {
    polls,
    isLoading,
    error,
    hasMore,
    loadMore,
    refetch,
  };
}
