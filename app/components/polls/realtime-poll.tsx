"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import { RealtimeService } from '@/lib/services/realtime-service';
import { Poll } from '@/lib/types/poll';
import { 
  Users, 
  TrendingUp, 
  Eye, 
  Share2, 
  MessageSquare,
  Wifi,
  WifiOff,
  Activity
} from 'lucide-react';

/**
 * RealtimePoll Component
 * ----------------------
 * Enhanced poll component with real-time updates and live engagement metrics.
 * 
 * WHY: Provides real-time user experience with live vote updates, engagement tracking,
 * and dynamic poll statistics. Essential for interactive and engaging polling.
 * 
 * Features:
 * - Real-time vote updates
 * - Live engagement metrics
 * - Connection status indicators
 * - Dynamic poll statistics
 * - User activity tracking
 * 
 * Security considerations:
 * - Secure real-time subscriptions
 * - User authentication for updates
 * - Data privacy protection
 * - Rate limiting for real-time events
 * 
 * Accessibility considerations:
 * - Screen reader support for live updates
 * - Keyboard navigation
 * - High contrast support
 * - Clear connection status indicators
 */
interface RealtimePollProps {
  poll: Poll;
  currentUserId?: string;
  onVote?: (optionId: string) => void;
  showRealtimeStats?: boolean;
}

export function RealtimePoll({ 
  poll, 
  currentUserId, 
  onVote, 
  showRealtimeStats = true 
}: RealtimePollProps) {
  const [livePoll, setLivePoll] = useState<Poll>(poll);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [liveStats, setLiveStats] = useState({
    totalVotes: poll.total_votes || 0,
    viewCount: poll.view_count || 0,
    shareCount: poll.share_count || 0,
    lastUpdate: new Date()
  });

  // Real-time subscription management
  useEffect(() => {
    if (!showRealtimeStats) return;

    let pollChannel: any = null;

    const handlePollUpdate = (payload: any) => {
      console.log('Poll updated:', payload);
      const updatedPoll = payload.new;
      setLivePoll(updatedPoll);
      setLiveStats(prev => ({
        ...prev,
        totalVotes: updatedPoll.total_votes || 0,
        viewCount: updatedPoll.view_count || 0,
        shareCount: updatedPoll.share_count || 0,
        lastUpdate: new Date()
      }));
    };

    const handleVoteUpdate = (payload: any) => {
      console.log('New vote:', payload);
      // Update poll with new vote
      setLivePoll(prev => ({
        ...prev,
        total_votes: (prev.total_votes || 0) + 1,
        votes: prev.votes.map((vote, index) => 
          index === payload.new.option_index ? vote + 1 : vote
        )
      }));
      setLiveStats(prev => ({
        ...prev,
        totalVotes: prev.totalVotes + 1,
        lastUpdate: new Date()
      }));
    };

    const handleError = (error: any) => {
      console.error('Real-time error:', error);
      setConnectionError(error.message);
      setIsConnected(false);
    };

    // Subscribe to poll updates
    try {
      pollChannel = RealtimeService.subscribeToPoll(
        poll.id,
        handlePollUpdate,
        handleVoteUpdate,
        handleError
      );

      setIsConnected(true);
      setConnectionError(null);
    } catch (error) {
      console.error('Failed to subscribe to poll updates:', error);
      setConnectionError('Failed to connect to real-time updates');
      setIsConnected(false);
    }

    // Cleanup on unmount
    return () => {
      if (pollChannel) {
        RealtimeService.unsubscribe(`poll-${poll.id}`);
      }
    };
  }, [poll.id, showRealtimeStats]);

  /**
   * Handle vote submission with real-time tracking
   * 
   * WHY: Integrates vote submission with real-time updates and analytics.
   * Provides immediate feedback and live poll updates.
   * 
   * @param optionId - Option ID to vote for
   */
  const handleVote = useCallback(async (optionId: string) => {
    try {
      // Submit vote
      if (onVote) {
        await onVote(optionId);
      }

      // Track analytics event
      if (currentUserId) {
        // In a real implementation, you'd call the analytics API here
        console.log('Tracking vote event:', { pollId: poll.id, userId: currentUserId });
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
    }
  }, [onVote, currentUserId, poll.id]);

  // Calculate vote percentages
  const totalVotes = livePoll.total_votes || 0;
  const votePercentages = livePoll.options.map((_, index) => {
    const votes = livePoll.votes[index] || 0;
    return totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
  });

  // Check if poll is active
  const isExpired = livePoll.expires_at && new Date() > new Date(livePoll.expires_at);
  const isActive = livePoll.is_active && !isExpired;

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-xl">{livePoll.question}</CardTitle>
            {livePoll.description && (
              <CardDescription className="text-base">
                {livePoll.description}
              </CardDescription>
            )}
          </div>
          
          {/* Real-time status indicator */}
          {showRealtimeStats && (
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <Badge variant="outline" className="flex items-center space-x-1">
                  <Wifi className="h-3 w-3 text-green-500" />
                  <span>Live</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center space-x-1">
                  <WifiOff className="h-3 w-3 text-red-500" />
                  <span>Offline</span>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Connection error */}
        {connectionError && (
          <div className="text-sm text-destructive">
            {connectionError}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Poll Options */}
        <div className="space-y-3">
          {livePoll.options.map((option, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{option}</span>
                <span className="text-sm text-muted-foreground">
                  {livePoll.votes[index] || 0} votes ({votePercentages[index]}%)
                </span>
              </div>
              <Progress value={votePercentages[index]} className="h-2" />
            </div>
          ))}
        </div>

        {/* Live Statistics */}
        {showRealtimeStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Votes</span>
              </div>
              <div className="text-2xl font-bold">{liveStats.totalVotes}</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Eye className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Views</span>
              </div>
              <div className="text-2xl font-bold">{liveStats.viewCount}</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Share2 className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Shares</span>
              </div>
              <div className="text-2xl font-bold">{liveStats.shareCount}</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Activity className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Last Update</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {liveStats.lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}

        {/* Poll Status */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? "Active" : "Inactive"}
            </Badge>
            {livePoll.expires_at && (
              <Badge variant="outline">
                Expires: {new Date(livePoll.expires_at).toLocaleDateString()}
              </Badge>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            Total: {totalVotes} votes
          </div>
        </div>

        {/* Vote Button */}
        {isActive && (
          <div className="flex justify-center pt-4">
            <Button 
              onClick={() => handleVote(livePoll.options[0])}
              className="w-full"
            >
              Vote Now
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
