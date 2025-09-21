import { Queue, Worker, Job } from 'bullmq';
import { createServerSupabaseClient } from '@/app/lib/supabase';
import { getVoteCache } from '@/lib/cache/vote-cache';

interface VoteAggregationJobData {
  pollId: string;
  userId?: string;
  optionIndex?: number;
  action: 'vote' | 'unvote' | 'refresh';
}

interface PollAnalyticsJobData {
  pollId: string;
  type: 'analytics' | 'top_polls';
}

class VoteAggregationJob {
  private queue: Queue;
  private worker: Worker;
  private voteCache: ReturnType<typeof getVoteCache>;

  constructor() {
    this.voteCache = getVoteCache();
    
    this.queue = new Queue('vote-aggregation', {
      connection: { 
        host: process.env.REDIS_URL || 'redis://localhost:6379',
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.worker = new Worker(
      'vote-aggregation',
      this.processVoteAggregation.bind(this),
      {
        connection: { 
          host: process.env.REDIS_URL || 'redis://localhost:6379',
          maxRetriesPerRequest: 3,
        },
        concurrency: 5, // Process up to 5 jobs concurrently
      }
    );

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      console.log(`Vote aggregation job ${job.id} completed for poll ${job.data.pollId}`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Vote aggregation job ${job?.id} failed:`, err);
    });

    this.worker.on('error', (err) => {
      console.error('Vote aggregation worker error:', err);
    });
  }

  // Queue vote aggregation job
  async queueVoteAggregation(pollId: string, action: 'vote' | 'unvote' | 'refresh' = 'refresh', userId?: string, optionIndex?: number): Promise<void> {
    try {
      const jobData: VoteAggregationJobData = {
        pollId,
        userId,
        optionIndex,
        action
      };

      // Add delay to batch multiple votes
      const delay = action === 'refresh' ? 1000 : 500;
      
      await this.queue.add('aggregate-votes', jobData, {
        delay,
        priority: action === 'refresh' ? 1 : 2, // Higher priority for refresh
        jobId: `vote-agg-${pollId}-${Date.now()}`, // Unique job ID
      });

      console.log(`Queued vote aggregation for poll ${pollId}, action: ${action}`);
    } catch (error) {
      console.error('Failed to queue vote aggregation:', error);
    }
  }

  // Process vote aggregation
  private async processVoteAggregation(job: Job<VoteAggregationJobData>): Promise<void> {
    const { pollId, action } = job.data;
    
    try {
      console.log(`Processing vote aggregation for poll ${pollId}, action: ${action}`);
      
      const supabase = createServerSupabaseClient();
      
      // Get current poll data
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .select('id, options, allow_multiple_votes')
        .eq('id', pollId)
        .single();

      if (pollError || !poll) {
        throw new Error(`Poll ${pollId} not found: ${pollError?.message}`);
      }

      // Get vote counts efficiently using the optimized function
      const { data: voteCounts, error: voteError } = await supabase
        .from('votes')
        .select('option_index, count(*)')
        .eq('poll_id', pollId)
        .group('option_index');

      if (voteError) {
        throw new Error(`Failed to get vote counts: ${voteError.message}`);
      }

      // Get unique voters count
      const { data: uniqueVoters, error: votersError } = await supabase
        .from('votes')
        .select('voter_id')
        .eq('poll_id', pollId);

      if (votersError) {
        throw new Error(`Failed to get unique voters: ${votersError.message}`);
      }

      // Build vote counts array
      const optionsCount = poll.options.length;
      const voteArray = new Array(optionsCount).fill(0);
      let totalVotes = 0;

      if (voteCounts) {
        voteCounts.forEach(({ option_index, count }) => {
          if (option_index >= 0 && option_index < optionsCount) {
            voteArray[option_index] = parseInt(count);
            totalVotes += parseInt(count);
          }
        });
      }

      const uniqueVotersCount = uniqueVoters ? new Set(uniqueVoters.map(v => v.voter_id)).size : 0;

      // Update poll with aggregated counts
      const { error: updateError } = await supabase
        .from('polls')
        .update({
          votes: voteArray,
          total_votes: totalVotes,
          unique_voters: uniqueVotersCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', pollId);

      if (updateError) {
        throw new Error(`Failed to update poll: ${updateError.message}`);
      }

      // Update cache
      await this.voteCache.cachePollVotes(pollId, {
        voteCounts: voteArray,
        totalVotes,
        uniqueVoters: uniqueVotersCount,
        lastUpdated: new Date().toISOString(),
        pollId
      });

      // Invalidate polls list cache
      await this.voteCache.invalidatePollsListCache();

      console.log(`Successfully updated vote counts for poll ${pollId}: ${totalVotes} total votes, ${uniqueVotersCount} unique voters`);
      
    } catch (error) {
      console.error(`Failed to process vote aggregation for poll ${pollId}:`, error);
      throw error;
    }
  }

  // Queue analytics job
  async queueAnalyticsJob(pollId: string, type: 'analytics' | 'top_polls' = 'analytics'): Promise<void> {
    try {
      const jobData: PollAnalyticsJobData = {
        pollId,
        type
      };

      await this.queue.add('poll-analytics', jobData, {
        delay: 2000, // 2 second delay
        priority: 3, // Lower priority
        jobId: `analytics-${pollId}-${type}-${Date.now()}`,
      });

      console.log(`Queued analytics job for poll ${pollId}, type: ${type}`);
    } catch (error) {
      console.error('Failed to queue analytics job:', error);
    }
  }

  // Process analytics job
  private async processAnalyticsJob(job: Job<PollAnalyticsJobData>): Promise<void> {
    const { pollId, type } = job.data;
    
    try {
      console.log(`Processing analytics for poll ${pollId}, type: ${type}`);
      
      const supabase = createServerSupabaseClient();
      
      if (type === 'analytics') {
        // Get poll analytics
        const { data: analytics, error } = await supabase
          .rpc('get_poll_analytics', { poll_uuid: pollId });

        if (error) {
          throw new Error(`Failed to get poll analytics: ${error.message}`);
        }

        if (analytics && analytics.length > 0) {
          await this.voteCache.cachePollAnalytics(pollId, analytics[0]);
        }
      } else if (type === 'top_polls') {
        // Get top polls
        const { data: topPolls, error } = await supabase
          .rpc('get_top_polls_by_votes', { limit_count: 10 });

        if (error) {
          throw new Error(`Failed to get top polls: ${error.message}`);
        }

        if (topPolls) {
          await this.voteCache.cacheTopPolls(10, topPolls);
        }
      }

      console.log(`Successfully processed analytics for poll ${pollId}, type: ${type}`);
      
    } catch (error) {
      console.error(`Failed to process analytics for poll ${pollId}:`, error);
      throw error;
    }
  }

  // Get queue statistics
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    try {
      const waiting = await this.queue.getWaiting();
      const active = await this.queue.getActive();
      const completed = await this.queue.getCompleted();
      const failed = await this.queue.getFailed();
      const delayed = await this.queue.getDelayed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
      };
    } catch (error) {
      console.error('Failed to get queue stats:', error);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      };
    }
  }

  // Clean up old jobs
  async cleanupOldJobs(): Promise<void> {
    try {
      // Remove completed jobs older than 1 hour
      await this.queue.clean(3600000, 100, 'completed');
      
      // Remove failed jobs older than 24 hours
      await this.queue.clean(86400000, 50, 'failed');
      
      console.log('Cleaned up old jobs');
    } catch (error) {
      console.error('Failed to cleanup old jobs:', error);
    }
  }

  // Close connections
  async close(): Promise<void> {
    try {
      await this.worker.close();
      await this.queue.close();
      console.log('Vote aggregation job system closed');
    } catch (error) {
      console.error('Failed to close vote aggregation system:', error);
    }
  }
}

// Singleton instance
let voteAggregationInstance: VoteAggregationJob | null = null;

export function getVoteAggregationJob(): VoteAggregationJob {
  if (!voteAggregationInstance) {
    voteAggregationInstance = new VoteAggregationJob();
  }
  return voteAggregationInstance;
}

export { VoteAggregationJob, type VoteAggregationJobData, type PollAnalyticsJobData };
