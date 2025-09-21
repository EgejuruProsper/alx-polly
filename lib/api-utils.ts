import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase';

/**
 * Extract user from request with authentication check
 */
export async function getAuthenticatedUser(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { user: null, error: 'Authentication required' };
  }
  
  return { user, error: null };
}

/**
 * Parse and validate request body
 */
export async function parseRequestBody<T>(request: NextRequest): Promise<{ data: T | null; error: string | null }> {
  try {
    const body = await request.json();
    return { data: body, error: null };
  } catch (error) {
    return { data: null, error: 'Invalid JSON in request body' };
  }
}

/**
 * Extract query parameters from URL
 */
export function extractQueryParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  return {
    search: searchParams.get('search'),
    sortBy: searchParams.get('sortBy') || 'newest',
    limit: parseInt(searchParams.get('limit') || '20'),
    offset: parseInt(searchParams.get('offset') || '0'),
  };
}

/**
 * Create standardized API responses
 */
export class ApiResponse {
  static success<T>(data: T, status = 200) {
    return NextResponse.json({ success: true, data }, { status });
  }

  static error(message: string, status = 400) {
    return NextResponse.json({ success: false, error: message }, { status });
  }

  static unauthorized(message = 'Authentication required') {
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }

  static forbidden(message = 'Access denied') {
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }

  static notFound(message = 'Resource not found') {
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }

  static serverError(message = 'Internal server error') {
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown, defaultMessage = 'An error occurred') {
  // Log error for monitoring (sanitized)
  console.error('API Error:', {
    message: error instanceof Error ? error.message : 'Unknown error',
    timestamp: new Date().toISOString(),
    // Don't log stack traces in production
    ...(process.env.NODE_ENV === 'development' && error instanceof Error ? { stack: error.stack } : {})
  });
  
  // Return sanitized error message
  if (error instanceof Error) {
    // Sanitize error messages to prevent information disclosure
    const sanitizedMessage = sanitizeErrorMessage(error.message);
    return ApiResponse.error(sanitizedMessage);
  }
  
  return ApiResponse.serverError(defaultMessage);
}

/**
 * Sanitize error messages to prevent information disclosure
 */
function sanitizeErrorMessage(message: string): string {
  // Remove database-specific error details
  const sanitized = message
    .replace(/password[=:]\s*\S+/gi, 'password=***')
    .replace(/connection[=:]\s*\S+/gi, 'connection=***')
    .replace(/database[=:]\s*\S+/gi, 'database=***')
    .replace(/host[=:]\s*\S+/gi, 'host=***')
    .replace(/port[=:]\s*\S+/gi, 'port=***')
    .replace(/user[=:]\s*\S+/gi, 'user=***')
    .replace(/at line \d+/gi, 'at line ***')
    .replace(/position \d+/gi, 'position ***');
  
  // If message contains sensitive patterns, return generic message
  if (message.includes('password') || message.includes('connection') || message.includes('database')) {
    return 'An error occurred while processing your request';
  }
  
  return sanitized;
}
