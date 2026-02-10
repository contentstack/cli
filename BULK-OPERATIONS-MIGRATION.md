# 🔄 Migration Guide: From Bulk Publish to Bulk Operations Commands

> **Migrating from @contentstack/cli-cm-bulk-publish (v1.x) to New Unified Commands @contentstack/cli-bulk-operations (v1.x)**
---

## What Changed?

We've consolidated **15 separate commands** into **2 simple commands** with flags:

**Before (v1.x):**
- ❌ `cm:entries:publish`
- ❌ `cm:entries:publish-modified`
- ❌ `cm:entries:publish-only-unpublished`
- ❌ `cm:entries:unpublish`
- ❌ `cm:assets:publish`
- ❌ `cm:assets:unpublish`
- ❌ `cm:stacks:unpublish`
- ❌ `cm:bulk-publish:cross-publish`
- ❌ And 7 more commands...

**After (v2.0):**
- `csdx cm:stacks:bulk-entries` (for all entry operations)
- `csdx cm:stacks:bulk-assets` (for all asset operations)

---

## Quick Migration Examples

### 1️⃣ **Basic Publish Entries**

```bash
# OLD
csdx cm:entries:publish --content-types blog --environments prod --locales en-us -k blt123

# NEW
csdx cm:stacks:bulk-entries --operation publish --content-types blog --environments prod --locales en-us -k blt123
```

**What changed:** 
- Command renamed from `cm:entries:publish` to `cm:stacks:bulk-entries`
- Added required `--operation publish` flag

---

### 2️⃣ **Publish Only Modified Entries**

```bash
# OLD
csdx cm:entries:publish-modified --content-types blog --source-env staging --environments prod --locales en-us -k blt123

# NEW
csdx cm:stacks:bulk-entries --operation publish --filter modified --content-types blog --source-env staging --environments prod --locales en-us -k blt123
```

**What changed:** 
- Command renamed to `cm:stacks:bulk-entries`
- Added `--filter modified` flag instead of separate command

---

### 3️⃣ **Publish Only Unpublished Entries**

```bash
# OLD
csdx cm:entries:publish-only-unpublished --content-types blog --environments prod --locales en-us -k blt123

# NEW
csdx cm:stacks:bulk-entries --operation publish --filter unpublished --content-types blog --environments prod --locales en-us -k blt123
```

**What changed:** 
- Command renamed to `cm:stacks:bulk-entries`
- Added `--filter unpublished` flag

---

### 4️⃣ **Publish Non-Localized Field Changes**

```bash
# OLD
csdx cm:entries:publish-non-localized-fields --content-types blog --source-env staging --environments prod -k blt123

# NEW
csdx cm:stacks:bulk-entries --operation publish --filter non-localized --content-types blog --source-env staging --environments prod --locales en-us -k blt123
```

**What changed:** 
- Command renamed to `cm:stacks:bulk-entries`
- Added `--filter non-localized` flag
- `--locales` flag is now required

---

### 5️⃣ **Unpublish Entries**

```bash
# OLD
csdx cm:entries:unpublish --content-types blog --environments staging --locales en-us -k blt123

# NEW
csdx cm:stacks:bulk-entries --operation unpublish --content-types blog --environments staging --locales en-us -k blt123
```

**What changed:** 
- Command renamed to `cm:stacks:bulk-entries`
- Added `--operation unpublish` flag

---

### 6️⃣ **Publish Assets**

```bash
# OLD
csdx cm:assets:publish --environments prod --locales en-us -k blt123

# NEW
csdx cm:stacks:bulk-assets --operation publish --environments prod --locales en-us -k blt123
```

**What changed:** 
- Command renamed to `cm:stacks:bulk-assets`
- Added `--operation publish` flag

---

### 7️⃣ **Publish Assets from Specific Folder**

```bash
# OLD
csdx cm:assets:publish --folder-uid images_folder --environments prod --locales en-us -k blt123

# NEW
csdx cm:stacks:bulk-assets --operation publish --folder-uid images_folder --environments prod --locales en-us -k blt123
```

**What changed:** 
- Command renamed to `cm:stacks:bulk-assets`
- Added `--operation publish` flag
- `--folder-uid` flag remains the same

---

### 8️⃣ **Unpublish Assets**

```bash
# OLD
csdx cm:assets:unpublish --environments staging --locales en-us -k blt123

# NEW
csdx cm:stacks:bulk-assets --operation unpublish --environments staging --locales en-us -k blt123
```

**What changed:** 
- Command renamed to `cm:stacks:bulk-assets`
- Added `--operation unpublish` flag

---

### 9️⃣ **Cross-Publish Entries**

