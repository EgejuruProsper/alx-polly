"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Poll } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { Edit, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { CopyPollLink } from "./copy-poll-link";

interface PollCardProps {
  poll: Poll;
  onVote?: (pollId: string, optionId: string) => void;
  onDelete?: (pollId: string) => void;
  currentUserId?: string;
  showVoteButton?: boolean;
}

export function PollCard({ poll, onVote, onDelete, currentUserId, showVoteButton = true }: PollCardProps) {
  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
  const isExpired = poll.expires_at && new Date() > new Date(poll.expires_at);
  const isOwner = currentUserId && poll.created_by === currentUserId;

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg line-clamp-2">{poll.question}</CardTitle>
            {poll.description && (
              <CardDescription className="line-clamp-2">
                {poll.description}
              </CardDescription>
            )}
          </div>
          <div className="flex flex-col items-end space-y-2">
            <div className="flex items-center space-x-2">
              {poll.is_public ? (
                <Badge variant="secondary">Public</Badge>
              ) : (
                <Badge variant="outline">Private</Badge>
              )}
              {isExpired && <Badge variant="destructive">Expired</Badge>}
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/polls/${poll.id}/edit`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete?.(poll.id)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Avatar className="h-6 w-6">
                <AvatarImage src={poll.author?.avatar} alt={poll.author?.name} />
                <AvatarFallback className="text-xs">
                  {poll.author?.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span>{poll.author?.name || 'Unknown User'}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Poll Options */}
        <div className="space-y-2">
          {poll.options.map((option) => {
            const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
            
            return (
              <div key={option.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{option.text}</span>
                  <span className="text-muted-foreground">
                    {option.votes} vote{option.votes !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Poll Stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{totalVotes} total vote{totalVotes !== 1 ? 's' : ''}</span>
          <span>
            {formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2">
            <Link href={`/polls/${poll.id}`}>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </Link>
            <CopyPollLink pollId={poll.id} size="sm" />
          </div>
          
          {showVoteButton && poll.is_active && !isExpired && (
            <Button 
              size="sm" 
              onClick={() => onVote?.(poll.id, poll.options[0].id)}
            >
              Vote
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
