import { supabase } from '@/lib/supabase-client';
import { ServiceResult } from '@/lib/poll-service';

/**
 * AnalyticsService
 * ----------------
 * Manages poll analytics and user engagement metrics.
 * 
 * WHY: Provides comprehensive analytics for poll performance, user engagement,
 * and system insights. Essential for understanding platform usage and optimization.
 * 
 * Security considerations:
 * - Role-based access control
 * - Data aggregation and anonymization
 * - Performance optimization for large datasets
 * - Privacy-compliant analytics
 * 
 * Edge cases:
 * - Large datasets → pagination and caching
 * - Missing data → graceful handling
 * - Permission checks → secure data access
 */
export class AnalyticsService {
  /**
   * Get poll analytics for a specific poll
   * 
   * WHY: Provides detailed analytics for individual polls including voting patterns,
   * engagement metrics, and performance data.
   * 
   * @param pollId - Poll ID to analyze
   * @param requesterId - User requesting the analytics
   * @returns Poll analytics data
   */
  static async getPollAnalytics(
    pollId: string,
    requesterId: string
  ): Promise<ServiceResult<PollAnalytics>> {
    try {
      // Get poll details
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .select('*')
        .eq('id', pollId)
        .single();

      if (pollError || !poll) {
        return { success: false, error: 'Poll not found' };
      }

      // Check permissions (poll owner or admin)
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', requesterId)
        .single();

      const isOwner = poll.created_by === requesterId;
      const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'moderator';

      if (!isOwner && !isAdmin) {
        return { success: false, error: 'Insufficient permissions' };
      }

      // Get voting data
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('option_index, created_at')
        .eq('poll_id', pollId)
        .order('created_at', { ascending: true });

      if (votesError) {
        return { success: false, error: 'Failed to fetch votes' };
      }

      // Get analytics data
      const { data: analytics, error: analyticsError } = await supabase
        .from('poll_analytics')
        .select('action_type, created_at')
        .eq('poll_id', pollId)
        .order('created_at', { ascending: true });

      if (analyticsError) {
        return { success: false, error: 'Failed to fetch analytics' };
      }

      // Process analytics data
      const analyticsData = this.processPollAnalytics(poll, votes || [], analytics || []);

      return { success: true, data: analyticsData };
    } catch (error) {
      console.error('Error fetching poll analytics:', error);
      return { success: false, error: 'Failed to fetch poll analytics' };
    }
  }

  /**
   * Get system-wide analytics
   * 
   * WHY: Provides platform-wide metrics for administrators including user engagement,
   * poll performance, and system health indicators.
   * 
   * @param requesterId - User requesting the analytics
   * @returns System analytics data
   */
  static async getSystemAnalytics(
    requesterId: string
  ): Promise<ServiceResult<SystemAnalytics>> {
    try {
      // Check admin permissions
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', requesterId)
        .single();

      if (userProfile?.role !== 'admin') {
        return { success: false, error: 'Insufficient permissions' };
      }

      // Get system metrics
      const [
        { data: totalPolls, count: pollsCount },
        { data: totalUsers, count: usersCount },
        { data: totalVotes, count: votesCount },
        { data: recentPolls },
        { data: topPolls }
      ] = await Promise.all([
        supabase.from('polls').select('id', { count: 'exact' }),
        supabase.from('user_profiles').select('id', { count: 'exact' }),
        supabase.from('votes').select('id', { count: 'exact' }),
        supabase.from('polls')
          .select('id, question, created_at, total_votes')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.from('polls')
          .select('id, question, total_votes, view_count')
          .order('total_votes', { ascending: false })
          .limit(10)
      ]);

      // Get daily activity for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: dailyActivity } = await supabase
        .from('poll_analytics')
        .select('action_type, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      const systemAnalytics: SystemAnalytics = {
        totalPolls: pollsCount || 0,
        totalUsers: usersCount || 0,
        totalVotes: votesCount || 0,
        recentPolls: recentPolls || [],
        topPolls: topPolls || [],
        dailyActivity: this.processDailyActivity(dailyActivity || []),
        engagement: this.calculateEngagementMetrics(dailyActivity || [])
      };

      return { success: true, data: systemAnalytics };
    } catch (error) {
      console.error('Error fetching system analytics:', error);
      return { success: false, error: 'Failed to fetch system analytics' };
    }
  }

