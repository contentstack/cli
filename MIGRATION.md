# Contentstack CLI Migration Guide: 1.x.x to 2.x.x-beta

## Overview

This guide helps you migrate from Contentstack CLI 1.x.x to the new 2.x.x-beta version. The new version introduces significant improvements in performance, user experience, and functionality.

## Major Changes

### 1. 🚀 TypeScript Module Support (Default)

**What Changed:**
- Removed `export-info.json` support
- TypeScript modules are now the default for export and import operations
- Improved performance and reliability

**Before (1.x.x):**
```bash
csdx cm:stacks:export -d "./export-data" -k bltxxxxxx
```
The CLI generated an export-info.json file containing a contentVersion field:
contentVersion: 2 for TypeScript modules
contentVersion: 1 for JavaScript modules (default)
This version indicator helped the import process select the appropriate module structure, as TypeScript and JavaScript modules have different structures for assets, entries, and other components.

**After (2.x.x-beta):**
```bash
csdx cm:stacks:export -d "./export-data" -k bltxxxxxx
```
No export-info.json file is generated
TypeScript modules are used by default for all operations
Simplified export structure with consistent module formatting

**Migration Action:** Remove `export-info.json` file generation logic from export plugin.

### 2. 🌿 Main Branch Export (Default)

**What Changed:**
- By default, only the main branch content is exported
- Consistent behavior with import operations
- Faster exports for most use cases

**Before (1.x.x):**
- Exported all branches by default

**After (2.x.x-beta):**
- Exports main branch by default
- Specify `--branch` for specific branch export

**Examples:**

```bash
# Export main branch (default behavior)
csdx cm:stacks:export -d "./export-data" -k bltxxxxxx

# Export specific branch
csdx cm:stacks:export --branch feature-branch -d "./export-data" -k bltxxxxxx

# Export using branch alias
csdx cm:stacks:export --branch-alias production -d "./export-data" -k bltxxxxxx
```

**Migration Action:** To export specific branches, add the `--branch` flag to your commands.

### 3. 📊 Progress Manager UI (Default)

**What Changed:**
- Visual Progress Manager is now the default UI for export, import, clone & seed operations
- Enhanced user experience with real-time progress tracking
- Console logs are available as an optional mode

## New Progress Manager Interface

### Default Mode: Visual Progress Manager

When you run the export or import commands, a visual progress interface appears.

```
STACK:
   ├─ Settings             |████████████████████████████████████████| 100% | 1/1 | ✓ Complete (1/1)
   ├─ Locale               |████████████████████████████████████████| 100% | 1/1 | ✓ Complete (1/1)

LOCALES:
    └─ Locales             |████████████████████████████████████████| 100% | 2/2 | ✓ Complete (2/2)

CONTENT TYPES:
    └─ Content types       |████████████████████████████████████████| 100% | 6/6 | ✓ Complete (6/6)

ENTRIES:
   ├─ Entries              |████████████████████████████████████████| 100% | 12/12 | ✓ Complete (12/12)
```

### Optional Mode: Console Logs

For debugging or detailed logging, switch to console log mode:

**Enable Console Logs:**
```bash
csdx config:set:log --show-console-logs
```

**Disable Console Logs (back to Progress Manager):**
```bash
csdx config:set:log --no-show-console-logs
```

**Console Log Output Example:**
```
[2025-08-22 16:12:23] INFO: Exporting content from branch main
[2025-08-22 16:12:23] INFO: Started to export content, version is 2
[2025-08-22 16:12:23] INFO: Exporting module: stack
[2025-08-22 16:12:24] INFO: Exporting stack settings
[2025-08-22 16:12:25] SUCCESS: Exported stack settings successfully!
```

### 4. 🏷️ Taxonomy Migration Deprecation

**What Changed:**
- Taxonomy migration functionality has been deprecated in 2.x.x
- The taxonomy migration script examples have been removed

**Before (1.x.x):**
```bash
csdx cm:stacks:migration -k b*******9ca0 --file-path "../contentstack-migration/examples/taxonomies/import-taxonomies.js" --config data-dir:'./data/Taxonomy Stack_taxonomies.csv'
```
- Taxonomy migration supports only in version 1.x.x

**After (2.x.x-beta):**
- Taxonomy migration is no longer supported through the migration plugin
- Use the standard import/export commands for taxonomy data migration

