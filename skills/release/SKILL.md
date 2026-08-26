---
name: release
description: >
  End-to-end release automation. Fetches Jira tickets for a fix version, verifies GitHub PRs,
  builds release notes, creates release PRs, writes a CAB Google Sheet, raises a release notes
  ticket, and generates a Confluence SDK changelog table.
  Use this skill whenever the user mentions running a release, starting a release process,
  creating a release sheet, or any step in the release workflow — including fetching Jira tickets,
  creating the Google Sheet, raising release notes tickets, or updating the SDK changelog.
  Triggers on: /release, "run the release", "start the release", "create release sheet",
  "do the release for", "kick off the release".
---

# Release Skill

Automates the full release process from Jira ticket fetch through Google Sheet creation,
release notes ticket creation (CLI), and Confluence SDK changelog update (SDK).

---

## Usage

When this skill activates, greet the user with this help block before doing anything else:

```
👋 /release — End-to-end release automation

How to use:
  /release                              → I'll collect all inputs via prompts
  /release "PROJ | 16-08-2026 | Release"   → start with a fix version
  /release --dry-run                    → preview everything, no writes

What I'll do:
  1. Fetch Jira tickets for the fix version
  2. Verify GitHub PRs (check merge state + dev branch status)
  2b. Build release notes (categorised by type)
  3. Build deployment plan (package versions, owners, platforms)
  4. Build rollback plan
  5. Create release PRs (dev → staging → main, per repo topology)
  6. Create CAB Google Sheet (Ticket List, Deployment Plan, Rollback Plan tabs)
  7. Create release notes ticket in your tracking project (CLI scope)
  8. Generate SDK Confluence changelog table (SDK scope)

Options:
  --dry-run   All reads run normally. No Jira comments, no PRs, no Sheet, no tickets.
              Dry-run is recommended for a first pass — shows you exactly what would happen.

Requirements:
  gh CLI      → brew install gh && gh auth login
  Jira MCP    → must be connected in Claude Code
  Google OAuth → see references/google-credentials.example.json for setup (live runs only)
  Config      → copy references/config.example.json → references/config.json and fill in
```

Only show this block once at the start. Then proceed to load config and collect inputs.

---

## Configuration

Before collecting inputs, read `$HOME/.claude/skills/release/references/config.json` using the
Read tool. If the file exists, parse it as `config`. If the file does not exist or a value is
missing, ask the user for it and offer to save it for future runs.

| Key | Description | Required when |
|-----|-------------|---------------|
| `google_sheet_template_id` | Google Drive file ID of your CAB sheet template | Live run, Step 6 |
| `confluence_sdk_page_id` | Confluence page ID for SDK changelog | SDK scope, Step 8 |
| `td_project_key` | Jira project key for release notes tickets (e.g. `TD`) | CLI scope, Step 7 |
| `td_assignee_account_id` | Jira account ID of the TD ticket assignee | Optional, Step 7 |
| `secondary_reviewer_account_id` | Jira account ID for PR comment CC (e.g. your release manager) | Optional, Step 2 |

If a required value is missing at the point it is needed, ask the user:
> "I couldn't find `{key}` in references/config.json. Please provide your {description}:"

Then offer:
> "Would you like me to save this to references/config.json so you don't have to enter it again?"

If the user agrees, append the value to config.json using the Write tool.

---

## Input Collection (before Step 1)

Collect all required inputs before running any steps. Use `AskUserQuestion` for every missing
input — never ask in plain prose.

### Run mode (if `--dry-run` was not passed in the invocation)

Call `AskUserQuestion`:
```
header:   "Run mode"
question: "How do you want to run this release?"
options:
  - label: "Dry run — preview everything, no writes (Recommended)"
    description: "All reads run normally. No Jira comments, no PRs, no Sheet, no tickets."
  - label: "Live run — execute all steps for real"
    description: "Posts Jira comments, creates release PRs, writes the CAB Sheet, creates the release notes ticket."
multiSelect: false
```

If the user selects "Dry run", set `--dry-run` mode for the entire run.

### Fix version (if not provided in the invocation)

Call `AskUserQuestion`:
```
header:   "Fix Version"
question: "What is the Jira fix version for this release? (e.g. PROJ | 16-08-2026 | Release)"
options:
  - label: "Enter fix version"
    description: "Type your fix version string — format: PROJECT | DD-MM-YYYY | Release (or Hotfix)"
multiSelect: false
```

The user selects "Other" to type the exact fix version string. Derive automatically from the value:
- `project_key` → first segment before the first `|` (e.g. `DX`, `PROJ`)
- `release_date` → middle segment e.g. `16-08-2026`
- `release_type` → last segment e.g. `Release` or `Hotfix`

### Scope (if not provided in the invocation)

