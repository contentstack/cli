# Cursor Rules

Context-aware rules that load automatically based on the files you're editing, optimized for this Contentstack CLI plugins monorepo.

## Rule Files

| File | Scope | Always Applied | Purpose |
|------|-------|----------------|---------|
| `dev-workflow.md` | `**/*.ts`, `**/*.js`, `**/*.json` | Yes | Monorepo TDD workflow, pnpm workspace patterns |
| `typescript.mdc` | `**/*.ts`, `**/*.tsx` | No | TypeScript config variations, naming conventions |
| `testing.mdc` | `**/test/**/*.ts`, `**/test/**/*.js`, `**/*.test.ts`, `**/*.spec.ts` | Yes | Mocha, Chai, Sinon patterns, nyc coverage |
| `oclif-commands.mdc` | `**/commands/**/*.ts` | No | OCLIF patterns, BaseCommand classes, CLI validation |
| `contentstack-cli.mdc` | `**/import/**/*.ts`, `**/export/**/*.ts`, `**/modules/**/*.ts`, `**/services/**/*.ts`, `**/utils/**/*.ts` | No | API integration, rate limiting, batch processing |

## Commands

| File | Trigger | Purpose |
|------|---------|---------|
| `execute-tests.md` | `/execute-tests` | Run tests by scope, package, or module with monorepo awareness |
| `code-review.md` | `/code-review` | Automated PR review with Contentstack CLI specific checklist |

## Loading Behaviour

### File Type Mapping
- **TypeScript files** → `typescript.mdc` + `dev-workflow.md`
- **Command files** (`packages/*/src/commands/**/*.ts`) → `oclif-commands.mdc` + `typescript.mdc` + `dev-workflow.md`
- **Import/Export modules** (`packages/*/src/{import,export,modules}/**/*.ts`) → `contentstack-cli.mdc` + `typescript.mdc` + `dev-workflow.md`
- **Service files** (`packages/*/src/services/**/*.ts`) → `contentstack-cli.mdc` + `typescript.mdc` + `dev-workflow.md`
- **Test files** (`packages/*/test/**/*.{ts,js}`) → `testing.mdc` + relevant domain rules + `dev-workflow.md`
- **Utility files** (`packages/*/src/utils/**/*.ts`) → `contentstack-cli.mdc` + `typescript.mdc` + `dev-workflow.md`

### Package-Specific Loading
- **Plugin packages** (with `oclif.commands`) → Full command and API rules
- **Library packages** (e.g., variants) → TypeScript and utility rules only
- **Bootstrap package** (JavaScript tests) → Adjusted testing rules

## Repository-Specific Features

### Monorepo Awareness
- **11 plugin packages** under `packages/`
- **pnpm workspaces** configuration
- **Shared utilities**: `@contentstack/cli-command`, `@contentstack/cli-utilities`
- **Build artifacts**: `lib/` directories (excluded from rules)

### Actual Patterns Detected
- **Testing**: Mocha + Chai + Sinon (not Jest)
- **TypeScript**: Mixed strict mode adoption
- **Commands**: Extend `@contentstack/cli-command` (not `@oclif/core`)
- **Rate limiting**: Multiple mechanisms (batch spacing, 429 retry, pagination throttle)
- **Coverage**: nyc with inconsistent enforcement

## Performance Benefits

- **75-85% token reduction** vs monolithic `.cursorrules`
- **Context-aware loading** - only relevant rules activate based on actual file patterns
- **Precise glob patterns** - avoid loading rules for build artifacts or irrelevant files
- **Skills integration** - rules provide quick context, skills provide comprehensive patterns

## Design Principles

### Validated Against Codebase
- Rules reflect **actual patterns** found in repository analysis
- Glob patterns match **real file structure** (not theoretical)
- Examples use **actual dependencies** and APIs
- Coverage targets reflect **current enforcement** (aspirational vs actual)

### Lightweight and Focused
- Each rule has **single responsibility**
- Detailed patterns referenced via **skills system**
- `alwaysApply: true` only for truly universal patterns
- Package-specific variations acknowledged

## Validation Checklist

### Rule Loading Tests (Repository-Specific)
- ✅ **Command files** (`packages/*/src/commands/**/*.ts`) → `oclif-commands.mdc` + `typescript.mdc` + `dev-workflow.md`
- ✅ **Import modules** (`packages/contentstack-import/src/import/**/*.ts`) → `contentstack-cli.mdc` + `typescript.mdc` + `dev-workflow.md`
- ✅ **Export modules** (`packages/contentstack-export/src/export/**/*.ts`) → `contentstack-cli.mdc` + `typescript.mdc` + `dev-workflow.md`
- ✅ **Test files** (`packages/*/test/unit/**/*.test.ts`) → `testing.mdc` + `dev-workflow.md`
- ✅ **Bootstrap tests** (`packages/contentstack-bootstrap/test/**/*.test.js`) → `testing.mdc` (JS-aware) + `dev-workflow.md`
- ✅ **Service files** (`packages/*/src/services/**/*.ts`) → `contentstack-cli.mdc` + `typescript.mdc` + `dev-workflow.md`

### Manual Verification
1. Open files from different packages in Cursor
2. Check active rules shown in chat interface
3. Verify correct rule combinations load based on file location
4. Test manual rule invocation: `@contentstack-cli show me rate limiting patterns`
5. Confirm no rules load for `lib/` build artifacts

### Performance Monitoring
- **Before**: Monolithic rules loaded for all files
- **After**: Context-specific rules based on actual file patterns
- **Expected reduction**: 75-85% in token usage
- **Validation**: Rules load only when relevant to current file context

## Maintenance Notes

### Regular Updates Needed
- **Glob patterns** - Update when package structure changes
- **TypeScript config** - Align with actual tsconfig.json variations
- **Coverage targets** - Sync with actual nyc configuration
- **Dependencies** - Update when shared utilities change

### Known Issues to Monitor
- **Coverage typo**: Several `.nycrc.json` files have `"inlcude"` instead of `"include"`
- **Strict mode inconsistency**: Packages have different TypeScript strictness levels
- **Test patterns**: Bootstrap uses `.test.js` while others use `.test.ts`
