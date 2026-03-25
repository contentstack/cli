---
description: "Core development workflow and TDD patterns - always applied"
globs: ["**/*.ts", "**/*.js", "**/*.json"]
alwaysApply: true
---

# Development Workflow

## Monorepo Structure

### Package Organization
- **11 plugin packages** under `packages/`
- **pnpm workspaces** with `workspaces: ["packages/*"]`
- **Shared dependencies**: `@contentstack/cli-command`, `@contentstack/cli-utilities`
- **Build artifacts**: `lib/` directory (compiled from `src/`)

### Development Commands
```bash
# Install dependencies for all packages
pnpm install

# Run command across all packages
pnpm -r --filter './packages/*' <command>

# Work on specific package
cd packages/contentstack-import
pnpm test
```

## TDD Workflow - MANDATORY

1. **RED** → Write ONE failing test in `test/unit/**/*.test.ts`
2. **GREEN** → Write minimal code in `src/` to pass
3. **REFACTOR** → Improve code quality while keeping tests green

### Test-First Examples
```typescript
// ✅ GOOD - Write test first
describe('ImportService', () => {
  it('should import content types', async () => {
    // Arrange - Set up mocks
    mockStackClient.contentType.returns({
      create: sinon.stub().resolves({ uid: 'ct-uid' })
    });

    // Act - Call the method
    const result = await importService.importContentTypes();

    // Assert - Verify behavior
    expect(result.success).to.be.true;
    expect(mockStackClient.contentType).to.have.been.called;
  });
});
```

## Critical Rules

### Testing Standards
- **NO implementation before tests** - Test-driven development only
- **Coverage aspiration**: 80% minimum (not uniformly enforced)
- **Mock all external dependencies** - No real API calls in tests
- **Use Mocha + Chai + Sinon** - Standard testing stack

### Code Quality
- **TypeScript configuration**: Varies by package (strict mode aspirational)
- **NO test.skip or .only in commits** - Clean test suites only
- **Proper error handling** - Use `handleAndLogError` from utilities

### Build Process
```bash
# Standard build process
pnpm run build    # tsc compilation
pnpm run test     # Run test suite
oclif manifest    # Generate OCLIF manifest
```

## Package-Specific Patterns

### Plugin Packages
- Have `oclif.commands` in `package.json`
- Commands in `src/commands/cm/**/*.ts`
- Built commands in `lib/commands/`
- Extend `@contentstack/cli-command`

### Library Packages (e.g., variants)
- No OCLIF commands configuration
- Pure TypeScript libraries
- Consumed by other packages
- `main` points to `lib/index.js`

## Quick Reference

For detailed patterns, see skills:
- `@skills/testing` - Mocha, Chai, Sinon patterns and TDD workflow
- `@skills/contentstack-cli` - API integration, rate limiting, authentication
- `@skills/oclif-commands` - Command structure, base classes, validation

## Development Checklist

### Before Starting Work
- [ ] Identify target package in `packages/`
- [ ] Check existing tests in `test/unit/`
- [ ] Understand command structure if working on commands
- [ ] Set up proper TypeScript configuration

### During Development
- [ ] Write failing test first
- [ ] Implement minimal code to pass
- [ ] Mock external dependencies (SDK, file system, etc.)
- [ ] Use proper error handling patterns
- [ ] Follow naming conventions (kebab-case files, PascalCase classes)

### Before Committing
- [ ] All tests pass: `pnpm test`
- [ ] No `.only` or `.skip` in test files
- [ ] Build succeeds: `pnpm run build`
- [ ] TypeScript compilation clean
- [ ] Proper error handling implemented

## Common Patterns

### Service Layer Architecture
```typescript
// ✅ GOOD - Separate concerns
export default class ImportCommand extends Command {
  async run(): Promise<void> {
    const config = this.buildConfig();
    const service = new ImportService(config);
    
    try {
      await service.execute();
      this.log('Import completed successfully');
    } catch (error) {
      handleAndLogError(error);
    }
  }
}
```

### Rate Limiting Compliance
```typescript
// ✅ GOOD - Respect API limits
async processBatch(batch: Item[]): Promise<void> {
  const start = Date.now();
  await this.makeConcurrentCall(batch, this.processItem);
  await this.logMsgAndWaitIfRequired('Processing', start);
}
```
