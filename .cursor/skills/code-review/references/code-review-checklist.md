# Code Review Checklist

Automated PR review guidelines covering security, performance, architecture, and code quality for the Contentstack CLI monorepo.

## Review Process

### Severity Levels
- **🔴 Critical** (must fix before merge):
  - Security vulnerabilities
  - Logic errors causing incorrect behavior
  - Breaking API changes
  - Hardcoded secrets or credentials
  - Data loss scenarios

- **🟡 Important** (should fix):
  - Performance regressions
  - Code maintainability issues
  - Missing error handling
  - Test coverage gaps
  - Best practice violations

- **🟢 Suggestion** (consider improving):
  - Code readability improvements
  - Minor optimizations
  - Documentation enhancements
  - Style inconsistencies

## Security Review

### Secrets and Credentials
- [ ] No hardcoded API keys, tokens, or passwords
- [ ] No secrets in environment variables exposed in logs
- [ ] No secrets in test data or fixtures
- [ ] Sensitive data not logged or exposed in error messages
- [ ] Config files don't contain real credentials

### Input Validation
```typescript
// ✅ GOOD - Validate all user input
if (!region || typeof region !== 'string') {
  throw new CLIError('Region must be a non-empty string');
}

if (!['us', 'eu', 'au'].includes(region)) {
  throw new CLIError('Invalid region specified');
}

// ❌ BAD - No validation
const result = await client.setRegion(region);
```

### Error Handling
- [ ] No sensitive data in error messages
- [ ] Stack traces don't leak system information
- [ ] Error messages are user-friendly
- [ ] All errors properly caught and handled
- [ ] No raw error objects exposed to users

### Authentication
- [ ] OAuth/token handling is secure
- [ ] No storing plaintext passwords
- [ ] Session tokens validated
- [ ] Auth state properly managed
- [ ] Rate limiting respected

## Correctness Review

### Logic Validation
- [ ] Business logic correctly implemented
- [ ] Algorithm is correct for the problem
- [ ] State transitions valid
- [ ] Data types used correctly
- [ ] Comparisons use correct operators (=== not ==)

### Error Scenarios
- [ ] API failures handled (404, 429, 500, etc.)
- [ ] Network timeouts managed
- [ ] Empty/null responses handled
- [ ] Invalid input rejected
- [ ] Partial failures handled gracefully

### Async/Await and Promises
```typescript
// ✅ GOOD - Proper async handling
async run(): Promise<void> {
  try {
    const result = await this.fetchData();
    await this.processData(result);
  } catch (error) {
    handleAndLogError(error, this.contextDetails);
  }
}

// ❌ BAD - Missing await
async run(): Promise<void> {
  const result = this.fetchData(); // Missing await!
  await this.processData(result);
}
```

### Data Integrity
- [ ] No race conditions
- [ ] State mutations atomic
- [ ] Data validation before mutations
- [ ] Rollback strategy for failures
- [ ] Concurrent operations safe

## Architecture Review

### Code Organization
- [ ] Classes/functions have single responsibility
- [ ] No circular dependencies
- [ ] Proper module structure
- [ ] Clear separation of concerns
- [ ] Commands delegate to services/utils

### Design Patterns
```typescript
// ✅ GOOD - Service layer separation
export default class MyCommand extends BaseCommand {
  async run(): Promise<void> {
    const service = new MyService(this.contextDetails);
    const result = await service.execute();
  }
}

// ❌ BAD - Logic in command
export default class MyCommand extends BaseCommand {
  async run(): Promise<void> {
    const data = await client.fetch();
    for (const item of data) {
      // Complex business logic here
    }
  }
}
```

### Modularity
- [ ] Services are reusable
- [ ] Utils are generic and testable
- [ ] Dependencies injected
- [ ] No tight coupling
- [ ] Easy to test in isolation

### Type Safety
- [ ] TypeScript strict mode enabled
- [ ] No `any` types without justification
- [ ] Interfaces defined for contracts
- [ ] Generic types used appropriately
- [ ] Type narrowing correct

## Performance Review

### API Calls
- [ ] Rate limiting respected (10 req/sec for Contentstack)
- [ ] No unnecessary API calls in loops
- [ ] Pagination implemented for large datasets
- [ ] Caching used where appropriate
- [ ] Batch operations considered

### Memory Management
- [ ] No memory leaks in event listeners
- [ ] Large arrays streamed not loaded fully
- [ ] Cleanup in try/finally blocks
- [ ] File handles properly closed
- [ ] Resources released after use

### Concurrency
```typescript
// ✅ GOOD - Controlled concurrency
const results = await Promise.all(
  items.map(item => processItem(item))
);

// ❌ BAD - Unbounded concurrency
for (const item of items) {
  promises.push(processItem(item)); // No limit!
}
```

### Efficiency
- [ ] Algorithms are efficient for scale
- [ ] String concatenation uses proper methods
- [ ] Unnecessary computations avoided
- [ ] Data structures appropriate
- [ ] No repeated lookups without caching

## Testing Review

### Coverage
- [ ] 80%+ line coverage achieved
- [ ] 80%+ branch coverage
- [ ] Critical paths fully tested
- [ ] Error paths tested
- [ ] Edge cases included

