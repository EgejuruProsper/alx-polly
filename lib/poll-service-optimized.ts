import { createServerSupabaseClient, supabase } from '@/app/lib/supabase';
import { createPollSchema, CreatePollFormData, UpdatePollFormData } from './validations';
import { Poll, User, PollOption } from '@/types';
import { getVoteCache } from '@/lib/cache/vote-cache';
import { getVoteAggregationJob } from '@/lib/jobs/vote-aggregation';
import { z } from 'zod';

// Generic service result type
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export interface PollFilters {
  search?: string;
  sortBy?: "newest" | "oldest" | "most-voted" | "least-voted";
  limit?: number;
  offset?: number;
}

export interface PollAnalytics {
  pollId: string;
  question: string;
  totalVotes: number;
  uniqueVoters: number;
  voteDistribution: {
    options: string[];
    voteCounts: number[];
    percentages: number[];
  };
  participationRate: number;
  createdAt: string;
}

export class OptimizedPollService {
  private static voteCache = getVoteCache();
  private static voteAggregationJob = getVoteAggregationJob();

  private static getSupabaseClient(isServer: boolean = false) {
    if (isServer) {
      return createServerSupabaseClient();
    }
    return supabase;
  }

  // Create poll with optimized caching
  static async createPoll(pollData: CreatePollFormData, userId: string): Promise<ServiceResult<Poll>> {
    try {
      const validatedData = createPollSchema.parse(pollData);
      const supabaseClient = this.getSupabaseClient(true);

      const votes = new Array(validatedData.options.length).fill(0);

      const { data, error } = await supabaseClient
        .from('polls')
        .insert({
          question: validatedData.title,
          options: validatedData.options,
          votes: votes,
          created_by: userId,
          is_public: validatedData.isPublic,
          is_active: true,
          expires_at: validatedData.expiresAt?.toISOString(),
          allow_multiple_votes: validatedData.allowMultipleVotes,
          description: validatedData.description,
          total_votes: 0,
          unique_voters: 0,
        })
        .select(`
          *,
          author:created_by (
            id,
            email,
            raw_user_meta_data
          )
        `)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      const poll = this.transformPollData(data);
      
      // Cache the new poll
      await this.voteCache.cachePollVotes(poll.id, {
        voteCounts: votes,
        totalVotes: 0,
        uniqueVoters: 0,
        lastUpdated: new Date().toISOString(),
        pollId: poll.id
      });

      // Invalidate polls list cache
      await this.voteCache.invalidatePollsListCache();

      return { success: true, data: poll };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: error.errors.map(err => err.message).join(', ') };
      }
      return { success: false, error: (error as Error).message || 'Failed to create poll' };
    }
  }

  // Get polls with caching and optimized queries
  static async getPolls(filters: PollFilters): Promise<ServiceResult<Poll[]>> {
    try {
      const { search, sortBy = 'newest', limit = 20, offset = 0 } = filters;
      
      // Check cache first
      const cacheKey = { search, sortBy, limit, offset };
      const cached = await this.voteCache.getCachedSortedPolls(cacheKey);
      
      if (cached) {
        console.log('Returning cached polls data');
        return { success: true, data: cached.polls };
      }

      const supabaseClient = this.getSupabaseClient(true);
      
      // Use materialized view for better performance
      let query = supabaseClient
        .from('poll_vote_stats')
        .select('*')
        .eq('is_public', true)
        .eq('is_active', true)
        .range(offset, offset + limit - 1);

      if (search) {
        query = query.or(`question.ilike.%${search}%,description.ilike.%${search}%`);
      }

      // Optimized sorting
      switch (sortBy) {
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'most-voted':
          query = query.order('total_votes', { ascending: false });
          break;
        case 'least-voted':
          query = query.order('total_votes', { ascending: true });
          break;
        default: // newest
          query = query.order('created_at', { ascending: false });
      }

      const { data: polls, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      const transformedPolls = polls?.map(poll => this.transformPollDataFromStats(poll)) || [];
      
      // Cache the results
      await this.voteCache.cacheSortedPolls(cacheKey, transformedPolls, transformedPolls.length);

      return { success: true, data: transformedPolls };
    } catch (error) {
      return { success: false, error: (error as Error).message || 'Failed to fetch polls' };
    }
  }

  // Get single poll with caching
  static async getPollById(id: string): Promise<ServiceResult<Poll>> {
    try {
      // Check cache first
      const cached = await this.voteCache.getPollVotes(id);
      if (cached) {
        console.log('Returning cached poll data');
        // We still need to get the full poll data, but we can use cached vote counts
      }

      const supabaseClient = this.getSupabaseClient(true);
      
      const { data: poll, error } = await supabaseClient
        .from('poll_vote_stats')
        .select('*')
        .eq('poll_id', id)
        .single();

      if (error || !poll) {
        return { success: false, error: 'Poll not found', status: 404 };
      }

      const transformedPoll = this.transformPollDataFromStats(poll);
      
      // Cache the poll data
      await this.voteCache.cachePollVotes(id, {
        voteCounts: poll.vote_counts || [],
        totalVotes: poll.total_votes || 0,
        uniqueVoters: poll.unique_voters || 0,
        lastUpdated: new Date().toISOString(),
        pollId: id
      });

      return { success: true, data: transformedPoll };
    } catch (error) {
      return { success: false, error: (error as Error).message || 'Failed to fetch poll' };
    }
  }

  // Submit vote with optimized processing
  static async submitVote(pollId: string, optionIndex: number, userId: string): Promise<ServiceResult<Poll>> {
    try {
      const supabaseClient = this.getSupabaseClient(true);

      // Check if user can vote using optimized function
      const { data: canVote, error: canVoteError } = await supabaseClient
        .rpc('can_user_vote_optimized', { 
          poll_uuid: pollId, 
          user_uuid: userId 
        });

      if (canVoteError || !canVote) {
        return { success: false, error: 'You cannot vote on this poll', status: 400 };
      }

      // Insert the vote
      const { error: insertError } = await supabaseClient
        .from('votes')
        .insert({
          poll_id: pollId,
          option_index: optionIndex,
          voter_id: userId,
        });

      if (insertError) {
        if (insertError.code === '23505') { // Unique constraint violation
          return { success: false, error: 'You have already voted on this poll', status: 409 };
        }
        return { success: false, error: insertError.message, status: 500 };
      }

      // Queue vote aggregation job (non-blocking)
      await this.voteAggregationJob.queueVoteAggregation(pollId, 'vote', userId, optionIndex);

      // Get updated poll data
      const result = await this.getPollById(pollId);
      
      if (result.success && result.data) {
        return { success: true, data: result.data };
      } else {
        return { success: false, error: 'Failed to get updated poll data' };
      }
    } catch (error) {
      return { success: false, error: (error as Error).message || 'Failed to submit vote' };
    }
  }

  // Update poll with cache invalidation
  static async updatePoll(id: string, updates: UpdatePollFormData, userId: string): Promise<ServiceResult<Poll>> {
    try {
      const validatedData = updatePollSchema.parse(updates);
      const supabaseClient = this.getSupabaseClient(true);

      // Check ownership
      const { data: existingPoll, error: fetchError } = await supabaseClient
        .from('polls')
        .select('created_by')
        .eq('id', id)
        .single();

      if (fetchError || !existingPoll) {
        return { success: false, error: 'Poll not found', status: 404 };
      }
      if (existingPoll.created_by !== userId) {
        return { success: false, error: 'You are not authorized to update this poll', status: 403 };
      }

      const { data: updatedPoll, error } = await supabaseClient
        .from('polls')
        .update({
          question: validatedData.title,
          options: validatedData.options,
          is_public: validatedData.isPublic,
          is_active: validatedData.isActive,
          expires_at: validatedData.expiresAt?.toISOString(),
          allow_multiple_votes: validatedData.allowMultipleVotes,
          description: validatedData.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          author:created_by (
            id,
            email,
            raw_user_meta_data
          )
        `)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      const poll = this.transformPollData(updatedPoll);
      
      // Invalidate cache
      await this.voteCache.invalidatePollVotes(id);
      await this.voteCache.invalidatePollsListCache();

      return { success: true, data: poll };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: error.errors.map(err => err.message).join(', ') };
      }
      return { success: false, error: (error as Error).message || 'Failed to update poll' };
    }
  }

  // Delete poll with cache cleanup
  static async deletePoll(id: string, userId: string): Promise<ServiceResult<null>> {
    try {
      const supabaseClient = this.getSupabaseClient(true);

      // Check ownership
      const { data: existingPoll, error: fetchError } = await supabaseClient
        .from('polls')
        .select('created_by')
        .eq('id', id)
        .single();

      if (fetchError || !existingPoll) {
        return { success: false, error: 'Poll not found', status: 404 };
      }
      if (existingPoll.created_by !== userId) {
        return { success: false, error: 'You are not authorized to delete this poll', status: 403 };
      }

      const { error } = await supabaseClient
        .from('polls')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      // Invalidate all caches
      await this.voteCache.invalidatePollVotes(id);
      await this.voteCache.invalidatePollsListCache();

      return { success: true, data: null };
    } catch (error) {
      return { success: false, error: (error as Error).message || 'Failed to delete poll' };
    }
  }

  // Get poll analytics with caching
  static async getPollAnalytics(pollId: string): Promise<ServiceResult<PollAnalytics>> {
    try {
      // Check cache first
      const cached = await this.voteCache.getCachedPollAnalytics(pollId);
      if (cached) {
        console.log('Returning cached poll analytics');
        return { success: true, data: cached };
      }

      const supabaseClient = this.getSupabaseClient(true);
      
      const { data: analytics, error } = await supabaseClient
        .rpc('get_poll_analytics', { poll_uuid: pollId });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!analytics || analytics.length === 0) {
        return { success: false, error: 'Poll not found', status: 404 };
      }

      const analyticsData = analytics[0];
      
      // Cache the analytics
      await this.voteCache.cachePollAnalytics(pollId, analyticsData);

      return { success: true, data: analyticsData };
    } catch (error) {
      return { success: false, error: (error as Error).message || 'Failed to get poll analytics' };
    }
  }

  // Get top polls with caching
  static async getTopPolls(limit: number = 10): Promise<ServiceResult<any[]>> {
    try {
      // Check cache first
      const cached = await this.voteCache.getCachedTopPolls(limit);
      if (cached) {
        console.log('Returning cached top polls');
        return { success: true, data: cached };
      }

      const supabaseClient = this.getSupabaseClient(true);
      
      const { data: topPolls, error } = await supabaseClient
        .rpc('get_top_polls_by_votes', { limit_count: limit });

      if (error) {
        return { success: false, error: error.message };
      }

      // Cache the results
      await this.voteCache.cacheTopPolls(limit, topPolls || []);

      return { success: true, data: topPolls || [] };
    } catch (error) {
      return { success: false, error: (error as Error).message || 'Failed to get top polls' };
    }
  }

  // Transform poll data from database
  private static transformPollData(poll: any): Poll {
    return {
      id: poll.id,
      question: poll.question,
      options: poll.options.map((option: string, index: number) => ({
        id: `${poll.id}-${index}`,
        text: option,
        votes: poll.votes[index] || 0,
        pollId: poll.id
      })),
      votes: poll.votes || [],
      created_at: poll.created_at,
      created_by: poll.created_by,
      is_public: poll.is_public,
      is_active: poll.is_active,
      expires_at: poll.expires_at,
      allow_multiple_votes: poll.allow_multiple_votes,
      description: poll.description,
      author: poll.author ? {
        id: poll.author.id,
        name: poll.author.raw_user_meta_data?.name || poll.author.email || 'Unknown User',
        email: poll.author.email || '',
        createdAt: new Date(poll.author.created_at),
        updatedAt: new Date(poll.author.updated_at || poll.author.created_at)
      } : undefined,
    };
  }

  // Transform poll data from materialized view
  private static transformPollDataFromStats(poll: any): Poll {
    return {
      id: poll.poll_id,
      question: poll.question,
      options: poll.options.map((option: string, index: number) => ({
        id: `${poll.poll_id}-${index}`,
        text: option,
        votes: poll.vote_counts[index] || 0,
        pollId: poll.poll_id
      })),
      votes: poll.vote_counts || [],
      created_at: poll.created_at,
      created_by: poll.created_by,
      is_public: poll.is_public,
      is_active: poll.is_active,
      expires_at: poll.expires_at,
      allow_multiple_votes: poll.allow_multiple_votes,
      description: poll.description,
      author: poll.author ? {
        id: poll.author.id,
        name: poll.author.raw_user_meta_data?.name || poll.author.email || 'Unknown User',
        email: poll.author.email || '',
        createdAt: new Date(poll.author.created_at),
        updatedAt: new Date(poll.author.updated_at || poll.author.created_at)
      } : undefined,
    };
  }

  // Health check for cache and job system
  static async healthCheck(): Promise<{
    cache: boolean;
    jobs: boolean;
    database: boolean;
  }> {
    const results = {
      cache: false,
      jobs: false,
      database: false
    };

    try {
      // Check cache
      results.cache = await this.voteCache.healthCheck();
    } catch (error) {
      console.error('Cache health check failed:', error);
    }

    try {
      // Check jobs
      const stats = await this.voteAggregationJob.getQueueStats();
      results.jobs = true; // If we can get stats, jobs are working
    } catch (error) {
      console.error('Jobs health check failed:', error);
    }

    try {
      // Check database
      const supabaseClient = this.getSupabaseClient(true);
      const { error } = await supabaseClient.from('polls').select('id').limit(1);
      results.database = !error;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    return results;
  }

  // Get system statistics
  static async getSystemStats(): Promise<{
    cache: any;
    jobs: any;
    database: any;
  }> {
    const cache = await this.voteCache.getCacheStats();
    const jobs = await this.voteAggregationJob.getQueueStats();
    
    return {
      cache,
      jobs,
      database: { status: 'connected' }
    };
  }
}
