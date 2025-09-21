import { NextRequest } from 'next/server';
import { OptimizedPollService } from '@/lib/poll-service-optimized';
import { ApiResponse, getAuthenticatedUser, parseRequestBody, handleApiError } from '@/lib/api-utils';

// GET /api/polls/optimized/[id] - Get single poll with caching
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await OptimizedPollService.getPollById(id);

    if (result.success && result.data) {
      return ApiResponse.success({ poll: result.data });
    } else {
      return ApiResponse.notFound(result.error || 'Poll not found');
    }
  } catch (error) {
    return handleApiError(error, 'Failed to fetch poll');
  }
}

// PUT /api/polls/optimized/[id] - Update poll with cache invalidation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return ApiResponse.unauthorized(authError);
    }

    const { data: updates, error: parseError } = await parseRequestBody(request);

    if (parseError || !updates) {
      return ApiResponse.error(parseError || 'Invalid request body');
    }

    const result = await OptimizedPollService.updatePoll(id, updates, user.id);

    if (result.success && result.data) {
      return ApiResponse.success({ poll: result.data });
    } else {
      return ApiResponse.error(result.error || 'Failed to update poll');
    }
  } catch (error) {
    return handleApiError(error, 'Failed to update poll');
  }
}

// DELETE /api/polls/optimized/[id] - Delete poll with cache cleanup
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return ApiResponse.unauthorized(authError);
    }

    const result = await OptimizedPollService.deletePoll(id, user.id);

    if (result.success) {
      return ApiResponse.success({ message: 'Poll deleted successfully' });
    } else {
      return ApiResponse.error(result.error || 'Failed to delete poll');
    }
  } catch (error) {
    return handleApiError(error, 'Failed to delete poll');
  }
}