**Migration Action:** use the import/export commands instead.

### 5. 📝 Migrate RTE Plugin Separation

**What Changed:**
- The migrate-rte plugin has been separated into a standalone plugin
- Requires separate installation to use RTE migration features
- Provides more flexibility and modular architecture

**Before (1.x.x):**
- RTE migration was built into the core CLI package
- Available by default with CLI installation

**After (2.x.x-beta):**
- RTE migration is a separate plugin that must be installed explicitly
- Install using one of the following methods:

**Installation Methods:**


**Option 1: Using npm**
```bash
npm install -g @contentstack/cli-cm-migrate-rte
```

**Option 2: Using CLI Plugin Manager**
```bash
csdx plugins:install @contentstack/cli-cm-migrate-rte@2.0.0-beta
```

**Usage:**
After installation, RTE migration commands will be available through the CLI:
```bash
csdx cm:migrate-rte --help
```

**Migration Action:** Install the `@contentstack/cli-cm-migrate-rte` plugin separately if you need RTE migration functionality.

### 6. 📦 Bulk Operations Command Consolidation

**What Changed:**
- The bulk publish plugin has been consolidated into unified bulk operations commands
- 15 separate commands have been simplified into 2 commands with operation flags
- Enhanced functionality with new filtering and cross-publish capabilities

**Impact:**
- Commands like `cm:entries:publish`, `cm:entries:unpublish`, `cm:assets:publish` have been replaced
- New unified commands: `cm:stacks:bulk-entries` and `cm:stacks:bulk-assets`
- Operation flag (`--operation`) is now required

**Migration Action:** Refer to the detailed [Bulk Operations Migration Guide](./BULK-OPERATIONS-MIGRATION.md) for complete command mappings and examples.

**Quick Example:**
```bash
# Before (1.x.x)
csdx cm:entries:publish --content-types blog --environments prod --locales en-us -k blt123

# After (2.x.x-beta)
csdx cm:stacks:bulk-entries --operation publish --content-types blog --environments prod --locales en-us -k blt123
```

### 7. 🚀 Launch Plugin Now Opt-In

**What Changed:**
- The `launch` plugin (`@contentstack/cli-launch`) is no longer bundled with the CLI
- All `launch:*` commands now require installing the plugin explicitly before use
- Brings `launch` in line with the opt-in, modular plugin model used elsewhere in 2.x

> ⚠️ **This is a change relative to the 2.x beta — not only relative to 1.x.** `@contentstack/cli-launch` was bundled throughout the 1.x releases **and** the entire 2.x beta period, so `launch:*` worked out of the box for beta users too. Starting with 2.x GA it becomes opt-in, so beta users who rely on `launch:*` are also affected when they upgrade.

**Before (1.x.x and 2.x.x-beta):**
- `launch:*` commands were bundled with the CLI and available by default after installation

**After (2.x.x GA):**
- `launch:*` commands are provided by a separate, opt-in plugin that must be installed explicitly
- Running any `launch:*` command without the plugin installed fails with a `command not found` error where it previously worked out of the box

**Affected commands:** `launch`, `launch:deployments`, `launch:environments`, `launch:functions`, `launch:logs`, `launch:open`, `launch:rollback`

**Installation Methods:**


**Option 1: Using CLI Plugin Manager**
```bash
csdx plugins:install @contentstack/cli-launch
```

**Option 2: Using npm**
```bash
npm install -g @contentstack/cli-launch
```

**Usage:**
After installation, launch commands will be available through the CLI:
```bash
csdx launch --help
```

**Migration Action:** If you use any `launch:*` command, install the `@contentstack/cli-launch` plugin before (or immediately after) upgrading to 2.x GA to avoid `command not found` errors. This applies to 2.x beta users as well, since `launch` was bundled during the beta.

### 8. 🔁 Flag Renames on Export / Import / Export-to-CSV

**What Changed:**
Several flags on `cm:stacks:export`, `cm:stacks:import`, and `cm:stacks:export-to-csv` were renamed or removed. Passing the old flag names now causes an **immediate error** — V2 does not silently fall back.

**cm:stacks:export — Removed Flags:**