Call `AskUserQuestion`:
```
header:   "Scope"
question: "Which packages are in scope for this release?"
options:
  - label: "Both CLI and SDK"
    description: "Runs Steps 7 (release notes ticket) and 8 (Confluence changelog)"
  - label: "CLI only"
    description: "Runs Step 7. Skips Step 8."
  - label: "SDK only"
    description: "Runs Step 8. Skips Step 7."
multiSelect: false
```

---

**Dry-run behaviour summary** (applies when `--dry-run` is active):

| Step | Normal action | Dry-run action |
|------|---------------|----------------|
| Step 2 — Jira comments | Post ADF comment on affected tickets | Print a list of tickets that WOULD receive a comment, with reason |
| Step 5c — Release PRs | `gh pr create` / `gh pr edit` | Print a `[DRY RUN]` block per repo: topology, head→base, title, version bump, filtered release notes |
| Step 6 — CAB Sheet | Copy template + populate via Sheets API | Skip OAuth + Drive entirely; render all tab data as markdown tables |
| Step 7 — Release notes ticket | `createJiraIssue` + `editJiraIssue` | Print the exact summary and description body that would be created |

Steps 1, 2 (data fetch), 2b, 3, 4, 5a, 5b run fully in both modes — they are read-only.

---

## Execution Steps

Run steps in order. Each step depends on the previous one's output.

**Working directory:** create once at the start of every run:
```bash
mkdir -p /tmp/release-run
```
All intermediate JSON files go here. Do NOT use the `scripts/` directory for temp files.

---

### Step 1 — Fetch Jira Tickets

Call `searchJiraIssuesUsingJql` with:
- jql: `project = {project_key} AND fixVersion = "{fixVersion}" ORDER BY created ASC`
- fields: `["key","summary","issuetype","parent","status","created","assignee","reporter","labels","comment"]`
- maxResults: 100

Save the MCP response JSON to `/tmp/release-run/jira-raw.json` using the Write tool.

If the response `total` exceeds `maxResults` (i.e. `startAt + maxResults < total`), the results are paginated. Fetch subsequent pages by calling `searchJiraIssuesUsingJql` again with `startAt` incremented by `maxResults` until all tickets are retrieved. Save each additional page as `jira-raw-2.json`, `jira-raw-3.json`, etc.

Then compress:
```bash
node "$HOME/.claude/skills/release/scripts/fetch-release-data.mjs" \
  /tmp/release-run/jira-raw.json \
  --fix-version "${fixVersion}" \
  > /tmp/release-run/release-tickets.json
```
(append additional page files if paginated: `… jira-raw-2.json jira-raw-3.json …`)

The `--fix-version` flag is the fallback when no master tracking ticket exists in the Jira results — the script derives `releaseDate` and `releaseType` from it instead of leaving them null.

Load `/tmp/release-run/release-tickets.json` as `ticket_data`. All subsequent steps read from `ticket_data`, not from the raw MCP response.

#### Step 1 Summary

Display the following after Step 1 completes:

```
---
✅ Step 1 complete — Jira Tickets Fetched

Fix Version:    {ticket_data.fixVersion}
Release Date:   {ticket_data.releaseDate}
Release Type:   {ticket_data.releaseType}
Master Ticket:  {ticket_data.masterTicketKey} (or "none found")
Total Tickets:  {ticket_data.tickets.length}

Ticket breakdown:
  Ready to Deploy / Done / Closed:  {count of tickets NOT in notReadyToDeploy}
  Not yet ready:                    {ticket_data.notReadyToDeploy.length}

Not-ready tickets: {ticket_data.notReadyToDeploy.join(', ') or "none"}
---
```

If `notReadyToDeploy` is non-empty, warn the user — but do not stop.

Then call `AskUserQuestion`:
```
header:   "Step 1 done"
question: "Jira tickets fetched. Ready to verify GitHub PRs?"
options:
  - label: "Continue to Step 2 (Recommended)"
  - label: "Stop here"
multiSelect: false
```

---

### Step 2 — Extract & Verify GitHub PRs

PR URLs were already extracted from descriptions and comments by the Step 1 script. Run the verification script:

```bash
node "$HOME/.claude/skills/release/scripts/check-prs.mjs" \
  /tmp/release-run/release-tickets.json \
  > /tmp/release-run/pr-status.json
```

Load `/tmp/release-run/pr-status.json` as `pr_data`.

- `pr_data.repos` — per-repo summary: verified/unverified/open PR counts, eligible flag, changed file paths
- `pr_data.flagged.needsJiraComment` — pre-computed list of tickets that need a warning comment
- `pr_data.flagged.notInDev` — merged PRs whose commit is not in development

**Flag unmerged PRs to the user** — list any `pr_data.prs` where `state !== 'MERGED'` and `isReleasePR === false` and `!error`.

**Comment on Jira ticket when a feature/fix PR is not in development:**

A PR is a **release PR** if `isReleasePR === true` (`headRefName === "development"`) — open by design, no comment needed.

