---
name: testing
description: Testing patterns, TDD workflow, and test automation for CLI development. Use when writing tests, implementing TDD, setting up test coverage, or debugging test failures.
---

# Testing Patterns

## Quick Reference

For comprehensive testing guidance, see:
- **[Testing Patterns](./references/testing-patterns.md)** - Complete testing best practices and TDD workflow
- See also `.cursor/rules/testing.mdc` for workspace-wide testing standards

## TDD Workflow Summary

**Simple RED-GREEN-REFACTOR:**
1. **RED** → Write failing test
2. **GREEN** → Make it pass with minimal code
3. **REFACTOR** → Improve code quality while keeping tests green

## Key Testing Rules

- **80% minimum coverage** (lines, branches, functions)
- **Class-based mocking** (no external libraries; extend and override methods)
- **Never make real API calls** in tests
- **Mock at service boundaries**, not implementation details
- **Test both success and failure paths**
- **Use descriptive test names**: "should [behavior] when [condition]"

## Quick Test Template

```typescript
describe('[ServiceName]', () => {
  let service: [ServiceName];

  beforeEach(() => {
    service = new [ServiceName]();
  });

  afterEach(() => {
    // Clean up any resources
  });

  it('should [expected behavior] when [condition]', async () => {
    // Arrange
    const input = { /* test data */ };
    
    // Act
    const result = await service.method(input);
    
    // Assert
    expect(result).to.deep.equal(expectedOutput);
  });

  it('should throw error when [error condition]', async () => {
    // Arrange & Act & Assert
    await expect(service.failingMethod())
      .to.be.rejectedWith('Expected error message');
  });
});
```

## Common Mock Patterns

### Class-Based Mocking
```typescript
// Mock a service by extending it
class MockContentstackClient extends ContentstackClient {
  async fetch() {
    return mockData;
  }
}

it('should use mocked client', async () => {
  const mockClient = new MockContentstackClient(config);
  const result = await mockClient.fetch();
  expect(result).to.deep.equal(mockData);
});
```

### Constructor Injection
```typescript
class RateLimiter {
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    return operation();
  }
}

class MyService {
  constructor(private rateLimiter: RateLimiter) {}
  
  async doWork() {
    return this.rateLimiter.execute(() => this.performWork());
  }
}

it('should rate limit operations', () => {
  const mockLimiter = { execute: () => Promise.resolve('result') };
  const service = new MyService(mockLimiter as any);
  // test service behavior
});
```

## Running Tests

### Run all tests in workspace
```bash
pnpm test
```

### Run tests for specific package
```bash
pnpm --filter @contentstack/cli-auth test
pnpm --filter @contentstack/cli-config test
```

### Run tests with coverage
```bash
pnpm test:coverage
```

### Run tests in watch mode
```bash
pnpm test:watch
```

### Run specific test file
```bash
pnpm test -- test/unit/commands/auth/login.test.ts
```

## Test Organization

### File Structure
- Mirror source structure: `test/unit/commands/auth/`, `test/unit/services/`, `test/unit/utils/`
- Use consistent naming: `[module-name].test.ts`
- Integration tests: `test/integration/`

### Test Data Management
```typescript
// Create mock data factories in test/fixtures/
const mockAuthToken = { token: 'abc123', expiresAt: Date.now() + 3600000 };
const mockConfig = { region: 'us', email: 'test@example.com' };
```

## Error Testing

### Rate Limit Handling
```typescript
it('should handle rate limit errors', async () => {
  const error = new Error('Rate limited');
  (error as any).status = 429;
  
  class MockClient {
    fetch() { throw error; }
  }
  
  try {
    await new MockClient().fetch();
    expect.fail('Should have thrown');
  } catch (err: any) {
    expect(err.status).to.equal(429);
  }
});
```

### Validation Error Testing
```typescript
it('should throw validation error for invalid input', () => {
  expect(() => service.validateRegion(''))
    .to.throw('Region is required');
});
```

## Coverage and Quality

### Coverage Requirements
```json
"nyc": {
  "check-coverage": true,
  "lines": 80,
  "functions": 80,
  "branches": 80,
  "statements": 80
}
```

### Quality Checklist
- [ ] All public methods tested
- [ ] Error paths covered (success + failure)
- [ ] Edge cases included
- [ ] No real API calls
- [ ] Descriptive test names
- [ ] Minimal test setup
- [ ] Tests run < 5s per test file
- [ ] 80%+ coverage achieved

## Usage

Reference the comprehensive patterns guide above for detailed test structures, mocking strategies, error testing patterns, and coverage requirements.