| V1 Flag | V2 Replacement |
|---|---|
| `--data` | `--data-dir` |
| `--stack-uid` / `-s` | `--stack-api-key` |
| `--management-token-alias` | `--alias` |
| `--auth-token` / `-A` | use `csdx auth:login`, then `--alias` |
| `-m` | `--module` (long form only) |
| `-t` | `--content-types` (long form only) |
| `-B` | `--branch` (long form only) |

**cm:stacks:import — Removed Flags:**

| V1 Flag | V2 Replacement |
|---|---|
| `--data` | `--data-dir` |
| `--stack-uid` / `-s` | `--stack-api-key` |
| `--management-token-alias` | `--alias` |
| `--auth-token` / `-A` | use `csdx auth:login`, then `--alias` |
| `-m` | `--module` (long form only) |
| `-b` | `--backup-dir` (long form only) |
| `-B` | `--branch` (long form only) |
| `--skip-app-recreation` | **Removed — no replacement** |

> ⚠️ `--skip-app-recreation` is gone entirely. Remove it from all import scripts.

**cm:stacks:export-to-csv — Removed Flags:**

| V1 Flag | V2 Replacement |
|---|---|
| `--data` | `--data-dir` |
| `--stack-uid` / `-s` | `--stack-api-key` |

**Before (1.x.x):**
```bash
csdx cm:stacks:export -s blt123 --data ./export -B main
csdx cm:stacks:import -s blt123 --data ./export -b ./backup -B main
```

**After (2.x.x):**
```bash
csdx cm:stacks:export --stack-api-key blt123 --data-dir ./export --branch main
csdx cm:stacks:import --stack-api-key blt123 --data-dir ./export --backup-dir ./backup --branch main
```

**Also note — `--module studio` renamed:**
V1's `--module studio` is now `--module composable-studio`. Using the old value fails immediately:
```bash
# V1
csdx cm:stacks:export --module studio

# V2
csdx cm:stacks:export --module composable-studio
```

**Migration Action:** Update all export and import scripts to use the new flag names above. Search your CI/CD configs for `--data`, `-s`, `-B`, `-b`, `-m`, `-t`, `--auth-token`, `--management-token-alias`, `--skip-app-recreation`, and `--module studio`.

---

### 9. ⚠️ Export Directory Structure Changed (CRITICAL — Silent Data Loss Risk)

**What Changed:**
V2 changes two structural aspects of the export directory that can cause **silent failures** in downstream pipelines and V1 import operations.

#### 9.1 Global Fields: One File Per UID (was one combined file)

V1 wrote all global field schemas into a single file. V2 writes one file per global field UID.

```
# V1 export layout
export/global_fields/globalfields.json       ← all schemas in one array

# V2 export layout
export/global_fields/my_header.json          ← one file per UID
export/global_fields/my_footer.json
export/global_fields/shared_banner.json
```

#### 9.2 Content Types: Combined `schema.json` Removed

V1 also wrote `content_types/schema.json` containing all content type schemas as an array. V2 removes this file — only individual `content_types/<uid>.json` files are written.

```bash
cat export/content_types/schema.json    # this file does not exist in V2 exports
ls export/content_types/*.json          # correct: iterate per-UID files
```

#### 9.3 Branches: `branches.json` No Longer Written

V1 wrote a `branches.json` to the export root. V2 does not write this file and raises no error.

**Migration Action:**
- Update any tooling that reads `globalfields.json` or `content_types/schema.json` to iterate per-UID files.
- Remove any pipeline steps that check for or read `branches.json`.
- If you run a V2 export and then import with a **V1 CLI**, content types and global fields will be silently skipped (see section 10).

---

### 10. 🚨 V2 Export Cannot Be Imported with V1 CLI — Silent Skip (CRITICAL)

**What Changed:**
V2's importer (`cm:stacks:import`) reads only per-UID `<uid>.json` files for content types and global fields. It **explicitly ignores** the V1 aggregate files (`schema.json`, `globalfields.json`). There is no error or warning — the import completes "successfully" with zero content types and zero global fields created.

The same silent-skip applies when running `cm:stacks:audit` against a V1 export directory — the audit reads per-UID files only and will report 0 schemas found.

| Module | V1 file (not read by V2) | V2 file (required) |
|---|---|---|
| Content types | `content_types/schema.json` | `content_types/<uid>.json` (one per UID) |
| Global fields | `global_fields/globalfields.json` | `global_fields/<uid>.json` (one per UID) |

