import map from 'lodash/map';
import chunk from 'lodash/chunk';
import values from 'lodash/values';
import filter from 'lodash/filter';
import uniqBy from 'lodash/uniqBy';
import forEach from 'lodash/forEach';
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
import BaseClass, { ApiOptions } from './base-class';

export default class ExportAssets extends BaseClass {
  private fs: FsUtility;
  private assetsPath: string;
  private mapperDirPath: string;
  private assetsRootPath: string;
  private assetUidMapperPath: string;
  private assetUrlMapperPath: string;
  private assetFolderUidMapperPath: string;
  public assetConfig = config.modules.assets;
  private environments: Record<string, any> = {};
  private assetsUidMap: Record<string, unknown> = {};
  private assetsUrlMap: Record<string, unknown> = {};
  private assetsFolderMap: Record<string, unknown> = {};

  constructor({ importConfig, stackAPIClient }) {
    super({ importConfig, stackAPIClient });

    this.assetsPath = join(this.importConfig.backupDir, 'assets');
    this.mapperDirPath = join(this.importConfig.backupDir, 'mapper', 'assets');
    this.assetUidMapperPath = join(this.mapperDirPath, 'uid-mapping.json');
    this.assetUrlMapperPath = join(this.mapperDirPath, 'url-mapping.json');
    this.assetFolderUidMapperPath = join(this.mapperDirPath, 'folder-mapping.json');
    this.assetsRootPath = join(this.importConfig.backupDir, this.assetConfig.dirName);
    this.fs = new FsUtility({ basePath: this.mapperDirPath });
    this.environments = this.fs.readFile(
      join(this.importConfig.backupDir, 'environments', 'environments.json'),
      true,
    ) as Record<string, unknown>;
  }

  async start(): Promise<void> {
    // NOTE Step 1: Import folders and create uid mapping file
    await this.importFolders();

    // NOTE Step 2: Import versioned assets and create it mapping files (uid, url)
    if (this.assetConfig.includeVersionedAssets) await this.importAssets(true);

    // NOTE Step 3: Import Assets and create it mapping files (uid, url)
    await this.importAssets();

    // NOTE Step 4: Publish assets
    if (this.assetConfig.publishAssets) await this.publish();
  }

  /**
   * @method importFolders
   * @returns Promise<any>
   */
  async importFolders(): Promise<any> {
    const folders = this.fs.readFile(pResolve(this.assetsRootPath, 'folders.json'));
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
    const serializeData = (apiOptions: ApiOptions) => {
      if (apiOptions.apiData.parent_uid) {
        apiOptions.apiData.parent_uid = this.assetsFolderMap[apiOptions.apiData.parent_uid];
      }

      return apiOptions;
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
      this.fs.writeFile(this.assetFolderUidMapperPath, this.assetsFolderMap);
    }
  }

