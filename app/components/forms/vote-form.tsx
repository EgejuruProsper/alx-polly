"use client";

import { useState } from 'react';
import { Poll, PollOption } from '@/types';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { CheckCircle, AlertCircle, Users, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface VoteFormProps {
  poll: Poll;
  onVote: (optionIndex: number) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  success?: string | null;
  hasVoted?: boolean;
  selectedOption?: string;
}

export function VoteForm({
  poll,
  onVote,
  isLoading = false,
  error,
  success,
  hasVoted = false,
  selectedOption
}: VoteFormProps) {
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);

  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
  const isExpired = poll.expires_at && new Date() > new Date(poll.expires_at);
  const isActive = poll.is_active && !isExpired;

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedOptionIndex === null) return;

    await onVote(selectedOptionIndex);
  };

  const getVotePercentage = (votes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Cast Your Vote</span>
        </CardTitle>
        <CardDescription>
          {poll.allow_multiple_votes 
            ? 'You can vote for multiple options'
            : 'You can only vote once'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Poll Status */}
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4" />
            <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
          </div>
          {poll.expires_at && (
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>
                {isExpired ? 'Expired' : `Expires ${formatDistanceToNow(new Date(poll.expires_at))} from now`}
              </span>
            </div>
          )}
        </div>

        {/* Success Message */}
        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Voting Form or Results */}
        {!hasVoted && isActive ? (
          <form onSubmit={handleVote} className="space-y-4">
            <div className="space-y-3">
              {poll.options.map((option, index) => (
                <label
                  key={option.id}
                  className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedOptionIndex === index
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input
                    type={poll.allow_multiple_votes ? 'checkbox' : 'radio'}
                    name="vote"
                    value={index}
                    checked={selectedOptionIndex === index}
                    onChange={() => setSelectedOptionIndex(index)}
                    disabled={isLoading}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{option.text}</div>
                    {totalVotes > 0 && (
                      <div className="text-sm text-muted-foreground">
                        {option.votes} {option.votes === 1 ? 'vote' : 'votes'} ({getVotePercentage(option.votes)}%)
                      </div>
                    )}
                  </div>
                  {selectedOptionIndex === index && (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                </label>
              ))}
            </div>

            <Button
              type="submit"
              disabled={isLoading || selectedOptionIndex === null}
              className="w-full"
            >
              {isLoading ? 'Submitting...' : 'Submit Vote'}
            </Button>
          </form>
        ) : hasVoted ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Thank you for voting! {selectedOption && `Your choice: ${selectedOption}`}
              </AlertDescription>
            </Alert>

            {/* Results */}
            <div className="space-y-3">
              <h4 className="font-medium">Results:</h4>
              {poll.options.map((option, index) => (
                <div key={option.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{option.text}</span>
                    <span className="text-sm text-muted-foreground">
                      {option.votes} {option.votes === 1 ? 'vote' : 'votes'} ({getVotePercentage(option.votes)}%)
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getVotePercentage(option.votes)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !isActive ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {isExpired ? 'This poll has expired and is no longer accepting votes.' : 'This poll is not active.'}
            </AlertDescription>
          </Alert>
        ) : null}

        {/* Poll Info */}
        <div className="pt-4 border-t text-sm text-muted-foreground">
          <p>
            Created by <span className="font-medium">{poll.author?.name || 'Unknown User'}</span>
          </p>
          <p>
            {formatDistanceToNow(new Date(poll.created_at))} ago
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
