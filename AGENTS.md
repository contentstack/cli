# Contentstack CLI – Agent guide

**Universal entry point** for contributors and AI agents. Detailed conventions live in **`skills/*/SKILL.md`**.

## What this repo is

| Field | Detail |
| --- | --- |
| **Name:** | Contentstack CLI (pnpm monorepo; root package name `csdx`) |
| **Purpose:** | Command-line tool and plugins to manage Contentstack stacks (auth, import/export, bulk operations, and related workflows). |
| **Out of scope (if any):** | Individual plugin packages may scope their own features; see each package under `packages/`. |

## Tech stack (at a glance)

| Area | Details |
| --- | --- |
| **Language** | TypeScript / JavaScript, Node **>= 18** (`engines` in root `package.json`) |
| **Build** | pnpm workspaces (`packages/*`); per package: `tsc`, OCLIF manifest/readme where applicable → `lib/` |
| **Tests** | Mocha + Chai; patterns under `packages/*/test/` (see [skills/testing/SKILL.md](skills/testing/SKILL.md)) |
| **Lint / coverage** | ESLint per package (`src/**/*.ts`); nyc where configured for coverage |
| **Other** | OCLIF v4, Husky |

## Commands (quick reference)

| Command type | Command |
| --- | --- |
| **Build** | `pnpm build` |
| **Test** | `pnpm test` |
| **Lint** | `pnpm lint` |

CI: [.github/workflows/unit-test.yml](.github/workflows/unit-test.yml), [.github/workflows/lint.yml](.github/workflows/lint.yml), and other workflows under [.github/workflows/](.github/workflows/).

## Where the documentation lives: skills

| Skill | Path | What it covers |
| --- | --- | --- |
| Development workflow | [skills/dev-workflow/SKILL.md](skills/dev-workflow/SKILL.md) | pnpm workspace commands, CI, TDD expectations, PR checklist |
| Contentstack CLI | [skills/contentstack-cli/SKILL.md](skills/contentstack-cli/SKILL.md) | OCLIF commands, plugins, integration patterns |
| Framework | [skills/framework/SKILL.md](skills/framework/SKILL.md) | Utilities, config, logging, errors |
| Testing | [skills/testing/SKILL.md](skills/testing/SKILL.md) | Mocha/Chai, coverage, mocks |
| Code review | [skills/code-review/SKILL.md](skills/code-review/SKILL.md) | PR review for this monorepo |

## Using Cursor (optional)

If you use **Cursor**, [.cursor/rules/README.md](.cursor/rules/README.md) only points to **`AGENTS.md`**—same docs as everyone else.
