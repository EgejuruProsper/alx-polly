import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/app/lib/supabase'

// POST /api/polls/[id]/vote - Submit a vote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServerSupabaseClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to vote' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { option_index } = body

    // Validate required fields
    if (option_index === undefined || option_index < 0) {
      return NextResponse.json(
        { error: 'Invalid option index' },
        { status: 400 }
      )
    }

    // First, get the current poll
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('*')
      .eq('id', id)
      .single()

    if (pollError || !poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    // Check if poll is active and not expired
    if (!poll.is_active) {
      return NextResponse.json({ error: 'Poll is not active' }, { status: 400 })
    }

    if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Poll has expired' }, { status: 400 })
    }

    // Validate option index
    if (option_index >= poll.options.length) {
      return NextResponse.json({ error: 'Invalid option index' }, { status: 400 })
    }

    // Check if user has already voted (unless multiple votes allowed)
    if (!poll.allow_multiple_votes) {
      const { data: existingVote } = await supabase
        .from('votes')
        .select('id')
        .eq('poll_id', id)
        .eq('voter_id', user.id)
        .single()

      if (existingVote) {
        return NextResponse.json({ 
          error: 'You have already voted on this poll' 
        }, { status: 400 })
      }
    }

    // Insert the vote
    const { data: vote, error: voteError } = await supabase
      .from('votes')
      .insert({
        poll_id: id,
        option_index,
        voter_id: user.id
      })
      .select()
      .single()

    if (voteError) {
      return NextResponse.json({ error: voteError.message }, { status: 500 })
    }

    // Get updated poll with new vote counts
    const { data: updatedPoll, error: updateError } = await supabase
      .from('polls')
      .select(`
        *,
        author:created_by (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('id', id)
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Transform the data to match our Poll interface
    const transformedPoll = {
      id: updatedPoll.id,
      question: updatedPoll.question,
      options: updatedPoll.options.map((option: string, index: number) => ({
        id: `${updatedPoll.id}-${index}`,
        text: option,
        votes: updatedPoll.votes[index] || 0,
        pollId: updatedPoll.id
      })),
      created_at: updatedPoll.created_at,
      created_by: updatedPoll.created_by,
      is_public: updatedPoll.is_public,
      is_active: updatedPoll.is_active,
      expires_at: updatedPoll.expires_at,
      allow_multiple_votes: updatedPoll.allow_multiple_votes,
      description: updatedPoll.description,
      author: {
        id: updatedPoll.author?.id || updatedPoll.created_by,
        name: updatedPoll.author?.raw_user_meta_data?.name || updatedPoll.author?.email || 'Unknown User',
        email: updatedPoll.author?.email || '',
        createdAt: new Date(updatedPoll.created_at),
        updatedAt: new Date(updatedPoll.created_at)
      }
    }

    return NextResponse.json({ 
      poll: transformedPoll,
      message: 'Vote submitted successfully' 
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 })
  }
}