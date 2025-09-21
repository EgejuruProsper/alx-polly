import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/polls/[id]/vote/route';
import { createServerSupabaseClient } from '@/app/lib/supabase';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn()
  }
};

vi.mock('@/app/lib/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase)
}));

// Test data factories
const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  ...overrides
});

const createMockPoll = (overrides = {}) => ({
  id: 'poll-123',
  question: 'What is your favorite color?',
  options: ['Red', 'Blue', 'Green'],
  votes: [5, 3, 2],
  is_active: true,
  expires_at: null,
  allow_multiple_votes: false,
  ...overrides
});

const createMockVote = (overrides = {}) => ({
  id: 'vote-123',
  poll_id: 'poll-123',
  option_index: 0,
  voter_id: 'user-123',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides
});

describe('Vote API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/polls/[id]/vote', () => {
    it('should submit vote successfully (happy path)', async () => {
      const mockUser = createMockUser();
      const mockPoll = createMockPoll();
      const mockVote = createMockVote();
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock poll fetch
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockPoll,
              error: null
            })
          })
        })
      });

      // Mock duplicate vote check
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' } // No rows found
              })
            })
          })
        })
      });

      // Mock vote insertion
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({
          data: mockVote,
          error: null
        })
      });

      // Mock poll update
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockPoll, votes: [6, 3, 2] },
                error: null
              })
            })
          })
        })
      });

      const requestBody = { option_index: 0 };
      const request = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: { id: 'poll-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Vote submitted successfully');
      expect(data.poll.votes).toEqual([6, 3, 2]);
    });

    it('should reject unauthenticated requests (failure case)', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const requestBody = { option_index: 0 };
      const request = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: { id: 'poll-123' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('You must be logged in to vote');
    });

    it('should reject requests with authentication error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid session' }
      });

      const requestBody = { option_index: 0 };
      const request = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: { id: 'poll-123' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('You must be logged in to vote');
    });

    it('should reject requests with missing option_index', async () => {
      const mockUser = createMockUser();
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const requestBody = {}; // Missing option_index
      const request = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: { id: 'poll-123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required field: option_index');
    });

    it('should reject requests for non-existent poll', async () => {
      const mockUser = createMockUser();
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Poll not found' }
            })
          })
        })
      });

      const requestBody = { option_index: 0 };
      const request = new NextRequest('http://localhost:3000/api/polls/non-existent/vote', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: { id: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Poll not found');
    });

    it('should reject votes for inactive polls', async () => {
      const mockUser = createMockUser();
      const mockPoll = createMockPoll({ is_active: false });
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockPoll,
              error: null
            })
          })
        })
      });

      const requestBody = { option_index: 0 };
      const request = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: { id: 'poll-123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Poll is not active');
    });

    it('should reject votes for expired polls', async () => {
      const mockUser = createMockUser();
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);
      
      const mockPoll = createMockPoll({ 
        expires_at: expiredDate.toISOString() 
      });
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockPoll,
              error: null
            })
          })
        })
      });

      const requestBody = { option_index: 0 };
      const request = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: { id: 'poll-123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Poll has expired');
    });

    it('should reject votes with invalid option index', async () => {
      const mockUser = createMockUser();
      const mockPoll = createMockPoll();
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockPoll,
              error: null
            })
          })
        })
      });

      const requestBody = { option_index: 5 }; // Invalid index
      const request = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: { id: 'poll-123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid option index');
    });

    it('should reject duplicate votes when multiple votes not allowed', async () => {
      const mockUser = createMockUser();
      const mockPoll = createMockPoll();
      const existingVote = createMockVote();
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock poll fetch
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockPoll,
              error: null
            })
          })
        })
      });

      // Mock duplicate vote check - return existing vote
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: existingVote,
                error: null
              })
            })
          })
        })
      });

      const requestBody = { option_index: 0 };
      const request = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: { id: 'poll-123' } });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('You have already voted on this poll');
    });

    it('should allow multiple votes when enabled', async () => {
      const mockUser = createMockUser();
      const mockPoll = createMockPoll({ allow_multiple_votes: true });
      const mockVote = createMockVote();
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock poll fetch
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockPoll,
              error: null
            })
          })
        })
      });

      // Mock vote insertion (no duplicate check for multiple votes)
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({
          data: mockVote,
          error: null
        })
      });

      // Mock poll update
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockPoll, votes: [6, 3, 2] },
                error: null
              })
            })
          })
        })
      });

      const requestBody = { option_index: 0 };
      const request = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: { id: 'poll-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Vote submitted successfully');
    });

    it('should handle vote insertion error', async () => {
      const mockUser = createMockUser();
      const mockPoll = createMockPoll();
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock poll fetch
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockPoll,
              error: null
            })
          })
        })
      });

      // Mock duplicate vote check
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }
              })
            })
          })
        })
      });

      // Mock vote insertion error
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insert failed' }
        })
      });

      const requestBody = { option_index: 0 };
      const request = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: { id: 'poll-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Insert failed');
    });

    it('should handle poll update error', async () => {
      const mockUser = createMockUser();
      const mockPoll = createMockPoll();
      const mockVote = createMockVote();
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock poll fetch
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockPoll,
              error: null
            })
          })
        })
      });

      // Mock duplicate vote check
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }
              })
            })
          })
        })
      });

      // Mock vote insertion
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({
          data: mockVote,
          error: null
        })
      });

      // Mock poll update error
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Update failed' }
              })
            })
          })
        })
      });

      const requestBody = { option_index: 0 };
      const request = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: { id: 'poll-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Update failed');
    });

    it('should handle malformed JSON in request body', async () => {
      const mockUser = createMockUser();
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const request = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: { id: 'poll-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to submit vote');
    });

    it('should handle unexpected errors during vote submission', async () => {
      const mockUser = createMockUser();
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected database error');
      });

      const requestBody = { option_index: 0 };
      const request = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: { id: 'poll-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to submit vote');
    });
  });
});
