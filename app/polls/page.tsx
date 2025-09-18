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

// Mock data - replace with actual API calls
const mockPolls: Poll[] = [
  {
    id: "1",
    title: "What's your favorite programming language?",
    description: "Help us understand the community's preferences",
    options: [
      { id: "1-1", text: "JavaScript", votes: 45, pollId: "1" },
      { id: "1-2", text: "Python", votes: 38, pollId: "1" },
      { id: "1-3", text: "TypeScript", votes: 25, pollId: "1" },
      { id: "1-4", text: "Rust", votes: 12, pollId: "1" },
    ],
    author: {
      id: "user-1",
      name: "John Doe",
      email: "john@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    isActive: true,
    isPublic: true,
    allowMultipleVotes: false,
    createdAt: new Date(Date.now() - 86400000), // 1 day ago
    updatedAt: new Date(),
  },
  {
    id: "2",
    title: "Which framework do you prefer for web development?",
    description: "Share your experience with different frameworks",
    options: [
      { id: "2-1", text: "React", votes: 60, pollId: "2" },
      { id: "2-2", text: "Vue", votes: 30, pollId: "2" },
      { id: "2-3", text: "Angular", votes: 20, pollId: "2" },
    ],
    author: {
      id: "user-2",
      name: "Jane Smith",
      email: "jane@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    isActive: true,
    isPublic: true,
    allowMultipleVotes: true,
    createdAt: new Date(Date.now() - 172800000), // 2 days ago
    updatedAt: new Date(),
  },
];

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    // Simulate API call
    const loadPolls = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPolls(mockPolls);
      setIsLoading(false);
    };

    loadPolls();
  }, []);

  const handleVote = async (pollId: string, optionId: string) => {
    // TODO: Implement actual voting logic
    console.log("Voting for poll:", pollId, "option:", optionId);
  };

  const handleLoadMore = () => {
    // TODO: Implement pagination
    console.log("Loading more polls...");
  };

  const filteredPolls = polls.filter(poll =>
    poll.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    poll.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

          {/* Polls List */}
          <PollList
            polls={filteredPolls}
            isLoading={isLoading}
            onVote={handleVote}
            onLoadMore={handleLoadMore}
            hasMore={false}
          />
        </div>
      </div>
    </Layout>
  );
}
