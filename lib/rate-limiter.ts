import { NextRequest } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// In production, use Redis or similar distributed store
const rateLimitStore = new Map<string, RateLimitEntry>();

export function rateLimit(config: RateLimitConfig) {
  return (request: NextRequest) => {
    const ip = request.ip || 
               request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Clean up expired entries
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < windowStart) {
        rateLimitStore.delete(key);
      }
    }
    
    const userLimit = rateLimitStore.get(ip);
    
    if (!userLimit || userLimit.resetTime < windowStart) {
      // New window or expired entry
      rateLimitStore.set(ip, { count: 1, resetTime: now });
      return { 
        allowed: true, 
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs
      };
    }
    
    if (userLimit.count >= config.maxRequests) {
      return { 
        allowed: false, 
        remaining: 0,
        resetTime: userLimit.resetTime + config.windowMs
      };
    }
    
    // Increment counter
    userLimit.count++;
    return { 
      allowed: true, 
      remaining: config.maxRequests - userLimit.count,
      resetTime: userLimit.resetTime + config.windowMs
    };
  };
}

// Advanced rate limiter with user-based limiting
export function userRateLimit(config: RateLimitConfig) {
  return (request: NextRequest, userId?: string) => {
    const identifier = userId || 
                      request.ip || 
                      request.headers.get('x-forwarded-for')?.split(',')[0] || 
                      'anonymous';
    
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Clean up expired entries
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < windowStart) {
        rateLimitStore.delete(key);
      }
    }
    
    const userLimit = rateLimitStore.get(identifier);
    
    if (!userLimit || userLimit.resetTime < windowStart) {
      rateLimitStore.set(identifier, { count: 1, resetTime: now });
      return { 
        allowed: true, 
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs
      };
    }
    
    if (userLimit.count >= config.maxRequests) {
      return { 
        allowed: false, 
        remaining: 0,
        resetTime: userLimit.resetTime + config.windowMs
      };
    }
    
    userLimit.count++;
    return { 
      allowed: true, 
      remaining: config.maxRequests - userLimit.count,
      resetTime: userLimit.resetTime + config.windowMs
    };
  };
}

// Rate limiter with different limits for different endpoints
export const rateLimitConfigs = {
  pollCreation: { windowMs: 60000, maxRequests: 5 }, // 5 polls per minute
  pollFetch: { windowMs: 60000, maxRequests: 100 }, // 100 requests per minute
  voteSubmission: { windowMs: 60000, maxRequests: 10 }, // 10 votes per minute
  general: { windowMs: 60000, maxRequests: 200 } // 200 requests per minute
};

// Utility function to get rate limit headers
export function getRateLimitHeaders(rateLimitResult: { allowed: boolean; remaining: number; resetTime: number }) {
  return {
    'X-RateLimit-Limit': rateLimitResult.allowed ? '100' : '0',
    'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
    'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
  };
}
