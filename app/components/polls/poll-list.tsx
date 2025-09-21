"use client";

import { PollCard } from "./poll-card";
import { Poll } from "@/types";
import { Button } from "@/app/components/ui/button";

interface PollListProps {
  polls: Poll[];
  isLoading?: boolean;
  onVote?: (pollId: string, optionId: string) => void;
  onLoadMore?: () => void;
  onDelete?: (pollId: string) => void;
  currentUserId?: string;
  hasMore?: boolean;
}

export function PollList({ 
  polls, 
  isLoading = false, 
  onVote, 
  onLoadMore, 
  onDelete,
  currentUserId,
  hasMore = false 
}: PollListProps) {
  if (isLoading && polls.length === 0) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg h-48 w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (polls.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-24 w-24 text-muted-foreground">
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            className="h-full w-full"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold">No polls found</h3>
        <p className="mt-2 text-muted-foreground">
          Be the first to create a poll and start gathering opinions!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {polls.map((poll) => (
        <PollCard
          key={poll.id}
          poll={poll}
          onVote={onVote}
          onDelete={onDelete}
          currentUserId={currentUserId}
          showVoteButton={true}
        />
      ))}
      
      {hasMore && (
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
