"use client";

import { useState, useEffect } from "react";
import { PollList } from "@/app/components/polls/poll-list";
import { Layout } from "@/app/components/layout/layout";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Poll } from "@/types";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/app/contexts/auth-context";

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchPolls = async (search?: string, sort?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (sort) params.append('sortBy', sort);
      params.append('limit', '20');
      
      const response = await fetch(`/api/polls?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch polls');
      }
      
      const data = await response.json();
      setPolls(data.polls || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch polls');
      setPolls([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPolls(searchTerm, sortBy);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, sortBy]);

  const handleVote = async (pollId: string, optionId: string) => {
    // TODO: Implement actual voting logic
    console.log("Voting for poll:", pollId, "option:", optionId);
  };

  const handleLoadMore = () => {
    // TODO: Implement pagination
    console.log("Loading more polls...");
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!confirm('Are you sure you want to delete this poll? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/polls/${pollId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete poll');
      }

      // Remove poll from local state
      setPolls(prevPolls => prevPolls.filter(poll => poll.id !== pollId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete poll');
    }
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
            <Select value={sortBy} onValueChange={setSortBy}>
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
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Polls List */}
          <PollList
            polls={polls}
            isLoading={isLoading}
            onVote={handleVote}
            onLoadMore={handleLoadMore}
            onDelete={handleDeletePoll}
            currentUserId={user?.id}
            hasMore={false}
          />
        </div>
      </div>
    </Layout>
  );
}
