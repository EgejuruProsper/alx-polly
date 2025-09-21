import { NextRequest } from 'next/server'
import { PollService } from '@/lib/poll-service'
import { ApiResponse, extractQueryParams, handleApiError, getAuthenticatedUser, parseRequestBody } from '@/lib/api-utils'
import { createPollSchema } from '@/lib/validations'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limiter'

/**
 * Rate limiting configuration for polls API
 * 
 * WHY: Prevents abuse and DoS attacks by limiting request frequency.
 * Different limits for different operations based on resource intensity.
 */
const pollCreationLimiter = rateLimit({ windowMs: 60000, maxRequests: 5 }); // 5 polls per minute
const pollFetchLimiter = rateLimit({ windowMs: 60000, maxRequests: 100 }); // 100 requests per minute

/**
 * Query parameters validation schema
 * 
 * WHY: Validates and sanitizes query parameters to prevent injection attacks.
 * Bounds checking prevents resource exhaustion (DoS via large limits/offsets).
 * 
 * Edge cases:
 * - Invalid sortBy values → defaults to 'newest'
 * - Negative limits/offsets → validation error
 * - Excessive limits → capped at 100
 */
const queryParamsSchema = z.object({
  search: z.string().max(100).optional(), // Prevent massive search strings
  sortBy: z.enum(['newest', 'oldest', 'most-voted', 'least-voted']).default('newest'),
  limit: z.number().int().min(1).max(100).default(20), // Prevent resource exhaustion
  offset: z.number().int().min(0).max(10000).default(0) // Reasonable pagination bounds
});

/**
 * GET /api/polls
 * --------------
 * Fetches public polls with filtering, sorting, and pagination.
 * 
 * WHY: Provides a secure way to browse polls without exposing sensitive data.
 * Server-side validation prevents injection attacks and resource exhaustion.
 * 
 * Security considerations:
 * - Rate limiting prevents abuse
 * - Input validation prevents injection
 * - No PII exposed in responses
 * - Pagination prevents large data dumps
 * 
 * @param request - NextRequest with query parameters
 * @returns Poll list with pagination metadata
 */
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting to prevent abuse
    const rateLimitResult = pollFetchLimiter(request);
    if (!rateLimitResult.allowed) {
      return ApiResponse.error('Too many requests', 429);
    }

    const { searchParams } = new URL(request.url);
    
    // Validate and sanitize query parameters to prevent injection attacks
    const validationResult = queryParamsSchema.safeParse({
      search: searchParams.get('search'),
      sortBy: searchParams.get('sortBy'),
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0')
    });

    if (!validationResult.success) {
      return ApiResponse.error('Invalid query parameters', 400);
    }

    const filters = validationResult.data;
    const result = await PollService.getPolls(filters);

    if (result.success && result.data) {
      return ApiResponse.success({ 
        polls: result.data,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          hasMore: result.data.length === filters.limit // Indicates if more data available
        }
      });
    } else {
      return ApiResponse.error(result.error || 'Failed to fetch polls');
    }
  } catch (error) {
    return handleApiError(error, 'Failed to fetch polls');
  }
}

/**
 * POST /api/polls
 * ---------------
 * Creates a new poll for the authenticated user.
 * 
 * WHY: Centralizes poll creation with server-side validation and ownership enforcement.
 * Prevents client tampering and ensures data integrity.
 * 
 * Security considerations:
 * - Authentication required (server-side session)
 * - Rate limiting prevents spam
 * - Input validation prevents malformed data
 * - User ownership automatically assigned
 * 
 * Edge cases:
 * - Unauthenticated requests → 401
 * - Invalid poll data → 400 with validation errors
 * - Rate limit exceeded → 429
 * 
 * @param request - NextRequest with poll data in body
 * @returns Created poll data or error response
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting to prevent spam and abuse
    const rateLimitResult = pollCreationLimiter(request);
    if (!rateLimitResult.allowed) {
      return ApiResponse.error('Too many requests', 429);
    }

    // Require server-side authentication to prevent client tampering
    const { user, error: authError } = await getAuthenticatedUser(request)
    
    if (authError || !user) {
      return ApiResponse.unauthorized(authError)
    }

    const { data: pollData, error: parseError } = await parseRequestBody(request)

    if (parseError || !pollData) {
      return ApiResponse.error(parseError || 'Invalid request body')
    }

    // Validate poll data with Zod schema to prevent malformed data
    const validationResult = createPollSchema.safeParse(pollData);
    if (!validationResult.success) {
      return ApiResponse.error('Invalid poll data: ' + validationResult.error.errors.map(e => e.message).join(', '), 400);
    }

    // Create poll with validated data and server-side user ID
    const result = await PollService.createPoll(validationResult.data, user.id)

    if (result.success && result.data) {
      return ApiResponse.success({ poll: result.data }, 201)
    } else {
      return ApiResponse.error(result.error || 'Failed to create poll')
    }
  } catch (error) {
    return handleApiError(error, 'Failed to create poll')
  }
}
