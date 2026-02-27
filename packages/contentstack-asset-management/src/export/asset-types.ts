import { log } from '@contentstack/cli-utilities';

import type { AssetManagementAPIConfig } from '../types/asset-management-api';
import type { ExportContext } from '../types/export-types';
import { AssetManagementExportAdapter } from './base';
import { getArrayFromResponse } from '../utils/export-helpers';
import { PROCESS_NAMES } from '../constants/index';

export default class ExportAssetTypes extends AssetManagementExportAdapter {
  constructor(apiConfig: AssetManagementAPIConfig, exportContext: ExportContext) {
    super(apiConfig, exportContext);
  }

  async start(spaceUid: string): Promise<void> {
    await this.init();
    const assetTypesData = await this.getWorkspaceAssetTypes(spaceUid);
    const items = getArrayFromResponse(assetTypesData, 'asset_types');
    const dir = this.getAssetTypesDir();
    log.debug(
      items.length === 0
        ? 'No asset types, wrote empty asset-types'
        : `Writing ${items.length} shared asset types`,
      this.exportContext.context,
    );
    await this.writeItemsToChunkedJson(dir, 'asset-types.json', 'asset_types', ['uid', 'title', 'category', 'file_extension'], items);
    this.tick(true, PROCESS_NAMES.AM_ASSET_TYPES, null);
  }
}
