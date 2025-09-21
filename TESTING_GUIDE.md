# Comprehensive Testing Guide

## 🎯 **Testing Strategy Overview**

This guide covers comprehensive testing at multiple levels, addressing common pitfalls and ensuring robust test coverage for the polling application.

## 📊 **Testing Levels**

### **1. Unit Tests** → Individual Functions
- ✅ **Pure Functions** - Validation, utilities, business logic
- ✅ **Component Logic** - Form handlers, state management
- ✅ **Helper Functions** - Data transformation, calculations

### **2. Integration Tests** → Flows Across API, DB, etc.
- ✅ **API Routes** - Request/response flows
- ✅ **Database Operations** - CRUD operations with Supabase
- ✅ **Authentication Flows** - Login, logout, session management
- ✅ **Component Integration** - Form submission, data fetching

### **3. End-to-End Tests** → Complete User Journeys
- ✅ **User Flows** - Create poll, vote, manage polls
- ✅ **Cross-Component** - Navigation, state persistence
- ✅ **Error Scenarios** - Network failures, validation errors

## ⚠️ **Common Testing Pitfalls Addressed**

### **1. AI Defaults to Happy Paths**
**Problem**: Tests only cover successful scenarios
**Solution**: Explicitly test failure cases, edge cases, and error conditions

```typescript
// ❌ Bad: Only happy path
it('should create poll successfully', () => {
  const result = createPoll(validData);
  expect(result.success).toBe(true);
});

// ✅ Good: Both happy and failure paths
describe('createPoll', () => {
  it('should create poll successfully', () => {
    const result = createPoll(validData);
    expect(result.success).toBe(true);
  });

  it('should reject empty title', () => {
    const result = createPoll({ ...validData, title: '' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Title is required');
  });

  it('should reject duplicate options', () => {
    const result = createPoll({ 
      ...validData, 
      options: ['Red', 'red'] 
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Duplicate options');
  });
});
```

### **2. Mocking May Be Wrong or Missing**
**Problem**: Incorrect mocks or missing dependencies
**Solution**: Verify mocks match real behavior, test with real dependencies

```typescript
// ❌ Bad: Over-mocking
vi.mock('@/app/lib/supabase', () => ({
  supabase: {} // Too generic
}));

// ✅ Good: Specific, realistic mocks
const mockSupabase = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockPoll,
          error: null
        })
      })
    })
  })
};
```

### **3. Duplicated Logic in Tests**
**Problem**: Repeated setup, assertions, or test data
**Solution**: Extract common utilities, use test factories, consolidate helpers

```typescript
// ❌ Bad: Duplicated test data
const poll1 = { id: '1', question: 'Q1', options: ['A', 'B'] };
const poll2 = { id: '2', question: 'Q2', options: ['C', 'D'] };

// ✅ Good: Test factories
const createMockPoll = (overrides = {}) => ({
  id: 'poll-123',
  question: 'Test Poll',
  options: ['Option 1', 'Option 2'],
  ...overrides
});

const poll1 = createMockPoll({ id: '1' });
const poll2 = createMockPoll({ id: '2', question: 'Q2' });
```

## 🧪 **Test Implementation**

### **Running Tests**

```bash
# Run all tests
npm run test

# Run specific test levels
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests only

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run with UI
npm run test:ui
```

### **Test File Structure**

```
tests/
├── unit/
│   ├── lib/
│   │   ├── validations.test.ts ✅
│   │   ├── createPoll.test.ts ✅
│   │   └── utils.test.ts
│   ├── components/
│   │   ├── create-poll-form.test.tsx ✅
│   │   ├── poll-card.test.tsx
│   │   └── poll-list.test.tsx
│   └── hooks/
│       └── use-polls.test.ts
├── integration/
│   ├── api/
│   │   ├── polls.test.ts ✅
│   │   ├── auth.test.ts
│   │   └── votes.test.ts ✅
│   ├── database/
│   │   ├── polls.test.ts
│   │   └── votes.test.ts
│   └── components/
│       ├── poll-creation-flow.test.tsx
│       └── voting-flow.test.tsx
├── e2e/
│   ├── user-journeys.test.ts ✅
│   └── error-scenarios.test.ts
└── utils/
    └── test-factories.ts ✅
```