```bash
# OLD
csdx cm:bulk-publish:cross-publish --source-env staging --environments prod --locales en-us -k blt123 --delivery-token blt***

# NEW - Step 1: Add delivery token as alias
csdx auth:tokens:add \
  -a staging-delivery \
  --delivery-token blt*** \
  --api-key blt123 \
  --environment staging \
  --type delivery

# NEW - Step 2: Use the alias for cross-publish
csdx cm:stacks:bulk-entries \
  --operation publish \
  --source-env staging \
  --source-alias staging-delivery \
  --content-types blog article \
  --environments prod \
  --locales en-us \
  -k blt123
```

**What changed:** 
- Command renamed to `cm:stacks:bulk-entries`
- Delivery token must be stored as an alias first
- Added `--source-alias` flag (required for cross-publish)
- `--delivery-token` flag no longer supported inline

---

### 🔟 **Unpublish All Content (Entries + Assets)**

```bash
# OLD
csdx cm:stacks:unpublish --environments staging --locales en-us -k blt123

# NEW - Run two commands:
# 1. Unpublish entries
csdx cm:stacks:bulk-entries --operation unpublish --content-types blog,article,page --environments staging --locales en-us -k blt123

# 2. Unpublish assets
csdx cm:stacks:bulk-assets --operation unpublish --environments staging --locales en-us -k blt123
```

**What changed:** 
- Split into two explicit commands for better control
- Must specify content types for entries

---

## ⚠️ Missing Functionality in v2.0

The following features from v1.x are **NOT** available in v2.0:

### **1. Interactive Menu Command**
```bash
# ❌ NOT AVAILABLE
csdx cm:stacks:publish
```

**Impact:** You must use explicit commands instead of an interactive selection menu.

**Workaround:** Use the explicit `bulk-entries` or `bulk-assets` commands directly.

---

### **2. Configuration Generator Command**
```bash
# ❌ NOT AVAILABLE
csdx cm:stacks:publish-configure
csdx cm:bulk-publish:configure
```

**Impact:** No command to generate configuration files interactively.

