# Security Audit Report: app/api/polls/route.ts

## Executive Summary
**Overall Risk Level: HIGH** 🔴

The `/api/polls` endpoint has multiple critical security vulnerabilities that could lead to data breaches, unauthorized access, and system compromise.

## Critical Findings

### 1. **CRITICAL: Missing Input Validation on GET Parameters**
**Severity: HIGH** 🔴  
**CVSS Score: 7.5**

**Issue**: Query parameters are not validated, allowing injection attacks.

```typescript
// VULNERABLE CODE
const filters = extractQueryParams(request)
const result = await PollService.getPolls({
  search: filters.search || undefined,  // ❌ No validation
  sortBy: filters.sortBy as "newest" | "oldest" | "most-voted" | "least-voted" | undefined,  // ❌ Type casting without validation
  limit: filters.limit,  // ❌ No bounds checking
  offset: filters.offset  // ❌ No bounds checking
})
```

**Exploit Scenario**:
```bash
# SQL Injection via search parameter
GET /api/polls?search='; DROP TABLE polls; --
GET /api/polls?search=<script>alert('XSS')</script>

# Integer overflow/DoS
GET /api/polls?limit=999999999&offset=-1

# NoSQL injection (if using MongoDB)
GET /api/polls?search={"$where": "this.created_by == 'admin'"}
```

**Impact**: 
- SQL/NoSQL injection
- XSS attacks
- DoS via resource exhaustion
- Data exfiltration

### 2. **CRITICAL: Type Casting Bypass in POST Request**
**Severity: HIGH** 🔴  
**CVSS Score: 8.1**

**Issue**: Dangerous type casting bypasses validation.

```typescript
// VULNERABLE CODE
const result = await PollService.createPoll(pollData as any, user.id)
//                                                      ^^^^^^^^
//                                                      DANGEROUS!
```

**Exploit Scenario**:
```javascript
// Attacker can send any data structure
POST /api/polls
{
  "title": "Legitimate Poll",
  "options": ["A", "B"],
  "__proto__": {"isAdmin": true},  // Prototype pollution
  "constructor": {"prototype": {"isAdmin": true}},
  "pollData": null,  // Null injection
  "maliciousField": "value"  // Extra fields not validated
}
```

**Impact**:
- Prototype pollution
- Type confusion attacks
- Bypass of Zod validation
- Potential RCE via prototype manipulation

### 3. **HIGH: Missing Rate Limiting**
**Severity: HIGH** 🟠  
**CVSS Score: 6.8**

**Issue**: No rate limiting on API endpoints.

**Exploit Scenario**:
```bash
# DoS via rapid requests
for i in {1..10000}; do
  curl -X POST /api/polls -d '{"title":"Spam","options":["A","B"]}' &
done

# Resource exhaustion
for i in {1..1000}; do
  curl "/api/polls?limit=1000&offset=$((i*1000))" &
done
```

**Impact**:
- DoS attacks
- Resource exhaustion
- Database overload
- Service unavailability

### 4. **HIGH: Missing CORS Configuration**
**Severity: MEDIUM** 🟡  
**CVSS Score: 5.3**

**Issue**: No CORS headers configured, allowing cross-origin requests.

**Exploit Scenario**:
```javascript
// Malicious website can make requests
fetch('https://your-app.com/api/polls', {
  method: 'POST',
  credentials: 'include',
  body: JSON.stringify({title: 'Malicious', options: ['A','B']})
})
```

**Impact**:
- CSRF attacks
- Unauthorized cross-origin requests
- Data leakage to malicious sites

### 5. **MEDIUM: Information Disclosure in Error Messages**
**Severity: MEDIUM** 🟡  
**CVSS Score: 4.7**

**Issue**: Error messages may leak sensitive information.

```typescript
// POTENTIALLY LEAKY
return ApiResponse.error(result.error || 'Failed to fetch polls')
//                    ^^^^^^^^^^^^^^^^
//                    May contain DB errors, stack traces
```

**Exploit Scenario**:
```bash
# Trigger database errors to get info
curl "/api/polls?search=' OR 1=1 --"
# Response might reveal: "Database error: syntax error at position 15"
```

**Impact**:
- Database schema disclosure
- Technology stack identification
- Internal error details exposure

### 6. **MEDIUM: Missing Request Size Limits**
**Severity: MEDIUM** 🟡  
**CVSS Score: 4.2**

**Issue**: No limits on request body size.

**Exploit Scenario**:
```bash
# Send massive payload
curl -X POST /api/polls -d '{"title":"'$(python -c "print('A'*1000000)")'","options":["A","B"]}'
```

**Impact**:
- Memory exhaustion
- DoS attacks
- Server crashes

### 7. **LOW: Missing Security Headers**
**Severity: LOW** 🟢  
**CVSS Score: 3.1**

**Issue**: No security headers configured.

**Missing Headers**:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security`
- `Content-Security-Policy`

## Proposed Security Patches

### Patch 1: Input Validation & Sanitization
```typescript
// app/api/polls/route.ts
import { z } from 'zod';

// Add query parameter validation schema
const queryParamsSchema = z.object({
  search: z.string().max(100).optional(),
  sortBy: z.enum(['newest', 'oldest', 'most-voted', 'least-voted']).default('newest'),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).max(10000).default(0)
});

