---
name: resolve-snyk
description: >
  Resolve Snyk vulnerabilities for any GitHub repo. Clones the repo, runs a full audit
  (npm audit + snyk test + snyk code test), shows all findings, determines upgrade versions,
  edits package.json (direct deps + overrides for transitive deps), then does a single clean
  install → re-audit → build → commit/PR. Explicit user approval required before any file
  changes or destructive steps.
  Triggers on: /resolve-snyk, "resolve snyk", "fix snyk issues", "fix snyk vulnerabilities",
  "snyk fix for", "clean up snyk".
---

# /resolve-snyk Skill

Guides the user through a full Snyk vulnerability resolution cycle for a GitHub repo.
Never edit files, delete files, update dependencies, or run any install command without
explicit user approval first.

---

## Usage

When this skill activates, greet the user with this help block before doing anything else:

```
👋 /resolve-snyk — Snyk vulnerability resolver

How to use:
  /resolve-snyk <github-repo-url>     — start with a specific repo
  /resolve-snyk                       — I'll ask you for the repo URL

What I'll do:
  1. Preflight   — verify Snyk CLI + gh CLI are authenticated
  2. Clone       — clone the repo to a temp directory
  3. Audit       — run npm audit + snyk test + snyk code (full baseline)
  4. Plan        — show safe upgrades (patch/minor) and transitive overrides to apply
  5. Approve     — you pick which changes to apply (all / specific / none)
  6. Apply       — update package.json only (no install yet)
  7. Install     — delete lock file + node_modules, single clean install (your approval required)
  8. Re-audit    — before vs after comparison
  9. Build       — verify build still passes (hard gate before commit)
  10. PR         — commit + raise PR via gh (your approval required)
  11. Cleanup    — optionally delete the cloned temp directory

Options you'll be asked about along the way:
  • Which safe upgrades to apply    (all / list packages / none)
  • Which transitive overrides      (all / list packages / none)
  • Whether to bump the package version (patch / minor / no)
  • Confirm before deleting node_modules + lock file
  • Target branch for the PR       (defaults to main)

What I won't touch automatically:
  ✗ Major version bumps            — listed for awareness, never applied
  ✗ npm audit fix --force          — surfaced as a decision, never run
  ✗ Any file before you approve    — every destructive step requires confirmation

Requirements:
  snyk CLI    → npm install -g snyk && snyk auth
  gh CLI      → brew install gh && gh auth login
  Node.js     → nodejs.org
```

Only show this block once at the start. Then proceed to Step 1.

---

## Requirements

The following tools must be installed and authenticated on the machine before this skill
can run. If any are missing, stop and tell the user exactly what to install or configure.

