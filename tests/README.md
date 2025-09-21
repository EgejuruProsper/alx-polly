# Tests Directory Structure

This directory contains all test files organized by testing level and type for better maintainability and clarity.

## 📁 Directory Structure

```
tests/
├── unit/                    # Unit tests for individual functions/components
│   ├── lib/                # Library function tests
│   │   ├── createPoll.test.ts
│   │   └── validations.test.ts
│   ├── components/         # React component tests
│   │   ├── create-poll-form.test.tsx
│   │   └── poll-card.test.tsx
│   └── hooks/             # Custom hook tests
│       └── use-polls.test.ts
├── integration/            # Integration tests for API routes and flows
│   ├── api/               # API route tests
│   │   ├── polls.test.ts
│   │   └── votes.test.ts
│   ├── database/          # Database integration tests
│   └── components/       # Component integration tests
├── e2e/                   # End-to-end user journey tests
│   ├── user-journeys.test.ts
│   └── error-scenarios.test.ts
└── utils/                 # Test utilities and factories
    └── test-factories.ts
```

## 🧪 Test Categories

### **Unit Tests** (`tests/unit/`)
- **Purpose**: Test individual functions, components, and utilities in isolation
- **Scope**: Single function/component behavior
- **Dependencies**: Mocked external dependencies
- **Examples**: Validation functions, utility functions, React components

### **Integration Tests** (`tests/integration/`)
- **Purpose**: Test interactions between different parts of the system
- **Scope**: API routes, database operations, component interactions
- **Dependencies**: Mocked external services, real internal logic
- **Examples**: API endpoint testing, database CRUD operations

### **End-to-End Tests** (`tests/e2e/`)
- **Purpose**: Test complete user workflows and system behavior
- **Scope**: Full application flows from user perspective
- **Dependencies**: Real or heavily mocked external services
- **Examples**: User registration → poll creation → voting workflow

## 🚀 Running Tests

### **All Tests**
```bash
npm run test
```

### **By Category**
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# End-to-end tests only
npm run test:e2e
```

### **With Coverage**
```bash
npm run test:coverage
```

### **Watch Mode**
```bash
npm run test:watch
```

### **With UI**
```bash
npm run test:ui
```

## 📝 Test Naming Conventions

### **File Names**
- Unit tests: `[component-name].test.ts`
- Integration tests: `[api-endpoint].test.ts`
- E2E tests: `[user-journey].test.ts`

### **Test Descriptions**
- Use descriptive names that explain the behavior being tested
- Group related tests using `describe` blocks
- Use "should" statements for test descriptions

```typescript
describe('createPoll', () => {
  describe('Happy Path', () => {
    it('should create a poll with valid data', () => {
      // test implementation
    });
  });

  describe('Error Cases', () => {
    it('should reject empty title', () => {
      // test implementation
    });
  });
});
```

## 🔧 Test Utilities

### **Test Factories** (`tests/utils/test-factories.ts`)
Centralized test data creation to avoid duplication:

```typescript
// Create mock data with sensible defaults
const mockPoll = createMockPoll();
const mockUser = createMockUser();

// Override specific properties
const expiredPoll = createMockPoll({ 
  expires_at: new Date(Date.now() - 86400000).toISOString() 
});
```

### **Mock Management**
- Use `vi.clearAllMocks()` in `beforeEach` hooks
- Create specific, realistic mocks
- Verify mock calls and parameters

## 📊 Test Coverage Goals

- **Unit Tests**: 90%+ coverage
- **Integration Tests**: 80%+ coverage  
- **E2E Tests**: 70%+ coverage

## 🎯 Best Practices

### **1. Test Structure (AAA Pattern)**
```typescript
it('should handle valid input', () => {
  // Arrange
  const input = createMockData();
  const expectedOutput = createExpectedResult();
  
  // Act
  const result = functionUnderTest(input);
  
  // Assert
  expect(result).toEqual(expectedOutput);
});
```

### **2. Error Testing**
```typescript
describe('Error Scenarios', () => {
  it('should handle network failures', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const result = await submitPoll(pollData);
    expect(result.success).toBe(false);
  });
});
```

### **3. Edge Cases**
```typescript
describe('Edge Cases', () => {
  it('should handle empty arrays', () => {
    const result = processPolls([]);
    expect(result).toEqual([]);
  });
});
```

## 🔍 Debugging Tests

### **Running Specific Tests**
```bash
# Run specific test file
npm run test tests/unit/lib/validations.test.ts

# Run tests matching pattern
npm run test -- --grep "should create poll"
```

### **Test Output**
- Use `console.log()` for debugging
- Use `--reporter=verbose` for detailed output
- Use `--ui` for interactive testing

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [Jest Documentation](https://jestjs.io/)

This organized structure makes it easy to:
- Find and maintain tests
- Run specific test categories
- Scale testing as the project grows
- Keep tests separate from application code