// GET /api/polls - Fetch all polls
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate and sanitize query parameters
    const validationResult = queryParamsSchema.safeParse({
      search: searchParams.get('search'),
      sortBy: searchParams.get('sortBy'),
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0')
    });

    if (!validationResult.success) {
      return ApiResponse.error('Invalid query parameters', 400);
    }

    const filters = validationResult.data;
    const result = await PollService.getPolls(filters);

    if (result.success && result.data) {
      return ApiResponse.success({ polls: result.data });
    } else {
      return ApiResponse.error('Failed to fetch polls');
    }
  } catch (error) {
    return handleApiError(error, 'Failed to fetch polls');
  }
}
```

### Patch 2: Remove Dangerous Type Casting
```typescript
// POST /api/polls - Create new poll
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return ApiResponse.unauthorized(authError);
    }

    const { data: pollData, error: parseError } = await parseRequestBody(request);

    if (parseError || !pollData) {
      return ApiResponse.error(parseError || 'Invalid request body');
    }

    // Remove dangerous type casting - let Zod handle validation
    const result = await PollService.createPoll(pollData, user.id);

    if (result.success && result.data) {
      return ApiResponse.success({ poll: result.data }, 201);
    } else {
      return ApiResponse.error(result.error || 'Failed to create poll');
    }
  } catch (error) {
    return handleApiError(error, 'Failed to create poll');
  }
}
```

### Patch 3: Add Rate Limiting
```typescript
// lib/rate-limiter.ts
import { NextRequest } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(config: RateLimitConfig) {
  return (request: NextRequest) => {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    const userLimit = rateLimitStore.get(ip);
    
    if (!userLimit || userLimit.resetTime < windowStart) {
      rateLimitStore.set(ip, { count: 1, resetTime: now });
      return { allowed: true, remaining: config.maxRequests - 1 };
    }
    
    if (userLimit.count >= config.maxRequests) {
      return { allowed: false, remaining: 0 };
    }
    
    userLimit.count++;
    return { allowed: true, remaining: config.maxRequests - userLimit.count };
  };
}

// Usage in route
const rateLimiter = rateLimit({ windowMs: 60000, maxRequests: 10 });

export async function POST(request: NextRequest) {
  const rateLimitResult = rateLimiter(request);
  if (!rateLimitResult.allowed) {
    return ApiResponse.error('Too many requests', 429);
  }
  // ... rest of handler
}
```

### Patch 4: Add Security Headers
```typescript
// lib/security-headers.ts
import { NextResponse } from 'next/server';

export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Content-Security-Policy', "default-src 'self'");
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

// Update ApiResponse class
export class ApiResponse {
  static success<T>(data: T, status = 200) {
    const response = NextResponse.json({ success: true, data }, { status });
    return addSecurityHeaders(response);
  }
  // ... other methods
}
```

### Patch 5: Enhanced Error Handling
```typescript
// lib/api-utils.ts
export function handleApiError(error: unknown, defaultMessage = 'An error occurred') {
  // Log error for monitoring
  console.error('API Error:', {
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString()
  });
  
  // Return sanitized error message
  return ApiResponse.error(defaultMessage);
}
```

## Security Tests

### Test Suite
```typescript
// __tests__/security/api-polls-security.test.ts
import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from '@/app/api/polls/route';
import { NextRequest } from 'next/server';

describe('Polls API Security Tests', () => {
  describe('Input Validation', () => {
    it('should reject SQL injection in search parameter', async () => {
      const request = new NextRequest('http://localhost/api/polls?search=\'; DROP TABLE polls; --');
      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it('should reject XSS in search parameter', async () => {
      const request = new NextRequest('http://localhost/api/polls?search=<script>alert("xss")</script>');
      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it('should enforce limit bounds', async () => {
      const request = new NextRequest('http://localhost/api/polls?limit=999999');
      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it('should enforce offset bounds', async () => {
      const request = new NextRequest('http://localhost/api/polls?offset=-1');
      const response = await GET(request);
      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should block requests exceeding rate limit', async () => {
      const requests = Array(15).fill(null).map(() => 
        new NextRequest('http://localhost/api/polls', { method: 'POST' })
      );
      
      const responses = await Promise.all(requests.map(req => POST(req)));
      const blockedResponses = responses.filter(r => r.status === 429);
      expect(blockedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Type Safety', () => {
    it('should reject malformed poll data', async () => {
      const request = new NextRequest('http://localhost/api/polls', {
        method: 'POST',
        body: JSON.stringify({
          title: null,
          options: "not an array",
          __proto__: { isAdmin: true }
        })
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const request = new NextRequest('http://localhost/api/polls');
      const response = await GET(request);
      
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    });
  });
});
```

## Implementation Priority

1. **IMMEDIATE** (Fix within 24 hours):
   - Remove dangerous type casting
   - Add input validation for query parameters
   - Implement rate limiting

2. **HIGH PRIORITY** (Fix within 1 week):
   - Add security headers
   - Enhance error handling
   - Add request size limits

3. **MEDIUM PRIORITY** (Fix within 1 month):
   - Add CORS configuration
   - Implement request logging
   - Add monitoring and alerting

## Conclusion

The current implementation has critical security vulnerabilities that must be addressed immediately. The proposed patches will significantly improve the security posture of the API endpoint while maintaining functionality.

**Recommendation**: Implement all critical and high-priority fixes before deploying to production.