**Workaround:** Create `config.json` files manually (see [Config File Support](#7-config-file-support) above).

---

### **3. Clear Logs Command**
```bash
# ❌ NOT AVAILABLE
csdx cm:stacks:publish-clear-logs
csdx cm:bulk-publish:clear
```

**Impact:** No CLI command to clear log files.

**Workaround:** Use OS commands:
```bash
# Unix/Linux/Mac
rm -rf ./bulk-operation/*

# Windows
del /q bulk-operation\*
```

---

### **4. Publish All Content Types Flag**
```bash
# ❌ NOT AVAILABLE
--publish-all-content-types
```

**Impact:** If content-types flag isn't provided then it will automatically fetch all content types.

```bash
csdx cm:stacks:bulk-entries --operation publish --environments prod --locales en-us -k blt123
```

---

### **5. Direct Delivery Token Flag**
```bash
# ❌ NOT AVAILABLE
--delivery-token blt***
```

**Impact:** Cannot pass delivery token directly for cross-publish.

**Workaround:** Store delivery token as an alias first:
```bash
# Step 1: Add delivery token
csdx auth:tokens:add -a prod-delivery --delivery-token blt*** --api-key blt123 --environment production --type delivery

# Step 2: Use the alias
csdx cm:stacks:bulk-entries --operation publish --source-env production --source-alias prod-delivery --environments staging --locales en-us -k blt123
```

---

## 📝 Step-by-Step Migration Process

### **Step 1: Find Your Current Command**

Look at your existing scripts/CI-CD pipelines and identify which old commands you're using.

Example: `csdx cm:entries:publish-modified`

---

### **Step 2: Find the Equivalent in the Table Above**

For `cm:entries:publish-modified`, the new command is:
```bash
csdx cm:stacks:bulk-entries --operation publish --filter modified
```

---

### **Step 3: Update Authentication for Cross-Publish**

If you use cross-publish with delivery tokens, store them as aliases:

```bash
# Old way (not supported)
csdx cm:bulk-publish:cross-publish --delivery-token blt*** ...

# New way - Step 1: Store token
csdx auth:tokens:add \
  -a staging-delivery \
  --delivery-token blt*** \
  --api-key blt123 \
  --environment staging \
  --type delivery

# New way - Step 2: Use alias
csdx cm:stacks:bulk-entries --operation publish --source-env staging --source-alias staging-delivery ...
```

---

### **Step 4: Update Your Script**

Replace the old command with the new one:

```bash
# Before
csdx cm:entries:publish-modified --content-types blog --source-env staging --environments prod --locales en-us -k $API_KEY

# After
csdx cm:stacks:bulk-entries --operation publish --filter modified --content-types blog --source-env staging --environments prod --locales en-us -k $API_KEY
```

---

### **Step 5: Test Your New Command**

Run the command in a test environment first:

```bash
# Test with staging environment
csdx cm:stacks:bulk-entries --operation publish --filter modified --content-types blog --environments staging --locales en-us -k $API_KEY
```

---

### **Step 6: Update All Scripts**

Find and replace all instances across your:
- CI/CD pipelines (GitHub Actions, Jenkins, etc.)
- Deployment scripts
- Documentation
- Team runbooks

---

## ⚠️ Breaking Changes

### **1. Operation Flag Now Required**

**Old behavior:**
```bash
csdx cm:entries:publish --content-types blog --environments prod --locales en-us -k blt123
# Command name implies the operation
```

**New behavior:**
```bash
csdx cm:stacks:bulk-entries --operation publish --content-types blog --environments prod --locales en-us -k blt123
# Must explicitly specify --operation flag
```

---

### **2. Combined Unpublish Split into Separate Commands**

**Old behavior:**
```bash
csdx cm:stacks:unpublish --environments staging --locales en-us -k blt123
# Unpublishes both entries and assets in one command
```

**New behavior:**
```bash
# Must run two separate commands for full control
csdx cm:stacks:bulk-entries --operation unpublish --content-types blog article --environments staging --locales en-us -k blt123
csdx cm:stacks:bulk-assets --operation unpublish --environments staging --locales en-us -k blt123
```

**Benefits:**
- Better control over what gets unpublished
- Clearer logging and error handling
- Can unpublish entries and assets independently

---

### **3. Publish all content types**

**Old behavior:**
```bash
csdx cm:entries:publish --publish-all-content-types --environments prod --locales en-us -k blt123
# Flag to publish all content types
```

**New behavior:**
```bash
csdx cm:stacks:bulk-entries --operation publish --environments prod --locales en-us -k blt123
```

---

### **4. Delivery Token Must Be Stored as Alias**

**Old behavior:**
```bash
csdx cm:bulk-publish:cross-publish --delivery-token blt*** --source-env prod --environments staging --locales en-us -k blt123
# Pass delivery token directly
```

**New behavior:**
```bash
# Step 1: Store delivery token
csdx auth:tokens:add -a prod-delivery --delivery-token blt*** --api-key blt123 --environment production --type delivery

# Step 2: Use the alias
csdx cm:stacks:bulk-entries --operation publish --source-env production --source-alias prod-delivery --content-types blog --environments staging --locales en-us -k blt123
```

**Why?**
- More secure (tokens not in command history)
- Tokens can be reused across commands
- Better token management

---

### **5. Filter Flags Replace Separate Commands**

**Old behavior:**
```bash
# Different commands for different filters
csdx cm:entries:publish-modified ...
csdx cm:entries:publish-only-unpublished ...
csdx cm:entries:publish-non-localized-fields ...
```

**New behavior:**
```bash
# One command with --filter flag
csdx cm:stacks:bulk-entries --operation publish --filter modified ...
csdx cm:stacks:bulk-entries --operation publish --filter unpublished ...
csdx cm:stacks:bulk-entries --operation publish --filter non-localized ...
```

---

### **6. Multiple Values Format Changed**

**Old behavior:**
```bash
# Comma-separated values
--environments dev,staging,prod
--locales en-us,es-es,fr-fr
```

**New behavior:**
```bash
# Space-separated values
--environments dev staging prod
--locales en-us es-es fr-fr
```

---

## 📝 Summary

**Key Takeaways:**

1. **Two commands replace 15 old commands**: `cm:stacks:bulk-entries` and `cm:stacks:bulk-assets`
2. **Operation flag is required**: Always specify `--operation publish` or `--operation unpublish`
3. **Filters replace separate commands**: Use `--filter` for modified, unpublished, draft, non-localized
4. **Delivery tokens must be stored as aliases**: Use `auth:tokens:add` before cross-publish
5. **Content types must be explicit**: No more `--publish-all-content-types`
6. **Config files recommended for complex operations**: Use JSON files with `--config` flag
7. **New features**: `--publish-mode`, `--revert`, `--include-variants`, `--api-version`

**Migration is straightforward:**
- Replace old command names with new ones
- Add `--operation` flag
- Use `--filter` instead of separate commands
- Store delivery tokens as aliases for cross-publish
- Test in lower environments first

**Need Help?**
- Check [official documentation](https://www.contentstack.com/docs/developers/cli/bulk-operations-in-cli)
- Contact [Contentstack Support](https://www.contentstack.com/support/)