**Scenario that breaks silently:**
```bash
# This appears to succeed but imports 0 content types and 0 global fields:
csdx cm:stacks:export --data-dir ./export -k bltV1stack     # exported with V1 CLI
csdx cm:stacks:import --data-dir ./export -k bltV2stack     # imported with V2 CLI
```

**Resolution:** Always re-export with the V2 CLI before importing with the V2 CLI. If you must work with a V1 export, split `schema.json` and `globalfields.json` into individual per-UID files first.

**Migration Action:** Do not mix V1-exported data with a V2 import run. Add a step in your pipeline to verify exports were produced by the same CLI major version before importing.

---

### 11. 🔗 Command Aliases Removed

**What Changed:**
Several short-form command aliases that worked in V1 no longer exist in V2. Running them produces a `command not found` error.

| Removed Alias (V1) | V2 Replacement |
|---|---|
| `csdx cm:export` | `csdx cm:stacks:export` |
| `csdx cm:import` | `csdx cm:stacks:import` |
| `csdx cm:import-setup` | `csdx cm:stacks:import-setup` |
| `csdx cm:seed` | `csdx cm:stacks:seed` |
| `csdx tokens` | `csdx auth:tokens:list` |
| `csdx audit` | `csdx cm:stacks:audit` |
| `csdx audit:fix` | `csdx cm:stacks:audit:fix` |

> ✅ **Exception:** `csdx cm:migration` is the one V1 alias that **survived** — it still works in V2.

**Before (1.x.x):**
```bash
csdx cm:export -s blt123 -d ./export
csdx audit --report-path ./my-export
```

**After (2.x.x):**
```bash
csdx cm:stacks:export --stack-api-key blt123 --data-dir ./export
csdx cm:stacks:audit --report-path ./my-export
```

**Migration Action:** Search your scripts and CI/CD configs for the removed aliases above and replace them with their full V2 equivalents.

---

### 12. 🧩 `content-type:*` Deprecated Flags Removed

**What Changed:**
All six `content-type:*` commands (`audit`, `compare`, `compare-remote`, `details`, `diagram`, `list`) had their deprecated V1 flags and multiple short chars removed. These flags printed deprecation warnings in V1 but now **fail with an error** in V2.

**Removed across all `content-type:*` commands:**

| Removed | V2 Replacement |
|---|---|
| `--stack` / `-s` | `--stack-api-key` / `-k` |
| `--token-alias` | `--alias` / `-a` |

**Additional short chars removed per command:**

| Command | Removed Short Chars | Long Flag |
|---|---|---|
| `content-type:audit` | `-c` | `--content-type` |
| `content-type:compare` | `-c`, `-l`, `-r` | `--content-type`, `--left`, `--right` |
| `content-type:compare-remote` | `-o`, `-r`, `-c` | `--origin-stack`, `--remote-stack`, `--content-type` |
| `content-type:details` | `-c`, `-p` | `--content-type`, `--path` |
| `content-type:diagram` | `-o`, `-d`, `-t` | `--output`, `--direction`, `--type` |
| `content-type:list` | `-o` | `--order` |

**Before (1.x.x):**
```bash
csdx content-type:audit --stack blt123 --token-alias myalias -c blog
csdx content-type:compare --stack blt123 -c blog -l 1 -r 2
```

**After (2.x.x):**
```bash
csdx content-type:audit --stack-api-key blt123 --alias myalias --content-type blog
csdx content-type:compare --stack-api-key blt123 --content-type blog --left 1 --right 2
```

**Migration Action:** Replace `--stack` with `--stack-api-key`, `--token-alias` with `--alias`, and use long-form flags for all removed short chars.

---

### 13. 🚫 `--api-version` Flag Removed from Bulk Operations

**What Changed:**
The `--api-version` flag has been **removed** from `cm:stacks:bulk-entries` and `cm:stacks:bulk-taxonomies`. V2 hardcodes `api_version: 3.2` for all publish/unpublish calls. Passing `--api-version` now causes an immediate flag error.

**Before (1.x.x):**
```bash
csdx cm:stacks:bulk-entries --operation publish --api-version 3.2 --environments prod --locales en-us -k blt123
csdx cm:stacks:bulk-taxonomies --operation publish --api-version 3 --environments prod -k blt123
```

