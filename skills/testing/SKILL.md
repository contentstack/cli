---
name: testing
description: Testing patterns, TDD workflow, and test automation for CLI development. Use when writing tests, implementing TDD, setting up test coverage, or debugging test failures.
---

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

## Monorepo test execution

Use **pnpm** from the repo root or `cd packages/<package>`; there is no `/execute-tests` slash command in this repository.

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

### Quick reference

- **All packages:** `pnpm test`
- **With coverage:** `pnpm test:coverage` or `pnpm -r --filter './packages/*' run test:coverage` (when scripts exist)
- **Single package:** `pnpm --filter @contentstack/cli-config test` or `cd packages/contentstack-config && pnpm test`
- **Watch:** `pnpm test --watch` or `pnpm --filter <pkg> test -- --watch` (depends on package script)
- **Command tests only:** run tests under `packages/*/test/unit/commands/` for the package you are changing
- **Bail on first failure:** `pnpm test -- --bail` if the test runner forwards args

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

## Intelligent Filtering

### Repository-Aware Detection
- **Test patterns**: All use `*.test.ts` naming convention
- **Directory structures**: Standard `test/unit/` layout
- **Test locations**: `packages/*/test/unit/**/*.test.ts`
- **Build exclusion**: Ignores `lib/` directories (compiled artifacts)

### Package Structure
The monorepo contains 6 packages:
- `contentstack` - Main CLI package
- `contentstack-auth` - Authentication plugin
- `contentstack-config` - Configuration plugin
- `contentstack-command` - Base Command class (library)
- `contentstack-utilities` - Utilities library
- `contentstack-dev-dependencies` - Dev dependencies

### Monorepo Integration
- **pnpm workspace support**: Uses `pnpm -r --filter` for package targeting
- **Dependency awareness**: Understands package interdependencies
- **Parallel execution**: Leverages pnpm's parallel capabilities
- **Selective testing**: Can target specific packages or file patterns

### Framework Detection
- **Mocha configuration**: Respects `.mocharc.json` files per package
- **TypeScript compilation**: Handles test TypeScript setup
- **Test setup**: Detects test helper initialization files
- **Test timeout**: 30 seconds standard (configurable per package)

## Execution Examples

### Common Workflows
```bash
# Run all tests with coverage
pnpm test:coverage

# Test specific package during development (example: contentstack-config)
pnpm --filter @contentstack/cli-config test -- --watch

# Run only command tests (example: from a package directory)
cd packages/contentstack-config && pnpm test -- "test/unit/commands/**/*.test.ts"

# Verbose / debug output (depends on package script / mocha)
pnpm test -- --reporter spec

# Bail on first failure
pnpm test -- --bail
```

### Package-Specific Commands Generated
```bash
# For contentstack-config package
cd packages/contentstack-config && pnpm test

# For all packages with parallel execution
pnpm -r --filter './packages/*' run test

# For specific test file
cd packages/contentstack-config && npx mocha "test/unit/commands/region.test.ts"

# With coverage
pnpm -r --filter './packages/*' run test:coverage
```

## Configuration Awareness

### Mocha Integration
- Respects individual package `.mocharc.json` configurations (see **Test Organization** → **Test Configuration** above for an example)
- Handles TypeScript compilation via ts-node/register
- Supports test helpers and initialization files
- Manages timeout settings per package (default 30 seconds)

### pnpm Workspace Features
- Leverages workspace dependency resolution
- Supports filtered execution by package patterns
- Enables parallel test execution across packages
- Respects package-specific scripts and configurations

## Test Structure

### Standard Test Organization
```
packages/*/
├── test/
│   └── unit/
│       ├── commands/        # Command-specific tests
│       ├── services/        # Service/business logic tests
│       └── utils/           # Utility function tests
└── src/
    ├── commands/            # CLI commands
    ├── services/            # Business logic
    └── utils/               # Utilities
```

### Test File Naming
- **Pattern**: `*.test.ts` across all packages
- **Location**: `test/unit/` directories
- **Organization**: Mirrors `src/` structure for easy navigation

## Performance Optimization

### Parallel Testing
```bash
# Run tests in parallel for faster feedback
pnpm -r --filter './packages/*' run test

# Watch mode during development
pnpm test --watch
```

### Selective Testing
- Run only affected packages' tests during development
- Use `--bail` to stop on first failure for quick iteration
- Target specific test files for focused debugging

## Troubleshooting

### Common Issues

**Tests not found**
- Check that files follow `*.test.ts` pattern
- Verify files are in `test/unit/` directory
- Ensure `.mocharc.json` has correct spec pattern

**TypeScript compilation errors**
- Verify `tsconfig.json` in package root
- Check that `ts-node/register` is in `.mocharc.json` requires
- Run `pnpm compile` to check TypeScript errors

**Watch mode not detecting changes**
- Verify `--watch` flag is supported in your Mocha version
- Check that file paths are correct
- Ensure no excessive `.gitignore` patterns

**Port conflicts**
- Tests should not use hard-coded ports
- Use dynamic port allocation or test isolation
- Check for process cleanup in `afterEach` hooks

## Best Practices

### Test Execution
- Run tests before committing: `pnpm test`
- Use `--bail` during development for quick feedback
- Run full suite before opening PR
- Check coverage for critical paths

### Test Organization
- Keep tests close to source code structure
- Use descriptive test names
- Group related tests with `describe` blocks
- Clean up resources in `afterEach`

### Debugging
- Use `--debug` flag for detailed output
- Add `log.debug()` statements in tests
- Run individual test files for isolation
- Use `--bail` to stop at first failure

## Integration with CI/CD

### GitHub Actions
- Runs `pnpm test` on pull requests
- Enforces test passage before merge
- May include coverage reporting
- Runs linting and build verification

### Local Development
```bash
# Before committing
pnpm test
pnpm run lint
pnpm run build

# Or use watch mode for faster iteration
pnpm test --watch
```

## Coverage Reporting

### Coverage Commands
```bash
# Run tests with coverage
pnpm test:coverage

# Typical coverage output layout (package-dependent)
# coverage/
# ├── index.html
# ├── coverage-summary.json
# └── lcov.info
```

### Coverage Goals
- **Team aspiration**: 80% minimum coverage
- **Focus on**: Critical business logic and error paths
- **Not critical**: Utility functions and edge cases
