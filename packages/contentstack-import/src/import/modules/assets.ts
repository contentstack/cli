import map from 'lodash/map';
import chunk from 'lodash/chunk';
import first from 'lodash/first';
import filter from 'lodash/filter';
import uniqBy from 'lodash/uniqBy';
import isArray from 'lodash/isArray';
import values from 'lodash/values';
import entries from 'lodash/entries';
import isEmpty from 'lodash/isEmpty';
import includes from 'lodash/includes';
import progress from 'progress-stream';
import { createWriteStream } from 'node:fs';
import { resolve as pResolve, join } from 'node:path';
import { FsUtility, getDirectories } from '@contentstack/cli-utilities';

import config from '../../config';
// import { log } from '../../utils';
import { logger } from '@contentstack/cli-utilities';
import BaseClass, { CustomPromiseHandler, CustomPromiseHandlerInput } from './base-class';

export default class ExportAssets extends BaseClass {
  private envPath: string;
  private foldersMap = {};
  private mapperDirPath: string;
  private assetUidMapperPath: string;
  private assetUrlMapperPath: string;
  private assetsRootPath: string;
  public assetConfig = config.modules.assets;
  private assetsFolder: Record<string, unknown>[] = [];
  private versionedAssets: Record<string, unknown>[] = [];

  constructor({ importConfig, stackAPIClient }) {
    super({ importConfig, stackAPIClient });

    this.mapperDirPath = join(this.importConfig.backupDir, 'mapper', 'assets');
    this.assetUidMapperPath = join(this.importConfig.backupDir, 'uid-mapping.json');
    this.assetUrlMapperPath = join(this.importConfig.backupDir, 'url-mapping.json');
    this.assetsRootPath = join(this.importConfig.backupDir, this.assetConfig.dirName);
    this.envPath = join(this.importConfig.backupDir, 'environments', 'environments.json');
  }

  get commonQueryParam(): Record<string, unknown> {
    return {
      skip: 0,
      asc: 'created_at',
      include_count: false,
    };
  }

  async start(): Promise<void> {
    // // const start = +new Date();
    // // NOTE step 1: Get assets and it's folder count in parallel
    // const [assetsCount, assetsFolderCount] = await Promise.all([this.getAssetsCount(), this.getAssetsCount(true)]);
    // // NOTE step 2: Get assets and it's folder data in parallel
    // await Promise.all([this.getAssetsFolders(assetsFolderCount), this.getAssets(assetsCount)]);
    // // NOTE step 3: Get versioned assets
    // if (!isEmpty(this.versionedAssets) && this.assetConfig.includeVersionedAssets) {
    //   await this.getVersionedAssets();
    // }
    // // NOTE step 4: Download all assets
    // await this.downloadAssets();
    // NOTE log function => this.logFn(start);
  }

  async importFolders(): Promise<any> {
    const folders = []; // orderBy(folders, 'created_at') // await fileHelper.readJSONFile(path.resolve(this.assetDirPath, 'folders.json'));
    if (!isEmpty(folders)) {
      logger.info('No folders found to import');
      return;
    }
    const importOrder = this.constructFolderImportOrder(folders);
    const onSuccess = ({ response: { items } }: any) => {
      this.assetsFolder.push(...items);
    };
    const onReject = ({ error }: any) => {
      logger.error('Folder creation failed.!', error);
    };

    return this.makeConcurrentCall({
      processName: 'import assets folders',
      apiParams: {
        reject: onReject,
        resolve: onSuccess,
        entity: 'create-assets-folder',
      },
      concurrencyLimit: this.assetConfig.apiConcurrency || 5,
    }).then(() => {
      // fs?.completeFile(true);
      // log(this.exportConfig, 'Assets exported successfully.!', 'info');
    });
    // const mappedFolderPath = pResolve(this.importConfig.backupDir, 'mapper', 'assets', 'folder-mapping.json');
    // try {
    //   this.foldersMap = {}; // (await fileHelper.readJSONFile(mappedFolderPath)) || {};
    // } catch (error) {
    //   logger.debug('No existing folders found', error);
    //   logger.info('No existing folders found');
    // }

    // // Converting folders into an object for better operations
    // const foldersObj = folders.reduce((obj, folder) => ({ ...obj, [folder.uid]: folder }), {});
    // const folderTreeStructure = assetUtils.buildFolderTreeStructure({ ...foldersObj });
    // const folderCreateRequestPayloads: Array<any> = assetUtils.buildCreateRequestPayload(
    //   foldersObj,
    //   folderTreeStructure,
    //   this.foldersMap,
    // );

    // for (const requestPayload of folderCreateRequestPayloads) {
    //   if (this.foldersMap.hasOwnProperty(requestPayload.json.asset.parent_uid)) {
    //     // replace old folder uid with new
    //     requestPayload.json.asset.parent_uid = this.foldersMap[requestPayload.json.asset.parent_uid];
    //   }
    //   try {
    //     const folderCreationResponse = await this.stackAPIClient.asset().folder().create(requestPayload.json);
    //     this.foldersMap[requestPayload.oldUid] = folderCreationResponse.uid;
    //   } catch (error) {
    //     logger.error(`Failed to import folder - name: ${requestPayload.json.asset.name}`, error);
    //   }
    // }

    // try {
    //   await fileHelper.writeFile(mappedFolderPath, this.foldersMap);
    // } catch (error) {
    //   logger.error('Failed to writer folders map to file', error);
    // }
  }

