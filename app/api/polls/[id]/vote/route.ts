import { NextRequest } from 'next/server'
import { PollService } from '@/lib/poll-service'
import { ApiResponse, getAuthenticatedUser, parseRequestBody, handleApiError } from '@/lib/api-utils'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limiter'

/**
 * Vote input validation schema
 * 
 * WHY: Ensures vote data is valid and prevents out-of-bounds access.
 * Option index must be within valid range to prevent array access errors.
 * 
 * Edge cases:
 * - Negative option_index → validation error
 * - Option index beyond poll options → handled by business logic
 * - Non-integer values → validation error
 */
const voteSchema = z.object({
  option_index: z.number().int().min(0).max(99) // Allow up to 100 options
});

/**
 * Rate limiting for vote submissions
 * 
 * WHY: Prevents vote manipulation and spam while allowing legitimate voting.
 * Lower limit than polls creation since voting is more frequent.
 */
const voteLimiter = rateLimit({ windowMs: 60000, maxRequests: 10 }); // 10 votes per minute

/**
 * POST /api/polls/[id]/vote
 * -------------------------
 * Records a single vote by the authenticated user for a poll option.
 * 
 * WHY: Enforces one-vote-per-user-per-poll constraint and prevents vote manipulation.
 * Server-side validation ensures data integrity and prevents client tampering.
 * 
 * Security considerations:
 * - Authentication required (server-side session)
 * - Rate limiting prevents vote manipulation
 * - Input validation prevents malformed votes
 * - Business logic enforces voting rules
 * 
 * Edge cases:
 * - Unauthenticated requests → 401
 * - Invalid poll ID → 404
 * - Invalid option index → 400
 * - User already voted → handled by business logic
 * - Poll expired/inactive → handled by business logic
 * 
 * @param request - NextRequest with vote data in body
 * @param params - Route parameters containing poll ID
 * @returns Updated poll data or error response
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting to prevent vote manipulation
    const rateLimitResult = voteLimiter(request);
    if (!rateLimitResult.allowed) {
      return ApiResponse.error('Too many requests', 429);
    }

    const { id } = await params
    // Require server-side authentication to prevent client tampering
    const { user, error: authError } = await getAuthenticatedUser(request)
    
    if (authError || !user) {
      return ApiResponse.unauthorized(authError)
    }

    const { data: body, error: parseError } = await parseRequestBody(request)
    
    if (parseError || !body) {
      return ApiResponse.error(parseError || 'Invalid request body')
    }

    // Validate vote data with Zod schema to prevent malformed votes
    const validationResult = voteSchema.safeParse(body);
    if (!validationResult.success) {
      return ApiResponse.error('Invalid vote data: ' + validationResult.error.errors.map(e => e.message).join(', '), 400);
    }

    const { option_index } = validationResult.data;

    // Submit vote with validated data and server-side user ID
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