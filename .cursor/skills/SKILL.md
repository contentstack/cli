---
name: contentstack-cli-skills
description: Collection of project-specific skills for Contentstack CLI monorepo development. Use when working with CLI commands, testing, framework utilities, or reviewing code changes.
---

# Contentstack CLI Skills

Project-specific skills for the pnpm monorepo containing 6 CLI packages.

## Skills Overview

| Skill | Purpose | Trigger |
|-------|---------|---------|
| **testing** | Testing patterns, TDD workflow, and test automation for CLI development | When writing tests or debugging test failures |
| **framework** | Core utilities, configuration, logging, and framework patterns | When working with utilities, config, or error handling |
| **contentstack-cli** | CLI commands, OCLIF patterns, authentication and configuration workflows | When implementing commands or integrating APIs |
| **code-review** | PR review guidelines and monorepo-aware checks | When reviewing code or pull requests |

## Quick Links

- **[Testing Skill](./testing/SKILL.md)** — TDD patterns, test structure, mocking strategies
- **[Framework Skill](./framework/SKILL.md)** — Utilities, configuration, logging, error handling
- **[Contentstack CLI Skill](./contentstack-cli/SKILL.md)** — Command development, API integration, auth/config patterns
- **[Code Review Skill](./code-review/SKILL.md)** — Review checklist with monorepo awareness

## Repository Context

- **Monorepo**: 6 pnpm workspace packages under `packages/`
- **Tech Stack**: TypeScript, OCLIF v4, Mocha+Chai, pnpm workspaces
- **Packages**: `@contentstack/cli` (main), `@contentstack/cli-auth`, `@contentstack/cli-config`, `@contentstack/cli-command`, `@contentstack/cli-utilities`, `@contentstack/cli-dev-dependencies`
- **Build**: TypeScript → `lib/` directories, OCLIF manifest generation
