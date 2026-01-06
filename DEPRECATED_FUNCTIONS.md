# Deprecated Functions, Flags, and Commands

This document lists all deprecated functions, flags, and commands identified in the Contentstack CLI project.

## Deprecated Commands

The following CLI commands are marked as expired/deprecated and have replacement commands:

1. **`cm:seed`** → Use `csdx cm:stacks:seed`
   - Location: `packages/contentstack-seed/package.json`

2. **`cm:migration`** → Use `csdx cm:stacks:migration`
   - Location: `packages/contentstack-migration/package.json`

3. **`cm:migrate-rte`** → Use `csdx cm:entries:migrate-html-rte`
   - Location: `packages/contentstack-migrate-rte/package.json`

4. **`cm:import`** → Use `csdx cm:stacks:import`
   - Location: `packages/contentstack-import/package.json`

5. **`cm:export`** → Use `csdx cm:stacks:export`
   - Location: `packages/contentstack-export/package.json`

6. **`cm:stack-clone`** → Use `csdx cm:stacks:clone`
   - Location: `packages/contentstack-clone/package.json`

7. **`cm:bulk-publish:configure`** → Use `csdx cm:stacks:publish-configure`
8. **`cm:bulk-publish:clear`** → Use `csdx cm:stacks:publish-clear-logs`
9. **`cm:bulk-publish:revert`** → Use `csdx cm:stacks:publish-revert`
10. **`cm:bulk-publish:assets`** → Use `csdx cm:assets:publish`
11. **`cm:bulk-publish:add-fields`** → Use `csdx cm:entries:update-and-publish`
   - Location: `packages/contentstack-bulk-publish/package.json`

## Deprecated Flags

### 1. Contentstack Seed (`packages/contentstack-seed/src/commands/cm/stacks/seed.ts`)
- **`stack`** (flag `-s`) → Use `--stack-api-key` or `-k`
  - Line 68-76: Marked as "To be deprecated"

### 2. Migration Command (`packages/contentstack-migration/src/commands/cm/stacks/migration.js`)
- **`api-key`** (flag `-k`) → Use `--stack-api-key`
- **`authtoken`** (flag `-A`) → Deprecated
- **`management-token-alias`** → Use `--alias` or `-a`
- **`filePath`** (flag `-n`) → Use `--file-path`
- **`multi`** → Use `--multiple`
  - Line 275-308: Marked as "To be deprecated"

### 3. Migrate RTE Command (`packages/contentstack-migrate-rte/src/commands/cm/entries/migrate-html-rte.js`)
- **`configPath`** (flag `-p`) → Use `-c` or `--config-path`
- **`content_type`** (flag `-c`) → Use `--content-type`
- **`isGlobalField`** (flag `-g`) → Use `--global-field`
- **`htmlPath`** (flag `-h`) → Use `--html-path`
- **`jsonPath`** (flag `-j`) → Use `--json-path`
  - Line 124-153: Marked as "To be deprecated"

### 4. Unpublish Command (`packages/contentstack-bulk-publish/src/commands/cm/stacks/unpublish.js`)
- **`retryFailed`** (flag `-r`) → Use `--retry-failed`
- **`bulkUnpublish`** (flag `-b`) → Use `--bulk-unpublish`
- **`contentType`** (flag `-t`) → Use `--content-type`
- **`deliveryToken`** (flag `-x`) → Use `--delivery-token`
- **`onlyAssets`** → Use `--only-assets`
- **`onlyEntries`** → Use `--only-entries`
  - Line 226-264: Marked as "To be deprecated"

### 5. Publish Revert Command (`packages/contentstack-bulk-publish/src/commands/cm/stacks/publish-revert.js`)
- **`retryFailed`** (flag `-r`) → Use `--retry-failed`
- **`logFile`** (flag `-l`) → Use `--log-file`
  - Line 80-93: Marked as "To be deprecated"

### 6. Update and Publish Command (`packages/contentstack-bulk-publish/src/commands/cm/entries/update-and-publish.js`)
- **`retryFailed`** (flag `-r`) → Use `--retry-failed`
- **`bulkPublish`** (flag `-b`) → Use `--bulk-publish`
- **`contentTypes`** (flag `-t`) → Use `--content-types`
  - Line 180-199: Marked as "To be deprecated"