For each entry in `pr_data.flagged.needsJiraComment` — post a comment using `addCommentToJiraIssue` on that **feature ticket**.

The entry already contains `assigneeAccountId` (null if unassigned). Use it directly — no separate `lookupJiraAccountId` call needed.

**If `--dry-run`:** Do NOT post any comment. Instead, print:

```
[DRY RUN] Jira comments that would be posted:
  {ticket_key} (assigned to: <name>) — PR <URL> is OPEN / not in development
    Would notify: @<owner>{secondary_reviewer_mention}
  (none — all PRs verified)
```

Where `{secondary_reviewer_mention}` = ` + @<secondary reviewer>` if `config.secondary_reviewer_account_id` is set, otherwise omit.

**If NOT dry-run:** Build the comment body as ADF. Include a `mention` node for the ticket owner (if assigned). If `config.secondary_reviewer_account_id` is set, also include a mention for the secondary reviewer:

> "Hi @[owner], the PR [URL] has not yet been merged into the `development` branch, but this ticket's fix version is already set to [fixVersion]. Please ensure the PR is merged into development before the release date.[cc_line]"

Where `[cc_line]` = ` cc @<secondary reviewer>` if `config.secondary_reviewer_account_id` is set, otherwise omit.

**A repo proceeds to the deployment plan (Step 3) if at least one of its PRs is merged and verified in development (or flagged as no-dev-branch).** Repos where every PR is unmerged are excluded from the deployment plan. Step 5 (release PR creation) still runs on all repos regardless of PR merge state.

#### Step 2 Summary

Display the following after Step 2 completes:

```
---
✅ Step 2 complete — GitHub PRs Verified

Total PRs found:  {pr_data.prs.length}
Total repos:      {pr_data.repos.length}

Per-repo status:
  Repo                     | Eligible | Verified | Unverified | Open | Rebase-merged | Fetch failed
  {repo}                   | {yes/no} | {N}      | {N}        | {N}  | {N}           | {N}
  ...

Flagged:
  Tickets needing Jira comment:  {pr_data.flagged.needsJiraComment.length} — {list of keys or "none"}
  PRs not in dev branch:         {pr_data.flagged.notInDev.length} — {list of repos/PRs or "none"}
  Unmerged feature PRs:          {count} — {list or "none"}

Jira comments: {N posted / DRY RUN — would post N}
---
```

Then call `AskUserQuestion`:
```
header:   "Step 2 done"
question: "PRs verified. Ready to build release notes?"
options:
  - label: "Continue to Step 2b (Recommended)"
  - label: "Stop here"
multiSelect: false
```

---

### Step 2b — Build Release Notes

Build `release_notes` from `ticket_data.tickets` (exclude the master release tracking ticket — the one whose `key === ticket_data.masterTicketKey`). This content is reused as:
- The body of release PRs created in Step 5 (filtered per repo — see Step 5c)
- The release notes section in the final output

**Categorise each ticket:**

| Condition | Category |
|-----------|----------|
| Ticket type = Bug AND summary contains a CVE-style vulnerability name (e.g. "Fix Cleartext Transmission", "Fix Command Injection") | Security |
| Ticket type = Bug, any other summary | Bug Fix |
| Ticket type = Task AND the change adds new behaviour or a new API | New Feature |
| Ticket type = Task AND the change improves or refines existing behaviour | Enhancement |

**Write one human-readable sentence per logical change** — not per ticket. Group duplicates (e.g., the same vulnerability fixed across multiple repos) into a single line. Do NOT include ticket keys, assignee names, or any internal identifiers.

**Format (markdown):**

```markdown
### New features
- <sentence describing new capability>

### Enhancements
- <sentence describing improvement>

### Bug fixes
- <sentence describing non-security bug resolved>

### Security
- <sentence describing vulnerability classes fixed and which packages were updated>
```

Omit any heading whose list would be empty.

Store as `release_notes` string.

**Also build and persist a `ticket_key → [note_lines]` map** — the list of note lines that each ticket contributed to. Write it to `/tmp/release-run/note-lines-map.json` immediately after building it. This map is never shown to the user; it is read in Step 5c to filter the PR body to only the lines relevant to each repo.

#### Step 2b Summary

Display the following after Step 2b completes:

```
---
✅ Step 2b complete — Release Notes Built

Categories found: {list of non-empty categories — New Features / Enhancements / Bug Fixes / Security}
Total note lines: {N}

Release Notes Preview:
──────────────────────
{release_notes}
──────────────────────
---
```

Then call `AskUserQuestion`:
```
header:   "Step 2b done"
question: "Release notes built. Ready to build the deployment plan?"
options:
  - label: "Continue to Step 3 (Recommended)"
  - label: "Stop here"
multiSelect: false
```

---

### Step 3 — Build Deployment Plan

Run the deploy plan script (covers this step plus Steps 5a and 5b — branch topology, version files, CHANGELOG checks):

