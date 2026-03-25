---
description: "Core development workflow and TDD patterns - always applied"
globs: ["**/*.ts", "**/*.js", "**/*.json"]
alwaysApply: true
---

# Development Workflow

## Monorepo Structure

### Package Organization
This modularized CLI has 6 packages under `packages/`:

1. **contentstack** - Main CLI package
   - Entry point: `bin/run.js`
   - Aggregates all plugins
   
2. **contentstack-auth** - Authentication plugin
   - Commands: `cm:auth:*`
   - Handles login/logout flows
   
3. **contentstack-config** - Configuration plugin
   - Commands: `cm:config:*`, `cm:region:*`, etc.
   - Manages CLI settings and preferences
   
4. **contentstack-command** - Base Command class (library)
   - Shared Command base for all plugins
   - Utilities and helpers for command development
   
5. **contentstack-utilities** - Utilities library
   - Shared helpers and utilities
   - Used by all packages
   
6. **contentstack-dev-dependencies** - Dev dependencies
   - Centralized development dependencies

### pnpm Workspace Configuration
```json
{
  "workspaces": ["packages/*"]
}
```

### Development Commands
```bash
# Install dependencies for all packages
pnpm install

# Run command across all packages
pnpm -r --filter './packages/*' <command>

# Work on specific package
cd packages/contentstack-config
pnpm test
```

## TDD Workflow - MANDATORY

1. **RED** → Write ONE failing test in `test/unit/**/*.test.ts`
2. **GREEN** → Write minimal code in `src/` to pass
3. **REFACTOR** → Improve code quality while keeping tests green

### Test-First Examples
```typescript
// ✅ GOOD - Write test first
describe('ConfigService', () => {
  it('should load configuration', async () => {
    // Arrange - Set up mocks
    const mockConfig = { region: 'us', alias: 'default' };
    
    // Act - Call the method
    const result = await configService.load();
    
    // Assert - Verify behavior
    expect(result).to.deep.equal(mockConfig);
  });
});
```

## Critical Rules

### Testing Standards
- **NO implementation before tests** - Test-driven development only
- **Mock all external dependencies** - No real API calls in tests
- **Use Mocha + Chai** - Standard testing stack
- **Coverage aspiration**: 80% minimum

### Code Quality
- **TypeScript configuration**: Varies by package
- **NO test.skip or .only in commits** - Clean test suites only
- **Proper error handling** - Clear error messages

### Build Process
```bash
# Standard build process for each package
pnpm run build    # tsc compilation + oclif manifest
pnpm run test     # Run test suite
pnpm run lint     # ESLint checks
```

## Package-Specific Patterns

### Plugin Packages (auth, config)
- Have `oclif.commands` in `package.json`
- Commands in `src/commands/cm/**/*.ts`
- Built commands in `lib/commands/`
- Extend `@oclif/core` Command class
- Script: `build`: compiles TypeScript, generates OCLIF manifest and README

### Library Packages (command, utilities, dev-dependencies)
- No OCLIF commands configuration
- Pure TypeScript/JavaScript libraries
- Consumed by other packages
- `main` points to `lib/index.js`

### Main CLI Package (contentstack)
- Entry point through `bin/run.js`
- Aggregates plugin commands
- Package dependencies reference plugin packages

## Script Conventions

### Build Scripts
```json
{
  "build": "pnpm compile && oclif manifest && oclif readme",
  "compile": "tsc -b tsconfig.json",
  "prepack": "pnpm compile && oclif manifest && oclif readme",
  "test": "mocha \"test/unit/**/*.test.ts\"",
  "lint": "eslint src/**/*.ts"
}
```

### Key Build Steps
1. **compile** - TypeScript compilation to `lib/`
2. **oclif manifest** - Generate command manifest for discovery
3. **oclif readme** - Generate command documentation

## Quick Reference

For detailed patterns, see:
- `@testing` - Mocha, Chai test patterns
- `@oclif-commands` - Command structure and validation
- `@dev-workflow` (this document) - Monorepo workflow and TDD

## Development Checklist

### Before Starting Work
- [ ] Identify target package in `packages/`
- [ ] Check existing tests in `test/unit/`
- [ ] Understand command structure if working on commands
- [ ] Set up proper TypeScript configuration

### During Development
- [ ] Write failing test first
- [ ] Implement minimal code to pass
- [ ] Mock external dependencies
- [ ] Follow naming conventions (kebab-case files, PascalCase classes)

### Before Committing
- [ ] All tests pass: `pnpm test`
- [ ] No `.only` or `.skip` in test files
- [ ] Build succeeds: `pnpm run build`
- [ ] TypeScript compilation clean
- [ ] Proper error handling implemented

## Common Patterns

### Service/Class Architecture
```typescript
// ✅ GOOD - Separate concerns
export default class ConfigCommand extends Command {
  static description = 'Manage CLI configuration';
  
  async run(): Promise<void> {
    try {
      const service = new ConfigService();
      await service.execute();
      this.log('Configuration updated successfully');
    } catch (error) {
      this.error('Configuration update failed');
    }
  }
}
```

### Error Handling
```typescript
// ✅ GOOD - Clear error messages
try {
  await this.performAction();
} catch (error) {
  if (error instanceof ValidationError) {
    this.error(`Invalid input: ${error.message}`);
  } else {
    this.error('Operation failed');
  }
}
```

## CI/CD Integration

### GitHub Actions
- Uses workflow files in `.github/workflows/`
- Runs linting, tests, and builds on pull requests
- Enforces code quality standards

### Pre-commit Hooks
- Husky integration for pre-commit checks
- Prevents commits with linting errors
- Located in `.husky/`
