# Cursor Rules

Context-aware rules that load automatically based on the files you're editing, optimized for this modularized Contentstack CLI.

## Rule Files

| File | Scope | Always Applied | Purpose |
|------|-------|----------------|---------|
| `dev-workflow.md` | `**/*.ts`, `**/*.js`, `**/*.json` | Yes | Monorepo TDD workflow, pnpm workspace patterns (6 packages) |
| `typescript.mdc` | `**/*.ts`, `**/*.tsx` | No | TypeScript configurations and naming conventions |
| `testing.mdc` | `**/test/**/*.ts`, `**/test/**/*.js`, `**/__tests__/**/*.ts`, `**/*.spec.ts`, `**/*.test.ts` | Yes | Mocha, Chai test patterns and test structure |
| `oclif-commands.mdc` | `**/commands/**/*.ts`, `**/base-command.ts` | No | OCLIF command patterns and CLI validation |
| `contentstack-core.mdc` | `packages/contentstack/src/**/*.ts`, `packages/contentstack/src/**/*.js` | No | Core package plugin aggregation, hooks, and entry point patterns |

## Commands

| File | Trigger | Purpose |
|------|---------|---------|
| `execute-tests.md` | `/execute-tests` | Run tests by scope, package, or module with monorepo awareness |
| `code-review.md` | `/code-review` | Automated PR review with CLI-specific checklist |

## Loading Behaviour

### File Type Mapping
- **TypeScript files** → `typescript.mdc` + `dev-workflow.md`
- **Command files** (`packages/*/src/commands/**/*.ts`) → `oclif-commands.mdc` + `typescript.mdc` + `dev-workflow.md`
- **Base command files** (`packages/*/src/base-command.ts`) → `oclif-commands.mdc` + `typescript.mdc` + `dev-workflow.md`
- **Core package files** (`packages/contentstack/src/**/*.ts`) → `contentstack-core.mdc` + `typescript.mdc` + `dev-workflow.md`
- **Test files** (`packages/*/test/**/*.{ts,js}`) → `testing.mdc` + `dev-workflow.md`
- **Utility files** (`packages/*/src/utils/**/*.ts`) → `typescript.mdc` + `dev-workflow.md`

### Package-Specific Loading
- **Plugin packages** (with `oclif.commands`) → Full command and utility rules
- **Library packages** → TypeScript and utility rules only

## Repository-Specific Features

### Monorepo Structure
- **6 packages** under `packages/`:
  - `contentstack` - Main CLI entry point (bin/run.js)
  - `contentstack-auth` - Authentication plugin
  - `contentstack-config` - Configuration plugin
  - `contentstack-command` - Base Command class for plugins
  - `contentstack-utilities` - Shared utilities and helpers
  - `contentstack-dev-dependencies` - Development dependencies

### Build Configuration
- **pnpm workspaces** configuration
- **Shared dependencies**: `@contentstack/cli-command`, `@contentstack/cli-utilities`
- **Build process**: TypeScript compilation → `lib/` directories
- **OCLIF manifest** generation for command discovery

### Actual Patterns Detected
- **Testing**: Mocha + Chai (not Jest or Sinon-heavy)
- **TypeScript**: Mixed strict mode adoption
- **Commands**: Extend `@oclif/core` Command class
- **Build artifacts**: `lib/` directories (excluded from rules)

## Performance Benefits

- **Lightweight loading** - Only relevant rules activate based on file patterns
- **Precise glob patterns** - Avoid loading rules for build artifacts
- **Context-aware** - Rules load based on actual file structure

## Design Principles

### Validated Against Codebase
- Rules reflect **actual patterns** found in repository
- Glob patterns match **real file structure**
- Examples use **actual dependencies** and APIs

### Lightweight and Focused
- Each rule has **single responsibility**
- Package-specific variations acknowledged
- `alwaysApply: true` only for truly universal patterns

## Quick Reference

For detailed patterns:
- **Testing**: See `testing.mdc` for Mocha/Chai test structure
- **Commands**: See `oclif-commands.mdc` for command development
- **Core Package**: See `contentstack-core.mdc` for plugin aggregation and hook patterns
- **Development**: See `dev-workflow.md` for TDD and monorepo workflow
- **TypeScript**: See `typescript.mdc` for type safety patterns