**After (2.x.x):**
```bash
csdx cm:stacks:bulk-entries --operation publish --environments prod --locales en-us -k blt123
csdx cm:stacks:bulk-taxonomies --operation publish --environments prod -k blt123
```

**Migration Action:** Remove `--api-version` from all bulk-entries and bulk-taxonomies scripts. API version 3.2 is always used.

---

### 14. ✂️ Short Char Removals Across Other Commands

**What Changed:**
V2 resolved short char conflicts across multiple commands by removing ambiguous or deprecated single-letter flags. Long-form flags are unaffected.

| Command | Removed Short Char | Long Flag (still works) |
|---|---|---|
| `cm:stacks:migration` | `-A` | `--authtoken` |
| `cm:stacks:migration` | `-n` | `--filePath` |
| `cm:stacks:migration` | `-B` | `--branch` |
| `migrate:convert` | `-o` | `--output` |
| `migrate:convert` | `-r` | `--rte` |
| `migrate:export` | `-b` | `--branch` |
| `migrate:export` | `-c` | `--config` |
| `migrate:export` | `-o` | `--org` |
| `app:create` | `-n` | `--name` |

**Before (1.x.x):**
```bash
csdx cm:stacks:migration -n ./my-migration.js -A myAuthtoken
csdx app:create -n my-app
```

**After (2.x.x):**
```bash
csdx cm:stacks:migration --filePath ./my-migration.js --authtoken myAuthtoken
csdx app:create --name my-app
```

**Migration Action:** Replace removed short chars with their long-form equivalents in all scripts.

---

### 15. ⚙️ Console Log Config Key Renamed

**What Changed:**
The internal config key that stores the console log preference was renamed from hyphenated to camelCase. Your V1 log preference is **not carried over** to V2 — you must re-apply it after upgrading.

| Config version | Key stored |
|---|---|
| V1 | `log["show-console-logs"]` |
| V2 | `log["showConsoleLogs"]` |

This does not affect the CLI flag name (`--show-console-logs` still works), only the stored config key. If your setup reads the Contentstack CLI config file directly (e.g. in a dotfile or CI bootstrap script), update the key name.

**Migration Action:** After upgrading to V2, re-run your log preference command:

```bash
# If you use console log mode in CI:
csdx config:set:log --show-console-logs

# If you use progress bar mode (default — run this to clear any stale V1 setting):
csdx config:set:log --no-show-console-logs
```

---

### 16. 📦 Bootstrap App Configs Removed (13 Removed, 8 Remain)

**What Changed:**
`cm:bootstrap` no longer recognises 13 app name values that were valid in V1. Passing any of them now throws `CLI_BOOTSTRAP_INVALID_APP_NAME`. Additionally, the flag names themselves changed (see section 8 above).

**Flag renames:**

| V1 Flag | V2 Flag |
|---|---|
| `--appName` / `-a` | `--app-name` |
| `--directory` / `-d` | `--project-dir` |
| `--appType` / `-s` | `--app-type` |

**Removed `--app-name` values (13 total):**

| Removed App Name | Type |
|---|---|
| `reactjs` | Sample app |
| `nextjs` | Sample app |
| `gatsby` | Sample app |
| `angular` | Sample app |
| `reactjs-starter` | Deprecated starter |
| `nextjs-starter` | Deprecated starter |
| `gatsby-starter` | Deprecated starter |
| `angular-starter` | Deprecated starter |
| `nuxt-starter` | Deprecated starter |
| `vue-starter` | Deprecated starter |
| `stencil-starter` | Deprecated starter |
| `nuxt3-starter` | Deprecated starter |
| `nuxtjs-disabled` | Hidden config entry |

**Valid `--app-name` values in V2 (8):**

| App Name | Description |
|---|---|
| `compass-app` | Compass App |
| `kickstart-next` | Kickstart Next.js |
| `kickstart-next-ssr` | Kickstart Next.js SSR |
| `kickstart-next-ssg` | Kickstart Next.js SSG |
| `kickstart-next-graphql` | Kickstart Next.js GraphQL |
| `kickstart-next-middleware` | Kickstart Next.js Middleware |
| `kickstart-nuxt` | Kickstart NuxtJS |
| `kickstart-nuxt-ssr` | Kickstart NuxtJS SSR |

