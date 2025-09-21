import { NextRequest } from 'next/server'
import { PollService } from '@/lib/poll-service'
import { ApiResponse, getAuthenticatedUser, parseRequestBody, handleApiError } from '@/lib/api-utils'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limiter'

// Input validation schemas
const voteSchema = z.object({
  option_index: z.number().int().min(0).max(99) // Allow up to 100 options
});

// Rate limiting configuration
const voteLimiter = rateLimit({ windowMs: 60000, maxRequests: 10 }); // 10 votes per minute

// POST /api/polls/[id]/vote - Submit a vote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const rateLimitResult = voteLimiter(request);
    if (!rateLimitResult.allowed) {
      return ApiResponse.error('Too many requests', 429);
    }

    const { id } = await params
    const { user, error: authError } = await getAuthenticatedUser(request)
    
    if (authError || !user) {
      return ApiResponse.unauthorized(authError)
    }

    const { data: body, error: parseError } = await parseRequestBody(request)
    
    if (parseError || !body) {
      return ApiResponse.error(parseError || 'Invalid request body')
    }

    // Validate vote data with Zod schema
    const validationResult = voteSchema.safeParse(body);
    if (!validationResult.success) {
      return ApiResponse.error('Invalid vote data: ' + validationResult.error.errors.map(e => e.message).join(', '), 400);
    }

    const { option_index } = validationResult.data;

    const result = await PollService.submitVote({
      pollId: id,
      optionIndex: option_index,
      userId: user.id
    })

    if (result.success && result.data) {
      return ApiResponse.success({
        poll: result.data,
        message: 'Vote submitted successfully'
      })
    } else {
      return ApiResponse.error(result.error || 'Failed to submit vote')
    }
  } catch (error) {
    return handleApiError(error, 'Failed to submit vote')
  }
}