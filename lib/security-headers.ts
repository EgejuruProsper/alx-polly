import { NextResponse } from 'next/server';

/**
 * Add comprehensive security headers to API responses
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Force HTTPS
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Content Security Policy
  response.headers.set('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://*.supabase.co; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'"
  );
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  response.headers.set('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  
  // Cache control for sensitive endpoints
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}

/**
 * Add CORS headers for API endpoints
 */
export function addCorsHeaders(response: NextResponse, origin?: string): NextResponse {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL
  ].filter(Boolean);

  const isAllowedOrigin = origin && allowedOrigins.includes(origin);
  
  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else {
    response.headers.set('Access-Control-Allow-Origin', 'null');
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  
  return response;
}

/**
 * Add rate limiting headers
 */
export function addRateLimitHeaders(
  response: NextResponse, 
  rateLimitResult: { allowed: boolean; remaining: number; resetTime: number }
): NextResponse {
  response.headers.set('X-RateLimit-Limit', '100');
  response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());
  
  if (!rateLimitResult.allowed) {
    response.headers.set('Retry-After', Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString());
  }
  
  return response;
}

/**
 * Add request ID for tracing
 */
export function addRequestId(response: NextResponse, requestId: string): NextResponse {
  response.headers.set('X-Request-ID', requestId);
  return response;
}

/**
 * Comprehensive security headers for API responses
 */
export function addAllSecurityHeaders(
  response: NextResponse, 
  options: {
    origin?: string;
    rateLimitResult?: { allowed: boolean; remaining: number; resetTime: number };
    requestId?: string;
  } = {}
): NextResponse {
  let securedResponse = addSecurityHeaders(response);
  
  if (options.origin) {
    securedResponse = addCorsHeaders(securedResponse, options.origin);
  }
  
  if (options.rateLimitResult) {
    securedResponse = addRateLimitHeaders(securedResponse, options.rateLimitResult);
  }
  
  if (options.requestId) {
    securedResponse = addRequestId(securedResponse, options.requestId);
  }
  
  return securedResponse;
}