```bash
node "$HOME/.claude/skills/release/scripts/build-deploy-plan.mjs" \
  /tmp/release-run/pr-status.json \
  /tmp/release-run/release-tickets.json \
  > /tmp/release-run/deploy-plan.json
```

Load `/tmp/release-run/deploy-plan.json` as `deploy_data`.

Each entry in `deploy_data.repos` contains:
- `repo`, `topology` (A/B/C), `mainBranch`, `stagingBranch`
- `platform` (NPM/NuGet/Maven/PyPI/GitHub), `packageName`, `versionFilePath`
- `versionDev`, `versionMain`, `detectedBump` (patch/minor/major/none)
- `semverRecommendation`, `changelogExists`, `changelogHasEntry`
- `owner` (display name of primary Task ticket assignee)
- `flags`: `versionBumpMissing`, `changelogMissing`, `changelogEntryMissing`, `directToMain`

Build `deployment_plan` rows from `deploy_data.repos` where `topology !== 'C'` **and `eligible !== false`** — ineligible repos have no version/platform/owner data and must be excluded:
```
Sr No. | Plugin/SDK (name@version) | Release Platform | Owner | Test Report | Status
```

Use `packageName@versionDev` for the name+version column. Leave Test Report and Status blank.

**Package naming:** The script reads `packageName` from the manifest exactly as written — preserve casing. Do not normalise.

#### Step 3 Summary

Display the following after Step 3 completes:

```
---
✅ Step 3 complete — Deployment Plan Built

Repos processed:    {deploy_data.repos.length}
  Topology A (2-hop): {count}
  Topology B (1-hop): {count}
  Topology C (skip):  {count}
  Ineligible:         {count}

Deployment Plan:
  Sr No. | Package@Version               | Platform | Owner
  1      | {packageName@versionDev}      | {platform} | {owner}
  ...

Flags requiring attention:
  ⚠️ Version bump missing: {repos with versionBumpMissing or "none"}
  ⚠️ Changelog missing:    {repos with changelogEntryMissing or "none"}
  ⚠️ Direct to main:       {repos with directToMain or "none"}
---
```

Then call `AskUserQuestion`:
```
header:   "Step 3 done"
question: "Deployment plan built. Ready to build the rollback plan?"
options:
  - label: "Continue to Step 4 (Recommended)"
  - label: "Stop here"
multiSelect: false
```

---

### Step 4 — Build Rollback Plan

For each row in `deployment_plan`:

| Platform | During Push — Task | Command |
|----------|-------------------|---------|
| NPM | Deprecate from npm | `npm deprecate <name>@<version> "Released in error — use previous version"` |
| NuGet | Deprecate from NuGet | `TBD - manual` |
| Maven | Deprecate from Maven | `TBD - manual` |
| PyPI | Yank from PyPI | `TBD - manual` |
| GitHub | Revert release | `TBD - manual` |

Owner for each rollback row = same as deployment plan owner.
After Push section: leave empty rows for human to fill.

#### Step 4 Summary

Display the following after Step 4 completes:

```
---
✅ Step 4 complete — Rollback Plan Built

  Command                                               | Owner   | During Push
  npm deprecate {package}@{version} "..."               | {owner} | Deprecate from npm
  ...

After Push rows left blank — to be filled manually before release day.
---
```

Then call `AskUserQuestion`:
```
header:   "Step 4 done"
question: "Rollback plan ready. Proceed to create release PRs?"
options:
  - label: "Continue to Step 5 — Create Release PRs (Recommended)"
  - label: "Stop here"
multiSelect: false
```

---

### Step 5 — Create Release PRs

For each **unique repo** identified from the **full PR list in Step 2** (regardless of whether feature PRs are merged or verified) — run the topology check and pre-flight checks below, then create or update the release PR.

This step runs on all repos. Even repos whose feature PRs are still pending will get a release PR created now so the PR is ready when the dev branch is updated.

---

#### 5a — Detect branch topology

**Already resolved by the script in Step 3.** Read from `deploy_data.repos`:
- `topology` — A (2-hop), B (1-hop), C (no dev branch)
- `mainBranch` — "main" or "master"
- `stagingBranch` — "staging", "next", or null

Use these values directly in 5c. No additional `gh api` calls needed.

---

#### 5b — Pre-flight checks per repo

**Skip Step 5b entirely for repos where `eligible === false`** — they have no version, changelog, or semver data. Proceed directly to Step 5c for those repos.

**Already resolved by the script in Step 3.** Read flags from `deploy_data.repos[i].flags`:

- `changelogMissing: true` → CHANGELOG.md doesn't exist — skip check, no flag needed
- `changelogEntryMissing: true` → file exists but no entry for release date → flag to operator:
  > `⚠️ {repo}: CHANGELOG.md exists but has no new entry for this release. Owner: {owner} — please update before merging.`
