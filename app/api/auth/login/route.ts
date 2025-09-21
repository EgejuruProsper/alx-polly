import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limiter'

// Input validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

// Rate limiting configuration
const authLimiter = rateLimit({ windowMs: 60000, maxRequests: 5 }); // 5 login attempts per minute

// POST /api/auth/login - User login
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = authLimiter(request);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json()
    
    // Validate input data
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input: ' + validationResult.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    return NextResponse.json({ 
      user: data.user,
      session: data.session 
    })
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
