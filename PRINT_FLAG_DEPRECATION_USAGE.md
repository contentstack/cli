# printFlagDeprecation Usage Locations

This document lists all locations where `printFlagDeprecation` is used in the codebase.

## Export Location
- **`packages/contentstack-utilities/src/index.ts`** (line 24)
  - Exports the function for use across packages

## Usage by Package

### 1. contentstack-seed
**File**: `packages/contentstack-seed/src/commands/cm/stacks/seed.ts`
- Line 31: `['-r']` → `['--repo']`
- Line 39: `['-o']` → `['--org']`
- Line 75: `['s', 'stack']` → `['-k', 'stack-api-key']`

### 2. contentstack-migration
**File**: `packages/contentstack-migration/src/commands/cm/stacks/migration.js`
- Line 262: `['-B']` → `['--branch']`
- Line 281: `['--api-key']` → `['-k', '--stack-api-key']`
- Line 289: `['-A', '--authtoken']` (no replacement)
- Line 296: `['--management-token-alias']` → `['-a', '--alias']`
- Line 301: `['-n', '--filePath']` → `['--file-path']`
- Line 306: `['--multi']` → `['--multiple']`

### 3. contentstack-migrate-rte
**File**: `packages/contentstack-migrate-rte/src/commands/cm/entries/migrate-html-rte.js`
- Line 129: `['-p', '--configPath']` → `['-c', '--config-path']`
- Line 134: `['-c', '--content_type']` → `['--content-type']`
- Line 140: `['-g', '--isGlobalField']` → `['--global-field']`
- Line 146: `['-h', '--htmlPath']` → `['--html-path']`
- Line 152: `['-j', '--jsonPath']` → `['--json-path']`

### 4. contentstack-import
**File**: `packages/contentstack-import/src/commands/cm/stacks/import.ts`
- Line 43: `['-s', '--stack-uid']` → `['-k', '--stack-api-key']`
- Line 52: `['--data']` → `['--data-dir']`
- Line 65: `['--management-token-alias']` → `['-a', '--alias']`
- Line 71: `['-A', '--auth-token']` (no replacement)
- Line 78: `['-m']` → `['--module']`
- Line 83: `['-b']` → `['--backup-dir']`
- Line 89: `['-B']` → `['--branch']`
- Line 111: `['--skip-app-recreation']` (no replacement)

### 5. contentstack-import-setup
**File**: `packages/contentstack-import-setup/src/commands/cm/stacks/import-setup.ts`
- Line 55: `['-B']` → `['--branch']`

### 6. contentstack-export
**File**: `packages/contentstack-export/src/commands/cm/stacks/export.ts`
- Line 47: `['-s', '--stack-uid']` → `['-k', '--stack-api-key']`
- Line 56: `['--data']` → `['--data-dir']`
- Line 69: `['--management-token-alias']` → `['-a', '--alias']`
- Line 75: `['-A', '--auth-token']` (no replacement)
- Line 81: `['-m']` → `['--module']`
- Line 88: `['-t']` → `['--content-types']`
- Line 95: `['-B']` → `['--branch']`

### 7. contentstack-config
**File**: `packages/contentstack-config/src/commands/config/set/region.ts`
- Line 24: `['-d']` → `['--cda']`
- Line 31: `['-m']` → `['--cma']`

### 8. contentstack-bulk-publish

#### 8.1. Unpublish Command
**File**: `packages/contentstack-bulk-publish/src/commands/cm/stacks/unpublish.js`
- Line 190: `['-l']` → `['--locale']`
- Line 196: `['-B']` → `['--branch']`
- Line 231: `['-r', '--retryFailed']` → `['--retry-failed']`
- Line 239: `['-b', '--bulkUnpublish']` → `['--bulk-unpublish']`
- Line 245: `['-t', '--contentType']` → `['--content-type']`
- Line 251: `['-x', '--deliveryToken']` → `['--delivery-token']`
- Line 257: `['--onlyAssets']` → `['--only-assets']`
- Line 263: `['--onlyEntries']` → `['--only-entries']`

#### 8.2. Publish Revert Command
**File**: `packages/contentstack-bulk-publish/src/commands/cm/stacks/publish-revert.js`
- Line 86: `['-r', '--retryFailed']` → `['--retry-failed']`
- Line 92: `['-l', '--logFile']` → `['--log-file']`

#### 8.3. Publish Clear Logs Command
**File**: `packages/contentstack-bulk-publish/src/commands/cm/stacks/publish-clear-logs.js`
- Line 69: `['-l', '--list']` → `['--log-files-count']`

#### 8.4. Update and Publish Command
**File**: `packages/contentstack-bulk-publish/src/commands/cm/entries/update-and-publish.js`
- Line 166: `['-l']` → `['--locales']`
- Line 173: `['-B']` → `['--branch']`
- Line 185: `['-r', '--retryFailed']` → `['--retry-failed']`
- Line 192: `['-b', '--bulkPublish']` → `['--bulk-publish']`
- Line 198: `['-t', '--contentTypes']` → `['--content-types']`