- `versionBumpMissing: true` → `versionDev === versionMain` → flag to operator:
  > `⚠️ {repo}: version on development ({versionDev}) matches {mainBranch} — no version bump detected. Owner: {owner}`
- `directToMain: true` → PR merged directly to main/master → flag automatically:
  > `⚠️ {repo}: PR merged directly to {mainBranch} — please verify a version bump was applied if required.`

**Check 3 — Semver confirmation** (eligible repos with a detected bump only):

For each eligible repo where `detectedBump !== 'none'`, call `AskUserQuestion`:
```
header:   "Semver — {short repo name}"
question: "Version bump detected for {repo}: {versionMain} → {versionDev} ({detectedBump}). Recommended: {semverRecommendation}. Confirm the bump type?"
options:
  - label: "Confirmed — {detectedBump} (Recommended)"
    description: "{versionMain} → {versionDev}"
  - label: "Override to patch"
    description: "Use patch bump instead"
  - label: "Override to minor"
    description: "Use minor bump instead"
  - label: "Override to major"
    description: "Use major bump instead"
multiSelect: false
```

Record the confirmed or overridden bump type for use in the PR body.

For eligible repos where `detectedBump === 'none'`, call `AskUserQuestion` per repo:
```
header:   "Semver — {short repo name}"
question: "No version bump detected on development for {repo}
           (dev: {versionDev ?? 'not detected'}, main: {versionMain ?? 'not detected'}).
           What bump type should be applied before merging?"
options:
  - label: "minor (Recommended)"
    description: "Apply a minor version bump — new features or enhancements"
  - label: "patch"
    description: "Apply a patch version bump — bug fixes only"
  - label: "major"
    description: "Apply a major version bump — breaking changes"
  - label: "Skip — no bump needed"
    description: "This repo does not publish a versioned package"
multiSelect: false
```

Record the selected bump type for use in the PR body and Step 5 summary. If "Skip" is selected, clear the `versionBumpMissing` flag for this repo — no warning needed.

**In `--dry-run` mode:** Skip the `AskUserQuestion` call for both cases. Record `semverRecommendation` as the confirmed bump and continue without blocking.

---

#### 5c — Create PRs

**PR title** (all types): `{project_key} | {release_date} | {release_type}`

**PR body — filtering mechanism:**

From Step 2 you have a `repo → [ticket_keys]` mapping. From Step 2b you have `/tmp/release-run/note-lines-map.json` (`ticket_key → [note_lines]`). To build the filtered PR body for a repo:
1. Collect all ticket keys for this repo from the `repo → [ticket_keys]` mapping
2. For each key, look up its `note_lines` from the internal map
3. Deduplicate lines and render as markdown — maintaining the category headings, omitting any heading whose list is empty after filtering
4. Do not include ticket numbers, names, or any internal identifiers in the final body

---

**If `--dry-run`:** Skip all PR creation and editing. For each repo, print:

```
[DRY RUN] Would create/update release PR:
  Repo:         {owner}/{repo}
  Topology:     Type A (2-hop) | Type B (1-hop) | Type C (no dev branch — would skip)
  Hop 1:        development → staging (or next)   [Type A only]
  Hop 2:        staging → {main_or_master}         [Type A only]
  Single hop:   development → {main_or_master}     [Type B only]
  PR title:     "{project_key} | {release_date} | {release_type}"
  Version bump: {old_version} → {new_version} ({patch|minor|major}) [from Step 5b]
  Existing PR:  #N already open (would update body) | none (would create new)

  Release notes for this repo:
  <filtered_release_notes for this repo>
```

**If NOT dry-run — check if one already exists (per hop, per topology):**

**Type A repos** — check both hops independently:
```bash
# Hop 1: development → staging
gh pr list --repo {owner}/{repo} --head development --base staging \
  --state open --json number,title

# Hop 2: staging → {main_or_master}
gh pr list --repo {owner}/{repo} --head staging --base {main_or_master} \
  --state open --json number,title
```

**Type B repos** — check one hop:
```bash
gh pr list --repo {owner}/{repo} --head development --base {main_or_master} \
  --state open --json number,title
```

For each hop: if a PR with title `{project_key} | {release_date} | {release_type}` already exists → update its body:
```bash
printf '%s' "{filtered_release_notes}" > /tmp/release-run/pr-body.md
gh pr edit {number} --repo {owner}/{repo} --body-file /tmp/release-run/pr-body.md
```
Report: `updated existing PR#{number}`. If no match → create it.

---

**Type A — 2 PRs per repo (create if not present):**
```bash
# PR 1: development → staging (or next)
printf '%s' "{filtered_release_notes}" > /tmp/release-run/pr-body.md
gh pr create \
  --repo {owner}/{repo} \
  --base staging \
  --head development \
  --title "{project_key} | {release_date} | {release_type}" \
  --body-file /tmp/release-run/pr-body.md

# PR 2: staging → {main_or_master}
printf '%s' "{filtered_release_notes}" > /tmp/release-run/pr-body.md
gh pr create \
  --repo {owner}/{repo} \
  --base {main_or_master} \
  --head staging \
  --title "{project_key} | {release_date} | {release_type}" \
  --body-file /tmp/release-run/pr-body.md
```

