import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

// GET /api/polls/[id] - Fetch poll details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data: poll, error } = await supabase
      .from('polls')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    return NextResponse.json({ poll })
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
    const body = await request.json()
    const { question, options, is_public, is_active, expires_at } = body

    const { data: poll, error } = await supabase
      .from('polls')
      .update({
        question,
        options,
        is_public,
        is_active,
        expires_at
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