  constructFolderImportOrder(folders) {
    let parentUid = [];
    // NOTE: Read root folder
    const importOrder = filter(folders, { parent_uid: null }).map(({ uid, name, parent_uid }) => {
      parentUid.push(uid);
      return { name, parent_uid };
    });

    while (!isEmpty(parentUid)) {
      // NOTE: Read nested folders every iteration until we find empty folders
      parentUid = filter(folders, ({ parent_uid }) => includes(parentUid, parent_uid)).map(
        ({ uid, name, parent_uid }) => {
          importOrder.push({ name, parent_uid });
          return uid;
        },
      );
    }

    return importOrder;
  }

  // /**
  //  * @method getAssetsFolders
  //  * @param {number} totalCount number
  //  * @returns Promise<any|void>
  //  */
  // getAssetsFolders(totalCount: number | void): Promise<Promise<void> | void> {
  //   if (!totalCount) return Promise.resolve();

  //   const queryParam = {
  //     ...this.commonQueryParam,
  //     query: { is_dir: true },
  //   };

  //   const onSuccess = ({ response: { items } }: any) => {
  //     this.assetsFolder.push(...items);
  //   };
  //   const onReject = ({ error }: any) => {
  //     log(this.exportConfig, 'Export asset folder query failed', 'error');
  //     log(this.exportConfig, error, 'error');
  //   };

  //   return this.makeConcurrentCall({
  //     totalCount,
  //     apiParams: {
  //       queryParam,
  //       module: 'assets',
  //       reject: onReject,
  //       resolve: onSuccess,
  //     },
  //     module: 'assets folders',
  //     concurrencyLimit: this.assetConfig.fetchConcurrency,
  //   }).then(() => {
  //     if (!isEmpty(this.assetsFolder)) {
  //       new FsUtility({ basePath: this.assetsRootPath }).writeFile(
  //         pResolve(this.assetsRootPath, 'folders.json'),
  //         this.assetsFolder,
  //         true,
  //       );
  //     }
  //     log(this.exportConfig, 'Assets folder Exported successfully.!', 'info');
  //   });
  // }

  // /**
  //  * @method getAssets
  //  * @param totalCount number
  //  * @returns Promise<void>
  //  */
  // getAssets(totalCount: number | void): Promise<any | void> {
  //   if (!totalCount) return Promise.resolve();

  //   let fs: FsUtility;
  //   let metaHandler: ((array: any) => any) | undefined;
  //   const queryParam = {
  //     ...this.commonQueryParam,
  //     include_publish_details: true,
  //     except: { BASE: this.assetConfig.invalidKeys },
  //   };

  //   if (this.assetConfig.includeVersionedAssets) {
  //     const customHandler = (array: Array<any>) => {
  //       const versionAssets: Array<any> = filter(array, ({ _version }: any) => _version > 1);
  //       if (!isEmpty(versionAssets)) {
  //         this.versionedAssets.push(
  //           ...map(versionAssets, ({ uid, _version }: any) => ({
  //             [uid]: _version,
  //           })),
  //         );
  //       }
  //     };
  //     metaHandler = customHandler;
  //   }

