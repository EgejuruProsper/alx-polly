import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/app/lib/supabase'

// GET /api/polls - Fetch all polls
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'newest'
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Build query
    let query = supabase
      .from('polls')
      .select(`
        *,
        author:created_by (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('is_public', true)
      .eq('is_active', true)
    
    // Add search filter
    if (search) {
      query = query.or(`question.ilike.%${search}%,description.ilike.%${search}%`)
    }
    
    // Add sorting
    switch (sortBy) {
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
      case 'most-voted':
        query = query.order('votes', { ascending: false })
        break
      case 'least-voted':
        query = query.order('votes', { ascending: true })
        break
      default: // newest
        query = query.order('created_at', { ascending: false })
    }
    
    // Add pagination
    query = query.range(offset, offset + limit - 1)
    
    const { data: polls, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform the data to match our Poll interface
    const transformedPolls = polls?.map(poll => ({
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
    })) || []

    return NextResponse.json({ polls: transformedPolls })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch polls' }, { status: 500 })
  }
}

// POST /api/polls - Create new poll
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to create a poll' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { question, options, is_public = true, expires_at, allow_multiple_votes = false, description } = body

    // Validate required fields
    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { error: 'Missing required fields: question and at least 2 options' },
        { status: 400 }
      )
    }

    // Initialize votes array with zeros
    const votes = new Array(options.length).fill(0)

    const { data: poll, error } = await supabase
      .from('polls')
      .insert({
        question,
        options,
        votes,
        created_by: user.id,
        is_public,
        is_active: true,
        expires_at,
        allow_multiple_votes,
        description
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ poll }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 })
  }
}
