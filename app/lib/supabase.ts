import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
          user_id: string
          is_public: boolean
          is_active: boolean
          expires_at?: string
        }
        Insert: {
          id?: string
          question: string
          options: string[]
          votes?: number[]
          created_at?: string
          user_id: string
          is_public?: boolean
          is_active?: boolean
          expires_at?: string
        }
        Update: {
          id?: string
          question?: string
          options?: string[]
          votes?: number[]
          created_at?: string
          user_id?: string
          is_public?: boolean
          is_active?: boolean
          expires_at?: string
        }
      }
    }
  }
}
