import { NextRequest } from 'next/server';
import { OptimizedPollService } from '@/lib/poll-service-optimized';
import { ApiResponse, getAuthenticatedUser, parseRequestBody, handleApiError } from '@/lib/api-utils';

// POST /api/polls/optimized/[id]/vote - Submit vote with optimized processing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return ApiResponse.unauthorized(authError);
    }

    const { data: body, error: parseError } = await parseRequestBody(request);

    if (parseError || !body) {
      return ApiResponse.error(parseError || 'Invalid request body');
    }

    const { option_index } = body as { option_index: number };

    // Validate required fields
    if (option_index === undefined || option_index < 0) {
      return ApiResponse.error('Invalid option index');
    }

    const result = await OptimizedPollService.submitVote(id, option_index, user.id);

    if (result.success && result.data) {
      return ApiResponse.success({ 
        poll: result.data, 
        message: 'Vote submitted successfully' 
      }, 201);
    } else {
      // Handle specific service errors
      if (result.status === 404) return ApiResponse.notFound(result.error);
      if (result.status === 400) return ApiResponse.error(result.error, 400);
      if (result.status === 409) return ApiResponse.error(result.error, 409); // Conflict for duplicate vote
      return ApiResponse.error(result.error || 'Failed to submit vote');
    }
  } catch (error) {
    return handleApiError(error, 'Failed to submit vote');
  }
}
