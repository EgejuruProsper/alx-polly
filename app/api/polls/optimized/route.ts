import { NextRequest } from 'next/server';
import { OptimizedPollService } from '@/lib/poll-service-optimized';
import { ApiResponse, getAuthenticatedUser, parseRequestBody, handleApiError } from '@/lib/api-utils';

// GET /api/polls/optimized - Get polls with optimized performance
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') as "newest" | "oldest" | "most-voted" | "least-voted" || 'newest';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const filters = {
      search,
      sortBy,
      limit: Math.min(limit, 100), // Cap at 100 for performance
      offset: Math.max(offset, 0)
    };

    const result = await OptimizedPollService.getPolls(filters);

    if (result.success && result.data) {
      return ApiResponse.success({
        polls: result.data,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          hasMore: result.data.length === filters.limit
        },
        filters: {
          search: filters.search,
          sortBy: filters.sortBy
        }
      });
    } else {
      return ApiResponse.error(result.error || 'Failed to fetch polls');
    }
  } catch (error) {
    return handleApiError(error, 'Failed to fetch polls');
  }
}

// POST /api/polls/optimized - Create new poll with optimized caching
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return ApiResponse.unauthorized(authError);
    }

    const { data: pollData, error: parseError } = await parseRequestBody(request);

    if (parseError || !pollData) {
      return ApiResponse.error(parseError || 'Invalid request body');
    }

    const result = await OptimizedPollService.createPoll(pollData as any, user.id);

    if (result.success && result.data) {
      return ApiResponse.success({ poll: result.data }, 201);
    } else {
      return ApiResponse.error(result.error || 'Failed to create poll');
    }
  } catch (error) {
    return handleApiError(error, 'Failed to create poll');
  }
}
