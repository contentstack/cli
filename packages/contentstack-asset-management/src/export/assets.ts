import { resolve as pResolve } from 'node:path';
import { Readable } from 'node:stream';
import { mkdir, writeFile } from 'node:fs/promises';
import { configHandler, log } from '@contentstack/cli-utilities';

import type { AssetManagementAPIConfig, LinkedWorkspace } from '../types/asset-management-api';
import type { ExportContext } from '../types/export-types';
import { AssetManagementExportAdapter } from './base';
import { getAssetItems, writeStreamToFile } from '../utils/export-helpers';
import { PROCESS_NAMES, PROCESS_STATUS } from '../constants/index';

export default class ExportAssets extends AssetManagementExportAdapter {
  constructor(apiConfig: AssetManagementAPIConfig, exportContext: ExportContext) {
    super(apiConfig, exportContext);
  }

  async start(workspace: LinkedWorkspace, spaceDir: string): Promise<void> {
    await this.init();
    const assetsDir = pResolve(spaceDir, 'assets');
    await mkdir(assetsDir, { recursive: true });
    log.debug(`Fetching folders and assets for space ${workspace.space_uid}`, this.exportContext.context);

    const [folders, assetsData] = await Promise.all([
      this.getWorkspaceFolders(workspace.space_uid),
      this.getWorkspaceAssets(workspace.space_uid),
    ]);

    await writeFile(pResolve(assetsDir, 'folders.json'), JSON.stringify(folders, null, 2));
    this.tick(true, `folders: ${workspace.space_uid}`, null);
    log.debug(`Wrote folders.json for space ${workspace.space_uid}`, this.exportContext.context);

    const assetItems = getAssetItems(assetsData);
    log.debug(
      assetItems.length === 0
        ? `No assets for space ${workspace.space_uid}, wrote empty assets.json`
        : `Writing ${assetItems.length} assets metadata for space ${workspace.space_uid}`,
      this.exportContext.context,
    );
    await this.writeItemsToChunkedJson(
      assetsDir,
      'assets.json',
      'assets',
      ['uid', 'url', 'filename', 'file_name', 'parent_uid'],
      assetItems,
    );
    this.tick(true, `assets: ${workspace.space_uid} (${assetItems.length})`, null);

    await this.downloadWorkspaceAssets(assetsData, assetsDir, workspace.space_uid);
  }

  private async downloadWorkspaceAssets(
    assetsData: unknown,
    assetsDir: string,
    spaceUid: string,
  ): Promise<void> {
    const items = getAssetItems(assetsData);
    if (items.length === 0) {
      log.debug('No assets to download', this.exportContext.context);
      return;
    }

    this.updateStatus(PROCESS_STATUS[PROCESS_NAMES.AM_DOWNLOADS].DOWNLOADING);
    log.debug(`Downloading ${items.length} asset file(s) for space ${spaceUid}...`, this.exportContext.context);
    const filesDir = pResolve(assetsDir, 'files');
    await mkdir(filesDir, { recursive: true });

    const securedAssets = this.exportContext.securedAssets ?? false;
    const authtoken = securedAssets ? configHandler.get('authtoken') : null;
    let lastError: string | null = null;
    let allSuccess = true;

    for (const asset of items) {
      const uid = asset.uid ?? asset._uid;
      const url = asset.url;
      const filename = asset.filename ?? asset.file_name ?? 'asset';
      if (!url || !uid) continue;
      try {
        const separator = url.includes('?') ? '&' : '?';
        const downloadUrl = securedAssets && authtoken ? `${url}${separator}authtoken=${authtoken}` : url;
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = response.body;
        if (!body) throw new Error('No response body');
        const nodeStream = Readable.fromWeb(body as Parameters<typeof Readable.fromWeb>[0]);
        const assetFolderPath = pResolve(filesDir, uid);
        await mkdir(assetFolderPath, { recursive: true });
        const filePath = pResolve(assetFolderPath, filename);
        await writeStreamToFile(nodeStream, filePath);
        log.debug(`Downloaded asset ${uid}`, this.exportContext.context);
      } catch (e) {
        allSuccess = false;
        lastError = (e as Error)?.message ?? PROCESS_STATUS[PROCESS_NAMES.AM_DOWNLOADS].FAILED;
        log.debug(`Failed to download asset ${uid}: ${e}`, this.exportContext.context);
      }
    }

    this.tick(allSuccess, `downloads: ${spaceUid}`, lastError);
    log.debug('Asset downloads completed', this.exportContext.context);
  }
}
