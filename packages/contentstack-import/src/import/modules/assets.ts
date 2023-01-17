import map from 'lodash/map';
import chunk from 'lodash/chunk';
import values from 'lodash/values';
import filter from 'lodash/filter';
import uniqBy from 'lodash/uniqBy';
import isArray from 'lodash/isArray';
import unionBy from 'lodash/unionBy';
import orderBy from 'lodash/orderBy';
import isEmpty from 'lodash/isEmpty';
import includes from 'lodash/includes';
import progress from 'progress-stream';
import { createWriteStream } from 'node:fs';
import { resolve as pResolve, join } from 'node:path';
import { FsUtility, getDirectories } from '@contentstack/cli-utilities';

import config from '../../config';
import { log, formatError } from '../../utils';
import BaseClass, { CustomPromiseHandler, CustomPromiseHandlerInput } from './base-class';

export default class ExportAssets extends BaseClass {
  private envPath: string;
  private assetsPath: string;
  private mapperDirPath: string;
  private assetsRootPath: string;
  private assetUidMapperPath: string;
  private assetUrlMapperPath: string;
  private assetFolderUidMapperPath: string;
  public assetConfig = config.modules.assets;
  private assetsFolderMap: Record<string, unknown> = {};
  private assetsUidMap: Record<string, unknown> = {};
  private assetsUrlMap: Record<string, unknown> = {};
  private versionedAssets: Record<string, unknown>[] = [];

  constructor({ importConfig, stackAPIClient }) {
    super({ importConfig, stackAPIClient });

    this.assetsPath = join(this.importConfig.backupDir, 'assets');
    this.mapperDirPath = join(this.importConfig.backupDir, 'mapper', 'assets');
    this.assetUidMapperPath = join(this.mapperDirPath, 'uid-mapping.json');
    this.assetUrlMapperPath = join(this.mapperDirPath, 'url-mapping.json');
    this.assetFolderUidMapperPath = join(this.mapperDirPath, 'folder-mapping.json');
    this.assetsRootPath = join(this.importConfig.backupDir, this.assetConfig.dirName);
    this.envPath = join(this.importConfig.backupDir, 'environments', 'environments.json');
  }

  async start(): Promise<void> {
    // const start = +new Date();
    // NOTE Step 1: Import folders and create uid mapping file
    await this.importFolders();
    // NOTE Step 2: Import Assets and create it mapping files (uid, url)
    await this.importAssets();
    // NOTE log function => this.logFn(start);
  }

  /**
   * @method importFolders
   * @returns Promise<any>
   */
  async importFolders(): Promise<any> {
    const folders = new FsUtility({ basePath: this.assetsRootPath }).readFile(
      pResolve(this.assetsRootPath, 'folders.json'),
    );
    if (isEmpty(folders)) {
      log(this.importConfig, 'No folders found to import', 'info');
      return;
    }
    const batches = this.constructFolderImportOrder(folders);
    const onSuccess = ({ response, apiData: { uid, name } = { uid: null, name: '' } }: any) => {
      this.assetsFolderMap[uid] = response.uid;
      log(this.importConfig, `Created folder: '${name}'`, 'success');
    };
    const onReject = ({ error, apiData: { name } = { name: '' } }: any) => {
      log(this.importConfig, `${name} folder creation failed.!`, 'error');
      log(this.importConfig, formatError(error), 'error');
    };
    const serializeData = (folder) => {
      if (folder.parent_uid) {
        folder.parent_uid = this.assetsFolderMap[folder.parent_uid];
      }

      return folder;
    };

    const batch = map(unionBy(batches, 'parent_uid'), 'parent_uid');

    for (const parent_uid of batch) {
      // NOTE create parent folders
      await this.makeConcurrentCall(
        {
          apiContent: orderBy(filter(batches, { parent_uid }), 'created_at'),
          processName: 'import assets folders',
          apiParams: {
            serializeData,
            reject: onReject,
            resolve: onSuccess,
            entity: 'create-assets-folder',
            includeParamOnCompletion: true,
          },
          concurrencyLimit: this.assetConfig.importFoldersConcurrency,
        },
        undefined,
        false,
      );
    }

    if (!isEmpty(this.assetsFolderMap)) {
      new FsUtility({ basePath: this.mapperDirPath }).writeFile(this.assetFolderUidMapperPath, this.assetsFolderMap);
    }
  }

  /**
   * @method importAssets
   * @param isVersion boolean
   */
  async importAssets(isVersion = false) {
    const indexFileName = isVersion ? 'versioned-assets.json' : 'assets.json';
    const basePath = isVersion ? join(this.assetsPath, 'versions') : this.assetsPath;
    const fs = new FsUtility({ basePath, indexFileName });
    const indexer = fs.indexFileContent;

    if (isEmpty(this.assetsFolderMap)) {
      this.assetsFolderMap = fs.readFile(this.assetFolderUidMapperPath, true) as any;
    }

    const onSuccess = ({ response, apiData: { uid, url, title } = undefined }: any) => {
      this.assetsUidMap[uid] = response.uid;
      this.assetsUrlMap[url] = response.asset.url;
      log(this.importConfig, `Created folder: '${title}'`, 'success');
    };
    const onReject = ({ error, apiData: { title } = undefined }: any) => {
      log(this.importConfig, `${title} asset upload failed.!`, 'error');
      log(this.importConfig, formatError(error), 'error');
    };
    const serializeData = (asset) => {
      asset.upload = join(this.assetsPath, 'files', asset.uid, asset.filename);

      if (asset.parent_uid) {
        asset.parent_uid = this.assetsFolderMap[asset.parent_uid];
      }

      return asset;
    };

    for (const _index in indexer) {
      const apiContent = (await fs.readChunkFiles.next()) as Record<string, any>[];
      await this.makeConcurrentCall({
        apiContent,
        processName: 'import assets',
        apiParams: {
          serializeData,
          reject: onReject,
          resolve: onSuccess,
          entity: 'create-assets',
          includeParamOnCompletion: true,
        },
        concurrencyLimit: this.assetConfig.uploadAssetsConcurrency,
      });
    }

    if (!isEmpty(this.assetsFolderMap)) {
      const fs = new FsUtility({ basePath: this.mapperDirPath });
      fs.writeFile(this.assetUidMapperPath, this.assetsUidMap);
      fs.writeFile(this.assetUrlMapperPath, this.assetsUrlMap);
    }
  }

  /**
   * @method constructFolderImportOrder
   * @param folders object
   * @returns Array<Record<string, any>>
   */
  constructFolderImportOrder(folders): Array<Record<string, any>> {
    let parentUid = [];
    // NOTE: Read root folder
    const importOrder = filter(folders, { parent_uid: null }).map(({ uid, name, parent_uid, created_at }) => {
      parentUid.push(uid);
      return { uid, name, parent_uid, created_at };
    });

    while (!isEmpty(parentUid)) {
      // NOTE: Read nested folders every iteration until we find empty folders
      parentUid = filter(folders, ({ parent_uid }) => includes(parentUid, parent_uid)).map(
        ({ uid, name, parent_uid, created_at }) => {
          importOrder.push({ uid, name, parent_uid, created_at });
          return uid;
        },
      );
    }

    return importOrder;
  }

  logFn(start: number): void {
    const end = Date.now();
    const exeTime = end - start;

    console.log(
      `In Assets: Time taken to execute: ${exeTime} milliseconds; wait time: ${
        exeTime < 1000 ? 1000 - exeTime : 0
      } milliseconds`,
    );
  }
}