**Before (1.x.x):**
```bash
csdx cm:bootstrap --appName reactjs --directory ./myapp --appType sampleapp
```

**After (2.x.x):**
```bash
csdx cm:bootstrap --app-name compass-app --project-dir ./myapp
```

**Migration Action:** Replace removed `--app-name` values with one of the 8 valid V2 app names. Update `--appName` → `--app-name`, `--directory` → `--project-dir`, `--appType` → `--app-type`.

---

### 17. 🌱 Seed Stack List Is Now Curated (4 Stacks Only)

**What Changed:**
In V1, running `csdx cm:stacks:seed` without `--repo` triggered a live GitHub API search and presented all matching Contentstack repositories. In V2, the list is fixed — only 4 curated repos are shown in the interactive picker.

**V2 curated list:**
1. `contentstack/kickstart-stack-seed` — Kickstart stack seed
2. `contentstack/kickstart-veda-seed` — Kickstart Veda
3. `contentstack/compass-starter-stack` — Compass starter stack
4. `contentstack/stack-starter-app` — Starter app

If you previously relied on the interactive list to discover repos, those repos no longer appear. Any script that passed a repo name not in this list via the interactive prompt will now time out or fail.

**Migration Action:** Use `--repo owner/repo-name` directly if you need a repository that is not in the curated list:

```bash
csdx cm:stacks:seed --repo contentstack/my-custom-seed-repo -k bltXXX
```

---

### 18. 🛑 Ctrl+C Now Exits with Code 130 (Was an Uncaught Exception)

**What Changed:**
In V1, pressing Ctrl+C during an interactive prompt (e.g. environment selection, alias selection) caused an `ExitPromptError` to be thrown. Depending on how your shell or CI pipeline handled unhandled exceptions, this could produce a non-zero exit code or an error stack trace.

In V2, SIGINT is caught and the process exits cleanly with **exit code 130** — the POSIX standard for SIGINT termination. No stack trace is printed.

**Before (1.x.x):**
- Ctrl+C → `ExitPromptError` thrown → unpredictable exit code, possible stack trace in logs

**After (2.x.x):**
- Ctrl+C → clean exit with code 130

**Migration Action:** If your CI pipeline checks the exit code of CLI commands that may be cancelled interactively, update the expected exit code from a non-zero exception code to `130`. If you catch `ExitPromptError` in any wrapper scripts, remove that handler.

---

## Troubleshooting

### Common Issues

**1. Command not found errors:**
- Ensure you have installed the 2.x.x-beta version
- Clear npm cache: `npm cache clean --force`

**2. Missing branch content:**
- Check if you need to specify the `--branch` flag for non-main branches
- Verify the branch exists in your stack

**3. Progress display issues:**
- Try switching between console logs and progress manager modes
- Check terminal compatibility for progress bars

**4. Performance differences:**
- The 2.x.x-beta version should be faster due to TypeScript modules
- If you are experiencing issues, switch to console log mode for debugging

**5. `launch:*` command not found:**
- In 2.x GA, `launch` is an opt-in plugin and is no longer bundled (it was bundled in 1.x and during the 2.x beta)
- Install it with `csdx plugins:install @contentstack/cli-launch`, then re-run your `launch:*` command
- Verify it is installed with `csdx plugins`

### Getting Help

**Documentation:**
- [CLI Documentation](https://www.contentstack.com/docs/developers/cli)
- [API Reference](https://www.contentstack.com/docs/developers/apis)

**Support:**
- [GitHub Issues](https://github.com/contentstack/cli/issues)

## Benefits of 2.x.x-beta

### 🚀 **Performance Improvements**
- Faster export/import operations with TypeScript modules
- Optimized branch handling
- Reduced memory usage

### 🎯 **Better User Experience**
- Visual Progress Manager with real-time updates
- Cleaner command syntax
- More intuitive default behaviors

### 🔧 **Enhanced Reliability**
- Improved error handling
- Better progress tracking
- More consistent behavior across commands

### 📊 **Better Observability**
- Detailed progress information
- Clear success/failure indicators
- Optional detailed logging for debugging
---

**Need help with migration?** Contact our support team or visit our community forum for assistance.
