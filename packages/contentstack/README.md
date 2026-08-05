# @contentstack/cli

Use Contentstack Command-line Interface (CLI) to interact with Contentstack directly from your terminal.

[![License](https://img.shields.io/npm/l/@contentstack/cli)](https://github.com/contentstack/cli/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/v/@contentstack/cli)](https://www.npmjs.com/package/@contentstack/cli)

## Requirements

Node.js v22 or higher — download from [nodejs.org](https://nodejs.org/).

## Installation

```sh
npm install -g @contentstack/cli
```

## Usage

```sh
csdx --version
csdx --help
csdx auth:login
```

For complete documentation, visit the [Contentstack CLI docs](https://www.contentstack.com/docs/developers/cli).

## Bundled Plugins

| Plugin | Description | Docs |
|--------|-------------|------|
| [`@contentstack/cli-auth`](https://www.npmjs.com/package/@contentstack/cli-auth) | Authentication — login, logout, token management | [Docs](https://www.contentstack.com/docs/headless-cms/cli-authentication) |
| [`@contentstack/cli-config`](https://www.npmjs.com/package/@contentstack/cli-config) | Region and early-access header configuration | [Docs](https://www.contentstack.com/docs/headless-cms/configure-regions-in-the-cli) |
| [`@contentstack/cli-cm-import`](https://www.npmjs.com/package/@contentstack/cli-cm-import) | Import stacks and modules into Contentstack | [Docs](https://www.contentstack.com/docs/headless-cms/import-content-using-the-cli) |
| [`@contentstack/cli-cm-export`](https://www.npmjs.com/package/@contentstack/cli-cm-export) | Export stacks and modules from Contentstack | [Docs](https://www.contentstack.com/docs/headless-cms/export-content-using-the-cli) |
| [`@contentstack/cli-cm-seed`](https://www.npmjs.com/package/@contentstack/cli-cm-seed) | Seed a stack from a GitHub repository | [Docs](https://www.contentstack.com/docs/headless-cms/import-content-using-the-seed-command) |
| [`@contentstack/cli-cm-bootstrap`](https://www.npmjs.com/package/@contentstack/cli-cm-bootstrap) | Bootstrap a new Contentstack project | [Docs](https://www.contentstack.com/docs/headless-cms/bootstrap-starter-apps/) |
| [`@contentstack/cli-cm-export-to-csv`](https://www.npmjs.com/package/@contentstack/cli-cm-export-to-csv) | Export entries, taxonomies, terms, and org users to CSV | [Docs](https://www.contentstack.com/docs/headless-cms/export-content-to-csv-file/) |
| [`@contentstack/cli-cm-clone`](https://www.npmjs.com/package/@contentstack/cli-cm-clone) | Clone a stack to another stack | [Docs](https://www.contentstack.com/docs/headless-cms/cloning-a-stack) |
| [`@contentstack/cli-cm-migrate-rte`](https://www.npmjs.com/package/@contentstack/cli-cm-migrate-rte) | Migrate HTML RTE entries to JSON RTE | [Docs](https://www.contentstack.com/docs/headless-cms/migrate-content-from-html-rte-to-json-rte) |
| [`@contentstack/cli-migration`](https://www.npmjs.com/package/@contentstack/cli-migration) | Run stack migration scripts | [Docs](https://www.contentstack.com/docs/headless-cms/migrate-your-content-using-the-cli-migration-command/) |
| [`@contentstack/cli-cm-bulk-publish`](https://www.npmjs.com/package/@contentstack/cli-cm-bulk-publish) | Bulk publish and unpublish entries and assets | [Docs](https://www.contentstack.com/docs/headless-cms/bulk-publish-and-unpublish-content) |
| [`@contentstack/cli-cm-branches`](https://www.npmjs.com/package/@contentstack/cli-cm-branches) | Branch management — create, diff, and merge | [Docs](https://www.contentstack.com/docs/headless-cms/compare-and-merge-branches-using-the-cli/) |
| [`@contentstack/cli-audit`](https://www.npmjs.com/package/@contentstack/cli-audit) | Audit and fix content type and entry issues | [Docs](https://www.contentstack.com/docs/headless-cms/audit-plugin) |
| [`@contentstack/cli-launch`](https://www.npmjs.com/package/@contentstack/cli-launch) | Deploy and manage Contentstack Launch projects | [Docs](https://www.contentstack.com/docs/headless-cms/cli-for-launch/) |

## Installable Plugins

These are Contentstack-owned plugins not bundled in the default install. Add any of them with:

```sh
csdx plugins:install <plugin-name>
```

| Plugin | Description | Docs |
|--------|-------------|------|
| [`@contentstack/apps-cli`](https://www.npmjs.com/package/@contentstack/apps-cli) | Build, deploy, and manage Contentstack apps | [Docs](https://www.contentstack.com/docs/headless-cms/apps-cli-plugin) |
| [`contentstack-cli-tsgen`](https://www.npmjs.com/package/contentstack-cli-tsgen) | Generate TypeScript typings from a stack's content types | [Docs](https://www.contentstack.com/docs/headless-cms/tsgen-plugin) |
| [`contentstack-cli-content-type`](https://www.npmjs.com/package/contentstack-cli-content-type) | Retrieve and inspect content types in a stack | [Docs](https://www.contentstack.com/docs/headless-cms/cli-content-type-plugin) |
| [`@contentstack/cli-cm-regex-validate`](https://www.npmjs.com/package/@contentstack/cli-cm-regex-validate) | Validate regex properties on content type and global fields | [Docs](https://www.contentstack.com/docs/headless-cms/cli-regex-validate-plugin) |
| [`@contentstack/cli-external-migrate`](https://www.npmjs.com/package/@contentstack/cli-external-migrate) | Migrate content from an external source into Contentstack | — |
| [`@contentstack/cli-cm-export-query`](https://www.npmjs.com/package/@contentstack/cli-cm-export-query) | Export stack content using query filters | [Docs](https://www.contentstack.com/docs/headless-cms/query-based-export) |

## License

[MIT](https://github.com/contentstack/cli/blob/main/LICENSE)
