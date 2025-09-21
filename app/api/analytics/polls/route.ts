import { NextRequest } from 'next/server';
import { OptimizedPollService } from '@/lib/poll-service-optimized';
import { ApiResponse, getAuthenticatedUser, handleApiError } from '@/lib/api-utils';

// GET /api/analytics/polls - Get poll analytics
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return ApiResponse.unauthorized(authError);
    }

    const { searchParams } = new URL(request.url);
    const pollId = searchParams.get('pollId');
    const type = searchParams.get('type') || 'analytics';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (type === 'analytics' && pollId) {
      // Get specific poll analytics
      const result = await OptimizedPollService.getPollAnalytics(pollId);
      
      if (result.success && result.data) {
        return ApiResponse.success({ analytics: result.data });
      } else {
        return ApiResponse.error(result.error || 'Failed to get poll analytics');
      }
    } else if (type === 'top_polls') {
      // Get top polls
      const result = await OptimizedPollService.getTopPolls(limit);
      
      if (result.success && result.data) {
        return ApiResponse.success({ topPolls: result.data });
      } else {
        return ApiResponse.error(result.error || 'Failed to get top polls');
      }
    } else {
      return ApiResponse.error('Invalid request parameters');
    }
  } catch (error) {
    return handleApiError(error, 'Failed to get analytics');
  }
}
