import { NextRequest } from 'next/server'
import { PollService } from '@/lib/poll-service'
import { ApiResponse, extractQueryParams, handleApiError, getAuthenticatedUser, parseRequestBody } from '@/lib/api-utils'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limiter'

// Input validation schemas
const queryParamsSchema = z.object({
  search: z.string().max(100).optional(),
  sortBy: z.enum(['newest', 'oldest', 'most-voted', 'least-voted']).default('newest'),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).max(10000).default(0)
});

const createPollSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  options: z.array(z.string().trim().min(1).max(100)).min(2).max(10),
  isPublic: z.boolean(),
  allowMultipleVotes: z.boolean(),
  expiresAt: z.date().optional()
});

// Rate limiting configuration
const pollCreationLimiter = rateLimit({ windowMs: 60000, maxRequests: 5 }); // 5 polls per minute
const pollFetchLimiter = rateLimit({ windowMs: 60000, maxRequests: 100 }); // 100 requests per minute

// GET /api/polls - Fetch all polls (SECURE VERSION)
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = pollFetchLimiter(request);
    if (!rateLimitResult.allowed) {
      return ApiResponse.error('Too many requests', 429);
    }

    const { searchParams } = new URL(request.url);
    
    // Validate and sanitize query parameters
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
          hasMore: result.data.length === filters.limit
        }
      });
    } else {
      return ApiResponse.error('Failed to fetch polls');
    }
  } catch (error) {
    return handleApiError(error, 'Failed to fetch polls');
  }
}

// POST /api/polls - Create new poll (SECURE VERSION)
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = pollCreationLimiter(request);
    if (!rateLimitResult.allowed) {
      return ApiResponse.error('Too many requests', 429);
    }

    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return ApiResponse.unauthorized(authError);
    }

    const { data: pollData, error: parseError } = await parseRequestBody(request);

    if (parseError || !pollData) {
      return ApiResponse.error(parseError || 'Invalid request body');
    }

    // Validate poll data with Zod schema
    const validationResult = createPollSchema.safeParse(pollData);
    if (!validationResult.success) {
      return ApiResponse.error('Invalid poll data: ' + validationResult.error.errors.map(e => e.message).join(', '), 400);
    }

    // Remove dangerous type casting - use validated data
    const result = await PollService.createPoll(validationResult.data, user.id);

    if (result.success && result.data) {
      return ApiResponse.success({ poll: result.data }, 201);
    } else {
      return ApiResponse.error(result.error || 'Failed to create poll');
    }
  } catch (error) {
    return handleApiError(error, 'Failed to create poll');
  }
}
