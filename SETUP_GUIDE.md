# Contentstack CLI - Repository Setup Guide

This guide provides step-by-step instructions to set up the Contentstack CLI repository for development.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Development Workflow](#development-workflow)
4. [Project Structure](#project-structure)
5. [Building & Testing](#building--testing)
6. [Common Tasks](#common-tasks)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- **Node.js**: Version 18.0.0 or higher
  - Check version: `node --version`
  - Download: [nodejs.org](https://nodejs.org/)
  
- **pnpm**: Version 7.33.7 or higher (package manager)
  - Install globally: `npm install -g pnpm@^7.33.7`
  - Verify: `pnpm --version`

- **Git**: For version control
  - Verify: `git --version`

### Optional but Recommended
- **VS Code** or your preferred IDE
- **GitHub CLI** (gh) for easier repository management

## Initial Setup

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd cli
```

### Step 2: Clean Existing Installation (if any)
If you're setting up on a machine that previously had the repo installed:
```bash
npm run clean-repo
```

This removes:
- `node_modules` directories
- `package-lock.json` files
- Build artifacts

### Step 3: Install Dependencies

**Option A: Full Setup (Recommended for first-time setup)**
```bash
npm run setup-repo
```

This command:
1. Cleans the repository
2. Clears npm cache
3. Prunes pnpm store
4. Installs npm dependencies
5. Generates package-lock.json
6. Cleans packages
7. Installs all package dependencies with pnpm
8. Prepacks all packages

**Option B: Quick Setup (if you've run setup-repo before)**
```bash
pnpm install
```

### Step 4: Verify Installation
```bash
# Check if all packages are installed
pnpm list --depth=0

# Verify the CLI can be built
pnpm --filter "./packages/*" -w prepack
```

## Development Workflow

### Running Commands Locally

The CLI uses a development mode that links packages locally:

```bash
# From the root directory
cd packages/contentstack/bin
node dev.js <command>

# Example: Run auth:login
node dev.js auth:login

# Example: Run import command
node dev.js cm:stacks:import --help
```

### Working with Individual Packages

Each package can be developed independently:

```bash
# Navigate to a specific package
cd packages/contentstack-import

# Install dependencies for this package only
pnpm install

# Run tests for this package
pnpm test

# Build this package
pnpm prepack
```

### Linking for Global Use (Optional)

To use your local development version globally:

```bash
# From root directory
pnpm link --global

# Or link a specific package
cd packages/contentstack
pnpm link --global
```

## Project Structure

```
cli/
├── packages/                    # All CLI packages (monorepo)
│   ├── contentstack/           # Main CLI package
│   ├── contentstack-auth/      # Authentication commands
│   ├── contentstack-import/    # Import functionality
│   ├── contentstack-export/    # Export functionality
│   ├── contentstack-bulk-publish/ # Bulk publish commands
│   ├── contentstack-seed/      # Seed stack from GitHub
│   ├── contentstack-migration/ # Migration scripts
│   ├── contentstack-utilities/ # Shared utilities
│   └── ...                     # Other packages
├── package.json                # Root package.json
├── pnpm-workspace.yaml         # pnpm workspace config
├── tsconfig.json               # Root TypeScript config
└── README.md                   # Main documentation
```

### Package Structure (Example)
```
packages/contentstack-import/
├── src/                        # Source code
│   ├── commands/              # CLI commands
│   ├── import/                 # Core import logic
│   ├── types/                  # TypeScript types
│   └── utils/                  # Utility functions
├── test/                       # Test files
├── bin/                        # Binary entry points
├── package.json                # Package configuration
└── tsconfig.json               # TypeScript config
```

## Building & Testing

### Building All Packages
```bash
# Build all packages
pnpm --filter "./packages/*" -w prepack

# Build a specific package
cd packages/contentstack-import
pnpm prepack
```

### Running Tests

**Run all tests:**
```bash
# From root (if test script exists)
pnpm test

# Or run tests for each package individually
cd packages/contentstack-import
pnpm test
```

**Run tests for a specific package:**
```bash
cd packages/contentstack-auth
pnpm test
```

### Type Checking
```bash
# Check TypeScript types across all packages
pnpm --filter "./packages/*" -w exec tsc --noEmit
```

## Common Tasks

### Adding a New Package
1. Create directory: `packages/your-package-name/`
2. Initialize package.json with proper structure
3. Add to `pnpm-workspace.yaml` (already includes `packages/*`)
4. Install dependencies: `pnpm install`

### Updating Dependencies
```bash
# Update all dependencies
pnpm update

# Update a specific package dependency
cd packages/contentstack-import
pnpm update <package-name>

# Update pnpm lockfile
pnpm install
```

### Cleaning the Repository
```bash
# Clean all packages
npm run clean

# Deep clean (removes node_modules, lockfiles)
npm run clean-repo

# Clear pnpm cache
pnpm store prune
```

### Git Hooks
The repository uses Husky for git hooks:
```bash
# Setup git hooks (runs automatically on npm install)
npm run prepare

# Pre-commit hook runs automatically
# It's configured in .husky/pre-commit
```

## Environment Variables

Some packages may require environment variables. Check package-specific README files:

```bash
# Example: contentstack-auth
cd packages/contentstack-auth
cat env.example  # Check example environment variables
```

## Development Best Practices

### 1. Code Style
- Follow existing code patterns in each package
- TypeScript packages should use strict mode
- JavaScript packages should follow ESLint rules

### 2. Testing
- Write tests for new features
- Run tests before committing
- Ensure all tests pass before creating PR

### 3. Commits
- Use conventional commit messages
- Follow the existing commit message format
- Pre-commit hooks will run automatically

### 4. Package Dependencies
- Use workspace dependencies when possible: `"@contentstack/cli-utilities": "workspace:*"`
- Keep dependencies up to date
- Use exact versions for critical dependencies

## Troubleshooting

### Issue: pnpm install fails
**Solution:**
```bash
# Clear pnpm cache
pnpm store prune

# Remove node_modules and reinstall
npm run clean-repo
pnpm install
```

### Issue: TypeScript errors
**Solution:**
```bash
# Rebuild TypeScript
pnpm --filter "./packages/*" -w exec tsc --build --clean
pnpm --filter "./packages/*" -w exec tsc --build
```

### Issue: Command not found after linking
**Solution:**
```bash
# Ensure global bin directory is in PATH
echo $PATH | grep -q "$(pnpm config get prefix)/bin"

# Or use npx
npx csdx <command>
```

### Issue: Workspace dependencies not resolving
**Solution:**
```bash
# Reinstall all dependencies
npm run clean-repo
pnpm install
```

### Issue: Build fails
**Solution:**
```bash
# Clean and rebuild
npm run clean
pnpm --filter "./packages/*" -w prepack
```

## Quick Reference Commands

```bash
# Setup (first time)
npm run setup-repo

# Daily development
pnpm install                    # Install/update dependencies
pnpm --filter "./packages/*" -w prepack  # Build all packages

# Testing
cd packages/<package-name>
pnpm test

# Cleaning
npm run clean                   # Clean build artifacts
npm run clean-repo              # Deep clean everything

# Development
cd packages/contentstack/bin
node dev.js <command>          # Run CLI command in dev mode
```

## Next Steps

1. **Read Package READMEs**: Each package has its own README with specific documentation
2. **Explore Commands**: Run `node dev.js --help` to see available commands
3. **Check Examples**: Look in `packages/*/examples/` for usage examples
4. **Review Tests**: Check `packages/*/test/` to understand expected behavior

## Additional Resources

- [Main README](./README.md) - General CLI documentation
- [Package READMEs](./packages/*/README.md) - Package-specific docs
- [Contentstack Docs](https://www.contentstack.com/docs/developers/cli) - Official CLI documentation
- [pnpm Workspaces](https://pnpm.io/workspaces) - pnpm workspace documentation

## Support

For issues or questions:
1. Check existing GitHub issues
2. Review package-specific README files
3. Consult the main documentation
4. Create a new issue if needed