### Test Quality
```typescript
// ✅ GOOD - Quality test
it('should throw error when region is empty', () => {
  expect(() => validateRegion(''))
    .to.throw('Region is required');
});

// ❌ BAD - Weak test
it('should validate region', () => {
  validateRegion('us'); // No assertion!
});
```

### Testing Patterns
- [ ] Descriptive test names
- [ ] Arrange-Act-Assert pattern
- [ ] One assertion per test (focus)
- [ ] Mocks properly isolated
- [ ] No test interdependencies

### TDD Compliance
- [ ] Tests written before implementation
- [ ] All tests pass
- [ ] Code coverage requirements met
- [ ] Tests are maintainable
- [ ] Both success and failure paths covered

## Code Conventions

### TypeScript Standards
- [ ] `strict: true` in tsconfig
- [ ] No `any` types (use `unknown` if needed)
- [ ] Proper null/undefined handling
- [ ] Type annotations on public APIs
- [ ] Generics used appropriately

### Naming Conventions
- [ ] Classes: PascalCase (`MyClass`)
- [ ] Functions: camelCase (`myFunction`)
- [ ] Constants: UPPER_SNAKE_CASE (`MY_CONST`)
- [ ] Booleans start with verb (`isActive`, `hasData`)
- [ ] Descriptive names (not `x`, `temp`, `data`)

### Code Style
- [ ] No unused imports
- [ ] No unused variables
- [ ] Proper indentation (consistent spacing)
- [ ] Line length reasonable (<100 chars)
- [ ] Imports organized (group by type)

### Documentation
- [ ] Complex logic documented
- [ ] Public APIs have JSDoc comments
- [ ] Non-obvious decisions explained
- [ ] Examples provided where helpful
- [ ] README updated if needed

## Monorepo-Specific Checks

### Cross-Package Imports
```typescript
// ✅ GOOD - Use published package names
import { configHandler } from '@contentstack/cli-utilities';
import { BaseCommand } from '@contentstack/cli-command';

// ❌ BAD - Relative paths across packages
import { configHandler } from '../../../contentstack-utilities/src';
```

### Workspace Dependencies
- [ ] Dependencies declared in correct `package.json`
- [ ] Versions consistent across packages
- [ ] No circular dependencies between packages
- [ ] Shared deps in root if used by multiple packages
- [ ] No installing globally when local version exists

### OCLIF Configuration
- [ ] Command file paths correct in `package.json`
- [ ] OCLIF manifest regenerated (`pnpm build && pnpm oclif manifest`)
- [ ] New commands registered in plugin list if needed
- [ ] Topic separators consistent (`:`)
- [ ] Command names follow pattern

### Build and Publishing
- [ ] TypeScript compiles without errors
- [ ] Build output in `lib/` directory
- [ ] No build artifacts committed
- [ ] ESLint passes without warnings
- [ ] Tests pass in CI environment

## Common Issues to Look For

### Security
- [ ] Config with default passwords
- [ ] API keys in client-side code
- [ ] SQL injection (N/A here, but parameterization pattern)
- [ ] XSS in CLI output (escape HTML if needed)

### Performance
- [ ] API calls in loops
- [ ] Synchronous file I/O on large files
- [ ] Memory not released properly
- [ ] Rate limiting ignored

### Logic
- [ ] Off-by-one errors in loops
- [ ] Wrong comparison operators
- [ ] Async/await chains broken
- [ ] Null/undefined not handled

### Testing
- [ ] Tests pass locally but fail in CI
- [ ] Mocks not properly restored
- [ ] Race conditions in tests
- [ ] Hardcoded timeouts

## Review Checklist Template

```markdown
## Security
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] Error handling secure

## Correctness
- [ ] Logic is correct
- [ ] Edge cases handled
- [ ] Error scenarios covered

## Architecture
- [ ] Good code organization
- [ ] Design patterns followed
- [ ] Modularity intact

## Performance
- [ ] Efficient implementation
- [ ] Rate limits respected
- [ ] Memory managed properly

## Testing
- [ ] Adequate coverage
- [ ] Quality tests
- [ ] Both paths tested

## Conventions
- [ ] TypeScript standards met
- [ ] Code style consistent
- [ ] Documentation adequate

## Monorepo
- [ ] Package imports correct
- [ ] Dependencies declared properly
- [ ] Manifest/build updated
- [ ] No breaking changes
```

## Approval Criteria

**APPROVE when:**
- ✅ All 🔴 Critical items addressed
- ✅ Most 🟡 Important items addressed (document exceptions)
- ✅ Code follows team conventions
- ✅ Tests pass and coverage sufficient
- ✅ Monorepo integrity maintained

**REQUEST CHANGES when:**
- ❌ Any 🔴 Critical issues present
- ❌ Multiple 🟡 Important issues unaddressed
- ❌ Test coverage below 80%
- ❌ Architecture concerns not resolved
- ❌ Breaking changes not documented

**COMMENT for:**
- 💬 🟢 Suggestions (non-blocking)
- 💬 Questions about implementation
- 💬 Appreciation for good patterns
