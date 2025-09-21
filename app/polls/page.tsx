"use client";

import { useState, useEffect } from "react";
import { PollList } from "@/app/components/polls/poll-list";
import { Layout } from "@/app/components/layout/layout";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePollActions } from "@/app/hooks/use-poll-actions";
import { useAuth } from "@/app/hooks/use-auth";
import { PollFilters } from "@/lib/poll-service";

export default function PollsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "most-voted" | "least-voted">("newest");
  
  const { user } = useAuth();
  
  const {
    polls,
    isLoading,
    error,
    hasMore,
    fetchPolls,
    deletePoll,
    submitVote,
    clearError
  } = usePollActions();

  useEffect(() => {
    fetchPolls({ search: searchTerm, sortBy, limit: 20 });
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPolls({ search: searchTerm, sortBy, limit: 20 });
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, sortBy, fetchPolls]);

  const handleVote = async (pollId: string, optionId: string) => {
    // Extract option index from optionId (format: pollId-index)
    const optionIndex = parseInt(optionId.split('-').pop() || '0');
    await submitVote(pollId, optionIndex);
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      fetchPolls({ 
        search: searchTerm, 
        sortBy: sortBy as any, 
        limit: 20, 
        offset: polls.length 
      });
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!confirm('Are you sure you want to delete this poll? This action cannot be undone.')) {
      return;
    }

    await deletePoll(pollId);
  };

  return (
    <Layout>
      <div className="container py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div>
              <h1 className="text-3xl font-bold">Polls</h1>
              <p className="text-muted-foreground">
                Discover and participate in community polls
              </p>
            </div>
            <Button asChild>
              <Link href="/polls/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Poll
              </Link>
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search polls..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="most-voted">Most Voted</SelectItem>
                <SelectItem value="least-voted">Least Voted</SelectItem>
              </SelectContent>
            </Select>
          </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex justify-between items-center">
                  <span>{error}</span>
                  <Button variant="outline" size="sm" onClick={clearError}>
                    Dismiss
                  </Button>
                </div>
              )}

              {/* Polls List */}
              <PollList
                polls={polls}
                isLoading={isLoading}
                onVote={handleVote}
                onLoadMore={handleLoadMore}
                onDelete={handleDeletePoll}
                hasMore={hasMore}
                currentUserId={user?.id}
              />
        </div>
      </div>
    </Layout>
  );
}