## 📝 **Testing Best Practices**

### **Test Structure (AAA Pattern)**

```typescript
describe('Function Name', () => {
  it('should handle happy path', () => {
    // Arrange
    const input = createMockData();
    const expectedOutput = createExpectedResult();
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toEqual(expectedOutput);
  });
  
  it('should handle error case', () => {
    // Arrange
    const invalidInput = createInvalidData();
    
    // Act & Assert
    expect(() => functionUnderTest(invalidInput)).toThrow();
  });
});
```

### **Mock Management**

```typescript
// ✅ Good: Specific mocks
const mockSupabase = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ 
        data: mockData, 
        error: null 
      })
    })
  })
};

// ✅ Good: Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

### **Test Data Factories**

```typescript
// ✅ Good: Reusable test data
const createMockPoll = (overrides = {}) => ({
  id: 'poll-123',
  question: 'Test Poll',
  options: ['Option 1', 'Option 2'],
  votes: [5, 3],
  created_at: '2024-01-01T00:00:00Z',
  created_by: 'user-123',
  is_public: true,
  is_active: true,
  ...overrides
});

// Usage
const activePoll = createMockPoll();
const expiredPoll = createMockPoll({ 
  expires_at: new Date(Date.now() - 86400000).toISOString() 
});
```

## 🎯 **Test Coverage Goals**

### **Unit Tests: 90%+ Coverage**
- All utility functions
- All validation schemas
- All component logic
- All business logic

### **Integration Tests: 80%+ Coverage**
- All API routes
- All database operations
- All authentication flows
- All component interactions

### **End-to-End Tests: 70%+ Coverage**
- All user journeys
- All error scenarios
- All cross-component flows

## 🚀 **Advanced Testing Scenarios**

### **Error Scenarios Testing**

```typescript
describe('Error Scenarios', () => {
  it('should handle network failures', async () => {
    // Mock network failure
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    
    const result = await submitPoll(pollData);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });

  it('should handle validation errors', () => {
    const invalidData = { title: '', options: [] };
    const result = createPoll(invalidData);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Title is required');
  });

  it('should handle database errors', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })
    });

    const result = await createPoll(pollData);
    expect(result.success).toBe(false);
  });
});
```

### **Edge Cases Testing**

```typescript
describe('Edge Cases', () => {
  it('should handle empty polls array', () => {
    const result = processPolls([]);
    expect(result).toEqual([]);
  });

  it('should handle polls with missing author data', () => {
    const poll = createMockPoll({ author: null });
    const result = transformPoll(poll);
    
    expect(result.author).toEqual({
      id: poll.id,
      name: 'Unknown User',
      email: ''
    });
  });

  it('should handle rapid form submissions', async () => {
    const user = userEvent.setup();
    render(<CreatePollForm onSubmit={mockOnSubmit} />);
    
    // Rapidly submit form multiple times
    for (let i = 0; i < 5; i++) {
      await user.click(screen.getByRole('button', { name: /create poll/i }));
    }
    
    // Should only submit once
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
  });
});
```

## 📊 **Test Results and Monitoring**

### **Coverage Reports**

```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/index.html
```

### **CI/CD Integration**

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
```

## 🔧 **Troubleshooting Common Issues**

### **Mock Issues**
```typescript
// Problem: Mock not working
// Solution: Check mock scope and timing
vi.mock('@/app/lib/supabase', () => ({
  supabase: mockSupabase
}));

// Ensure mock is called before component render
beforeEach(() => {
  vi.clearAllMocks();
});
```

### **Async Testing Issues**
```typescript
// Problem: Async operations not completing
// Solution: Use waitFor and proper async handling
await waitFor(() => {
  expect(mockOnSubmit).toHaveBeenCalled();
});
```

### **Component Testing Issues**
```typescript
// Problem: Component not rendering
// Solution: Check imports and setup
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
```

This comprehensive testing strategy ensures robust coverage at all levels while avoiding common pitfalls and maintaining high code quality!
