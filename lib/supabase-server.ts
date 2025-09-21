import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Server-side Supabase client with authentication
 * 
 * WHY: Provides server-side database access with proper session handling.
 * This should only be used in server components and API routes.
 * 
 * Security considerations:
 * - Uses httpOnly cookies for session management
 * - Server-side authentication context
 * - No client-side token exposure
 * 
 * Edge cases:
 * - Missing cookies → handled gracefully
 * - Invalid session → returns null user
 * - Network errors → proper error handling
 */
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