#### 8.5. Publish Command
**File**: `packages/contentstack-bulk-publish/src/commands/cm/entries/publish.js`
- Line 200: `['-r', '--retryFailed']` → `['--retry-failed']`
- Line 210: `['-b', '--bulkPublish']` → `['--bulk-publish']`
- Line 228: `['-o', '--publishAllContentTypes']` → `['--publish-all-content-types']`
- Line 240: `['-t', '--contentTypes']` → `['--content-types']`
- Line 248: `['-l']` → `['--locales']`
- Line 270: `['-B']` → `['--branch']`

#### 8.6. Publish Only Unpublished Command
**File**: `packages/contentstack-bulk-publish/src/commands/cm/entries/publish-only-unpublished.js`
- Line 33: `['--retryFailed', '-r']` → `['--retry-failed']`
- Line 44: `['--bulkPublish', '-b']` → `['--bulk-publish']`
- Line 59: `['--sourceEnv', '-s']` → `['--source-env']`
- Line 69: `['--contentTypes', '-t']` → `['--content-types']`
- Line 79: `['-l']` → `['--locales']`
- Line 91: `['-B']` → `['--branch']`

#### 8.7. Publish Non-Localized Fields Command
**File**: `packages/contentstack-bulk-publish/src/commands/cm/entries/publish-non-localized-fields.js`
- Line 177: `['-B']` → `['--branch']`
- Line 185: `['-r', '--retryFailed']` → `['--retry-failed']`
- Line 193: `['-b', '--bulkPublish']` → `['--bulk-publish']`
- Line 202: `['-s', '--sourceEnv']` → `['--source-env']`
- Line 209: `['-t', '--contentTypes']` → `['--content-types']`

#### 8.8. Publish Modified Command
**File**: `packages/contentstack-bulk-publish/src/commands/cm/entries/publish-modified.js`
- Line 144: `['-r', '--retryFailed']` → `['--retry-failed']`
- Line 154: `['-b', '--bulkPublish']` → `['--bulk-publish']`
- Line 167: `['-s', '--sourceEnv']` → `['--source-env']`
- Line 177: `['-t', '--contentTypes']` → `['--content-types']`
- Line 190: `['-l']` → `['--locales']`
- Line 212: `['-B']` → `['--branch']`

#### 8.9. Cross Publish Command
**File**: `packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/cross-publish.js`
- Line 185: `['--retryFailed', '-r']` → `['--retry-failed']`
- Line 195: `['--bulkPublish', '-b']` → `['--bulk-publish']`
- Line 209: `['--contentType', '-t']` → `['--content-type']`
- Line 219: `['-l']` → `['--locales']`
- Line 228: `['--environment', '-e']` → `['--source-env']`
- Line 238: `['--destEnv']` → `['--environments']`
- Line 248: `['--deliveryToken', '-x']` → `['--delivery-token']`
- Line 259: `['-B']` (no replacement specified)

#### 8.10. Assets Publish Command
**File**: `packages/contentstack-bulk-publish/src/commands/cm/assets/publish.js`
- Line 202: `['-l']` → `['--locales']`
- Line 209: `['-B']` → `['--branch']`
- Line 217: `['-r', '--retryFailed']` → `['--retry-failed']`
- Line 223: `['-u', '--folderUid']` → `['--folder-uid']`
- Line 232: `['-b', '--bulkPublish']` → `['--bulk-publish']`

### 9. contentstack-bootstrap
**File**: `packages/contentstack-bootstrap/src/commands/cm/bootstrap.ts`
- Line 94: `['-a', '--appName']` → `['--app-name']`
- Line 103: `['-d', '--directory']` → `['--project-dir']`
- Line 111: `['-s', '--appType']` → `['--app-type']`

### 10. contentstack-auth

#### 10.1. Tokens Add Command
**File**: `packages/contentstack-auth/src/commands/auth/tokens/add.ts`
- Line 39: `['-d']` → `['--delivery']`
- Line 45: `['-m']` → `['--management']`
- Line 58: `['-t']` → `['--token']`
- Line 65: `['api-key']` → `['-k', 'stack-api-key']`
- Line 71: `['-f', '--force']` → `['-y', '--yes']`

#### 10.2. Logout Command
**File**: `packages/contentstack-auth/src/commands/auth/logout.ts`
- Line 34: `['-f', '--force']` → `['-y', '--yes']`

## Summary Statistics

- **Total files using printFlagDeprecation**: 20 files
- **Total usages**: ~115 instances
- **Packages using it**: 10 packages
  - contentstack-seed
  - contentstack-migration
  - contentstack-migrate-rte
  - contentstack-import
  - contentstack-import-setup
  - contentstack-export
  - contentstack-config
  - contentstack-bulk-publish (10 command files)
  - contentstack-bootstrap
  - contentstack-auth (2 command files)

## Common Patterns

1. **Short flags to long flags**: `['-l']` → `['--locale']` or `['--locales']`
2. **CamelCase to kebab-case**: `['--retryFailed']` → `['--retry-failed']`
3. **Old flag names to new flag names**: `['--api-key']` → `['--stack-api-key']`
4. **Flag aliases**: `['-f', '--force']` → `['-y', '--yes']`
5. **Branch flag standardization**: `['-B']` → `['--branch']` (used in 8+ files)

