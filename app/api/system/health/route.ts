import { NextRequest } from 'next/server';
import { OptimizedPollService } from '@/lib/poll-service-optimized';
import { ApiResponse } from '@/lib/api-utils';

// GET /api/system/health - System health check
export async function GET(request: NextRequest) {
  try {
    const health = await OptimizedPollService.healthCheck();
    const stats = await OptimizedPollService.getSystemStats();
    
    const isHealthy = health.cache && health.jobs && health.database;
    
    return ApiResponse.success({
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        cache: {
          status: health.cache ? 'up' : 'down',
          stats: stats.cache
        },
        jobs: {
          status: health.jobs ? 'up' : 'down',
          stats: stats.jobs
        },
        database: {
          status: health.database ? 'up' : 'down',
          stats: stats.database
        }
      }
    }, isHealthy ? 200 : 503);
  } catch (error) {
    return ApiResponse.error('Health check failed', 500);
  }
}