  /**
   * @method importAssets
   * @param isVersion boolean
   */
  async importAssets(isVersion = false) {
    const processName = isVersion ? 'import versioned assets' : 'import assets';
    const indexFileName = isVersion ? 'versioned-assets.json' : 'assets.json';
    const basePath = isVersion ? join(this.assetsPath, 'versions') : this.assetsPath;
    const fs = new FsUtility({ basePath, indexFileName });
    const indexer = fs.indexFileContent;

    const onSuccess = ({ response, apiData: { uid, url, title } = undefined }: any) => {
      this.assetsUidMap[uid] = response.uid;
      this.assetsUrlMap[url] = response.url;
      log(this.importConfig, `Created asset: '${title}'`, 'success');
    };
    const onReject = ({ error, apiData: { title } = undefined }: any) => {
      log(this.importConfig, `${title} asset upload failed.!`, 'error');
      log(this.importConfig, formatError(error), 'error');
    };

    for (const _index in indexer) {
      let apiContent = orderBy(values((await fs.readChunkFiles.next()) as Record<string, any>[]), '_version');

      if (isVersion && this.assetConfig.importSameStructure) {
        // NOTE to create same structure it must have seed assets/version 1 asset to be created first
        await this.makeConcurrentCall({
          processName,
          apiContent: filter(apiContent, ({ _version }) => _version === 1),
          apiParams: {
            reject: onReject,
            resolve: onSuccess,
            entity: 'create-assets',
            includeParamOnCompletion: true,
            serializeData: this.serializeAssets.bind(this),
          },
          concurrencyLimit: this.assetConfig.uploadAssetsConcurrency,
        });

        apiContent = filter(apiContent, ({ _version }) => _version > 1);
      }

      await this.makeConcurrentCall(
        {
          apiContent,
          processName,
          apiParams: {
            reject: onReject,
            resolve: onSuccess,
            entity: 'create-assets',
            includeParamOnCompletion: true,
            serializeData: this.serializeAssets.bind(this),
          },
          concurrencyLimit: this.assetConfig.uploadAssetsConcurrency,
        },
        undefined,
        false,
      );
    }

    if (!isVersion && !isEmpty(this.assetsFolderMap)) {
      this.fs.writeFile(this.assetUidMapperPath, this.assetsUidMap);
      this.fs.writeFile(this.assetUrlMapperPath, this.assetsUrlMap);
    }
  }

  /**
   * @method serializeAssets
   * @param apiOptions ApiOptions
   * @returns ApiOptions
   */
  serializeAssets(apiOptions: ApiOptions) {
    const { apiData: asset } = apiOptions;
    asset.upload = join(this.assetsPath, 'files', asset.uid, asset.filename);

    if (asset.parent_uid) {
      asset.parent_uid = this.assetsFolderMap[asset.parent_uid];
    }

    apiOptions.apiData = asset;

    if (this.assetsUidMap[asset.uid] && this.assetConfig.importSameStructure) {
      apiOptions.entity = 'replace-assets';
      apiOptions.uid = this.assetsUidMap[asset.uid] as string;
    }

    return apiOptions;
  }

  /**
   * @method publish
   * @returns Promise<void>
   */
  async publish() {
    const fs = new FsUtility({ basePath: this.assetsPath, indexFileName: 'assets.json' });
    if (isEmpty(this.assetsUidMap)) {
      this.assetsUidMap = fs.readFile(this.assetUidMapperPath, true) as any;
    }
    const indexer = fs.indexFileContent;
    const onSuccess = ({ apiData: { uid, title } = undefined }: any) => {
      log(this.importConfig, `Asset '${uid}: ${title}' published successfully`, 'success');
    };
    const onReject = ({ error, apiData: { uid, title } = undefined }: any) => {
      log(this.importConfig, `Asset '${uid}: ${title}' not published`, 'error');
      log(this.importConfig, formatError(error), 'error');
    };
    const serializeData = (apiOptions: ApiOptions) => {
      const { apiData: asset } = apiOptions;
      const publishDetails = filter(asset.publish_details, 'environment');
      const locales = map(publishDetails, 'locale');
      const environments = map(publishDetails, ({ environment }) => this.environments[environment].name);

      asset.locales = locales;
      asset.environments = environments;
      apiOptions.uid = this.assetsUidMap[asset.uid] as string;
      apiOptions.apiData.publishDetails = { locales, environments };

      return apiOptions;
    };

    for (const _index in indexer) {
      const apiContent = filter(
        values(await fs.readChunkFiles.next()),
        ({ publish_details }) => !isEmpty(publish_details),
      );
      await this.makeConcurrentCall({
        apiContent,
        processName: 'assets publish',
        apiParams: {
          serializeData,
          reject: onReject,
          resolve: onSuccess,
          entity: 'publish-assets',
          includeParamOnCompletion: true,
        },
        concurrencyLimit: this.assetConfig.uploadAssetsConcurrency,
      });
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
}
