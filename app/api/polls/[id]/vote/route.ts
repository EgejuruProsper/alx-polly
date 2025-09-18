import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

// POST /api/polls/[id]/vote - Submit a vote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { option_index, user_id } = body

    // Validate required fields
    if (option_index === undefined || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: option_index, user_id' },
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
    if (option_index < 0 || option_index >= poll.options.length) {
      return NextResponse.json({ error: 'Invalid option index' }, { status: 400 })
    }

    // Update votes array
    const newVotes = [...poll.votes]
    newVotes[option_index] += 1

    const { data: updatedPoll, error: updateError } = await supabase
      .from('polls')
      .update({ votes: newVotes })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      poll: updatedPoll,
      message: 'Vote submitted successfully' 
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 })
  }
}
