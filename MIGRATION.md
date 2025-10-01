# Contentstack CLI Migration Guide: 1.x to 2.x.x-beta

## Overview

This guide helps you migrate from Contentstack CLI 1.x to the new 2.x.x-beta version. The new version introduces significant improvements in performance, user experience, and functionality.

## Major Changes

### 1. 🚀 TypeScript Module Support (Default)

**What Changed:**
- Removed `export-info.json` support
- TypeScript modules are now the default for export & import operations
- Improved performance and reliability

**Before (1.x):**
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

**Before (1.x):**
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

**Migration Action:** If you need to export specific branches, add the `--branch` flag to your commands.

### 3. 📊 Progress Manager UI (Default)

**What Changed:**
- Visual Progress Manager is now the default UI for export, import, clone & seed operations
- Enhanced user experience with real-time progress tracking
- Console logs are available as an optional mode

## New Progress Manager Interface

### Default Mode: Visual Progress Manager

When you run export/import commands, you'll see a beautiful progress interface:

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

## Troubleshooting

### Common Issues

**1. Command not found errors:**
- Ensure you've installed the 2.x.x-beta version
- Clear npm cache: `npm cache clean --force`

**2. Missing branch content:**
- Check if you need to specify `--branch` flag for non-main branches
- Verify branch exists in your stack

**3. Progress display issues:**
- Try switching between console logs and progress manager modes
- Check terminal compatibility for progress bars

**4. Performance differences:**
- 2.x.x-beta should be faster due to TypeScript modules
- If experiencing issues, switch to console log mode for debugging

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
