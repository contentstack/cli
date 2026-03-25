---
name: code-review
description: Automated PR review using comprehensive checklist tailored for Contentstack CLI plugins
---

# Code Review Command

## Usage Patterns

### Scope-Based Reviews
- `/code-review` - Review all current changes with full checklist
- `/code-review --scope typescript` - Focus on TypeScript configuration and patterns
- `/code-review --scope testing` - Focus on Mocha/Chai/Sinon test patterns
- `/code-review --scope contentstack` - Focus on API integration and CLI patterns
- `/code-review --scope oclif` - Focus on command structure and OCLIF patterns

### Severity Filtering
- `/code-review --severity critical` - Show only critical issues (security, breaking changes)
- `/code-review --severity high` - Show high and critical issues
- `/code-review --severity all` - Show all issues including suggestions

### Package-Aware Reviews
- `/code-review --package contentstack-import` - Review changes in specific package
- `/code-review --package-type plugin` - Review plugin packages only
- `/code-review --package-type library` - Review library packages (e.g., variants)

### File Type Focus
- `/code-review --files commands` - Review command files only
- `/code-review --files tests` - Review test files only
- `/code-review --files modules` - Review import/export modules

## Comprehensive Review Checklist

### Monorepo Structure Compliance
- **Package organization**: Proper placement in `packages/` structure
- **pnpm workspace**: Correct `package.json` workspace configuration
- **Build artifacts**: No `lib/` directories committed to version control
- **Dependencies**: Proper use of shared utilities (`@contentstack/cli-command`, `@contentstack/cli-utilities`)

### TypeScript Standards (Repository-Specific)
- **Configuration compliance**: Follows package-specific TypeScript config
- **Naming conventions**: kebab-case files, PascalCase classes, camelCase functions
- **Type safety**: Appropriate use of strict mode vs relaxed settings per package
- **Import patterns**: ES modules with proper default/named exports
- **Migration strategy**: Proper use of `@ts-ignore` during gradual migration

### OCLIF Command Patterns (Actual Implementation)
- **Base class usage**: Extends `@contentstack/cli-command` (not `@oclif/core`)
- **Command structure**: Proper `static description`, `examples`, `flags`
- **Topic organization**: Uses `cm` topic structure (`cm:stacks:import`)
- **Error handling**: Uses `handleAndLogError` from utilities
- **Validation**: Early flag validation and user-friendly error messages
- **Service delegation**: Commands orchestrate, services implement business logic

### Testing Excellence (Mocha/Chai/Sinon Stack)
- **Framework compliance**: Uses Mocha + Chai + Sinon (not Jest)
- **File patterns**: Follows `*.test.ts` naming (or `*.test.js` for bootstrap)
- **Directory structure**: Proper placement in `test/unit/`, `test/lib/`, etc.
- **Mock patterns**: Proper Sinon stubbing of SDK methods
- **Coverage configuration**: Correct nyc setup (watch for `inlcude` typo)
- **Test isolation**: Proper `beforeEach`/`afterEach` with `sinon.restore()`
- **No real API calls**: All external dependencies properly mocked

### Contentstack API Integration (Real Patterns)
- **SDK usage**: Proper `managementSDKClient` and fluent API chaining
- **Authentication**: Correct `configHandler` and token alias handling
- **Rate limiting compliance**: 
  - Batch spacing (minimum 1 second between batches)
  - 429 retry handling with exponential backoff
  - Pagination throttling for variants
- **Error handling**: Proper `handleAndLogError` usage and user-friendly messages
- **Configuration**: Proper regional endpoint and management token handling

### Import/Export Module Architecture
- **BaseClass extension**: Proper inheritance from import/export BaseClass
- **Batch processing**: Correct use of `makeConcurrentCall` and `logMsgAndWaitIfRequired`
- **Module organization**: Proper entity-specific module structure
- **Configuration handling**: Proper `ModuleClassParams` usage
- **Progress feedback**: Appropriate user feedback during long operations

### Security and Best Practices
- **Token security**: No API keys or tokens logged or committed
- **Input validation**: Proper validation of user inputs and flags
- **Error exposure**: No sensitive information in error messages
- **File permissions**: Proper handling of file system operations
- **Process management**: Appropriate use of `process.exit(1)` for critical failures

### Performance Considerations
- **Concurrent processing**: Proper use of `Promise.allSettled` for batch operations
- **Memory management**: Appropriate handling of large datasets
- **Rate limiting**: Compliance with Contentstack API limits (10 req/sec)
- **Batch sizing**: Appropriate batch sizes for different operations
- **Progress tracking**: Efficient progress reporting without performance impact

### Package-Specific Patterns
- **Plugin vs Library**: Correct `oclif.commands` configuration for plugin packages
- **Command compilation**: Proper build pipeline (`tsc` → `lib/commands` → `oclif manifest`)
- **Dependency management**: Correct use of shared vs package-specific dependencies
- **Test variations**: Handles different test patterns per package (JS vs TS, different structures)

## Review Execution

### Automated Checks
1. **Lint compliance**: ESLint and TypeScript compiler checks
2. **Test coverage**: nyc coverage thresholds (where enforced)
3. **Build verification**: Successful compilation to `lib/` directories
4. **Dependency audit**: No security vulnerabilities in dependencies

### Manual Review Focus Areas
1. **API integration patterns**: Verify proper SDK usage and error handling
2. **Rate limiting implementation**: Check for proper throttling mechanisms
3. **Test quality**: Verify comprehensive mocking and error scenario coverage
4. **Command usability**: Ensure clear help text and examples
5. **Monorepo consistency**: Check for consistent patterns across packages

### Common Issues to Flag
- **Coverage config typos**: `"inlcude"` instead of `"include"` in `.nycrc.json`
- **Inconsistent TypeScript**: Mixed strict mode usage without migration plan
- **Real API calls in tests**: Any unmocked external dependencies
- **Missing rate limiting**: API calls without proper throttling
- **Build artifacts committed**: Any `lib/` directories in version control
- **Inconsistent error handling**: Not using utilities error handling patterns
