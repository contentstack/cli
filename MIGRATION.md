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
