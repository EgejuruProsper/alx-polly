import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Client-side Supabase client
 * 
 * WHY: Provides client-side database access for components and hooks.
 * This should only be used in client components and browser environments.
 * 
 * Security considerations:
 * - Uses public anon key (safe for client-side)
 * - Row Level Security (RLS) enforced on database
 * - No sensitive operations performed client-side
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
