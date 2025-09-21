import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/polls/route-secure';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/poll-service', () => ({
  PollService: {
    getPolls: vi.fn(),
    createPoll: vi.fn()
  }
}));

vi.mock('@/lib/api-utils', () => ({
  getAuthenticatedUser: vi.fn(),
  parseRequestBody: vi.fn(),
  handleApiError: vi.fn(),
  ApiResponse: {
    success: vi.fn(),
    error: vi.fn(),
    unauthorized: vi.fn()
  }
}));

vi.mock('@/lib/rate-limiter', () => ({
  rateLimit: vi.fn(() => () => ({ allowed: true, remaining: 99, resetTime: Date.now() + 60000 }))
}));

describe('Polls API Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    it('should reject invalid sortBy parameter', async () => {
      const request = new NextRequest('http://localhost/api/polls?sortBy=malicious');
      const response = await GET(request);
      
      expect(response.status).toBe(400);
    });

    it('should accept valid parameters', async () => {
      const request = new NextRequest('http://localhost/api/polls?search=test&sortBy=newest&limit=10&offset=0');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should block requests exceeding rate limit', async () => {
      const { rateLimit } = await import('@/lib/rate-limiter');
      const mockRateLimit = vi.mocked(rateLimit);
      
      // Mock rate limiter to return blocked
      mockRateLimit.mockReturnValue(() => ({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000
      }));

      const request = new NextRequest('http://localhost/api/polls');
      const response = await GET(request);
      
      expect(response.status).toBe(429);
    });

    it('should allow requests within rate limit', async () => {
      const { rateLimit } = await import('@/lib/rate-limiter');
      const mockRateLimit = vi.mocked(rateLimit);
      
      // Mock rate limiter to return allowed
      mockRateLimit.mockReturnValue(() => ({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000
      }));

      const request = new NextRequest('http://localhost/api/polls');
      const response = await GET(request);
      
      expect(response.status).not.toBe(429);
    });
  });

  describe('Type Safety', () => {
    it('should reject malformed poll data', async () => {
      const { parseRequestBody } = await import('@/lib/api-utils');
      const mockParseRequestBody = vi.mocked(parseRequestBody);
      
      mockParseRequestBody.mockResolvedValue({
        data: {
          title: null,
          options: "not an array",
          __proto__: { isAdmin: true }
        },
        error: null
      });

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

    it('should reject prototype pollution attempts', async () => {
      const { parseRequestBody } = await import('@/lib/api-utils');
      const mockParseRequestBody = vi.mocked(parseRequestBody);
      
      mockParseRequestBody.mockResolvedValue({
        data: {
          title: "Test Poll",
          options: ["A", "B"],
          constructor: { prototype: { isAdmin: true } }
        },
        error: null
      });

      const request = new NextRequest('http://localhost/api/polls', {
        method: 'POST',
        body: JSON.stringify({
          title: "Test Poll",
          options: ["A", "B"],
          constructor: { prototype: { isAdmin: true } }
        })
      });
      
      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should accept valid poll data', async () => {
      const { parseRequestBody } = await import('@/lib/api-utils');
      const mockParseRequestBody = vi.mocked(parseRequestBody);
      
      mockParseRequestBody.mockResolvedValue({
        data: {
          title: "Test Poll",
          description: "Test Description",
          options: ["Option A", "Option B"],
          isPublic: true,
          allowMultipleVotes: false
        },
        error: null
      });

      const { getAuthenticatedUser } = await import('@/lib/api-utils');
      const mockGetAuthenticatedUser = vi.mocked(getAuthenticatedUser);
      
      mockGetAuthenticatedUser.mockResolvedValue({
        user: { id: 'user-123' },
        error: null
      });

      const { PollService } = await import('@/lib/poll-service');
      const mockPollService = vi.mocked(PollService);
      
      mockPollService.createPoll.mockResolvedValue({
        success: true,
        data: { id: 'poll-123', title: 'Test Poll' }
      });

      const request = new NextRequest('http://localhost/api/polls', {
        method: 'POST',
        body: JSON.stringify({
          title: "Test Poll",
          description: "Test Description",
          options: ["Option A", "Option B"],
          isPublic: true,
          allowMultipleVotes: false
        })
      });
      
      const response = await POST(request);
      expect(response.status).toBe(201);
    });
  });

  describe('Authentication', () => {
    it('should require authentication for POST requests', async () => {
      const { getAuthenticatedUser } = await import('@/lib/api-utils');
      const mockGetAuthenticatedUser = vi.mocked(getAuthenticatedUser);
      
      mockGetAuthenticatedUser.mockResolvedValue({
        user: null,
        error: 'Authentication required'
      });

      const request = new NextRequest('http://localhost/api/polls', {
        method: 'POST',
        body: JSON.stringify({
          title: "Test Poll",
          options: ["A", "B"]
        })
      });
      
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should allow unauthenticated GET requests', async () => {
      const { PollService } = await import('@/lib/poll-service');
      const mockPollService = vi.mocked(PollService);
      
      mockPollService.getPolls.mockResolvedValue({
        success: true,
        data: [{ id: 'poll-1', title: 'Test Poll' }]
      });

      const request = new NextRequest('http://localhost/api/polls');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
    });
  });

  describe('Request Size Limits', () => {
    it('should handle large request bodies gracefully', async () => {
      const largeString = 'A'.repeat(1000000); // 1MB string
      
      const { parseRequestBody } = await import('@/lib/api-utils');
      const mockParseRequestBody = vi.mocked(parseRequestBody);
      
      mockParseRequestBody.mockResolvedValue({
        data: {
          title: largeString,
          options: ["A", "B"]
        },
        error: null
      });

      const request = new NextRequest('http://localhost/api/polls', {
        method: 'POST',
        body: JSON.stringify({
          title: largeString,
          options: ["A", "B"]
        })
      });
      
      const response = await POST(request);
      expect(response.status).toBe(400); // Should be rejected due to size limits
    });
  });

  describe('Error Handling', () => {
    it('should not leak sensitive information in error messages', async () => {
      const { PollService } = await import('@/lib/poll-service');
      const mockPollService = vi.mocked(PollService);
      
      mockPollService.getPolls.mockRejectedValue(new Error('Database connection failed: password=secret123'));

      const request = new NextRequest('http://localhost/api/polls');
      const response = await GET(request);
      
      const responseText = await response.text();
      expect(responseText).not.toContain('password=secret123');
      expect(responseText).not.toContain('Database connection failed');
    });

    it('should handle malformed JSON gracefully', async () => {
      const { parseRequestBody } = await import('@/lib/api-utils');
      const mockParseRequestBody = vi.mocked(parseRequestBody);
      
      mockParseRequestBody.mockResolvedValue({
        data: null,
        error: 'Invalid JSON in request body'
      });

      const request = new NextRequest('http://localhost/api/polls', {
        method: 'POST',
        body: '{"title": "Test", "options": ["A", "B"' // Missing closing brace
      });
      
      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const { PollService } = await import('@/lib/poll-service');
      const mockPollService = vi.mocked(PollService);
      
      mockPollService.getPolls.mockResolvedValue({
        success: true,
        data: []
      });

      const request = new NextRequest('http://localhost/api/polls');
      const response = await GET(request);
      
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    });
  });
});
