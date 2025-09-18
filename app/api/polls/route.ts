import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

// GET /api/polls - Fetch all polls
export async function GET(request: NextRequest) {
  try {
    const { data: polls, error } = await supabase
      .from('polls')
      .select('*')
      .eq('is_public', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ polls })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch polls' }, { status: 500 })
  }
}

// POST /api/polls - Create new poll
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question, options, user_id, is_public = true, expires_at } = body

    // Validate required fields
    if (!question || !options || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: question, options, user_id' },
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
        user_id,
        is_public,
        is_active: true,
        expires_at
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