### 7. Publish Non-Localized Fields Command (`packages/contentstack-bulk-publish/src/commands/cm/entries/publish-non-localized-fields.js`)
- **`retryFailed`** (flag `-r`) → Use `--retry-failed`
- **`bulkPublish`** (flag `-b`) → Use `--bulk-publish`
- **`sourceEnv`** (flag `-s`) → Use `--source-env`
- **`contentTypes`** (flag `-t`) → Use `--content-types`
  - Line 180-210: Marked as "To be deprecated"

### 8. Assets Publish Command (`packages/contentstack-bulk-publish/src/commands/cm/assets/publish.js`)
- **`retryFailed`** (flag `-r`) → Use `--retry-failed`
- **`folderUid`** (flag `-u`) → Use `--folder-uid`
- **`bulkPublish`** (flag `-b`) → Use `--bulk-publish`
  - Line 212-233: Marked as "To be deprecated"

### 9. Bootstrap Command (`packages/contentstack-bootstrap/src/commands/cm/bootstrap.ts`)
- **`appName`** (flag `-a`) → Use `--app-name`
- **`directory`** (flag `-d`) → Use `--project-dir`
- **`appType`** (flag `-s`) → Use `--app-type`
  - Line 87-112: Marked as "To be deprecated"

### 10. Auth Tokens Add Command (`packages/contentstack-auth/src/commands/auth/tokens/add.ts`)
- **`api-key`** → Use `-k` or `--stack-api-key`
- **`force`** (flag `-f`) → Use `-y` or `--yes`
  - Line 61-78: Marked as "To be deprecated"

### 11. General Deprecated Flags (used across multiple commands)
- **`-l`** (short flag for locale) → Use `--locale` or `--locales`
- **`-B`** (short flag for branch) → Use `--branch`
- **`-A`** (short flag for authtoken) → Deprecated
- **`-r`** (short flag for repo) → Use `--repo`
- **`-o`** (short flag for org) → Use `--org`
- **`-d`** (short flag for delivery) → Use `--delivery`
- **`-m`** (short flag for management) → Use `--management`
- **`-t`** (short flag for token) → Use `--token`

## Deprecated Bootstrap App Configurations

The following app configurations are marked as deprecated in `packages/contentstack-bootstrap/src/config.ts`:

### Sample Apps (Deprecated):
- React JS (`reactjs`)
- Next JS (`nextjs`)
- Gatsby (`gatsby`)
- Angular (`angular`)

### Starter Apps (Deprecated):
- React JS Starter (`reactjs-starter`)
- Next JS Starter (`nextjs-starter`)
- Gatsby Starter (`gatsby-starter`)
- Angular Starter (`angular-starter`)
- Nuxt JS Starter (`nuxt-starter`)
- Vue JS Starter (`vue-starter`)
- Stencil Starter (`stencil-starter`)
- Nuxt3 Starter (`nuxt3-starter`)

## Deprecated Utility Functions

### Flag Deprecation Check Function
- **Location**: `packages/contentstack-utilities/src/flag-deprecation-check.ts`
- **Function**: `export default function (deprecatedFlags = [], suggestions = [], customMessage?: string)`
- **Purpose**: Utility function that checks for deprecated flags and prints warnings

### Command Deprecation Check Hook
- **Location**: `packages/contentstack/src/hooks/prerun/command-deprecation-check.ts`
- **Function**: `export default async function (_opts): Promise<void>`
- **Purpose**: Pre-run hook that checks for deprecated commands and prints warnings

## Deprecated Field Mappings

In `packages/contentstack-migrate-rte/src/lib/util/index.js`:
- **`configPath`** → `config-path`
- **`content_type`** → `content-type`
- **`isGlobalField`** → `global-field`
- **`htmlPath`** → `html-path`
- **`jsonPath`** → `json-path`

## Notes

- All deprecated flags are marked as `hidden: true` in their flag definitions
- Deprecated flags use the `printFlagDeprecation` utility to show warnings when used
- Deprecated commands are checked via a pre-run hook that displays warnings
- The deprecation system provides suggestions for replacement flags/commands
- Most deprecated items follow a pattern of converting camelCase to kebab-case for flags