| Tool | Purpose | Install | Auth |
|------|---------|---------|------|
| **Snyk CLI** | SCA + code scanning | `npm install -g snyk` | `snyk auth` |
| **GitHub CLI (`gh`)** | Raising PRs | `brew install gh` or [cli.github.com](https://cli.github.com) | `gh auth login` |
| **Node.js + npm** | Installing deps, running audits | [nodejs.org](https://nodejs.org) | — |
| **yarn** *(if repo uses it)* | Installing deps | `npm install -g yarn` | — |
| **pnpm** *(if repo uses it)* | Installing deps | `npm install -g pnpm` | — |
| **git** | Cloning, branching, committing | pre-installed on most systems | SSH or HTTPS access to the repo |

These are hard requirements — the skill cannot proceed without them.

> **Package manager support:** npm and pnpm are fully supported. For yarn repos, `npm audit`
> is used as a fallback (yarn audit outputs a different JSONL format); results are accurate
> but the audit command targets the npm registry endpoint directly rather than the yarn
> lockfile. Overrides are written as npm-style `overrides` for yarn repos (yarn v1 honours
> this; yarn berry uses `resolutions` — flag this to the user if the repo uses yarn berry).

---

## Step 1 — Preflight checks and GitHub URL

Before doing anything else, verify the required tools are present and authenticated:

```bash
snyk whoami 2>&1        # must succeed — if not, run `snyk auth` first
gh auth status 2>&1     # must succeed — if not, run `gh auth login` first
```

If either check fails, stop and tell the user exactly which tool needs authenticating.
Do not proceed until both pass.

If the user has not already provided a GitHub repo URL, ask for it.
Store it as `REPO_URL`.

---

## Step 2 — Clone, detect package manager, and install

```bash
REPO_DIR=$(mktemp -d)
git clone <REPO_URL> "$REPO_DIR"
```

**Detect the package manager** from the lock file present in the cloned repo:
- `package-lock.json` → use `npm`
- `yarn.lock` → use `yarn`
- `pnpm-lock.yaml` → use `pnpm`

Use the detected package manager for every install, audit, and outdated command throughout
the skill. If no lock file exists, default to `npm` and note this to the user.

Install dependencies so the audit scans have actual resolved packages to analyse:

```bash
# npm
cd "$REPO_DIR" && npm install

# yarn
cd "$REPO_DIR" && yarn

# pnpm
cd "$REPO_DIR" && pnpm install
```

> **Never use `--prefix` (npm) or `--cwd` / `--dir` flags for install commands.** These cause
> npm to embed absolute paths from the current working directory into `package-lock.json` instead
> of the standard `node_modules/…` relative keys. The resulting lockfile will fail Snyk CI scans
> and `npm ci` runs on any machine other than the one that generated it. Always `cd` into the
> repo directory first.

Confirm both the clone and install succeeded. Print the temp path.
If install fails, report the error and stop — do not proceed to the audit.

---

## Step 3 — Initial full audit (before any changes)

Run `audit-scan.mjs` and save its output as the baseline for later diff comparison:

```bash
node "$SKILL_DIR/scripts/audit-scan.mjs" "$REPO_DIR" > /tmp/snyk-baseline.json
```

Read `/tmp/snyk-baseline.json` and present a combined summary to the user:

### npm audit findings

Severity count table (`npmAudit.severityCounts`), then three groups:

**Minor/patch fix available** (`npmAudit.directPatch` + `npmAudit.directMinor`) — show exact safe version per package:

| Package | Current | Safe fix version | Severity | Title |
|---------|---------|-----------------|----------|-------|

**Requires major version bump** (`npmAudit.directMajor`) — list for awareness; never touch automatically:

| Package | Current | Major fix version | Severity | Title |
|---------|---------|------------------|----------|-------|

**Transitive only** (`npmAudit.transitiveOnly`) — NOT in `package.json`; addressed via overrides in Step 4b:

| Package | Current vulnerable range | Introduced via | Severity |
|---------|--------------------------|----------------|----------|

If a package has no fix, it appears in `npmAudit.noFix` — list it as "no fix available".

### Snyk SCA findings

Severity count table (`snykTest.severityCounts`). Vulns from `snykTest.vulns`, licenses from `snykTest.licenseIssues`.

### Snyk Code findings

Severity count table (`snykCode.severityCounts`). Each finding from `snykCode.findings`: file:line, severity, title, CWE.

> Note: Snyk Code findings are source-level static analysis — they will NOT change as a
> result of dependency updates. Do not expect them to move in the Step 9 re-audit.

If any scan returns no issues, say so clearly.

---

## Step 4a — Determine direct dependency upgrade candidates

Run `find-upgrades.mjs` passing the repo dir and the baseline audit file:

```bash
node "$SKILL_DIR/scripts/find-upgrades.mjs" "$REPO_DIR" /tmp/snyk-baseline.json > /tmp/snyk-upgrade-plan.json
```

Read `/tmp/snyk-upgrade-plan.json` and present two tables to the user:

**Safe upgrades (patch + minor)** from `safeUpgrades`:

| Package | Pin type | Current | Patch upgrade | Minor upgrade |
|---------|----------|---------|---------------|---------------|
| express | `^` range | 4.18.1 | 4.18.3 | 4.19.2 |
| lodash | exact | 4.17.19 | 4.17.21 | — |

**Requires major bump** from `majorUpgrades` — list for awareness only; never apply automatically:

| Package | Current | Major upgrade |
|---------|---------|---------------|
| react | 17.0.2 | 18.3.1 |

Ask the user:

> "Which of the safe (patch + minor) upgrades above would you like to apply?
> You can say 'all', list specific packages, or 'none'."

Wait for the answer before continuing.

---

## Step 4b — Handle transitive vulnerable deps via overrides

No additional command needed — `find-upgrades.mjs` (Step 4a) already wrote both `safeUpgrades`
and `transitiveOverrides` into `/tmp/snyk-upgrade-plan.json`. Read `transitiveOverrides` from
that same file. The script has already:
- Found the lowest non-deprecated safe version above the vulnerable range for each package
- Checked deprecation status via `npm view <pkg>@<ver> deprecated`
- Confirmed each version exists on npm

Present the overrides table to the user:

| Package | Current vulnerable | Override to | Deprecated? | Skip? | Introduced via |
|---------|--------------------|-------------|-------------|-------|----------------|
| undici  | <7.28.1           | 7.28.1      | No          | No    | some-framework  |

Before presenting the table, apply these three manual checks — the script does NOT catch all of them:

1. **Vulnerable range is `*`** — if `currentVulnerable` is `*`, every version of the package is
   flagged. Any override you pick is still inside the range and fixes nothing. Mark it SKIP and
   explain there is no safe version to pin.

2. **Override version falls inside the vulnerable range** — verify `overrideTo` is actually above
   (not inside) `currentVulnerable`. If the script resolved a version that is still within the
   range (e.g. the lowest available version on npm predates the CVE fix), mark it SKIP.

3. **Cross-major override conflicting with direct deps** — if the proposed `overrideTo` jumps
   to a different major version than what the project's direct deps already resolve to for that
   package, mark it SKIP. A cross-major override forces incompatible peer dep versions into the
   tree and often introduces *more* vulnerabilities than it removes. Check by comparing the
   major of `overrideTo` against the major already locked in `package-lock.json` for that
   package.

For any entry that is skipped (script `skip: true`, or caught by the checks above), flag it
clearly in the table with the reason — do not include it in the approved plan.

Ask the user:

> "These transitive deps will be added to the `overrides` field in `package.json`.
> Which would you like to apply? 'all', specific packages, or 'none'."

Wait for the answer before continuing.

---

## Step 4c — Package version bump

Ask the user:

> "Should I bump this package's own `version` field?
> Current: X.Y.Z — patch bump would be X.Y.(Z+1).
> Yes (patch) / yes (minor) / no?"

Wait for the answer before continuing.

---

## Step 5 — Apply all approved changes to package.json only

Only after all three questions in Steps 4a, 4b, and 4c are answered, build the approved
plan JSON and run `apply-upgrades.mjs`:

```bash
# Write the approved plan to a temp file, e.g.:
cat > /tmp/snyk-approved-plan.json << 'EOF'
{
  "directUpgrades": [
    { "package": "express",  "targetVersion": "^4.19.2" },
    { "package": "lodash",   "targetVersion": "4.17.21" }
  ],
  "overrides": [
    { "package": "undici", "targetVersion": "7.28.1" }
  ],
  "versionBump": "patch"
}
EOF

node "$SKILL_DIR/scripts/apply-upgrades.mjs" "$REPO_DIR" /tmp/snyk-approved-plan.json
```

The script handles:
- Exact-pinned packages → writes bare version (no prefix)
- Range-pinned packages → preserves original `^` or `~` prefix
- Overrides block created/merged in `package.json`
- Version field bumped atomically in the same pass

Read the JSON output from `apply-upgrades.mjs` and show the user a diff-style summary
of every change made (`changes` array: section, package, before, after).

**Do not run any install yet. Do not delete anything yet.**

---

## Step 6 — Approval gate: delete package-lock.json and node_modules

Ask the user:

> "`package.json` is fully updated. To get a clean, in-sync install I need to delete
> `package-lock.json` and `node_modules`, then run a fresh install.
>
> **Proceed? [yes/no]**"

Do NOT proceed until the user explicitly confirms.

---

## Step 7 — Single authoritative install

Only after approval:

```bash
rm "$REPO_DIR/package-lock.json"   # (or yarn.lock / pnpm-lock.yaml)
rm -rf "$REPO_DIR/node_modules"
cd "$REPO_DIR" && npm install      # (or yarn / pnpm equivalent)
```

This is the **only authoritative install** — the one that produces the committed lock file.
`package.json` was fully finalised in Step 5 before anything was deleted, so the resulting
lock file is guaranteed to be in sync with `package.json`.

**If install fails:**
- Identify the conflicting package from the error output.
- Roll back just that package's version in `package.json` (restore from `git diff`).
- Delete `node_modules` and the lock file again and retry once.
- If it still fails, stop and ask the user how to proceed.
- Do NOT add `--legacy-peer-deps` or `--force` without explicit user approval.

---

## Step 8 — Run npm audit fix

```bash
cd "$REPO_DIR" && npm audit fix      # (or yarn/pnpm equivalent)
```

> Note: `npm audit fix` only modifies `package-lock.json`, never `package.json`. Any changes
> it makes are captured when we stage the lock file in Step 11.

Show how many vulnerabilities were fixed and how many remain. If `--force` is the only
remaining option, tell the user — do NOT run it automatically.

---

## Step 9 — Full re-audit (npm audit + Snyk)

Run `audit-scan.mjs` again, passing the baseline for automatic diff computation:

```bash
node "$SKILL_DIR/scripts/audit-scan.mjs" "$REPO_DIR" --baseline /tmp/snyk-baseline.json > /tmp/snyk-reaudit.json
```

Read `/tmp/snyk-reaudit.json` and present the **before vs after comparison** from the
`diff` field (computed automatically by the script):

| Severity | Before | After | Fixed |
|----------|--------|-------|-------|
| High     | 15     | 4     | ✓ 11  |
| Moderate | 6      | 3     | ✓ 3   |
| Low      | 2      | 2     | —     |

For Snyk Code: show results separately with a note that findings are unchanged by design
(source-level analysis, not affected by dep updates).

List all still-remaining issues from `npmAudit` and `snykTest` with package and title so
the user knows what needs manual attention.

---

## Step 10 — Build verification (hard gate)

First check whether a `build` script exists in `package.json`:

```bash
node -e "const p=require('$REPO_DIR/package.json'); process.exit(p.scripts?.build ? 0 : 1);" 2>/dev/null \
  && echo "BUILD_SCRIPT=yes" || echo "BUILD_SCRIPT=no"
```

- If **no `build` script exists**: skip this step entirely. Note it to the user — this is
  normal for library packages or repos that build via a separate pipeline. Proceed to Step 11.

If a build script exists, run it using `cd`:

```bash
cd "$REPO_DIR" && npm run build 2>&1   # (or yarn build / pnpm build)
```

> Do NOT use `--prefix` with `npm run` — it does not work reliably for scripts.

- If the **build passes**: note any warnings (e.g. CommonJS bailout notices) but proceed.
  Warnings from pre-existing issues in third-party deps are not blockers.
- If the **build fails due to a missing env var** from a prebuild script: note this is a
  project configuration issue, not caused by the dep changes. Ask the user to confirm
  before proceeding anyway.
- If the **build fails with a real error**: stop immediately. Do NOT commit. Show the full
  error, identify which dep change likely caused it, and ask the user whether to roll back
  that package or investigate further.

---

## Step 11 — Commit and raise PR (approval gate)

Ask the user:

> "Build passed. Ready to commit and raise a PR?
> Suggested branch: `fix/snyk-patch-deps-YYYYMMDD` (today's date)
> Target branch: `main` — or specify another.
> **Proceed? [yes/no]**"

Only after approval:

1. `git checkout -b fix/snyk-patch-deps-YYYYMMDD`
2. Stage only `package.json` and the lock file — explicitly exclude any generated files
   (e.g. `dist/`, generated config files, `.env`) that the prebuild or build step created:
   ```bash
   git add package.json package-lock.json   # (or yarn.lock / pnpm-lock.yaml)
   ```
3. Commit — fill in actual numbers from Steps 4 and 9, not placeholder text:
   ```
   fix: bump N dependencies and add M overrides to resolve Snyk vulnerabilities

   Direct dep upgrades: [list packages + versions]
   Overrides added: [list transitive packages + versions]
   Package version: X.Y.Z → X.Y.(Z+1)
   Vuln count: N (before) → M (after). Build verified passing.
   ```
4. Push and raise PR via `gh pr create` with a body containing:
   - Table of direct dep changes (before → after)
   - Table of overrides added
   - Before/after vuln count table (from Step 9)
   - Remaining issues and why they need `--force` or manual intervention
   - Build status: passed

---

## Step 12 — Cleanup

Ask:

> "Done! The cloned repo is at `<REPO_DIR>`. Want me to delete it? [yes/no]"

If yes: `rm -rf "$REPO_DIR"`

---

## Important rules

- **Preflight first** — Snyk auth and `gh` auth must both pass before Step 2. Fail fast.
- **Steps 1–4 are fully read-only** — no file edits, no deletions, no installs beyond the
  initial scan install in Step 2.
- **Only one authoritative install** — `package.json` must be fully finalised (Steps 4a/4b/4c + 5)
  before deleting the lock file and `node_modules`. One wipe, one install, guaranteed sync.
- **Preserve range prefixes** — for `^`/`~` pinned packages, keep the prefix when writing
  the upgraded version back. Never silently change a flexible range to an exact pin.
- **Never touch major bumps automatically** — list them for awareness, never apply them.
- **Always check overrides for deprecation before adding them** — a deprecated override
  version is worse than the vulnerability it was meant to fix.
- **Never run `npm audit fix --force`** — surface it as a user decision, never execute it.
- **Build is a hard gate** — do not commit if the build fails with a real error.
- **Always run both npm audit and Snyk** — mandatory at baseline (Step 3) and after changes
  (Step 9). Never skip one.
- **Snyk Code findings do not change from dep updates** — present them separately in Step 9,
  never imply they were fixed by dependency changes.
- **Stage only `package.json` and the lock file** — never stage generated or environment files.
- **On install failure** — roll back the specific conflicting dep and retry once before stopping.
- **Never use `--prefix` for installs** — `npm install --prefix <dir>` embeds absolute paths in
  `package-lock.json`, producing a lockfile that breaks Snyk CI and `npm ci` on any other machine.
  Always `cd "$REPO_DIR"` first, then run the bare install command.
- **pnpm overrides go in `pnpm.overrides`** — `apply-upgrades.mjs` handles this automatically;
  never manually write transitive overrides to the top-level `overrides` field for pnpm repos.
- **No build script = skip Step 10** — library packages and pipeline-built repos often have no
  `build` script. Absence is not an error; skip gracefully and note it in the PR body.
- **Yarn berry uses `resolutions`, not `overrides`** — if the repo uses yarn berry (has
  `.yarnrc.yml` or `packageManager: yarn@>=2`), flag this to the user; the overrides written
  by the skill will not be honoured by yarn berry and the user must rename the field manually.
