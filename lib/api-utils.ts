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
  console.error('API Error:', error);
  
  if (error instanceof Error) {
    return ApiResponse.error(error.message);
  }
  
  return ApiResponse.serverError(defaultMessage);
}
