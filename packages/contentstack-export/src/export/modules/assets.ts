import map from 'lodash/map';
import chalk from 'chalk';
import chunk from 'lodash/chunk';
import first from 'lodash/first';
import merge from 'lodash/merge';
import filter from 'lodash/filter';
import uniqBy from 'lodash/uniqBy';
import values from 'lodash/values';
import entries from 'lodash/entries';
import isEmpty from 'lodash/isEmpty';
import includes from 'lodash/includes';
import progress from 'progress-stream';
import { createWriteStream } from 'node:fs';
import { resolve as pResolve } from 'node:path';
import {
  FsUtility,
  getDirectories,
  configHandler,
  log,
  handleAndLogError,
  messageHandler,
} from '@contentstack/cli-utilities';

import config from '../../config';
import { ModuleClassParams } from '../../types';
import BaseClass, { CustomPromiseHandler, CustomPromiseHandlerInput } from './base-class';
import { PROCESS_NAMES, MODULE_CONTEXTS, PROCESS_STATUS, MODULE_NAMES } from '../../utils';

export default class ExportAssets extends BaseClass {
  private assetsRootPath: string;
  public assetConfig = config.modules.assets;
  private assetsFolder: Record<string, unknown>[] = [];
  public versionedAssets: Record<string, unknown>[] = [];

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.exportConfig.context.module = MODULE_CONTEXTS.ASSETS;
    this.currentModuleName = MODULE_NAMES[MODULE_CONTEXTS.ASSETS];
  }

  get commonQueryParam(): Record<string, unknown> {
    return {
      skip: 0,
      asc: 'created_at',
      include_count: false,
    };
  }

  async start(): Promise<void> {
      this.assetsRootPath = pResolve(
      this.exportConfig.exportDir,
      this.exportConfig.branchName || '',
      this.assetConfig.dirName,
    );
    log.debug(`Assets root path resolved to: ${this.assetsRootPath}`, this.exportConfig.context);
    log.debug('Fetching assets and folders count...', this.exportConfig.context);
    // NOTE step 1: Get assets and it's folder count in parallel
    const [assetsCount, assetsFolderCount] = await this.withLoadingSpinner(
      `${chalk.bold('ASSETS')}: Analyzing stack content...`,
      () => Promise.all([this.getAssetsCount(), this.getAssetsCount(true)]),
    );

    // Create nested progress manager
    const progress = this.createNestedProgress(this.currentModuleName);

    // Add sub-processes
    if (typeof assetsFolderCount === 'number' && assetsFolderCount > 0) {
      progress.addProcess(PROCESS_NAMES.ASSET_FOLDERS, assetsFolderCount);
    }
    if (typeof assetsCount === 'number' && assetsCount > 0) {
      progress.addProcess(PROCESS_NAMES.ASSET_METADATA, assetsCount);
      progress.addProcess(PROCESS_NAMES.ASSET_DOWNLOADS, assetsCount);
    }

    try {
      // Process asset folders
      if (typeof assetsFolderCount === 'number' && assetsFolderCount > 0) {
        progress
          .startProcess(PROCESS_NAMES.ASSET_FOLDERS)
          .updateStatus(
            PROCESS_STATUS[PROCESS_NAMES.ASSET_FOLDERS].FETCHING,
            PROCESS_NAMES.ASSET_FOLDERS,
          );
        await this.getAssetsFolders(assetsFolderCount);
        progress.completeProcess(PROCESS_NAMES.ASSET_FOLDERS, true);
      }

      // Process asset metadata
      if (typeof assetsCount === 'number' && assetsCount > 0) {
        progress
          .startProcess(PROCESS_NAMES.ASSET_METADATA)
          .updateStatus(
            PROCESS_STATUS[PROCESS_NAMES.ASSET_METADATA].FETCHING,
            PROCESS_NAMES.ASSET_METADATA,
          );
        await this.getAssets(assetsCount);
        progress.completeProcess(PROCESS_NAMES.ASSET_METADATA, true);
      }

      // Get versioned assets
      if (!isEmpty(this.versionedAssets) && this.assetConfig.includeVersionedAssets) {
        log.debug('Fetching versioned assets metadata...', this.exportConfig.context);
        progress.updateStatus(
          PROCESS_STATUS[PROCESS_NAMES.ASSET_METADATA].FETCHING_VERSION,
          PROCESS_NAMES.ASSET_METADATA,
        );
        await this.getVersionedAssets();
      }

      // Download all assets
      if (typeof assetsCount === 'number' && assetsCount > 0) {
        progress
          .startProcess(PROCESS_NAMES.ASSET_DOWNLOADS)
          .updateStatus(
            PROCESS_STATUS[PROCESS_NAMES.ASSET_DOWNLOADS].DOWNLOADING,
            PROCESS_NAMES.ASSET_DOWNLOADS,
          );
        log.debug('Starting download of all assets...', this.exportConfig.context);
        await this.downloadAssets();
        progress.completeProcess(PROCESS_NAMES.ASSET_DOWNLOADS, true);
      }

      this.completeProgressWithMessage();

    } catch (error) {
      this.completeProgress(false, error?.message || 'Asset export failed');
    }
  }

  /**
   * @method getAssetsFolders
   * @param {number} totalCount number
   * @returns Promise<any|void>
   */
  getAssetsFolders(totalCount: number | void): Promise<Promise<void> | void> {
    if (!totalCount) return Promise.resolve();

    const queryParam = {
      ...this.commonQueryParam,
      query: { is_dir: true },
    };

    log.debug(`Fetching asset folders with query: ${JSON.stringify(queryParam)}`, this.exportConfig.context);

    const onSuccess = ({ response: { items } }: any) => {
      log.debug(`Fetched ${items?.length || 0} asset folders`, this.exportConfig.context);
      if (!isEmpty(items)) {
        this.assetsFolder.push(...items);
        items.forEach((folder: any) => {
          this.progressManager?.tick(
            true,
            `folder: ${folder.name || folder.uid}`,
            null,
            PROCESS_NAMES.ASSET_FOLDERS,
          );
        });
      }
    };

    const onReject = ({ error }: any) => {
      this.progressManager?.tick(
        false,
        'asset folder',
        error?.message || PROCESS_STATUS[PROCESS_NAMES.ASSET_FOLDERS].FAILED,
        PROCESS_NAMES.ASSET_FOLDERS,
      );
      handleAndLogError(error, { ...this.exportConfig.context });
    };

    return this.makeConcurrentCall({
      totalCount,
      apiParams: {
        queryParam,
        module: 'assets',
        reject: onReject,
        resolve: onSuccess,
      },
      module: 'assets folders',
      concurrencyLimit: this.assetConfig.fetchConcurrency,
    }).then(() => {
      if (!isEmpty(this.assetsFolder)) {
        const path = pResolve(this.assetsRootPath, 'folders.json');
        log.debug(`Writing asset folders to ${path}`, this.exportConfig.context);
        new FsUtility({ basePath: this.assetsRootPath }).writeFile(path, this.assetsFolder);
      }
      log.info(
        messageHandler.parse('ASSET_FOLDERS_EXPORT_COMPLETE', this.assetsFolder.length),
        this.exportConfig.context,
      );
    });
  }

  /**
   * @method getAssets
   * @param totalCount number
   * @returns Promise<void>
   */
  getAssets(totalCount: number | void): Promise<any | void> {
    if (!totalCount) return Promise.resolve();

    log.debug(`Fetching ${totalCount} assets...`, this.exportConfig.context);

    let fs: FsUtility;
    let metaHandler: ((array: any) => any) | undefined;

    const queryParam = {
      ...this.commonQueryParam,
      include_publish_details: true,
      except: { BASE: this.assetConfig.invalidKeys },
    };
    this.applyQueryFilters(queryParam, 'assets');

    if (this.assetConfig.includeVersionedAssets) {
      const customHandler = (array: Array<any>) => {
        const versionAssets: Array<any> = filter(array, ({ _version }: any) => _version > 1);
        log.debug(`Found ${versionAssets.length} versioned assets`, this.exportConfig.context);
        if (!isEmpty(versionAssets)) {
          this.versionedAssets.push(
            ...map(versionAssets, ({ uid, _version }: any) => ({
              [uid]: _version,
            })),
          );
        }
      };
      metaHandler = customHandler;
    }

    const onReject = ({ error }: any) => {
      this.progressManager?.tick(
        false,
        'asset',
        error?.message || PROCESS_STATUS[PROCESS_NAMES.ASSET_METADATA].FAILED,
        PROCESS_NAMES.ASSET_METADATA,
      );
      handleAndLogError(error, { ...this.exportConfig.context }, messageHandler.parse('ASSET_QUERY_FAILED'));
    };

    const onSuccess = ({ response: { items } }: any) => {
      log.debug(`Fetched ${items?.length || 0} assets`, this.exportConfig.context);
      if (!fs && !isEmpty(items)) {
        log.debug('Initializing FsUtility for writing assets metadata', this.exportConfig.context);
        fs = new FsUtility({
          metaHandler,
          moduleName: 'assets',
          indexFileName: 'assets.json',
          basePath: this.assetsRootPath,
          chunkFileSize: this.assetConfig.chunkFileSize,
          metaPickKeys: merge(['uid', 'url', 'filename', 'parent_uid'], this.assetConfig.assetsMetaKeys),
        });
      }
      if (!isEmpty(items)) {
        log.debug(`Writing ${items.length} assets into file`, this.exportConfig.context);
        fs?.writeIntoFile(items, { mapKeyVal: true });
        // Track progress for each asset with process name
        items.forEach((asset: any) => {
          this.progressManager?.tick(
            true,
            `asset: ${asset.filename || asset.uid}`,
            null,
            PROCESS_NAMES.ASSET_METADATA,
          );
        });
      }
    };

    return this.makeConcurrentCall({
      module: 'assets',
      totalCount,
      apiParams: {
        queryParam,
        module: 'assets',
        reject: onReject,
        resolve: onSuccess,
      },
      concurrencyLimit: this.assetConfig.fetchConcurrency,
    }).then(() => {
      fs?.completeFile(true);
      log.info(messageHandler.parse('ASSET_METADATA_EXPORT_COMPLETE'), this.exportConfig.context);
    });
  }
  /**
   * @method getVersionedAssets
   * @returns Promise<any|void>
   */
  getVersionedAssets(): Promise<any | void> {
    log.debug('Preparing to fetch versioned assets...', this.exportConfig.context);

    let fs: FsUtility;

    const queryParam = {
      ...this.commonQueryParam,
      include_publish_details: true,
      except: { BASE: this.assetConfig.invalidKeys },
    };

    const versionedAssets = map(this.versionedAssets, (element) => {
      const batch = [];
      const [uid, version]: any = first(entries(element));

      for (let index = 1; index < version; index++) {
        batch.push({ [uid]: index });
      }

      return batch;
    }).flat();

    log.debug(`Prepared ${versionedAssets.length} versioned asset queries`, this.exportConfig.context);
    const apiBatches: Array<any> = chunk(versionedAssets, this.assetConfig.fetchConcurrency);

    const promisifyHandler: CustomPromiseHandler = (input: CustomPromiseHandlerInput) => {
      const { index, batchIndex, apiParams, isLastRequest } = input;
      const batch: Record<string, number> = apiBatches[batchIndex][index];
      const [uid, version]: any = first(entries(batch));

      log.debug(`Fetching versioned asset [UID: ${uid}, Version: ${version}]`, this.exportConfig.context);

      if (apiParams?.queryParam) {
        apiParams.uid = uid;
        apiParams.queryParam.version = version;
        return this.makeAPICall(apiParams, isLastRequest);
      }
      return Promise.resolve();
    };

    const onSuccess = ({ response }: any) => {
      if (!fs && !isEmpty(response)) {
        fs = new FsUtility({
          moduleName: 'assets',
          indexFileName: 'versioned-assets.json',
          chunkFileSize: this.assetConfig.chunkFileSize,
          basePath: pResolve(this.assetsRootPath, 'versions'),
          metaPickKeys: merge(['uid', 'url', 'filename', '_version', 'parent_uid'], this.assetConfig.assetsMetaKeys),
        });
      }
      if (!isEmpty(response)) {
        log.debug(
          `Writing versioned asset: UID=${response.uid}, Version=${response._version}`,
          this.exportConfig.context,
        );
        fs?.writeIntoFile([response], { mapKeyVal: true, keyName: ['uid', '_version'] });
      }
    };

    const onReject = ({ error }: any) => {
      handleAndLogError(error, { ...this.exportConfig.context }, messageHandler.parse('ASSET_VERSIONED_QUERY_FAILED'));
    };

    return this.makeConcurrentCall(
      {
        apiBatches,
        apiParams: {
          queryParam,
          module: 'asset',
          reject: onReject,
          resolve: onSuccess,
        },
        module: 'versioned assets',
        totalCount: versionedAssets.length,
        concurrencyLimit: this.assetConfig.fetchConcurrency,
      },
      promisifyHandler,
    ).then(() => {
      fs?.completeFile(true);
      log.info(messageHandler.parse('ASSET_VERSIONED_METADATA_EXPORT_COMPLETE'), this.exportConfig.context);
    });
  }

  getAssetsCount(isDir = false): Promise<number | void> {
    const queryParam: any = {
      limit: 1,
      ...this.commonQueryParam,
      skip: 10 ** 100,
    };

    if (isDir) queryParam.query = { is_dir: true };

    log.debug(
      `Querying count of assets${isDir ? ' (folders only)' : ''} with params: ${JSON.stringify(queryParam)}`,
      this.exportConfig.context,
    );

    return this.stack
      .asset()
      .query(queryParam)
      .count()
      .then(({ assets }: any) => {
        log.debug(`Received asset count: ${assets}`, this.exportConfig.context);
        return assets;
      })
      .catch((error: Error) => {
        handleAndLogError(error, { ...this.exportConfig.context }, messageHandler.parse('ASSET_COUNT_QUERY_FAILED'));
      });
  }
  /**
   * @method downloadAssets
   * @returns Promise<any|void>
   */
  async downloadAssets(): Promise<any | void> {
    const fs: FsUtility = new FsUtility({
      fileExt: 'json',
      createDirIfNotExist: false,
      basePath: this.assetsRootPath,
    });

    log.debug('Reading asset metadata for download...', this.exportConfig.context);
    const assetsMetaData = fs.getPlainMeta();

    let listOfAssets = values(assetsMetaData).flat();

    if (this.assetConfig.includeVersionedAssets) {
      const versionedAssetsMetaData = fs.getPlainMeta(pResolve(this.assetsRootPath, 'versions', 'metadata.json'));
      listOfAssets.push(...values(versionedAssetsMetaData).flat());
    }

    listOfAssets = uniqBy(listOfAssets, 'url');
    log.debug(`Total unique assets to download: ${listOfAssets.length}`, this.exportConfig.context);

    const apiBatches: Array<any> = chunk(listOfAssets, this.assetConfig.downloadLimit);
    const downloadedAssetsDirs = await getDirectories(pResolve(this.assetsRootPath, 'files'));

    const onSuccess = ({ response: { data }, additionalInfo }: any) => {
      const { asset } = additionalInfo;
      const assetFolderPath = pResolve(this.assetsRootPath, 'files', asset.uid);
      const assetFilePath = pResolve(assetFolderPath, asset.filename);

      log.debug(`Saving asset to: ${assetFilePath}`, this.exportConfig.context);

      if (!includes(downloadedAssetsDirs, asset.uid)) {
        fs.createFolderIfNotExist(assetFolderPath);
      }

      const assetWriterStream = createWriteStream(assetFilePath);
      assetWriterStream.on('error', (error) => {
        handleAndLogError(
          error,
          { ...this.exportConfig.context, uid: asset.uid, filename: asset.fileName },
          messageHandler.parse('ASSET_DOWNLOAD_FAILED', asset.filename, asset.uid),
        );
      });
      /**
       * NOTE if pipe not working as expected add the following code below to fix the issue
       * https://oramind.com/using-streams-efficiently-in-nodejs/
       * import * as stream from "stream";
       * import { promisify } from "util";
       * const finished = promisify(stream.finished);
       * await finished(assetWriterStream);
       */
      if (this.assetConfig.enableDownloadStatus) {
        const str = progress({
          time: 5000,
          length: data.headers['content-length'],
        });
        str.on('progress', function (progressData) {
          console.log(`${asset.filename}: ${Math.round(progressData.percentage)}%`);
        });
        data.pipe(str).pipe(assetWriterStream);
      } else {
        data.pipe(assetWriterStream);
      }
      this.progressManager?.tick(
        true,
        `Downloaded asset: ${asset.filename || asset.uid}`,
        null,
        PROCESS_NAMES.ASSET_DOWNLOADS,
      );
      log.success(messageHandler.parse('ASSET_DOWNLOAD_SUCCESS', asset.filename, asset.uid), this.exportConfig.context);
    };

    const onReject = ({ error, additionalInfo }: any) => {
      const { asset } = additionalInfo;
      this.progressManager?.tick(
        false,
        `Failed to download asset: ${asset.filename || asset.uid}`,
        null,
        PROCESS_NAMES.ASSET_DOWNLOADS,
      );
      handleAndLogError(
        error,
        { ...this.exportConfig.context, uid: asset.uid, filename: asset.filename },
        messageHandler.parse('ASSET_DOWNLOAD_FAILED', asset.filename, asset.uid),
      );
    };

    const promisifyHandler: CustomPromiseHandler = (input: CustomPromiseHandlerInput) => {
      const { index, batchIndex } = input;
      const asset: any = apiBatches[batchIndex][index];
      const url = this.assetConfig.securedAssets
        ? `${asset.url}?authtoken=${configHandler.get('authtoken')}`
        : asset.url;
      log.debug(
        `Preparing to download asset: ${asset.filename} (UID: ${asset.uid}) from URL: ${url}`,
        this.exportConfig.context,
      );
      return this.makeAPICall({
        reject: onReject,
        resolve: onSuccess,
        url: encodeURI(url),
        module: 'download-asset',
        additionalInfo: { asset },
      });
    };

    return this.makeConcurrentCall(
      {
        apiBatches,
        module: 'assets download',
        totalCount: listOfAssets.length,
        concurrencyLimit: this.assetConfig.downloadLimit,
      },
      promisifyHandler,
    ).then(() => {
      log.success(messageHandler.parse('ASSET_DOWNLOAD_COMPLETE'), this.exportConfig.context);
    });
  }
}
