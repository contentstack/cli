---
name: execute-tests
description: Run tests by scope, file, or module with intelligent filtering for this pnpm monorepo
---

# Execute Tests Command

## Usage Patterns

### Monorepo-Wide Testing
- `/execute-tests` - Run all tests across all packages
- `/execute-tests --coverage` - Run all tests with nyc coverage report
- `/execute-tests --parallel` - Run package tests in parallel using pnpm

### Package-Specific Testing
- `/execute-tests packages/contentstack-audit/` - Run tests for specific package
- `/execute-tests packages/contentstack-import/` - Run import package tests
- `/execute-tests packages/contentstack-export/` - Run export package tests
- `/execute-tests contentstack-migration` - Run tests by package name (shorthand)

### Scope-Based Testing
- `/execute-tests unit` - Run unit tests only (`test/unit/**/*.test.ts`)
- `/execute-tests commands` - Run command tests (`test/commands/**/*.test.ts`)
- `/execute-tests services` - Run service layer tests
- `/execute-tests modules` - Run import/export module tests

### File Pattern Testing
- `/execute-tests *.test.ts` - Run all TypeScript tests
- `/execute-tests *.test.js` - Run JavaScript tests (bootstrap package)
- `/execute-tests test/unit/services/` - Run tests for specific directory

### Watch and Development
- `/execute-tests --watch` - Run tests in watch mode with file monitoring
- `/execute-tests --debug` - Run tests with debug output enabled
- `/execute-tests --bail` - Stop on first test failure

## Intelligent Filtering

### Repository-Aware Detection
- **Test patterns**: Primarily `*.test.ts`, some `*.test.js` (bootstrap), rare `*.spec.ts`
- **Directory structures**: `test/unit/`, `test/lib/`, `test/seed/`, `test/commands/`
- **Package variations**: Different test layouts per package
- **Build exclusion**: Ignores `lib/` directories (compiled artifacts)

### Monorepo Integration
- **pnpm workspace support**: Uses `pnpm -r --filter` for package targeting
- **Dependency awareness**: Understands package interdependencies
- **Parallel execution**: Leverages pnpm's parallel capabilities
- **Selective testing**: Can target specific packages or file patterns

### Framework Detection
- **Mocha configuration**: Respects `.mocharc.json` files per package
- **TypeScript compilation**: Handles `pretest: tsc -p test` scripts
- **Coverage integration**: Works with nyc configuration (`.nycrc.json`)
- **Test helpers**: Detects and includes test initialization files

## Execution Examples

### Common Workflows
```bash
# Run all tests with coverage
/execute-tests --coverage

# Test specific package during development
/execute-tests packages/contentstack-import/ --watch

# Run only unit tests across all packages
/execute-tests unit

# Test import/export modules specifically
/execute-tests modules --coverage

# Debug failing tests in audit package
/execute-tests packages/contentstack-audit/ --debug --bail
```

### Package-Specific Commands Generated
```bash
# For contentstack-import package
cd packages/contentstack-import && pnpm test

# For all packages with coverage
pnpm -r --filter './packages/*' run test:coverage

# For specific test file
cd packages/contentstack-export && npx mocha test/unit/export/modules/stack.test.ts
```

## Configuration Awareness

### Mocha Integration
- Respects individual package `.mocharc.json` configurations
- Handles TypeScript compilation via `ts-node/register`
- Supports test helpers and initialization files
- Manages timeout settings per package

### Coverage Integration
- Uses nyc for coverage reporting
- Respects `.nycrc.json` configurations (with typo detection)
- Generates HTML, text, and lcov reports
- Handles TypeScript source mapping

### pnpm Workspace Features
- Leverages workspace dependency resolution
- Supports filtered execution by package patterns
- Enables parallel test execution across packages
- Respects package-specific scripts and configurations
