---
name: dev-workflow
description: Branches, CI, pnpm workspace commands, PR expectations, and TDD workflow for the Contentstack CLI monorepo.
---

# Development workflow – Contentstack CLI

## When to use

- Before you run builds or tests across the workspace
- When wiring CI or interpreting `.github/workflows/`
- When following TDD expectations for a package under `packages/`

## Monorepo layout

Six packages under `packages/`:

| Package | Role |
| --- | --- |
| `contentstack` | Main CLI; entry `bin/run.js`; aggregates plugins |
| `contentstack-auth` | Authentication plugin (`cm:auth:*`) |
| `contentstack-config` | Configuration plugin (`cm:config:*`, regions, etc.) |
| `contentstack-command` | Shared base Command and helpers for plugins |
| `contentstack-utilities` | Shared helpers |
| `contentstack-dev-dependencies` | Centralized dev dependencies |

Workspaces: `packages/*` (see root `package.json`).

## Commands (root)

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install all workspace dependencies |
| `pnpm build` | `pnpm -r --filter './packages/*' run build` |
| `pnpm test` | `pnpm -r --filter './packages/*' run test` |
| `pnpm lint` | `pnpm -r --filter './packages/*' run lint` |
| `pnpm prepack` | `pnpm -r --filter './packages/*' run prepack` |

Run a command in one package: `pnpm --filter @contentstack/cli-auth test` (adjust package name).

## TDD expectations

1. **RED** — one failing test under `test/unit/**/*.test.ts` (or package’s test glob)
2. **GREEN** — minimal `src/` change to pass
3. **REFACTOR** — keep tests green

Do not commit `test.only` / `test.skip`. Target **80%** coverage where `nyc` is configured. Mock external APIs; no real API calls in unit tests.

## CI and hooks

- Workflows: [`.github/workflows/`](../../../.github/workflows/) — e.g. `unit-test.yml`, `lint.yml`, `release.yml`, `sca-scan.yml`, `policy-scan.yml`, `codeql-analysis.yml`
- Husky: [`.husky/`](../../../.husky/) for pre-commit hooks

## PR expectations

- Tests and build pass for affected packages
- No stray `.only` / `.skip` in tests
- Follow patterns in [testing](../testing/SKILL.md) and [code-review](../code-review/SKILL.md)
