import map from 'lodash/map';
import values from 'lodash/values';
import filter from 'lodash/filter';
import unionBy from 'lodash/unionBy';
import orderBy from 'lodash/orderBy';
import isEmpty from 'lodash/isEmpty';
import uniq from 'lodash/uniq';
import { existsSync } from 'node:fs';
import includes from 'lodash/includes';
import { v4 as uuid } from 'uuid';
import { resolve as pResolve, join } from 'node:path';
import { FsUtility } from '@contentstack/cli-utilities';

import config from '../../config';
import { log, formatError, formatDate } from '../../utils';
import BaseClass, { ApiOptions } from './base-class';
import { ModuleClassParams } from '../../types';

export default class ImportAssets extends BaseClass {
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
  private rootFolder: { uid: string; name: string; parent_uid: string; created_at: string };

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
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

  /**
   * @method start
   * @returns {Promise<void>} Promise<any>
   */
  async start(): Promise<void> {
    // NOTE Step 1: Import folders and create uid mapping file
    await this.importFolders();

    // NOTE Step 2: Import versioned assets and create it mapping files (uid, url)
    if (this.assetConfig.includeVersionedAssets) {
      if (existsSync(`${this.assetsPath}/versions`)) await this.importAssets(true);
      else log(this.importConfig, 'No Versioned assets found to import', 'info');
    }

    // NOTE Step 3: Import Assets and create it mapping files (uid, url)
    await this.importAssets();

    // NOTE Step 4: Publish assets
    if (this.assetConfig.publishAssets) await this.publish();
  }

