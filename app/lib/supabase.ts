import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client with auth
export function createServerSupabaseClient() {
  const cookieStore = cookies()
  
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.then(store => store.get(name)?.value)
        },
      },
    }
  )
}

// Database types based on your rules
export interface Database {
  public: {
    Tables: {
      polls: {
        Row: {
          id: string
          question: string
          options: string[]
          votes: number[]
          created_at: string
          created_by: string
          is_public: boolean
          is_active: boolean
          expires_at?: string
          allow_multiple_votes?: boolean
          description?: string
        }
        Insert: {
          id?: string
          question: string
          options: string[]
          votes?: number[]
          created_at?: string
          created_by: string
          is_public?: boolean
          is_active?: boolean
          expires_at?: string
          allow_multiple_votes?: boolean
          description?: string
        }
        Update: {
          id?: string
          question?: string
          options?: string[]
          votes?: number[]
          created_at?: string
          created_by?: string
          is_public?: boolean
          is_active?: boolean
          expires_at?: string
          allow_multiple_votes?: boolean
          description?: string
        }
      }
    }
  }
}
