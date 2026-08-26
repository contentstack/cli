---
name: back-merge
description: >
  Creates or checks back-merge PRs (main/master → development) across repos after a release.
  Use whenever the user wants to check or create back-merge PRs, verify post-release branch sync,
  or audit which repos are missing a back-merge.
  Triggers on: /back-merge, "back merge", "backmerge", "check back merges", "create back-merge PRs",
  "are back merges done", "post-release back merge".
---

# Back-Merge Skill

Creates or checks PRs that merge `main/master → development` across repos after a release.
Supports two input modes and two run modes.

---

## Usage

When this skill activates, greet the user with this help block before doing anything else:

```
👋 /back-merge — Back-merge PR checker & creator

How to use:
  /back-merge                                         → I'll ask how to specify repos
  /back-merge "<fixVersion>"                          → pull repos from a Jira release
  /back-merge <github-url1> <github-url2> ...         → use a direct repo list
  /back-merge "<fixVersion>" <github-url1> ...        → combine both sources

Modes (specify after your input, or I'll ask):
  check   — read-only audit, shows what needs back-merging (default, recommended)
  create  — raises PRs for all repos that need them (asks for confirmation first)

Examples:
  /back-merge "DX | 16-08-2026 | Release" check
  /back-merge https://github.com/org/repo1 https://github.com/org/repo2
  /back-merge "PROJ | 16-08-2026 | Release" create

Requirements:
  gh CLI  → brew install gh && gh auth login
  Jira MCP (only needed for fixVersion mode) — must be connected in Claude Code
```

Only show this block once at the start. Then proceed to collect inputs.

---

## Inputs

| Input | Format | Example |
|-------|--------|---------|
| `fixVersion` | Jira fixVersion string | `PROJ \| 16-08-2026 \| Release` |
| `repo_list` | Space or comma-separated GitHub URLs | `https://github.com/org/repo1 https://github.com/org/repo2` |
| `mode` | `check` or `create` | `check` |

**If neither fixVersion nor repo_list is provided** — use AskUserQuestion:

> **Question:** "How would you like to specify the repos to back-merge?"
> - `fixVersion` — pull repos from a Jira release (e.g. `PROJ | 16-08-2026 | Release`)
> - `Repo list` — paste GitHub repo URLs directly
> - `Both` — combine repos from a fixVersion AND a manual list
>
> *(User can select "Other" to type a custom value)*

Do not proceed without knowing the scope.

**If mode is not provided** — use AskUserQuestion:

> **Question:** "Which mode do you want to run?"
> - `Check` — read-only, shows what needs back-merging without creating any PRs *(Recommended)*
> - `Create PRs` — creates back-merge PRs for all repos that need them
>
> *(User can select "Other" to specify a custom behaviour)*

---

## Step 1 — Resolve Repo List

### 1a — From fixVersion

**Extract the project key** from the fixVersion string — it is the first segment before the first `|`:
- `"DX | 16-08-2026 | Release"` → project key = `DX`
- `"PROJ | 16-08-2026 | Release"` → project key = `PROJ`

Query Jira using the extracted project key:

```
project = {project_key} AND fixVersion = "{fixVersion}" ORDER BY created ASC
```

Scan every ticket's `comment.comments[].body` AND the master release ticket's `description` for GitHub PR URLs:

```
pattern: https://github\.com/[^/]+/[^/]+/pull/\d+
```

For each unique PR URL, extract `owner` and `repo` from the URL path. Deduplicate by `owner/repo`. This is your repo list.

If no PR URLs are found → warn the user and stop:
> `⚠️ No GitHub PRs found for fixVersion "{fixVersion}". Cannot determine repo scope.`

### 1b — From repo_list

Parse each GitHub URL to extract `owner/repo`:
- `https://github.com/org/repo-name` → `org/repo-name`

Deduplicate silently. If a URL can't be parsed → skip it and flag:
> `⚠️ Could not parse repo from URL: {url} — skipped.`

### Step 1 output — display resolved repos before proceeding

After resolving the repo list, always show this table:

```
📋 Repos resolved (N total)

# | Repo                      | Source
--|---------------------------|--------
1 | org/repo-one              | fixVersion
2 | org/repo-two              | manual list
3 | org/repo-three            | fixVersion
```

Do not proceed to Step 2 until this table is shown.

---

## Step 2 & 3 — Run the bundled script

Use `scripts/back-merge.sh` — do not regenerate this logic inline.