**Type B — 1 PR per repo (create if not present):**
```bash
printf '%s' "{filtered_release_notes}" > /tmp/release-run/pr-body.md
gh pr create \
  --repo {owner}/{repo} \
  --base {main_or_master} \
  --head development \
  --title "{project_key} | {release_date} | {release_type}" \
  --body-file /tmp/release-run/pr-body.md
```

**Type C — flag only:**
> `⚠️ {owner}/{repo}: no development branch found — skipping PR creation`

#### Step 5 Summary

After all PRs are created, display:

```
---
✅ Step 5 complete — Release PRs Created

  Repo                  | Type | PRs created/updated          | Semver bump
  {owner}/{repo}        | A    | PR#N (dev→staging)           | minor
                        |      | PR#M (staging→{main})        |
  {owner}/{repo}        | B    | PR#N (dev→{main})            | patch
  {owner}/{repo}        | C    | ⚠️ no dev branch             | —
---
```

Then call `AskUserQuestion`:
```
header:   "Step 5 done"
question: "Release PRs created. Ready to create the CAB Google Sheet?"
options:
  - label: "Continue to Step 6 — Create CAB Sheet (Recommended)"
  - label: "Stop here"
multiSelect: false
```

---

### Step 6 — Create Google Sheet (CAB Sheet)

**If `--dry-run`:** Skip Steps 6a–6c entirely (no OAuth, no Drive API, no curl). Instead, render all three documented tab contents as markdown tables:

**[DRY RUN] CAB Sheet preview — what would be written:**

**Ticket List tab** (`Ticket List!A2:I{N+1}`, GID 231599262)

| Issue Type | Key | Summary | Parent Key | Sprint | Status | Created | Assignee | Reporter |
|------------|-----|---------|------------|--------|--------|---------|----------|----------|
| (one row per ticket from `ticket_data.tickets`) |

**Deployment Plan tab** (`Deployement Plan!A3:F{M+2}`, GID 0)

| Sr No. | Plugin/SDK (name@version) | Release Platform | Owner | Test Report | Status |
|--------|--------------------------|-----------------|-------|-------------|--------|
| (one row per entry in `deployment_plan`) |

**Rollback Plan tab** (`Rollback Plan!A3:D{M+2}`, GID 1940902083)

| Command | Owner | During Push | After Push |
|---------|-------|-------------|------------|
| (one row per entry in `rollback_plan`) |

**Check List tab** (GID 878611207)

> This tab exists in the template sheet but is not yet populated by the skill. Show a note: "Check List tab present in template — content must be filled manually."

#### Step 6 Summary (dry-run)

```
---
✅ Step 6 complete — CAB Sheet Preview (DRY RUN)

Sheet would be titled: "{project_key} | {release_date} | {release_type}"
Ticket List rows:      {N}
Deployment Plan rows:  {M}
Rollback Plan rows:    {M}

No sheet was created — re-run without --dry-run to write for real.
---
```

Then skip the rest of Step 6 and proceed to Step 7.

---

**If NOT dry-run:** Google Sheets is accessed via OAuth2 using stored credentials.

#### 6a — Refresh the access token

Read `$HOME/.claude/skills/release/references/google-credentials.json` using the Read tool.
If the file does not exist, tell the user:
> "google-credentials.json not found. Please copy references/google-credentials.example.json to references/google-credentials.json and fill in your OAuth credentials. See the 'Getting a new OAuth token' section below."

Then run:
```bash
GOOGLE_ACCESS_TOKEN=$(bash "$HOME/.claude/skills/release/scripts/refresh-google-token.sh")
```

If the script fails (expired credentials, missing file), see "Getting a new OAuth token" section below.

**Important:** capture the token into `GOOGLE_ACCESS_TOKEN` as shown. Do NOT use `source` — the exported variable does not survive across separate Bash tool calls.

#### 6b — Copy the template sheet

Read `config.google_sheet_template_id` from config. If not set, ask the user for their Google Sheet template Drive file ID.

```bash
NEW_SHEET_ID=$(bash "$HOME/.claude/skills/release/scripts/copy-template-sheet.sh" \
  "$GOOGLE_ACCESS_TOKEN" \
  "{project_key} | {release_date} | {release_type}" \
  "{config.google_sheet_template_id}")
echo "New sheet ID: $NEW_SHEET_ID"
```

#### 6c — Populate all tabs via batchUpdate

Build the JSON payload (see `$HOME/.claude/skills/release/references/sheets-api.md` for exact tab GIDs and payload structure) targeting:

