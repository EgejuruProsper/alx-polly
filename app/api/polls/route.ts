import { NextRequest } from 'next/server'
import { PollService } from '@/lib/poll-service'
import { ApiResponse, extractQueryParams, handleApiError, getAuthenticatedUser, parseRequestBody } from '@/lib/api-utils'

// GET /api/polls - Fetch all polls
export async function GET(request: NextRequest) {
  try {
    const filters = extractQueryParams(request)
    const result = await PollService.getPolls({
      search: filters.search || undefined,
      sortBy: filters.sortBy as "newest" | "oldest" | "most-voted" | "least-voted" | undefined,
      limit: filters.limit,
      offset: filters.offset
    })

    if (result.success && result.data) {
      return ApiResponse.success({ polls: result.data })
    } else {
      return ApiResponse.error(result.error || 'Failed to fetch polls')
    }
  } catch (error) {
    return handleApiError(error, 'Failed to fetch polls')
  }
}

// POST /api/polls - Create new poll
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request)
    
    if (authError || !user) {
      return ApiResponse.unauthorized(authError)
    }

    const { data: pollData, error: parseError } = await parseRequestBody(request)

    if (parseError || !pollData) {
      return ApiResponse.error(parseError || 'Invalid request body')
    }

    const result = await PollService.createPoll(pollData as any, user.id)

    if (result.success && result.data) {
      return ApiResponse.success({ poll: result.data }, 201)
    } else {
      return ApiResponse.error(result.error || 'Failed to create poll')
    }
  } catch (error) {
    return handleApiError(error, 'Failed to create poll')
  }
}
