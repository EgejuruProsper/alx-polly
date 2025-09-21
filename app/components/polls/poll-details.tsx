"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Poll } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { Share2 } from "lucide-react";
import { CopyPollLink } from "./copy-poll-link";

interface PollDetailsProps {
  poll: Poll;
  onVote?: (optionId: string) => void;
  userVote?: string | null;
  isLoading?: boolean;
}

export function PollDetails({ poll, onVote, userVote, isLoading = false }: PollDetailsProps) {
  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
  const isExpired = poll.expires_at && new Date() > new Date(poll.expires_at);
  const canVote = poll.is_active && !isExpired && !userVote;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: poll.question,
          text: poll.description,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or error occurred
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Poll Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{poll.question}</CardTitle>
              {poll.description && (
                <CardDescription className="text-base">
                  {poll.description}
                </CardDescription>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <CopyPollLink pollId={poll.id} />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={poll.author?.avatar} alt={poll.author?.name || 'User'} />
                  <AvatarFallback>
                    {poll.author?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  by {poll.author?.name || 'Unknown User'}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {poll.is_public ? (
                <Badge variant="secondary">Public</Badge>
              ) : (
                <Badge variant="outline">Private</Badge>
              )}
              {isExpired && <Badge variant="destructive">Expired</Badge>}
              {!poll.is_active && <Badge variant="outline">Inactive</Badge>}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Poll Options */}
      <Card>
        <CardHeader>
          <CardTitle>Vote Options</CardTitle>
          <CardDescription>
            {totalVotes} total vote{totalVotes !== 1 ? 's' : ''}
            {poll.allow_multiple_votes && " • Multiple votes allowed"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canVote && userVote && (
            <Alert className="mb-4">
              <AlertDescription>
                You have already voted in this poll.
              </AlertDescription>
            </Alert>
          )}
          
          {!canVote && isExpired && (
            <Alert className="mb-4">
              <AlertDescription>
                This poll has expired and is no longer accepting votes.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {poll.options.map((option) => {
              const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
              const isSelected = userVote === option.id;
              
              return (
                <div key={option.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{option.text}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">
                        {option.votes} vote{option.votes !== 1 ? 's' : ''}
                      </span>
                      <span className="text-sm font-medium">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${
                          isSelected ? 'bg-primary' : 'bg-primary/70'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    {isSelected && (
                      <div className="absolute -top-1 -right-1">
                        <Badge variant="default" className="text-xs">
                          Your Vote
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  {canVote && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onVote?.(option.id)}
                      disabled={isLoading}
                      className="w-full"
                    >
                      Vote for this option
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
