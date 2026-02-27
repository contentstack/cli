import { resolve as pResolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { FsUtility, log, CLIProgressManager, configHandler } from '@contentstack/cli-utilities';

import type { AssetManagementAPIConfig } from '../types/asset-management-api';
import type { ExportContext } from '../types/export-types';
import { AssetManagementAdapter } from '../utils/asset-management-api-adapter';
import { AM_MAIN_PROCESS_NAME } from '../constants/index';
import { BATCH_SIZE, CHUNK_FILE_SIZE_MB } from '../utils/export-helpers';

export type { ExportContext };

/**
 * Base class for export modules. Extends the API adapter and adds export context,
 * internal progress management, and shared write helpers.
 */
export class AssetManagementExportAdapter extends AssetManagementAdapter {
  protected readonly apiConfig: AssetManagementAPIConfig;
  protected readonly exportContext: ExportContext;
  protected progressManager: CLIProgressManager | null = null;
  protected parentProgressManager: CLIProgressManager | null = null;
  protected readonly processName: string = AM_MAIN_PROCESS_NAME;

  constructor(apiConfig: AssetManagementAPIConfig, exportContext: ExportContext) {
    super(apiConfig);
    this.apiConfig = apiConfig;
    this.exportContext = exportContext;
  }

  public setParentProgressManager(parent: CLIProgressManager): void {
    this.parentProgressManager = parent;
  }

  protected get progressOrParent(): CLIProgressManager | null {
    return this.parentProgressManager ?? this.progressManager;
  }

  protected createNestedProgress(moduleName: string): CLIProgressManager {
    if (this.parentProgressManager) {
      this.progressManager = this.parentProgressManager;
      return this.parentProgressManager;
    }
    const logConfig = configHandler.get('log') || {};
    const showConsoleLogs = logConfig.showConsoleLogs ?? false;
    this.progressManager = CLIProgressManager.createNested(moduleName, showConsoleLogs);
    return this.progressManager;
  }

  protected tick(success: boolean, itemName: string, error: string | null, processName?: string): void {
    this.progressOrParent?.tick?.(success, itemName, error, processName ?? this.processName);
  }

  protected updateStatus(message: string, processName?: string): void {
    this.progressOrParent?.updateStatus?.(message, processName ?? this.processName);
  }

  protected completeProcess(processName: string, success: boolean): void {
    if (!this.parentProgressManager) {
      this.progressManager?.completeProcess?.(processName, success);
    }
  }

  protected get spacesRootPath(): string {
    return this.exportContext.spacesRootPath;
  }

  protected getAssetTypesDir(): string {
    return pResolve(this.exportContext.spacesRootPath, 'asset_types');
  }

  protected getFieldsDir(): string {
    return pResolve(this.exportContext.spacesRootPath, 'fields');
  }

  protected async writeItemsToChunkedJson(
    dir: string,
    indexFileName: string,
    moduleName: string,
    metaPickKeys: string[],
    items: unknown[],
  ): Promise<void> {
    if (items.length === 0) {
      await writeFile(pResolve(dir, indexFileName), '{}');
      return;
    }
    const fs = new FsUtility({
      basePath: dir,
      indexFileName,
      chunkFileSize: CHUNK_FILE_SIZE_MB,
      moduleName,
      fileExt: 'json',
      metaPickKeys,
      keepMetadata: true,
    });
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      fs.writeIntoFile(batch as Record<string, string>[], { mapKeyVal: true });
    }
    fs.completeFile(true);
  }
}
