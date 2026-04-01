# Testing Patterns

Testing best practices and TDD workflow for Contentstack CLI monorepo development.

## TDD Workflow

**Simple RED-GREEN-REFACTOR:**
1. **RED** → Write failing test
2. **GREEN** → Make it pass with minimal code
3. **REFACTOR** → Improve code quality while keeping tests green

## Test Structure Standards

### Basic Test Template
```typescript
describe('[ComponentName]', () => {
  let component: [ComponentName];

  beforeEach(() => {
    // Setup mocks and test data
    component = new [ComponentName]();
  });

  afterEach(() => {
    // Clean up resources
  });

  it('should [expected behavior] when [condition]', async () => {
    // Arrange
    const input = { /* test data */ };
    
    // Act
    const result = await component.method(input);
    
    // Assert
    expect(result).to.deep.equal(expectedOutput);
  });
});
```

### Command Testing Example
```typescript
import { test } from '@oclif/test';

describe('config:set:region', () => {
  test
    .stdout()
    .command(['config:set:region', '--help'])
    .it('shows help', ctx => {
      expect(ctx.stdout).to.contain('Set CLI region');
    });

  test
    .stdout()
    .command(['config:set:region', 'AWS-NA'])
    .it('sets region to AWS-NA', ctx => {
      expect(ctx.stdout).to.contain('success');
    });
});
```

### Service Testing Example
```typescript
describe('AuthService', () => {
  let authService: AuthService;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = { region: 'us', email: 'test@example.com' };
    authService = new AuthService(mockConfig);
  });

  it('should authenticate user with valid credentials', async () => {
    const result = await authService.login('test@example.com', 'password');
    expect(result).to.have.property('token');
  });

  it('should throw error on invalid credentials', async () => {
    await expect(authService.login('test@example.com', 'wrong'))
      .to.be.rejectedWith('Authentication failed');
  });
});
```

## Key Testing Rules

### Coverage Requirements
- **80% minimum** coverage (lines, branches, functions)
- Test both success and failure paths
- Include edge cases and error scenarios

### Mocking Standards
- **Use class-based mocking** (extend and override methods)
- **Never make real API calls** in tests
- **Mock at service boundaries**, not implementation details
- Clean up resources in `afterEach()` to prevent test pollution

### Test Patterns
- Use descriptive test names: "should [behavior] when [condition]"
- Keep test setup minimal and focused
- Prefer async/await patterns
- Group related tests in `describe` blocks

## Common Mock Patterns

### Service Mocking
```typescript
// Mock a service by extending and overriding methods
class MockContentstackClient {
  async fetch() {
    return {
      uid: 'entry-1',
      title: 'Mock Entry',
      content_type: 'page'
    };
  }
}

it('should process entry', async () => {
  const mockClient = new MockContentstackClient();
  const result = await mockClient.fetch();
  expect(result.uid).to.equal('entry-1');
});
```

### Dependency Injection Mocking
```typescript
class RateLimiter {
  constructor(private maxConcurrent: number = 1) {}
  
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

it('should use rate limiter', async () => {
  // Pass in mock with minimal implementation
  const mockLimiter = { execute: (fn) => fn() } as any;
  const service = new MyService(mockLimiter);
  
  const result = await service.doWork();
  expect(result).to.exist;
});
```

### API Error Simulation
```typescript
class MockClient {
  fetch(endpoint: string) {
    if (endpoint === '/rate-limited') {
      const error = new Error('Rate limited');
      (error as any).status = 429;
      throw error;
    }
    return Promise.resolve({ data: 'ok' });
  }
}

it('should handle rate limit errors', async () => {
  const client = new MockClient();
  
  try {
    await client.fetch('/rate-limited');
    expect.fail('Should have thrown');
  } catch (error: any) {
    expect(error.status).to.equal(429);
    expect(error.message).to.include('Rate limited');
  }
});
```

### Configuration Mocking
```typescript
it('should load config from mock', async () => {
  const mockConfig = {
    region: 'us',
    email: 'test@example.com',
    authToken: 'token-123',
    get: (key: string) => mockConfig[key as keyof typeof mockConfig]
  };

  const service = new ConfigService(mockConfig);
  expect(service.region).to.equal('us');
});
```

## Error Testing Patterns

### Rate Limit Handling
```typescript
it('should retry on rate limit error', async () => {
  let callCount = 0;
  
  class MockService {
    async call() {
      callCount++;
      if (callCount === 1) {
        const error = new Error('Rate limited');
        (error as any).status = 429;
        throw error;
      }
      return 'success';
    }
  }

  const service = new MockService();
  
  // First call throws, simulate retry
  try { await service.call(); } catch (e) { /* expected */ }
  const result = await service.call();
  
  expect(result).to.equal('success');
  expect(callCount).to.equal(2);
});
```

### Validation Error Testing
```typescript
it('should throw validation error for invalid input', () => {
  class Validator {
    validate(region: string): void {
      if (!region || region === '') {
        throw new Error('Region is required');
      }
    }
  }

  const validator = new Validator();
  expect(() => validator.validate(''))
    .to.throw('Region is required');
});
```

### Async Error Handling
```typescript
it('should handle async operation failures', async () => {
  class FailingService {
    async performAsync() {
      throw new Error('Operation failed');
    }
  }

  const service = new FailingService();

  try {
    await service.performAsync();
    expect.fail('Should have thrown error');
  } catch (error: any) {
    expect(error.message).to.include('Operation failed');
  }
});
```

## Test Organization

### File Structure
- Mirror source structure: `test/unit/services/auth-service.test.ts`
- Use consistent naming: `[module-name].test.ts`
- Group integration tests: `test/integration/`
- Commands: `test/unit/commands/auth/login.test.ts`
- Services: `test/unit/services/config-service.test.ts`
- Utils: `test/unit/utils/region-handler.test.ts`

### Test Data Management
- Create mock data in test files or in `test/fixtures/` for reuse
- Use realistic test data that matches actual API responses
- Share common mocks across test files in a factory pattern

### Test Configuration
```javascript
// .mocharc.json
{
  "require": [
    "test/helpers/init.js",
    "ts-node/register",
    "source-map-support/register"
  ],
  "recursive": true,
  "timeout": 30000,
  "spec": "test/**/*.test.ts"
}
```

## Monorepo Testing Commands

### Run all tests across workspace
```bash
pnpm test
```

### Run tests for specific package
```bash
pnpm --filter @contentstack/cli-auth test
pnpm --filter @contentstack/cli-config test
pnpm --filter @contentstack/cli-command test
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
pnpm test -- test/unit/commands/config/set/region.test.ts
```

### Run tests matching pattern
```bash
pnpm test -- --grep "should authenticate user"
```

## Coverage and Quality

### Coverage Enforcement
```json
"nyc": {
  "check-coverage": true,
  "lines": 80,
  "functions": 80,
  "branches": 80,
  "statements": 80
}
```

### Coverage Report Generation
```bash
# Generate coverage reports
pnpm test:coverage

# HTML report available at coverage/index.html
open coverage/index.html
```

### Quality Checklist
- [ ] All public methods tested
- [ ] Error paths covered (success + failure)
- [ ] Edge cases included
- [ ] No real API calls in tests
- [ ] Descriptive test names
- [ ] Minimal test setup (fast to run)
- [ ] Tests complete in < 5 seconds per file
- [ ] 80%+ coverage achieved
- [ ] Mocks properly isolated per test
- [ ] No test pollution (afterEach cleanup)
