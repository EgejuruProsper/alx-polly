"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { PollDetails } from "@/app/components/polls/poll-details";
import { Layout } from "@/app/components/layout/layout";
import { Poll } from "@/types";
import { Alert, AlertDescription } from "@/app/components/ui/alert";

// Mock data - replace with actual API call
const mockPoll: Poll = {
  id: "1",
  title: "What's your favorite programming language?",
  description: "Help us understand the community's preferences for programming languages in 2024",
  options: [
    { id: "1-1", text: "JavaScript", votes: 45, pollId: "1" },
    { id: "1-2", text: "Python", votes: 38, pollId: "1" },
    { id: "1-3", text: "TypeScript", votes: 25, pollId: "1" },
    { id: "1-4", text: "Rust", votes: 12, pollId: "1" },
    { id: "1-5", text: "Go", votes: 8, pollId: "1" },
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
};

export default function PollDetailsPage() {
  const params = useParams();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userVote, setUserVote] = useState<string | null>(null);

  useEffect(() => {
    const loadPoll = async () => {
      setIsLoading(true);
      try {
        // TODO: Implement actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setPoll(mockPoll);
      } catch (err) {
        setError("Failed to load poll. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      loadPoll();
    }
  }, [params.id]);

  const handleVote = async (optionId: string) => {
    try {
      // TODO: Implement actual voting logic
      console.log("Voting for option:", optionId);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setUserVote(optionId);
      
      // Update poll data optimistically
      if (poll) {
        const updatedPoll = {
          ...poll,
          options: poll.options.map(option =>
            option.id === optionId
              ? { ...option, votes: option.votes + 1 }
              : option
          ),
        };
        setPoll(updatedPoll);
      }
    } catch (err) {
      console.error("Failed to vote:", err);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="bg-gray-200 rounded-lg h-32 w-full"></div>
              <div className="bg-gray-200 rounded-lg h-64 w-full"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !poll) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="max-w-4xl mx-auto">
            <Alert variant="destructive">
              <AlertDescription>
                {error || "Poll not found"}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <PollDetails
          poll={poll}
          onVote={handleVote}
          userVote={userVote}
          isLoading={false}
        />
      </div>
    </Layout>
  );
}
