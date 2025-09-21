import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check request size limit (1MB)
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 1024 * 1024) {
    return new Response('Request too large', { status: 413 });
  }

  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  
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
  
  // CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.NEXT_PUBLIC_VERCEL_URL
    ].filter(Boolean);

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else {
      response.headers.set('Access-Control-Allow-Origin', 'null');
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: response.headers });
  }
  
  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