  /**
   * @method importFolders
   * @returns {Promise<any>} Promise<any>
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
      /* eslint-disable no-await-in-loop */
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
   * @param {boolean} isVersion boolean
   * @returns {Promise<void>} Promise<void>
   */
  async importAssets(isVersion = false): Promise<void> {
    const processName = isVersion ? 'import versioned assets' : 'import assets';
    const indexFileName = isVersion ? 'versioned-assets.json' : 'assets.json';
    const basePath = isVersion ? join(this.assetsPath, 'versions') : this.assetsPath;
    const fs = new FsUtility({ basePath, indexFileName });
    const indexer = fs.indexFileContent;
    const indexerCount = values(indexer).length;

    const onSuccess = ({ response = {}, apiData: { uid, url, title } = undefined }: any) => {
      this.assetsUidMap[uid] = response.uid;
      this.assetsUrlMap[url] = response.url;
      log(this.importConfig, `Created asset: '${title}'`, 'info');
    };
    const onReject = ({ error, apiData: { title } = undefined }: any) => {
      log(this.importConfig, `${title} asset upload failed.!`, 'error');
      log(this.importConfig, formatError(error), 'error');
    };

    /* eslint-disable @typescript-eslint/no-unused-vars, guard-for-in */
    for (const index in indexer) {
      const chunk = await fs.readChunkFiles.next().catch((error) => {
        log(this.importConfig, error, 'error');
      });

      if (chunk) {
        let apiContent = orderBy(values(chunk as Record<string, any>[]), '_version');

        if (isVersion && this.assetConfig.importSameStructure) {
          // NOTE to create same structure it must have seed assets/version 1 asset to be created first
          await this.makeConcurrentCall({
            processName,
            indexerCount,
            currentIndexer: +index,
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
            indexerCount,
            currentIndexer: +index,
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
          !isVersion,
        );
      }
    }

    if (!isVersion && (!isEmpty(this.assetsUidMap) || !isEmpty(this.assetsUrlMap))) {
      this.fs.writeFile(this.assetUidMapperPath, this.assetsUidMap);
      this.fs.writeFile(this.assetUrlMapperPath, this.assetsUrlMap);
    }
  }

  /**
   * @method serializeAssets
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeAssets(apiOptions: ApiOptions): ApiOptions {
    const { apiData: asset } = apiOptions;

    if (
      !this.assetConfig.importSameStructure &&
      !this.assetConfig.includeVersionedAssets &&
      /* eslint-disable @typescript-eslint/no-unused-vars, no-prototype-builtins */
      this.assetsUidMap.hasOwnProperty(asset.uid)
    ) {
      log(
        this.importConfig,
        `Skipping upload of asset: ${asset.uid}. Its mapped to: ${this.assetsUidMap[asset.uid]}`,
        'success',
      );
      apiOptions.entity = undefined;
      return apiOptions;
    }

    asset.upload = join(this.assetsPath, 'files', asset.uid, asset.filename);

    if (asset.parent_uid) {
      asset.parent_uid = this.assetsFolderMap[asset.parent_uid];
    } else if (this.importConfig.replaceExisting) {
      // adds the root folder as parent for all assets in the root level
      asset.parent_uid = this.assetsFolderMap[this.rootFolder.uid];
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
   * @returns {Promise<void>} Promise<void>
   */
  async publish() {
    const fs = new FsUtility({ basePath: this.assetsPath, indexFileName: 'assets.json' });
    if (isEmpty(this.assetsUidMap)) {
      this.assetsUidMap = fs.readFile(this.assetUidMapperPath, true) as any;
    }
    const indexer = fs.indexFileContent;
    const indexerCount = values(indexer).length;
    const onSuccess = ({ apiData: { uid, title } = undefined }: any) => {
      log(this.importConfig, `Asset '${uid}: ${title}' published successfully`, 'success');
    };
    const onReject = ({ error, apiData: { uid, title } = undefined }: any) => {
      log(this.importConfig, `Asset '${uid}: ${title}' not published`, 'error');
      log(this.importConfig, formatError(error), 'error');
    };
    const serializeData = (apiOptions: ApiOptions) => {
      const { apiData: asset } = apiOptions;
      const publishDetails = filter(asset.publish_details, ({ environment }) => {
        return this.environments.hasOwnProperty(environment);
      });
      const environments = uniq(map(publishDetails, ({ environment }) => this.environments[environment].name));
      const locales = uniq(map(publishDetails, 'locale'));

      asset.locales = locales;
      asset.environments = environments;
      apiOptions.uid = this.assetsUidMap[asset.uid] as string;
      apiOptions.apiData.publishDetails = { locales, environments };

      if (!apiOptions.uid) apiOptions.entity = undefined;

      return apiOptions;
    };

    /* eslint-disable @typescript-eslint/no-unused-vars */
    for (const index in indexer) {
      const apiContent = filter(
        values(await fs.readChunkFiles.next()),
        ({ publish_details }) => !isEmpty(publish_details),
      );
      await this.makeConcurrentCall({
        apiContent,
        indexerCount,
        currentIndexer: +index,
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
   * @param {Record<string, any>[]} folders object
   * @returns {Array<Record<string, any>>} Array<Record<string, any>>
   */
  constructFolderImportOrder(folders: any): Array<Record<string, any>> {
    let parentUIds: unknown[] = [];

    // NOTE: Read root folder
    const importOrder = filter(folders, { parent_uid: null }).map(({ uid, name, parent_uid, created_at }) => {
      parentUIds.push(uid);
      return { uid, name, parent_uid, created_at };
    });

    while (!isEmpty(parentUIds)) {
      // NOTE: Read nested folders every iteration until we find empty folders
      parentUIds = filter(folders, ({ parent_uid }) => includes(parentUIds, parent_uid)).map(
        ({ uid, name, parent_uid, created_at }) => {
          importOrder.push({ uid, name, parent_uid, created_at });
          return uid;
        },
      );
    }

    if (this.importConfig.replaceExisting) {
      // Note: adds a root folder to distinguish latest asset uploads
      // Todo: This temporary approach should be updated with asset and folder overwrite strategy, which follows
      // folder overwrite
      // 1. Create folder trees, 2. Export all target stack folders, 3.Match the source to target folders and create a list of existing folders
      // 4. Replace existing folders
      // Asset overwrite
      // 1. Search asset with title + filename + type
      // 2. if there are multiple assets fetched with same query, then check the parent uid against mapper created while importing folders
      // 3. Replace matched assets
      this.rootFolder = {
        uid: uuid(),
        name: `Import-${formatDate()}`,
        parent_uid: null,
        created_at: null,
      };
      filter(importOrder, (folder, index) => {
        if (!folder.parent_uid) {
          importOrder.splice(index, 1, { ...folder, parent_uid: this.rootFolder.uid });
        }
      });
      // NOTE: Adds root folder
      importOrder.unshift(this.rootFolder);
    }
    return importOrder;
  }
}
