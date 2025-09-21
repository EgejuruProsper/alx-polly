import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/app/lib/supabase'

// GET /api/polls/[id] - Get single poll
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServerSupabaseClient()
    
    const { data: poll, error } = await supabase
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
      .eq('is_public', true)
      .eq('is_active', true)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    // Transform the data to match our Poll interface
    const transformedPoll = {
      id: poll.id,
      question: poll.question,
      options: poll.options.map((option: string, index: number) => ({
        id: `${poll.id}-${index}`,
        text: option,
        votes: poll.votes[index] || 0,
        pollId: poll.id
      })),
      created_at: poll.created_at,
      created_by: poll.created_by,
      is_public: poll.is_public,
      is_active: poll.is_active,
      expires_at: poll.expires_at,
      allow_multiple_votes: poll.allow_multiple_votes,
      description: poll.description,
      author: {
        id: poll.author?.id || poll.created_by,
        name: poll.author?.raw_user_meta_data?.name || poll.author?.email || 'Unknown User',
        email: poll.author?.email || '',
        createdAt: new Date(poll.created_at),
        updatedAt: new Date(poll.created_at)
      }
    }

    return NextResponse.json({ poll: transformedPoll })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch poll' }, { status: 500 })
  }
}

// PUT /api/polls/[id] - Update poll
export async function PUT(
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
        { error: 'You must be logged in to edit a poll' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { question, options, is_public, expires_at, allow_multiple_votes, description } = body

    // Check if user owns this poll
    const { data: existingPoll, error: fetchError } = await supabase
      .from('polls')
      .select('created_by')
      .eq('id', id)
      .single()

    if (fetchError || !existingPoll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    if (existingPoll.created_by !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own polls' },
        { status: 403 }
      )
    }

    // Validate required fields
    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { error: 'Missing required fields: question and at least 2 options' },
        { status: 400 }
      )
    }

    // Update votes array to match new options length
    const currentVotes = existingPoll.votes || []
    const newVotes = new Array(options.length).fill(0)
    // Preserve existing votes for options that still exist
    for (let i = 0; i < Math.min(currentVotes.length, options.length); i++) {
      newVotes[i] = currentVotes[i] || 0
    }

    const { data: poll, error } = await supabase
      .from('polls')
      .update({
        question,
        options,
        votes: newVotes,
        is_public: is_public,
        expires_at,
        allow_multiple_votes,
        description,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ poll })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update poll' }, { status: 500 })
  }
}

// DELETE /api/polls/[id] - Delete poll
export async function DELETE(
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
        { error: 'You must be logged in to delete a poll' },
        { status: 401 }
      )
    }

    // Check if user owns this poll
    const { data: existingPoll, error: fetchError } = await supabase
      .from('polls')
      .select('created_by')
      .eq('id', id)
      .single()

    if (fetchError || !existingPoll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    if (existingPoll.created_by !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own polls' },
        { status: 403 }
      )
    }

    // Delete the poll (this will also delete associated votes due to CASCADE)
    const { error } = await supabase
      .from('polls')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Poll deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete poll' }, { status: 500 })
  }
}