  //   const onReject = ({ error }: any) => {
  //     log(this.exportConfig, 'Export asset query failed', 'error');
  //     log(this.exportConfig, error.message, 'error');
  //   };

  //   const onSuccess = ({ response: { items } }: any) => {
  //     if (!fs && !isEmpty(items)) {
  //       fs = new FsUtility({
  //         metaHandler,
  //         moduleName: 'assets',
  //         indexFileName: 'assets.json',
  //         basePath: this.assetsRootPath,
  //         metaPickKeys: ['uid', 'url', 'filename'],
  //         chunkFileSize: this.assetConfig.chunkFileSize,
  //       });
  //     }
  //     fs?.writeIntoFile(items, { mapKeyVal: true });
  //   };

  //   return this.makeConcurrentCall({
  //     module: 'assets',
  //     totalCount,
  //     apiParams: {
  //       queryParam,
  //       module: 'assets',
  //       reject: onReject,
  //       resolve: onSuccess,
  //     },
  //     concurrencyLimit: this.assetConfig.fetchConcurrency,
  //   }).then(() => {
  //     fs?.completeFile(true);
  //     log(this.exportConfig, 'Assets exported successfully.!', 'info');
  //   });
  // }

  // /**
  //  * @method getVersionedAssets
  //  * @returns Promise<any|void>
  //  */
  // getVersionedAssets(): Promise<any | void> {
  //   let fs: FsUtility;
  //   const queryParam = {
  //     ...this.commonQueryParam,
  //     include_publish_details: true,
  //     except: { BASE: this.assetConfig.invalidKeys },
  //   };
  //   const versionedAssets = map(this.versionedAssets, (element) => {
  //     const batch = [];
  //     const [uid, version]: any = first(entries(element));

  //     for (let index = 1; index < version; index++) {
  //       batch.push({ [uid]: index });
  //     }

  //     return batch;
  //   }).flat();
  //   const apiBatches: Array<any> = chunk(versionedAssets, this.assetConfig.fetchConcurrency);

  //   const promisifyHandler: CustomPromiseHandler = (input: CustomPromiseHandlerInput) => {
  //     const { index, batchIndex, apiParams, isLastRequest } = input;
  //     const batch: Record<string, number> = apiBatches[batchIndex][index];
  //     const [uid, version]: any = first(entries(batch));

  //     if (apiParams?.queryParam) {
  //       apiParams.uid = uid;
  //       apiParams.queryParam.version = version;

  //       return this.makeAPICall(apiParams, isLastRequest);
  //     }

  //     return Promise.resolve();
  //   };
  //   const onSuccess = ({ response }: any) => {
  //     if (!fs && !isEmpty(response)) {
  //       fs = new FsUtility({
  //         moduleName: 'assets',
  //         indexFileName: 'versioned-assets.json',
  //         chunkFileSize: this.assetConfig.chunkFileSize,
  //         metaPickKeys: ['uid', 'url', 'filename', '_version'],
  //         basePath: pResolve(this.assetsRootPath, 'versions'),
  //       });
  //     }
  //     fs?.writeIntoFile([response], {
  //       mapKeyVal: true,
  //       keyName: ['uid', '_version'],
  //     });
  //   };
  //   const onReject = ({ error }: any) => {
  //     log(this.exportConfig, 'Export versioned asset query failed', 'error');
  //     log(this.exportConfig, error, 'error');
  //   };

  //   return this.makeConcurrentCall(
  //     {
  //       apiBatches,
  //       apiParams: {
  //         queryParam,
  //         module: 'asset',
  //         reject: onReject,
  //         resolve: onSuccess,
  //       },
  //       module: 'versioned assets',
  //       totalCount: versionedAssets.length,
  //       concurrencyLimit: this.assetConfig.fetchConcurrency,
  //     },
  //     promisifyHandler,
  //   ).then(() => {
  //     fs?.completeFile(true);
  //     log(this.exportConfig, 'Assets folder Exported successfully.!', 'info');
  //   });
  // }

  // /**
  //  * @method getAssetsCount
  //  * @param isDir boolean
  //  * @returns Promise<number|undefined>
  //  */
  // getAssetsCount(isDir = false): Promise<number | void> {
  //   const queryParam: any = {
  //     limit: 1,
  //     ...this.commonQueryParam,
  //     skip: 10 ** 100,
  //   };

  //   if (isDir) queryParam.query = { is_dir: true };