```bash
SKILL_DIR="$(dirname "$(realpath "$0")")/.."   # or: ~/.claude/skills/back-merge

# check mode
bash "$SKILL_DIR/scripts/back-merge.sh" check \
  owner/repo1 owner/repo2 ...

# create mode — pass the full fixVersion string as the second argument
bash "$SKILL_DIR/scripts/back-merge.sh" create "{fixVersion}" \
  owner/repo1 owner/repo2 ...

# create mode — no fixVersion (repo list only)
bash "$SKILL_DIR/scripts/back-merge.sh" create "" \
  owner/repo1 owner/repo2 ...
```

**Before running in create mode** — show the resolved repos table from Step 1 if not already visible, then use AskUserQuestion:

> **Question:** "Ready to create back-merge PRs for the N repos listed above. Proceed?"
> - `Yes, create PRs` — proceed with PR creation
> - `No, abort` — stop without making any changes
> - `Check only` — switch to check mode instead (read-only, no PRs created)
>
> *(User can select "Other" to specify which repos to skip or override)*

Do not create any PRs until the user confirms.

The script outputs one pipe-delimited line per repo:

```
owner/repo|STATUS_CODE|branch_used|details
```

| STATUS_CODE | Meaning |
|-------------|---------|
| `IN_SYNC` | branches are in sync |
| `NEEDS_MERGE` | back-merge needed (`details` = "base is N commits ahead (status)") |
| `PR_OPEN` | open PR already exists (`details` = "PR#N url") |
| `CREATED` | PR created (`details` = PR URL) |
| `NO_DEV` | no development branch |
| `NO_BASE` | no main or master branch |
| `ACCESS_ERROR` | API error / no access |
| `ERROR` | PR creation failed (`details` = error message) |

Parse the output and render the table below.

### Check mode output table

```
Repo                   | Status                     | Details
org/repo-one           | ✅ In sync                 | —
org/repo-two           | ⚠️ Back-merge needed       | main is 4 commits ahead
org/repo-three         | 🔄 PR open — pending merge | PR#456 <url>
org/repo-four          | ❌ No dev branch            | —
org/repo-five          | ❌ Access error             | —
```

Do not create any PRs in check mode.

### Create mode output table

```
Repo                   | Result                      | PR
org/repo-one           | ✅ Created                  | PR#789 <url>
org/repo-two           | ⏭️ Skipped — PR open        | PR#456 <url>
org/repo-three         | ⏭️ Skipped — in sync        | —
org/repo-four          | ⏭️ Skipped — no dev branch  | —
```

**`ERROR` rows**: report the details verbatim — do not retry silently. If details contains "No commits between", treat it as `IN_SYNC`.

---

## Corner Cases Handled

| # | Scenario | Behaviour |
|---|----------|-----------|
| 1 | Repo has no `development` branch | Flagged `❌ No dev branch`, skipped |
| 2 | Repo has no `main` or `master` | Flagged `❌ No main/master branch`, skipped |
| 3 | main and development are identical (in sync) | Flagged `✅ In sync`, no PR created |
| 4 | Back-merge PR already open | Reported as `🔄 pending merge`, not duplicated |
| 5 | Back-merge PR was closed (not merged) | New PR created — closed ≠ done |
| 6 | Branches diverged (both have unique commits) | PR created anyway — GitHub surfaces conflicts |
| 7 | `gh` cannot access repo (private / permissions) | Flagged `❌ Access error`, skipped |
| 8 | Duplicate repos in manual list | Deduplicated silently before processing |
| 9 | Unparseable URL in manual list | Flagged and skipped, rest continues |
| 10 | fixVersion has no PRs / no repos found | Warn user and stop — no scope to act on |
| 11 | PR creation fails with "no commits between" | Treated as `✅ In sync` — already resolved |
| 12 | Mode not specified | Ask via AskUserQuestion (see Inputs section) |
| 13 | Repo list + fixVersion both provided | Merge both lists, deduplicate, proceed |

---

## Final Summary Output

After all repos are processed:

```
✅ Back-merge run complete

Mode:   check | create
Input:  fixVersion "{fixVersion}" | {N} repos from list

📊 Summary:
  ⚠️  Needs back-merge:          <N repos — listed>
  🔄  PR open (pending merge):   <N repos — listed with PR links>
  ✅  In sync:                   <N repos>
  ❌  Skipped (no dev branch):   <N repos>
  ❌  Skipped (access error):    <N repos>

[create mode only]
  ✅  PRs created:               <N> — <links>
```

---

## Error Handling

- **`gh` not authenticated**: Run `gh auth status`; ask user to run `gh auth login` if needed
- **Jira MCP not available**: Cannot resolve fixVersion — ask user to switch to repo_list input mode
- **All repos in sync**: Report clearly — no action needed
- **Partial failures**: Always continue processing remaining repos; report failures at the end
