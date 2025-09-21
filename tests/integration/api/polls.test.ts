import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/polls/route';
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
const createMockPoll = (overrides = {}) => ({
  id: 'poll-123',
  question: 'What is your favorite color?',
  options: ['Red', 'Blue', 'Green'],
  votes: [5, 3, 2],
  created_at: '2024-01-01T00:00:00Z',
  created_by: 'user-123',
  is_public: true,
  is_active: true,
  expires_at: null,
  allow_multiple_votes: false,
  description: 'A test poll',
  author: {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    raw_user_meta_data: { name: 'Test User' }
  },
  ...overrides
});

const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  user_metadata: { name: 'Test User' },
  ...overrides
});

describe('Polls API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/polls', () => {
    it('should fetch polls successfully (happy path)', async () => {
      const mockPolls = [createMockPoll(), createMockPoll({ id: 'poll-456' })];
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: mockPolls,
                    error: null
                  })
                })
              })
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/polls');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.polls).toHaveLength(2);
      expect(data.polls[0]).toMatchObject({
        id: 'poll-123',
        question: 'What is your favorite color?',
        options: expect.arrayContaining([
          expect.objectContaining({ text: 'Red', votes: 5 }),
          expect.objectContaining({ text: 'Blue', votes: 3 }),
          expect.objectContaining({ text: 'Green', votes: 2 })
        ])
      });
    });

    it('should handle search parameter', async () => {
      const mockPolls = [createMockPoll()];
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: mockPolls,
                    error: null
                  })
                })
              })
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/polls?search=color');
      await GET(request);

      expect(mockSupabase.from).toHaveBeenCalledWith('polls');
    });

    it('should handle sort parameter', async () => {
      const mockPolls = [createMockPoll()];
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: mockPolls,
                    error: null
                  })
                })
              })
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/polls?sortBy=oldest');
      await GET(request);

      expect(mockSupabase.from).toHaveBeenCalledWith('polls');
    });

    it('should handle database error (failure case)', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database connection failed' }
                  })
                })
              })
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/polls');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database connection failed');
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = new NextRequest('http://localhost:3000/api/polls');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch polls');
    });
  });

  describe('POST /api/polls', () => {
    it('should create poll successfully (happy path)', async () => {
      const mockUser = createMockUser();
      const mockPoll = createMockPoll();
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockPoll,
              error: null
            })
          })
        })
      });

      const requestBody = {
        question: 'What is your favorite color?',
        options: ['Red', 'Blue', 'Green'],
        is_public: true,
        allow_multiple_votes: false,
        description: 'A test poll'
      };

      const request = new NextRequest('http://localhost:3000/api/polls', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.poll).toMatchObject({
        id: 'poll-123',
        question: 'What is your favorite color?',
        options: ['Red', 'Blue', 'Green']
      });
    });

    it('should reject unauthenticated requests (failure case)', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const requestBody = {
        question: 'What is your favorite color?',
        options: ['Red', 'Blue']
      };

      const request = new NextRequest('http://localhost:3000/api/polls', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('You must be logged in to create a poll');
    });

    it('should reject requests with authentication error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid session' }
      });

      const requestBody = {
        question: 'What is your favorite color?',
        options: ['Red', 'Blue']
      };

      const request = new NextRequest('http://localhost:3000/api/polls', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('You must be logged in to create a poll');
    });

    it('should reject requests with missing required fields', async () => {
      const mockUser = createMockUser();
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const requestBody = {
        question: '', // Missing required field
        options: ['Red'] // Too few options
      };

      const request = new NextRequest('http://localhost:3000/api/polls', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields: question and at least 2 options');
    });

    it('should handle database insertion error', async () => {
      const mockUser = createMockUser();
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' }
            })
          })
        })
      });

      const requestBody = {
        question: 'What is your favorite color?',
        options: ['Red', 'Blue', 'Green']
      };

      const request = new NextRequest('http://localhost:3000/api/polls', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Insert failed');
    });

    it('should handle malformed JSON in request body', async () => {
      const mockUser = createMockUser();
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const request = new NextRequest('http://localhost:3000/api/polls', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create poll');
    });

    it('should handle unexpected errors during poll creation', async () => {
      const mockUser = createMockUser();
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected database error');
      });

      const requestBody = {
        question: 'What is your favorite color?',
        options: ['Red', 'Blue', 'Green']
      };

      const request = new NextRequest('http://localhost:3000/api/polls', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create poll');
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle empty polls array', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                  })
                })
              })
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/polls');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.polls).toEqual([]);
    });

    it('should handle polls with missing author data', async () => {
      const mockPoll = createMockPoll({ author: null });
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: [mockPoll],
                    error: null
                  })
                })
              })
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/polls');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.polls[0].author).toMatchObject({
        id: 'poll-123',
        name: 'Unknown User',
        email: ''
      });
    });

    it('should handle polls with different vote counts', async () => {
      const mockPoll = createMockPoll({
        votes: [10, 5, 0, 2] // Different vote distribution
      });
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: [mockPoll],
                    error: null
                  })
                })
              })
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/polls');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.polls[0].options).toEqual([
        expect.objectContaining({ text: 'Red', votes: 10 }),
        expect.objectContaining({ text: 'Blue', votes: 5 }),
        expect.objectContaining({ text: 'Green', votes: 0 })
      ]);
    });
  });
});
