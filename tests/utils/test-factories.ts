/**
 * Test Data Factories
 * 
 * Centralized test data creation to avoid duplication and ensure consistency
 * across all test files. Each factory provides sensible defaults and allows
 * for easy customization through overrides.
 */

// User-related factories
export const createMockUser = (overrides: Partial<{
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}> = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
});

export const createMockAuthUser = (overrides: Partial<{
  id: string;
  email: string;
  user_metadata: Record<string, any>;
  app_metadata: Record<string, any>;
}> = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  user_metadata: { name: 'Test User' },
  app_metadata: {},
  ...overrides
});

// Poll-related factories
export const createMockPoll = (overrides: Partial<{
  id: string;
  question: string;
  options: string[];
  votes: number[];
  created_at: string;
  created_by: string;
  is_public: boolean;
  is_active: boolean;
  expires_at: string | null;
  allow_multiple_votes: boolean;
  description: string | null;
  author: any;
}> = {}) => ({
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

export const createMockPollOption = (overrides: Partial<{
  id: string;
  text: string;
  votes: number;
  pollId: string;
}> = {}) => ({
  id: 'option-123',
  text: 'Red',
  votes: 5,
  pollId: 'poll-123',
  ...overrides
});

// Vote-related factories
export const createMockVote = (overrides: Partial<{
  id: string;
  poll_id: string;
  option_index: number;
  voter_id: string;
  created_at: string;
}> = {}) => ({
  id: 'vote-123',
  poll_id: 'poll-123',
  option_index: 0,
  voter_id: 'user-123',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides
});

// Form data factories
export const createMockCreatePollFormData = (overrides: Partial<{
  title: string;
  description: string;
  options: string[];
  isPublic: boolean;
  allowMultipleVotes: boolean;
  expiresAt: Date | undefined;
}> = {}) => ({
  title: 'Test Poll',
  description: 'A test poll description',
  options: ['Option 1', 'Option 2'],
  isPublic: true,
  allowMultipleVotes: false,
  expiresAt: undefined,
  ...overrides
});

// API response factories
export const createMockApiResponse = <T>(data: T, overrides: Partial<{
  status: number;
  error: string | null;
  message: string | null;
}> = {}) => ({
  data,
  status: 200,
  error: null,
  message: null,
  ...overrides
});

export const createMockErrorResponse = (message: string, overrides: Partial<{
  status: number;
  code: string;
}> = {}) => ({
  error: message,
  status: 500,
  code: 'INTERNAL_ERROR',
  ...overrides
});

// Database error factories
export const createMockDatabaseError = (message: string, overrides: Partial<{
  code: string;
  details: string;
  hint: string;
}> = {}) => ({
  message,
  code: 'PGRST_ERROR',
  details: 'Database operation failed',
  hint: 'Check your query syntax',
  ...overrides
});

// Supabase response factories
export const createMockSupabaseResponse = <T>(data: T | null, overrides: Partial<{
  error: any;
  count: number | null;
  status: number;
  statusText: string;
}> = {}) => ({
  data,
  error: null,
  count: null,
  status: 200,
  statusText: 'OK',
  ...overrides
});

export const createMockSupabaseError = (message: string, overrides: Partial<{
  code: string;
  details: string;
  hint: string;
}> = {}) => ({
  data: null,
  error: {
    message,
    code: 'PGRST_ERROR',
    details: 'Database operation failed',
    hint: 'Check your query syntax',
    ...overrides
  },
  count: null,
  status: 400,
  statusText: 'Bad Request'
});

// Test scenario factories
export const createMockHappyPathScenario = () => ({
  user: createMockUser(),
  poll: createMockPoll(),
  vote: createMockVote(),
  formData: createMockCreatePollFormData()
});

export const createMockErrorScenario = (errorType: 'auth' | 'validation' | 'database' | 'network') => {
  const baseScenario = createMockHappyPathScenario();
  
  switch (errorType) {
    case 'auth':
      return {
        ...baseScenario,
        user: null,
        error: createMockErrorResponse('Authentication required')
      };
    case 'validation':
      return {
        ...baseScenario,
        formData: createMockCreatePollFormData({ title: '' }),
        error: createMockErrorResponse('Validation failed')
      };
    case 'database':
      return {
        ...baseScenario,
        error: createMockDatabaseError('Database connection failed')
      };
    case 'network':
      return {
        ...baseScenario,
        error: createMockErrorResponse('Network error')
      };
    default:
      return baseScenario;
  }
};

// Edge case factories
export const createMockExpiredPoll = () => createMockPoll({
  expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
});

export const createMockInactivePoll = () => createMockPoll({
  is_active: false
});

export const createMockPollWithManyOptions = () => createMockPoll({
  options: Array.from({ length: 10 }, (_, i) => `Option ${i + 1}`),
  votes: Array.from({ length: 10 }, () => Math.floor(Math.random() * 10))
});

export const createMockPollWithDuplicateOptions = () => createMockPoll({
  options: ['Red', 'red', 'Blue'], // Case-insensitive duplicates
  votes: [5, 3, 2]
});

// Test data sets for different scenarios
export const createMockPollDataset = (count: number) => 
  Array.from({ length: count }, (_, i) => createMockPoll({
    id: `poll-${i + 1}`,
    question: `Test Poll ${i + 1}`,
    options: [`Option A ${i + 1}`, `Option B ${i + 1}`],
    votes: [Math.floor(Math.random() * 10), Math.floor(Math.random() * 10)]
  }));

export const createMockUserDataset = (count: number) =>
  Array.from({ length: count }, (_, i) => createMockUser({
    id: `user-${i + 1}`,
    email: `user${i + 1}@example.com`,
    name: `User ${i + 1}`
  }));

// Validation test data
export const createMockValidationTestCases = () => ({
  valid: {
    title: 'Valid Poll Title',
    options: ['Option 1', 'Option 2', 'Option 3'],
    description: 'Valid description'
  },
  invalid: {
    emptyTitle: { title: '', options: ['Option 1', 'Option 2'] },
    whitespaceTitle: { title: '   ', options: ['Option 1', 'Option 2'] },
    longTitle: { title: 'A'.repeat(201), options: ['Option 1', 'Option 2'] },
    emptyOptions: { title: 'Valid Title', options: ['', ''] },
    whitespaceOptions: { title: 'Valid Title', options: ['   ', '   '] },
    duplicateOptions: { title: 'Valid Title', options: ['Red', 'red'] },
    tooFewOptions: { title: 'Valid Title', options: ['Only One'] },
    tooManyOptions: { title: 'Valid Title', options: Array.from({ length: 11 }, (_, i) => `Option ${i + 1}`) }
  }
});

// Mock function factories
export const createMockSupabaseClient = () => ({
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn()
  }
});

export const createMockNextRequest = (url: string, overrides: Partial<{
  method: string;
  body: string;
  headers: Record<string, string>;
}> = {}) => ({
  url,
  method: 'GET',
  body: null,
  headers: {},
  ...overrides
});

// Test assertion helpers
export const expectPollStructure = (poll: any) => {
  expect(poll).toHaveProperty('id');
  expect(poll).toHaveProperty('question');
  expect(poll).toHaveProperty('options');
  expect(poll).toHaveProperty('votes');
  expect(poll).toHaveProperty('created_at');
  expect(poll).toHaveProperty('created_by');
  expect(poll).toHaveProperty('is_public');
  expect(poll).toHaveProperty('is_active');
};

export const expectVoteStructure = (vote: any) => {
  expect(vote).toHaveProperty('id');
  expect(vote).toHaveProperty('poll_id');
  expect(vote).toHaveProperty('option_index');
  expect(vote).toHaveProperty('voter_id');
  expect(vote).toHaveProperty('created_at');
};

export const expectUserStructure = (user: any) => {
  expect(user).toHaveProperty('id');
  expect(user).toHaveProperty('email');
  expect(user).toHaveProperty('name');
};
