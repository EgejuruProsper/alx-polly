import Redis from 'ioredis';
import { Poll } from '@/types';

interface VoteCacheData {
  voteCounts: number[];
  totalVotes: number;
  uniqueVoters: number;
  lastUpdated: string;
  pollId: string;
}

interface PollCacheData {
  polls: Poll[];
  totalCount: number;
  lastUpdated: string;
  filters: {
    search?: string;
    sortBy?: string;
    limit?: number;
    offset?: number;
  };
}

class VoteCache {
  private redis: Redis;
  private readonly TTL = 300; // 5 minutes for vote data
  private readonly POLL_TTL = 600; // 10 minutes for poll lists
  private readonly ANALYTICS_TTL = 3600; // 1 hour for analytics

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
    });

    this.redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  // Cache poll vote counts
  async cachePollVotes(pollId: string, voteData: VoteCacheData): Promise<void> {
    try {
      const key = `poll:votes:${pollId}`;
      await this.redis.setex(key, this.TTL, JSON.stringify(voteData));
    } catch (error) {
      console.error('Failed to cache poll votes:', error);
    }
  }

  // Get cached vote counts
  async getPollVotes(pollId: string): Promise<VoteCacheData | null> {
    try {
      const key = `poll:votes:${pollId}`;
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Failed to get cached poll votes:', error);
      return null;
    }
  }

  // Invalidate cache when votes change
  async invalidatePollVotes(pollId: string): Promise<void> {
    try {
      const key = `poll:votes:${pollId}`;
      await this.redis.del(key);
    } catch (error) {
      console.error('Failed to invalidate poll votes cache:', error);
    }
  }

  // Cache sorted poll lists
  async cacheSortedPolls(filters: {
    search?: string;
    sortBy?: string;
    limit?: number;
    offset?: number;
  }, polls: Poll[], totalCount: number): Promise<void> {
    try {
      const key = `polls:sorted:${JSON.stringify(filters)}`;
      const cacheData: PollCacheData = {
        polls,
        totalCount,
        lastUpdated: new Date().toISOString(),
        filters
      };
      await this.redis.setex(key, this.POLL_TTL, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Failed to cache sorted polls:', error);
    }
  }

  // Get cached sorted polls
  async getCachedSortedPolls(filters: {
    search?: string;
    sortBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<PollCacheData | null> {
    try {
      const key = `polls:sorted:${JSON.stringify(filters)}`;
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Failed to get cached sorted polls:', error);
      return null;
    }
  }

  // Cache poll analytics
  async cachePollAnalytics(pollId: string, analytics: any): Promise<void> {
    try {
      const key = `poll:analytics:${pollId}`;
      await this.redis.setex(key, this.ANALYTICS_TTL, JSON.stringify(analytics));
    } catch (error) {
      console.error('Failed to cache poll analytics:', error);
    }
  }

  // Get cached poll analytics
  async getCachedPollAnalytics(pollId: string): Promise<any | null> {
    try {
      const key = `poll:analytics:${pollId}`;
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Failed to get cached poll analytics:', error);
      return null;
    }
  }

  // Cache top polls
  async cacheTopPolls(limit: number, topPolls: any[]): Promise<void> {
    try {
      const key = `polls:top:${limit}`;
      await this.redis.setex(key, this.ANALYTICS_TTL, JSON.stringify(topPolls));
    } catch (error) {
      console.error('Failed to cache top polls:', error);
    }
  }

  // Get cached top polls
  async getCachedTopPolls(limit: number): Promise<any[] | null> {
    try {
      const key = `polls:top:${limit}`;
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Failed to get cached top polls:', error);
      return null;
    }
  }

  // Invalidate all poll-related cache
  async invalidateAllPollCache(): Promise<void> {
    try {
      const keys = await this.redis.keys('poll:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Failed to invalidate all poll cache:', error);
    }
  }

  // Invalidate polls list cache
  async invalidatePollsListCache(): Promise<void> {
    try {
      const keys = await this.redis.keys('polls:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Failed to invalidate polls list cache:', error);
    }
  }

  // Get cache statistics
  async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate: number;
  }> {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      const stats = await this.redis.info('stats');
      
      const totalKeys = await this.redis.dbsize();
      const memoryUsage = info.match(/used_memory_human:([^\r\n]+)/)?.[1] || '0B';
      const hits = stats.match(/keyspace_hits:(\d+)/)?.[1] || '0';
      const misses = stats.match(/keyspace_misses:(\d+)/)?.[1] || '0';
      const hitRate = parseInt(hits) + parseInt(misses) > 0 
        ? (parseInt(hits) / (parseInt(hits) + parseInt(misses))) * 100 
        : 0;

      return {
        totalKeys,
        memoryUsage,
        hitRate: Math.round(hitRate * 100) / 100
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalKeys: 0,
        memoryUsage: '0B',
        hitRate: 0
      };
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  // Close connection
  async close(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      console.error('Failed to close Redis connection:', error);
    }
  }
}

// Singleton instance
let voteCacheInstance: VoteCache | null = null;

export function getVoteCache(): VoteCache {
  if (!voteCacheInstance) {
    voteCacheInstance = new VoteCache();
  }
  return voteCacheInstance;
}

export { VoteCache, type VoteCacheData, type PollCacheData };
