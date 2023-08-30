/* eslint-disable no-prototype-builtins */
/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

import * as path from 'path';
import { values, isEmpty, filter, pick } from 'lodash';
import { cliux } from '@contentstack/cli-utilities';
import { GlobalFieldData } from '@contentstack/management/types/stack/globalField';
import { fsUtil, log, formatError, fileHelper, lookupExtension, removeReferenceFields } from '../../utils';
import { ImportConfig, ModuleClassParams } from '../../types';
import BaseClass, { ApiOptions } from './base-class';

export default class ImportGlobalFields extends BaseClass {
  private gFsMapperPath: string;
  private gFsFolderPath: string;
  private gFsFailsPath: string;
  private gFsSuccessPath: string;
  private gFsUidMapperPath: string;
  private gFsPendingPath: string;
  private pendingGFs: string[];
  private failedGFs: Record<string, unknown>[];
  private createdGFs: Record<string, unknown>[];
  private gFs: Record<string, unknown>[];
  private gFsUidMapper: Record<string, string>;
  private config: ImportConfig;
  private stackAPIClient: any;
  private marketplaceAppMapperPath: string;
  private reqConcurrency: number;
  private installedExtensions: Record<string, unknown>;
  private gFsConfig: {
    dirName: string;
    fileName: string;
    validKeys: string[];
    limit: number;
    writeConcurrency?: number;
  };

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.config = importConfig;
    this.gFsConfig = importConfig.modules['global-fields'];
    this.gFs = [];
    this.gFsUidMapper = {};
    this.createdGFs = [];
    this.failedGFs = [];
    this.pendingGFs = [];
    this.reqConcurrency = this.gFsConfig.writeConcurrency || this.config.writeConcurrency;
    this.gFsMapperPath = path.resolve(this.config.data, 'mapper', 'global_fields');
    this.gFsFolderPath = path.resolve(this.config.data, this.gFsConfig.dirName);
    this.gFsFailsPath = path.resolve(this.config.data, 'mapper', 'global_fields', 'fails.json');
    this.gFsSuccessPath = path.resolve(this.config.data, 'mapper', 'global_fields', 'success.json');
    this.gFsUidMapperPath = path.resolve(this.config.data, 'mapper', 'global_fields', 'uid-mapping.json');
    this.gFsPendingPath = path.resolve(this.config.data, 'mapper', 'global_fields', 'pending_global_fields.js');
    this.marketplaceAppMapperPath = path.join(this.config.data, 'mapper', 'marketplace_apps', 'uid-mapping.json');
  }

  async start(): Promise<any> {
    this.gFs = fsUtil.readFile(path.join(this.gFsFolderPath, this.gFsConfig.fileName)) as Record<string, unknown>[];
    if (!this.gFs || isEmpty(this.gFs)) {
      log(this.config, 'No global fields found to import', 'info');
      return;
    }
    await fsUtil.makeDirectory(this.gFsMapperPath);
    if (fileHelper.fileExistsSync(this.gFsUidMapperPath)) {
      this.gFsUidMapper = (fsUtil.readFile(this.gFsUidMapperPath) || {}) as Record<string, string>;
    }
    this.installedExtensions = (
      ((await fsUtil.readFile(this.marketplaceAppMapperPath)) as any) || { extension_uid: {} }
    ).extension_uid;

    await this.importGFs();
    fsUtil.writeFile(this.gFsPendingPath, this.pendingGFs);
    log(this.config, 'Global fields import has been completed!', 'info');
  }

  async importGFs() {
    const onSuccess = ({ response: globalField, apiData: { uid } = undefined }: any) => {
      this.createdGFs.push(globalField);
      this.gFsUidMapper[uid] = globalField;
      fsUtil.writeFile(this.gFsUidMapperPath, this.gFsUidMapper);
      log(this.config, 'Global field ' + uid + ' created successfully', 'success');
    };
    const onReject = ({ error, apiData: { uid } = undefined }: any) => {
      log(this.importConfig, `Global fields '${uid}' failed to import`, 'error');
      log(this.importConfig, formatError(error), 'error');
      this.failedGFs.push({ uid });
    };

    return await this.makeConcurrentCall(
      {
        processName: 'Import global fields',
        apiContent: this.gFs,
        apiParams: {
          reject: onReject.bind(this),
          resolve: onSuccess.bind(this),
          entity: 'create-gfs',
          includeParamOnCompletion: true,
        },
        concurrencyLimit: this.reqConcurrency,
      },
      this.createGFs.bind(this),
    );
  }

  async createGFs({
    apiParams,
    element: globalField,
    isLastRequest,
  }: {
    apiParams: ApiOptions;
    element: Record<string, string>;
    isLastRequest: boolean;
  }) {
    return new Promise(async (resolve, reject) => {
      lookupExtension(this.config, globalField.schema, this.config.preserveStackVersion, this.installedExtensions);
      const isReferenceFieldRemoved = await removeReferenceFields(globalField.schema, undefined, this.stackAPIClient);
      if (isReferenceFieldRemoved) {
        this.pendingGFs.push(globalField.uid);
      }
      return this.stack
        .globalField()
        .create({ global_field: globalField as GlobalFieldData })
        .then((response) => {
          apiParams.resolve({
            response,
            apiData: globalField,
          });
          resolve(true);
        })
        .catch((error) => {
          apiParams.reject({
            error,
            apiData: globalField,
          });
          reject(true);
        });
    });
  }
}
