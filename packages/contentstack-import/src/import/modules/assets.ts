import map from 'lodash/map';
import chunk from 'lodash/chunk';
import first from 'lodash/first';
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
// import { log } from '../../utils';
import { fileHelper, log, formatError } from '../../utils';
import BaseClass, { CustomPromiseHandler, CustomPromiseHandlerInput } from './base-class';

export default class ExportAssets extends BaseClass {
  private envPath: string;
  private foldersMap = {};
  private mapperDirPath: string;
  private assetUidMapperPath: string;
  private assetUrlMapperPath: string;
  private assetsRootPath: string;
  public assetConfig = config.modules.assets;
  private assetsFolderMap: Record<string, unknown> = {};
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
    // const start = +new Date();
    this.importFolders();
    // NOTE log function => this.logFn(start);
  }

  async importFolders(): Promise<any> {
    const folders = new FsUtility({ basePath: this.assetsRootPath }).readFile(
      pResolve(this.assetsRootPath, 'folders.json'),
    );
    if (isEmpty(folders)) {
      log(this.importConfig, 'No folders found to import', 'info');
      return;
    }
    const batches = this.constructFolderImportOrder(folders);
    const onSuccess = ({ response, queryParam: { uid, name } = { uid: null, name: '' } }: any) => {
      this.assetsFolderMap[uid] = response.uid;
      log(this.importConfig, `${name} folder created successfully.`, 'success');
    };
    const onReject = ({ error, queryParam: { name } = { name: '' } }: any) => {
      log(this.importConfig, `${name} folder creation failed.!`, 'error');
      log(this.importConfig, formatError(error), 'error');
    };

    const batch = map(unionBy(batches, 'parent_uid'), 'parent_uid');
    const serialiseData = (folder) => {
      if (folder.parent_uid) {
        folder.parent_uid = this.assetsFolderMap[folder.parent_uid];
      }

      return folder;
    };

    for (const parent_uid of batch) {
      // NOTE create parent folders
      await this.makeConcurrentCall(
        {
          apiContent: orderBy(filter(batches, { parent_uid }), 'created_at'),
          processName: 'import assets folders',
          apiParams: {
            serialiseData,
            reject: onReject,
            resolve: onSuccess,
            entity: 'create-assets-folder',
            includeParamOnCompletion: true,
          },
        },
        undefined,
        false,
      );
    }

    return Promise.resolve();
  }

  constructFolderImportOrder(folders) {
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
