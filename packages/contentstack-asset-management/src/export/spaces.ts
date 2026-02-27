import { resolve as pResolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { log, CLIProgressManager, configHandler } from '@contentstack/cli-utilities';

import type { AssetManagementExportOptions, AssetManagementAPIConfig } from '../types/asset-management-api';
import type { ExportContext } from '../types/export-types';
import { AssetManagementAdapter } from '../utils/asset-management-api-adapter';
import { AM_MAIN_PROCESS_NAME, PROCESS_NAMES, PROCESS_STATUS } from '../constants/index';
import ExportAssetTypes from './asset-types';
import ExportFields from './fields';
import ExportWorkspace from './workspaces';

/**
 * Orchestrates the full Asset Management 2.0 export: shared asset types and fields,
 * then per-workspace metadata and assets (including internal download).
 * Progress and download are fully owned by this package.
 */
export class ExportSpaces {
  private readonly options: AssetManagementExportOptions;
  private parentProgressManager: CLIProgressManager | null = null;
  private progressManager: CLIProgressManager | null = null;

  constructor(options: AssetManagementExportOptions) {
    this.options = options;
  }

  public setParentProgressManager(parent: CLIProgressManager): void {
    this.parentProgressManager = parent;
  }

  async start(): Promise<void> {
    const {
      linkedWorkspaces,
      exportDir,
      branchName,
      assetManagementUrl,
      org_uid,
      context,
      securedAssets,
    } = this.options;

    if (!linkedWorkspaces.length) {
      log.debug('No linked workspaces to export', context);
      return;
    }

    log.debug(`Exporting Asset Management 2.0 (${linkedWorkspaces.length} space(s))`, context);
    log.debug(`Spaces: ${linkedWorkspaces.map((ws) => ws.space_uid).join(', ')}`, context);

    const spacesRootPath = pResolve(exportDir, branchName || 'main', 'spaces');
    await mkdir(spacesRootPath, { recursive: true });
    log.debug(`Spaces root path: ${spacesRootPath}`, context);

    const totalSteps = 2 + linkedWorkspaces.length * 4;
    const progress = this.createProgress();
    progress.addProcess(AM_MAIN_PROCESS_NAME, totalSteps);
    progress.startProcess(AM_MAIN_PROCESS_NAME).updateStatus(PROCESS_STATUS[PROCESS_NAMES.AM_FIELDS].FETCHING, AM_MAIN_PROCESS_NAME);

    const apiConfig: AssetManagementAPIConfig = {
      baseURL: assetManagementUrl,
      headers: { organization_uid: org_uid },
      context,
    };
    const exportContext: ExportContext = {
      spacesRootPath,
      context,
      securedAssets,
    };

    const sharedFieldsDir = pResolve(spacesRootPath, 'fields');
    const sharedAssetTypesDir = pResolve(spacesRootPath, 'asset_types');
    await mkdir(sharedFieldsDir, { recursive: true });
    await mkdir(sharedAssetTypesDir, { recursive: true });

    const firstSpaceUid = linkedWorkspaces[0].space_uid;
    try {
      const exportAssetTypes = new ExportAssetTypes(apiConfig, exportContext);
      exportAssetTypes.setParentProgressManager(progress);
      await exportAssetTypes.start(firstSpaceUid);

      const exportFields = new ExportFields(apiConfig, exportContext);
      exportFields.setParentProgressManager(progress);
      await exportFields.start(firstSpaceUid);

      for (const ws of linkedWorkspaces) {
        progress.updateStatus(`Exporting space: ${ws.space_uid}...`, AM_MAIN_PROCESS_NAME);
        log.debug(`Exporting space: ${ws.space_uid}`, context);
        const spaceDir = pResolve(spacesRootPath, ws.space_uid);
        try {
          const exportWorkspace = new ExportWorkspace(apiConfig, exportContext);
          exportWorkspace.setParentProgressManager(progress);
          await exportWorkspace.start(ws, spaceDir, branchName || 'main');
          log.debug(`Exported workspace structure for space ${ws.space_uid}`, context);
        } catch (err) {
          log.debug(`Failed to export workspace for space ${ws.space_uid}: ${err}`, context);
          progress.tick(
            false,
            `space: ${ws.space_uid}`,
            (err as Error)?.message ?? PROCESS_STATUS[PROCESS_NAMES.AM_SPACE_METADATA].FAILED,
            AM_MAIN_PROCESS_NAME,
          );
          throw err;
        }
      }

      progress.completeProcess(AM_MAIN_PROCESS_NAME, true);
      log.debug('Asset Management 2.0 export completed', context);
    } catch (err) {
      progress.completeProcess(AM_MAIN_PROCESS_NAME, false);
      throw err;
    }
  }

  private createProgress(): CLIProgressManager {
    if (this.parentProgressManager) {
      this.progressManager = this.parentProgressManager;
      return this.parentProgressManager;
    }
    const logConfig = configHandler.get('log') || {};
    const showConsoleLogs = logConfig.showConsoleLogs ?? false;
    this.progressManager = CLIProgressManager.createNested(AM_MAIN_PROCESS_NAME, showConsoleLogs);
    return this.progressManager;
  }
}

/**
 * Entry point for callers that prefer a function. Delegates to ExportSpaces.
 */
export async function exportSpaceStructure(options: AssetManagementExportOptions): Promise<void> {
  await new ExportSpaces(options).start();
}
