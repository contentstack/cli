---
name: execute-tests
description: Run tests by scope, file, or module with intelligent filtering for this pnpm monorepo
---

# Execute Tests Command

## Usage Patterns

### Monorepo-Wide Testing
- `/execute-tests` - Run all tests across all packages
- `/execute-tests --coverage` - Run all tests with coverage reporting
- `/execute-tests --parallel` - Run package tests in parallel using pnpm

### Package-Specific Testing
- `/execute-tests contentstack-config` - Run tests for config package
- `/execute-tests contentstack-auth` - Run tests for auth package
- `/execute-tests contentstack-command` - Run tests for command package
- `/execute-tests contentstack-utilities` - Run tests for utilities package
- `/execute-tests packages/contentstack-config/` - Run tests using path

### Scope-Based Testing
- `/execute-tests unit` - Run unit tests only (`test/unit/**/*.test.ts`)
- `/execute-tests commands` - Run command tests (`test/unit/commands/**/*.test.ts`)
- `/execute-tests services` - Run service layer tests

### File Pattern Testing
- `/execute-tests *.test.ts` - Run all TypeScript tests
- `/execute-tests test/unit/commands/` - Run tests for specific directory

### Watch and Development
- `/execute-tests --watch` - Run tests in watch mode with file monitoring
- `/execute-tests --debug` - Run tests with debug output enabled
- `/execute-tests --bail` - Stop on first test failure

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
/execute-tests --coverage

# Test specific package during development
/execute-tests contentstack-config --watch

# Run only command tests across all packages
/execute-tests commands

# Run unit tests with detailed output
/execute-tests --debug

# Test until first failure (quick feedback)
/execute-tests --bail
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
- Respects individual package `.mocharc.json` configurations
- Handles TypeScript compilation via ts-node/register
- Supports test helpers and initialization files
- Manages timeout settings per package (default 30 seconds)

### Test Configuration
```json
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
/execute-tests --watch
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
/execute-tests --coverage

# Coverage output location
coverage/
├── index.html          # HTML report
├── coverage-summary.json # JSON summary
└── lcov.info          # LCOV format
```

### Coverage Goals
- **Team aspiration**: 80% minimum coverage
- **Focus on**: Critical business logic and error paths
- **Not critical**: Utility functions and edge cases