- **Ticket List** tab (`Ticket List!A2:I{N+1}`): one row per ticket — Issue Type, Key, Summary, Parent key, Sprint name, Status, Created date, Assignee display name, Reporter display name
- **Deployment Plan** tab (`Deployement Plan!A3:F{M+2}`): deployment plan rows — Sr No, package name@version, platform, owner, empty, empty
- **Rollback Plan** tab (`Rollback Plan!A3:D{M+2}`): rollback rows — command, owner, empty, empty

Write the payload to a temp file, then POST:

```bash
TOKEN="$GOOGLE_ACCESS_TOKEN"
SHEET_ID="$NEW_SHEET_ID"
curl -s -X POST \
  "https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchUpdate" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d @/tmp/release-run/sheets_payload.json \
  | jq '{totalUpdatedRows, totalUpdatedCells, error: .error.message}'
```

#### Step 6 Summary (live run)

```
---
✅ Step 6 complete — CAB Sheet Created

Sheet title:          "{project_key} | {release_date} | {release_type}"
Ticket List rows:     {N}
Deployment Plan rows: {M}
Rollback Plan rows:   {M}
Sheet URL:            https://docs.google.com/spreadsheets/d/{NEW_SHEET_ID}
---
```

Share the sheet URL with the user.

Then call `AskUserQuestion`:
```
header:   "Step 6 done"
question: "CAB Sheet created. Ready to create the release notes ticket?"
options:
  - label: "Continue to Step 7 (Recommended)"
  - label: "Stop here"
multiSelect: false
```

---

#### Getting a new OAuth token (first-time setup or when refresh token fails)

Give the user these instructions:

1. Go to `https://developers.google.com/oauthplayground`
2. In the left panel "Step 1 — Select & authorize APIs", find and select:
   - **Google Sheets API v4** → `https://www.googleapis.com/auth/spreadsheets`
   - **Drive API v3** → `https://www.googleapis.com/auth/drive`
3. Click **Authorize APIs** and sign in with the Google account that has access to your sheet template
4. In "Step 2 — Exchange authorization code for tokens", click **Exchange authorization code for tokens**
5. Copy the value shown for **Refresh token**
6. Also note the **client_id** and **client_secret** (visible in the OAuth Playground settings gear)
7. Copy `references/google-credentials.example.json` → `references/google-credentials.json` and fill in the three values

The refresh token does not expire unless manually revoked.

---

### Step 7 — Create Release Notes Ticket (skip if scope = SDK only)

Read `config.td_project_key` from config (default: `TD` if not set). Ask if missing.

**If `--dry-run`:** Skip `createJiraIssue` and `editJiraIssue`. Instead, print:

```
[DRY RUN] Would create release notes ticket:
  Project:  {td_project_key}
  Type:     Task
  Summary:  "{project_key} | Release Notes | {release_date} | CLI"
  Assignee: {config.td_assignee_account_id or "unassigned"}

  Description body that would be set:
  ─────────────────────────────────────
  Release Date: {release_date}

  Docs Changes: <value>

  Plugin: <package>
  Version: <version>

  New Features:
  - ...

  Enhancements:
  - ...

  Bug & Security Fixes:
  - ...
  ─────────────────────────────────────
```

Print one block per CLI package. Then display:

```
---
✅ Step 7 complete — Release Notes Ticket Preview (DRY RUN)

Would create {N} ticket(s) for CLI packages.
No ticket was created — re-run without --dry-run to write for real.
---
```

Then skip the rest of Step 7.

**If NOT dry-run:**

**7a — Create the ticket** using `createJiraIssue`:

```json
{
  "projectKey": "{config.td_project_key}",
  "issueType": "Task",
  "summary": "{project_key} | Release Notes | {release_date} | CLI",
  "assignee": "{config.td_assignee_account_id}"
}
```

If `config.td_assignee_account_id` is not set, create the ticket unassigned.

**7b — Populate the description** with CLI release notes using `editJiraIssue`.

**CLI scope** — packages whose release tickets carry a `CLI` label. **SDK scope** (Step 8) — packages whose release tickets carry an `SDK` label. Repos with neither label are excluded from both Step 7 and Step 8. If a repo's tickets have both labels, treat it as CLI.

Use this format:

```
Release Date: <release_date>

Docs Changes: <Any docs changes, or "None">

Plugin: <exact package name>
Version: <version>

New Features:
- <feature description, or omit heading if empty>

Enhancements:
- <enhancement description, or omit heading if empty>

Bug & Security Fixes:
- <fix description, or omit heading if empty>
```

Write one block per CLI package. Omit empty headings. Map from the release notes built in Step 2b.

#### Step 7 Summary

```
---
✅ Step 7 complete — Release Notes Ticket Created

  Package   | Ticket | URL
  {package} | {key}  | {jira_ticket_url}
---
```

Then call `AskUserQuestion`:
```
header:   "Step 7 done"
question: "Release notes ticket created. Ready to generate the SDK Confluence changelog table?"
options:
  - label: "Continue to Step 8 (Recommended)"
  - label: "Stop here"
multiSelect: false
```

