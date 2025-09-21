"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Layout } from "@/app/components/layout/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Poll } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, CheckCircle, Users, Clock } from "lucide-react";
import Link from "next/link";
import { usePollActions } from "@/app/hooks/use-poll-actions";
import { useAuth } from "@/app/contexts/auth-context";

export default function PollDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [hasVoted, setHasVoted] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { fetchPollById, submitVote, isLoading, error, clearError } = usePollActions();

  // Fetch poll data
  useEffect(() => {
    const loadPoll = async () => {
      const { id } = await params;
      const pollData = await fetchPollById(id);
      if (pollData) {
        setPoll(pollData);
      }
    };

    loadPoll();
  }, [params, fetchPollById]);

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!poll || !selectedOption) return;

    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      return;
    }

    clearError();
    setSuccess(null);

    const optionIndex = poll.options.findIndex(option => option.text === selectedOption);
    
    const success = await submitVote(poll.id, optionIndex);
    
    if (success) {
      setSuccess("Thank you for voting! Your choice has been recorded.");
      setHasVoted(true);
      // Update local poll state with new vote counts
      const updatedPoll = await fetchPollById(poll.id);
      if (updatedPoll) {
        setPoll(updatedPoll);
      }
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error && !poll) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Poll Not Found</h1>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button asChild>
                <Link href="/polls">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Polls
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!poll) return null;

  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
  const isExpired = poll.expires_at && new Date() > new Date(poll.expires_at);

  return (
    <Layout>
      <div className="container py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/polls">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Polls
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{poll.question}</h1>
              {poll.description && (
                <p className="text-muted-foreground mt-2">{poll.description}</p>
              )}
            </div>
          </div>

          {/* Poll Info */}
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={poll.author?.avatar} alt={poll.author?.name} />
                <AvatarFallback className="text-xs">
                  {poll.author?.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span>By {poll.author?.name || 'Unknown User'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center space-x-2">
              {poll.is_public ? (
                <Badge variant="secondary">Public</Badge>
              ) : (
                <Badge variant="outline">Private</Badge>
              )}
              {isExpired && <Badge variant="destructive">Expired</Badge>}
            </div>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

                  {error && (
                    <Alert variant="destructive" className="flex justify-between items-center">
                      <AlertDescription>{error}</AlertDescription>
                      <Button variant="outline" size="sm" onClick={clearError}>
                        Dismiss
                      </Button>
                    </Alert>
                  )}

          {/* Voting Form or Results */}
          <Card>
            <CardHeader>
              <CardTitle>Cast Your Vote</CardTitle>
              <CardDescription>
                {hasVoted ? "Thank you for voting! Here are the current results:" : "Select your preferred option below:"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!hasVoted && !isExpired && poll.is_active ? (
                !isAuthenticated ? (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4" />
                      <p className="text-lg font-semibold">Login Required to Vote</p>
                      <p className="mb-4">You must be logged in to participate in this poll.</p>
                      <Button asChild>
                        <Link href="/auth/login">Login to Vote</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleVote} className="space-y-4">
                    <div className="space-y-3">
                      {poll.options.map((option, index) => (
                        <label key={index} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name="vote"
                            value={option.text}
                            checked={selectedOption === option.text}
                            onChange={(e) => setSelectedOption(e.target.value)}
                            className="h-4 w-4 text-primary"
                            required
                          />
                          <span className="flex-1">{option.text}</span>
                        </label>
                      ))}
                    </div>
                    
                    <div className="flex justify-end space-x-4">
                      <Button type="button" variant="outline" asChild>
                        <Link href="/polls">Cancel</Link>
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isLoading || !selectedOption}
                      >
                        {isLoading ? "Submitting Vote..." : "Submit Vote"}
                      </Button>
                    </div>
                  </form>
                )
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    {isExpired ? (
                      <div className="text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-4" />
                        <p className="text-lg font-semibold">This poll has expired</p>
                        <p>Voting is no longer available for this poll.</p>
                      </div>
                    ) : !poll.is_active ? (
                      <div className="text-muted-foreground">
                        <p className="text-lg font-semibold">This poll is no longer active</p>
                        <p>Voting has been disabled for this poll.</p>
                      </div>
                    ) : hasVoted ? (
                      <div className="text-green-600">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4" />
                        <p className="text-lg font-semibold">Thank you for voting!</p>
                        <p>Your choice: <strong>{selectedOption}</strong></p>
                      </div>
                    ) : null}
                  </div>

                  {/* Results Display */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">Current Results</h3>
                    {poll.options.map((option, index) => {
                      const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                      const isSelected = selectedOption === option.text;
                      
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`${isSelected ? 'font-semibold text-primary' : ''}`}>
                              {option.text}
                              {isSelected && <span className="ml-2 text-sm">(Your choice)</span>}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {option.votes} vote{option.votes !== 1 ? 's' : ''} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all duration-300 ${
                                isSelected ? 'bg-primary' : 'bg-gray-400'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}