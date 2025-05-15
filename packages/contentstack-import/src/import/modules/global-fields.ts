/* eslint-disable no-prototype-builtins */
/*!
 * Contentstack Import
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */

import * as path from 'path';
import { isEmpty, cloneDeep, map, find } from 'lodash';
import { cliux, sanitizePath } from '@contentstack/cli-utilities';
import { GlobalFieldData, GlobalField } from '@contentstack/management/types/stack/globalField';
import { fsUtil, log, formatError, fileHelper, lookupExtension, removeReferenceFields } from '../../utils';
import { ImportConfig, ModuleClassParams } from '../../types';
import BaseClass, { ApiOptions } from './base-class';
import { gfSchemaTemplate } from '../../utils/global-field-helper';


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
  private existingGFs: Record<string, any>[];
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
    this.existingGFs = [];
    this.reqConcurrency = this.gFsConfig.writeConcurrency || this.config.writeConcurrency;
    this.gFsMapperPath = path.resolve(sanitizePath(this.config.data), 'mapper', 'global_fields');
    this.gFsFolderPath = path.resolve(sanitizePath(this.config.data), sanitizePath(this.gFsConfig.dirName));
    this.gFsFailsPath = path.resolve(sanitizePath(this.config.data), 'mapper', 'global_fields', 'fails.json');
    this.gFsSuccessPath = path.resolve(sanitizePath(this.config.data), 'mapper', 'global_fields', 'success.json');
    this.gFsUidMapperPath = path.resolve(sanitizePath(this.config.data), 'mapper', 'global_fields', 'uid-mapping.json');
    this.gFsPendingPath = path.resolve(sanitizePath(this.config.data), 'mapper', 'global_fields', 'pending_global_fields.js');
    this.marketplaceAppMapperPath = path.join(sanitizePath(this.config.data), 'mapper', 'marketplace_apps', 'uid-mapping.json');
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

    await this.seedGFs();
    if (this.seedGFs?.length) fsUtil.writeFile(this.gFsPendingPath, this.pendingGFs);
    log(this.importConfig, 'Created Global Fields', 'success');

    await this.updateGFs();
    log(this.importConfig, 'Updated Global Fields', 'success');

    if (this.importConfig.replaceExisting && this.existingGFs.length > 0) {
      await this.replaceGFs().catch((error: Error) => {
        log(this.importConfig, `Error while replacing global fields ${formatError(error)}`, 'error');
      });
    }

    log(this.config, 'Global fields import has been completed!', 'info');
  }

  async seedGFs(): Promise<any> {
    const onSuccess = ({ response: globalField, apiData: { uid } = undefined }: any) => {
      this.createdGFs.push(globalField);
      this.gFsUidMapper[uid] = globalField;
      log(this.importConfig, `Global field ${globalField.global_field.uid} created successfully`, 'success');
    };
    const onReject = ({ error, apiData: globalField = undefined }: any) => {
      const uid = globalField?.uid;
      if (error?.errors?.title) {
        if (this.importConfig.replaceExisting) {
          this.existingGFs.push(globalField);
        }
        if (!this.importConfig.skipExisting) {
          log(this.importConfig, `Global fields '${globalField?.global_field?.uid}' already exist`, 'info');
        }
      } else {
        log(this.importConfig, `Global fields '${uid}' failed to import`, 'error');
        log(this.importConfig, formatError(error), 'error');
        this.failedGFs.push({ uid });
      }
    };
    return await this.makeConcurrentCall({
      processName: 'Import global fields',
      apiContent: this.gFs,
      apiParams: {
        serializeData: this.serializeGFs.bind(this),
        reject: onReject.bind(this),
        resolve: onSuccess.bind(this),
        entity: 'create-gfs',
        includeParamOnCompletion: true,
      },
      concurrencyLimit: this.reqConcurrency,
    });
  }

  /**
   * @method serializeGFs
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeGFs(apiOptions: ApiOptions): ApiOptions {
    const { apiData: globalField } = apiOptions;
    const updatedGF = cloneDeep(gfSchemaTemplate);
    updatedGF.global_field.uid = globalField.uid;
    updatedGF.global_field.title = globalField.title;
    apiOptions.apiData = updatedGF;
    return apiOptions;
  }

  async updateGFs(): Promise<any> {
    const onSuccess = ({ response: globalField, apiData: { uid } = undefined }: any) => {
      log(this.importConfig, `Updated the global field ${uid}`, 'info');
    };
    const onReject = ({ error, apiData: { uid } = undefined }: any) => {
      log(this.importConfig, `Failed to update the global field '${uid}' ${formatError(error)}`, 'error');
    };
    
    return await this.makeConcurrentCall({
      processName: 'Update Global Fields',
      apiContent: this.gFs,
      apiParams: {
        reject: onReject.bind(this),
        resolve: onSuccess.bind(this),
        entity: 'update-gfs',
        includeParamOnCompletion: true,
      },
      concurrencyLimit: this.reqConcurrency,
    },
    this.updateSerializedGFs.bind(this),
    );
  }

  async updateSerializedGFs({
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
      let flag = { supressed: false };
      await removeReferenceFields(globalField.schema, flag, this.stack);
      if (flag.supressed) {
        this.pendingGFs.push(globalField.uid);
      }
      return this.stack
        .globalField(globalField.uid, { api_version: '3.2' })
        .update({ global_field: globalField })
        .then((response: GlobalField) => {
          apiParams.resolve({
            response,
            apiData: globalField,
          });
          resolve(true);
        })
        .catch((error: unknown) => {
          apiParams.reject({
            error,
            apiData: globalField,
          });
          reject(true);
        });
    });
  }

  async replaceGFs(): Promise<any> {
    const onSuccess = ({ response: globalField, apiData: { uid } = { uid: null } }: any) => {
      this.createdGFs.push(globalField);
      this.gFsUidMapper[uid] = globalField;
      fsUtil.writeFile(this.gFsUidMapperPath, this.gFsUidMapper);
      log(this.config, 'Global field ' + uid + ' replaced successfully', 'success');
    };

    const onReject = ({ error, apiData: { uid } }: any) => {
      log(this.importConfig, `Global fields '${uid}' failed to replace`, 'error');
      log(this.importConfig, formatError(error), 'error');
      this.failedGFs.push({ uid });
    };

    await this.makeConcurrentCall(
      {
        apiContent: this.existingGFs,
        processName: 'Replace global fields',
        apiParams: {
          serializeData: this.serializeReplaceGFs.bind(this),
          reject: onReject.bind(this),
          resolve: onSuccess.bind(this),
          entity: 'update-gfs',
          includeParamOnCompletion: true,
        },
        concurrencyLimit: this.importConfig.concurrency || this.importConfig.fetchConcurrency || 1,
      },
      undefined,
      false,
    );
  }

  /**
   * @method serializeReplaceGFs
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeReplaceGFs(apiOptions: ApiOptions): ApiOptions {
    const { apiData: globalField } = apiOptions;
    const globalFieldPayload = this.stack.globalField(globalField.uid, { api_version: '3.2' });
    Object.assign(globalFieldPayload, cloneDeep(globalField), {
      stackHeaders: globalFieldPayload.stackHeaders,
    });
    apiOptions.apiData = globalFieldPayload;
    return apiOptions;
  }
}
