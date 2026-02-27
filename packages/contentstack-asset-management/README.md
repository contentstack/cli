# @contentstack/cli-asset-management

Asset Management 2.0 API adapter for Contentstack CLI export and import. Used by the export and import plugins when Asset Management (AM 2.0) is enabled. To learn how to export and import content in Contentstack, refer to the [Migration guide](https://www.contentstack.com/docs/developers/cli/migration/).

[![License](https://img.shields.io/npm/l/@contentstack/cli)](https://github.com/contentstack/cli/blob/main/LICENSE)

<!-- toc -->
* [@contentstack/cli-asset-management](#contentstackcli-asset-management)
* [Overview](#overview)
* [Usage](#usage)
* [Exports](#exports)
<!-- tocstop -->

# Overview

This package provides:

- **AssetManagementAdapter** – HTTP client for the Asset Management API (spaces, assets, folders, fields, asset types).
- **exportSpaceStructure** – Exports space metadata and full workspace structure (metadata, folders, assets, fields, asset types) for linked workspaces.
- **Types** – `AssetManagementExportOptions`, `LinkedWorkspace`, `IAssetManagementAdapter`, and related types for export/import integration.

# Usage

This package is consumed by the export and import plugins. When using the export CLI with the `--asset-management` flag (or when the host app enables AM 2.0), the export plugin calls `exportSpaceStructure` with linked workspaces and options:

```ts
import { exportSpaceStructure } from '@contentstack/cli-asset-management';

await exportSpaceStructure({
  linkedWorkspaces,
  exportDir,
  branchName: 'main',
  assetManagementUrl,
  org_uid,
  context,
  progressManager,
  progressProcessName,
  updateStatus,
  downloadAsset, // optional
});
```

# Exports

| Export | Description |
|--------|-------------|
| `exportSpaceStructure` | Async function to export space structure for given linked workspaces. |
| `AssetManagementAdapter` | Class to call the Asset Management API (getSpace, getWorkspaceFields, getWorkspaceAssets, etc.). |
| Types from `./types` | `AssetManagementExportOptions`, `ExportSpaceOptions`, `ChunkedJsonWriteOptions`, `LinkedWorkspace`, `SpaceResponse`, `FieldsResponse`, `AssetTypesResponse`, and related API types. |