  //   return this.stack
  //     .asset()
  //     .query(queryParam)
  //     .count()
  //     .then(({ assets }: any) => assets)
  //     .catch((error) => {
  //       log(this.exportConfig, 'Get count query failed', 'error');
  //       log(this.exportConfig, error, 'error');
  //     });
  // }

  // /**
  //  * @method downloadAssets
  //  * @returns Promise<any|void>
  //  */
  // async downloadAssets(): Promise<any | void> {
  //   const fs: FsUtility = new FsUtility({
  //     fileExt: 'json',
  //     createDirIfNotExist: false,
  //     basePath: this.assetsRootPath,
  //   });
  //   const assetsMetaData = fs.getPlainMeta();

  //   let listOfAssets = values(assetsMetaData).flat();

  //   if (this.assetConfig.includeVersionedAssets) {
  //     const versionedAssetsMetaData = fs.getPlainMeta(pResolve(this.assetsRootPath, 'versions', 'metadata.json'));

  //     listOfAssets.push(...values(versionedAssetsMetaData).flat());
  //   }

  //   listOfAssets = uniqBy(listOfAssets, 'url');

  //   const apiBatches: Array<any> = chunk(listOfAssets, this.assetConfig.downloadLimit);
  //   const downloadedAssetsDirs = await getDirectories(pResolve(this.assetsRootPath, 'files'));

  //   const onSuccess = ({ response: { data }, additionalInfo }: any) => {
  //     const { asset } = additionalInfo;
  //     const assetFolderPath = pResolve(this.assetsRootPath, 'files', asset.uid);
  //     const assetFilePath = pResolve(assetFolderPath, asset.filename);

  //     if (!includes(downloadedAssetsDirs, asset.uid)) {
  //       fs.createFolderIfNotExist(assetFolderPath);
  //     }

  //     const assetWriterStream = createWriteStream(assetFilePath);
  //     assetWriterStream.on('error', (error) => {
  //       log(this.exportConfig, `Downloaded failed ${asset.filename}: ${asset.uid}!`, 'error');
  //       log(this.exportConfig, error, 'error');
  //     });
  //     /**
  //      * NOTE if pipe not working as expected add the following code below to fix the issue
  //      * https://oramind.com/using-streams-efficiently-in-nodejs/
  //      * import * as stream from "stream";
  //      * import { promisify } from "util";
  //      * const finished = promisify(stream.finished);
  //      * await finished(assetWriterStream);
  //      */
  //     if (this.assetConfig.enableDownloadStatus) {
  //       const str = progress({
  //         time: 5000,
  //         length: data.headers['content-length'],
  //       });
  //       str.on('progress', function (progressData) {
  //         console.log(`${asset.filename}: ${Math.round(progressData.percentage)}%`);
  //       });
  //       data.pipe(str).pipe(assetWriterStream);
  //     } else {
  //       data.pipe(assetWriterStream);
  //     }

  //     log(this.exportConfig, `Downloaded ${asset.filename}: ${asset.uid} successfully!`, 'success');
  //   };

  //   const onReject = ({ error, additionalInfo }: any) => {
  //     const { asset } = additionalInfo;
  //     log(this.exportConfig, `Downloaded failed ${asset.filename}: ${asset.uid}!`, 'error');
  //     log(this.exportConfig, error, 'error');
  //   };

  //   const promisifyHandler: CustomPromiseHandler = (input: CustomPromiseHandlerInput) => {
  //     const { index, batchIndex } = input;
  //     const asset: any = apiBatches[batchIndex][index];
  //     const url = this.assetConfig.securedAssets ? `${asset.url}?authtoken=${this.exportConfig.auth_token}` : asset.url;

  //     return this.makeAPICall({
  //       reject: onReject,
  //       resolve: onSuccess,
  //       url: encodeURI(url),
  //       module: 'download-asset',
  //       additionalInfo: { asset },
  //     });
  //   };

  //   return this.makeConcurrentCall(
  //     {
  //       apiBatches,
  //       module: 'assets download',
  //       totalCount: listOfAssets.length,
  //       concurrencyLimit: this.assetConfig.downloadLimit,
  //     },
  //     promisifyHandler,
  //   ).then(() => {
  //     log(this.exportConfig, 'Assets download completed successfully.!', 'info');
  //   });
  // }

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