---

### Step 8 — Update SDK Confluence Changelog (skip if scope = CLI only)

Read `config.confluence_sdk_page_id` from config. Ask the user if missing:
> "Please provide your Confluence SDK changelog page ID (the numeric ID in the page URL):"

**The Confluence page body may be very large ADF** — do NOT attempt `updateConfluencePage` inline.
Instead: generate a table for the release manager to paste manually.

**SDK scope for this table:** packages whose release tickets carry an `SDK` label. Packages with a `CLI` label belong in Step 7. Repos with neither label are excluded.

**Generate the table** — render it as HTML so the release manager can copy it cleanly. Present **all SDK rows at once** in a single table (one row per SDK package), then tell the release manager to paste one row at a time into Confluence.

Columns:

| SDK/Utils | Change Log | Docs Reviewed | Docs Status | Code Release Date |
|-----------|------------|--------------|------------|------------------|
| `<package name@version>` | `<release notes for this package>` | — | — | `<release_date>` |

After showing the table, give the release manager these instructions:

> To add these rows to the Confluence page (page ID: `{config.confluence_sdk_page_id}`):
> 1. Open the page in Confluence
> 2. Click **Edit**
> 3. Find the main changelog table (header: SDK/Utils, Change Log, Docs Reviewed, Docs Status, Code Release Date)
> 4. Click inside the first data row (below the header)
> 5. Insert a new row **above** it (right-click → Insert row above)
> 6. Paste the content for the **first SDK package** into the appropriate cells
> 7. Repeat for each additional SDK package
> 8. Save the page

#### Step 8 Summary

```
---
✅ Step 8 complete — SDK Confluence Table Generated

SDK packages included: {N}
  {package@version}
  ...

Paste table into Confluence page ID: {config.confluence_sdk_page_id}
---
```

---

## Final Output to User

After all steps complete, print a full run summary.

**Normal run:**

```
✅ Release {fixVersion}

📋 Tickets fetched:       {N} tickets ({M} flagged not Ready to Deploy)
⚠️  Unmerged PRs:         {list or "none"}
⚠️  Not in dev branch:    {list or "none"}
⚠️  Jira comments posted: {list of tickets commented, or "none"}
⚠️  Version bump missing: {list of repos, or "none"}
⚠️  Changelog missing:    {list of repos, or "none"}
🔀 Release PRs created:   {N} PRs across {R} repos
     Type A (2-hop):      {repos}
     Type B (1-hop):      {repos}
     Type C (skipped):    {repos}
📦 Deployment Plan:       {N} packages across {platforms}
📊 CAB Sheet:             {URL}
🎫 Release Notes Ticket:  {key} — {URL}          [or SKIPPED]
📝 Confluence (SDK):      Table generated — paste into page ID {confluence_sdk_page_id}  [or SKIPPED]

📣 Release Notes:
{release_notes content}
```

**Dry-run (`--dry-run` flag):**

```
🔍 DRY RUN — Release {fixVersion}    ← no writes were performed

📋 Tickets fetched:       {N} tickets ({M} flagged not Ready to Deploy)
⚠️  Unmerged PRs:         {list or "none"}
⚠️  Not in dev branch:    {list or "none"}
💬 Jira comments:         [DRY RUN] Would notify {N} ticket(s) — see Step 2 output above
🔀 Release PRs:           [DRY RUN] Would create/update {N} PRs across {R} repos — see Step 5 output above
📊 CAB Sheet:             [DRY RUN] Sheet preview shown above — no sheet created
🎫 Release Notes Ticket:  [DRY RUN] Ticket body shown above — no ticket created   [or SKIPPED]
📝 Confluence (SDK):      Table generated — paste into page ID {confluence_sdk_page_id} [or SKIPPED]

📣 Release Notes:
{release_notes content}

─────────────────────────────────────────────────────────────
No Jira comments were posted. No GitHub PRs were created or updated.
No Google Sheet was created. No release notes ticket was created.
Re-run without --dry-run to execute for real.
─────────────────────────────────────────────────────────────
```

If any step fails, report the error clearly, skip that step, and continue with the rest.

---

## Error Handling

- **No fixVersion match in Jira**: Stop and ask user to verify the version string
- **gh CLI not authenticated**: Run `gh auth status`; ask user to run `gh auth login` if needed
- **google-credentials.json missing**: Ask user to copy the example file and fill in their OAuth credentials — see "Getting a new OAuth token" in Step 6
- **Google token refresh fails**: Verify `client_id` and `client_secret` in `references/google-credentials.json` match the credentials used in OAuth Playground
- **Drive API 403 on template copy**: Re-authorize with `https://www.googleapis.com/auth/drive` scope included
- **PR URL in comment but `gh` can't access repo**: Note it and skip that PR; flag to user
- **config.json missing a required value**: Ask the user for the value and offer to save it