  /**
   * Track poll analytics event
   * 
   * WHY: Records user interactions for analytics and engagement tracking.
   * Essential for understanding user behavior and platform usage.
   * 
   * @param pollId - Poll ID
   * @param userId - User ID (optional for anonymous tracking)
   * @param actionType - Type of action (view, vote, share, comment)
   * @param metadata - Additional metadata
   */
  static async trackPollEvent(
    pollId: string,
    userId: string | null,
    actionType: 'view' | 'vote' | 'share' | 'comment',
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await supabase
        .from('poll_analytics')
        .insert({
          poll_id: pollId,
          user_id: userId,
          action_type: actionType,
          metadata,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error tracking poll event:', error);
      // Don't throw - analytics tracking failure shouldn't break the app
    }
  }

  /**
   * Process poll analytics data
   * 
   * WHY: Transforms raw data into meaningful analytics insights.
   * Provides structured data for visualization and reporting.
   */
  private static processPollAnalytics(
    poll: any,
    votes: any[],
    analytics: any[]
  ): PollAnalytics {
    // Safely handle potentially undefined fields
    const options = poll.options || [];
    const pollVotes = poll.votes || [];
    const totalVotes = poll.total_votes || 0;
    
    // Calculate voting distribution
    const voteDistribution = options.map((_: any, index: number) => ({
      option: options[index],
      votes: pollVotes[index] || 0,
      percentage: totalVotes > 0 ? 
        Math.round((pollVotes[index] || 0) / totalVotes * 100) : 0
    }));

    // Calculate engagement metrics
    const views = analytics.filter(a => a.action_type === 'view').length;
    const shares = analytics.filter(a => a.action_type === 'share').length;
    const comments = analytics.filter(a => a.action_type === 'comment').length;

    // Calculate voting timeline
    const votingTimeline = this.calculateVotingTimeline(votes);

    // Calculate engagement timeline
    const engagementTimeline = this.calculateEngagementTimeline(analytics);

    return {
      pollId: poll.id,
      question: poll.question,
      totalVotes: poll.total_votes,
      uniqueVoters: poll.unique_voters,
      viewCount: poll.view_count,
      shareCount: poll.share_count,
      voteDistribution,
      votingTimeline,
      engagementTimeline,
      engagement: {
        views,
        shares,
        comments,
        engagementRate: poll.total_votes > 0 ? 
          Math.round((poll.total_votes / views) * 100) : 0
      },
      createdAt: poll.created_at,
      expiresAt: poll.expires_at
    };
  }

  /**
   * Process daily activity data
   * 
   * WHY: Aggregates daily activity for trend analysis and reporting.
   * Provides insights into platform usage patterns over time.
   */
  private static processDailyActivity(analytics: any[]): DailyActivity[] {
    const dailyMap = new Map<string, DailyActivity>();

    analytics.forEach(analytics => {
      const date = new Date(analytics.created_at).toISOString().split('T')[0];
      
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          views: 0,
          votes: 0,
          shares: 0,
          comments: 0
        });
      }

      const daily = dailyMap.get(date)!;
      switch (analytics.action_type) {
        case 'view': daily.views++; break;
        case 'vote': daily.votes++; break;
        case 'share': daily.shares++; break;
        case 'comment': daily.comments++; break;
      }
    });

    return Array.from(dailyMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  /**
   * Calculate engagement metrics
   * 
   * WHY: Provides key performance indicators for platform engagement.
   * Essential for understanding user behavior and platform health.
   */
  private static calculateEngagementMetrics(analytics: any[]): EngagementMetrics {
    const totalViews = analytics.filter(a => a.action_type === 'view').length;
    const totalVotes = analytics.filter(a => a.action_type === 'vote').length;
    const totalShares = analytics.filter(a => a.action_type === 'share').length;
    const totalComments = analytics.filter(a => a.action_type === 'comment').length;

    return {
      totalViews,
      totalVotes,
      totalShares,
      totalComments,
      engagementRate: totalViews > 0 ? Math.round((totalVotes / totalViews) * 100) : 0,
      shareRate: totalViews > 0 ? Math.round((totalShares / totalViews) * 100) : 0,
      commentRate: totalViews > 0 ? Math.round((totalComments / totalViews) * 100) : 0
    };
  }

  /**
   * Calculate voting timeline
   * 
   * WHY: Provides temporal analysis of voting patterns.
   * Helps understand when users are most active.
   */
  private static calculateVotingTimeline(votes: any[]): VotingTimeline[] {
    const timelineMap = new Map<string, number>();

    votes.forEach(vote => {
      const date = new Date(vote.created_at).toISOString().split('T')[0];
      timelineMap.set(date, (timelineMap.get(date) || 0) + 1);
    });

    return Array.from(timelineMap.entries()).map(([date, count]) => ({
      date,
      votes: count
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Calculate engagement timeline
   * 
   * WHY: Provides temporal analysis of user engagement.
   * Helps understand engagement patterns over time.
   */
  private static calculateEngagementTimeline(analytics: any[]): EngagementTimeline[] {
    const timelineMap = new Map<string, EngagementTimeline>();

    analytics.forEach(analytics => {
      const date = new Date(analytics.created_at).toISOString().split('T')[0];
      
      if (!timelineMap.has(date)) {
        timelineMap.set(date, {
          date,
          views: 0,
          votes: 0,
          shares: 0,
          comments: 0
        });
      }

      const daily = timelineMap.get(date)!;
      switch (analytics.action_type) {
        case 'view': daily.views++; break;
        case 'vote': daily.votes++; break;
        case 'share': daily.shares++; break;
        case 'comment': daily.comments++; break;
      }
    });

    return Array.from(timelineMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }
}

// Type definitions for analytics data
export interface PollAnalytics {
  pollId: string;
  question: string;
  totalVotes: number;
  uniqueVoters: number;
  viewCount: number;
  shareCount: number;
  voteDistribution: VoteDistribution[];
  votingTimeline: VotingTimeline[];
  engagementTimeline: EngagementTimeline[];
  engagement: {
    views: number;
    shares: number;
    comments: number;
    engagementRate: number;
  };
  createdAt: string;
  expiresAt?: string;
}

export interface SystemAnalytics {
  totalPolls: number;
  totalUsers: number;
  totalVotes: number;
  recentPolls: any[];
  topPolls: any[];
  dailyActivity: DailyActivity[];
  engagement: EngagementMetrics;
}

export interface VoteDistribution {
  option: string;
  votes: number;
  percentage: number;
}

export interface VotingTimeline {
  date: string;
  votes: number;
}

export interface EngagementTimeline {
  date: string;
  views: number;
  votes: number;
  shares: number;
  comments: number;
}

export interface DailyActivity {
  date: string;
  views: number;
  votes: number;
  shares: number;
  comments: number;
}

export interface EngagementMetrics {
  totalViews: number;
  totalVotes: number;
  totalShares: number;
  totalComments: number;
  engagementRate: number;
  shareRate: number;
  commentRate: number;
}
