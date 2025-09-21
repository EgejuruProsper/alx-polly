import { NextRequest } from 'next/server'
import { PollService } from '@/lib/poll-service'
import { ApiResponse, getAuthenticatedUser, parseRequestBody, handleApiError } from '@/lib/api-utils'

// POST /api/polls/[id]/vote - Submit a vote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user, error: authError } = await getAuthenticatedUser(request)
    
    if (authError || !user) {
      return ApiResponse.unauthorized(authError)
    }

    const { data: body, error: parseError } = await parseRequestBody(request)
    
    if (parseError || !body) {
      return ApiResponse.error(parseError || 'Invalid request body')
    }

    const { option_index } = body as { option_index: number }

    // Validate required fields
    if (option_index === undefined || option_index < 0) {
      return ApiResponse.error('Invalid option index')
    }

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