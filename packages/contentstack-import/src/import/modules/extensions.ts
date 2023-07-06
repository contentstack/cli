import isEmpty from 'lodash/isEmpty';
import values from 'lodash/values';
import {join, resolve } from 'node:path';
import { FsUtility } from '@contentstack/cli-utilities';

import config from '../../config';
import { log, formatError } from '../../utils';
import BaseClass, { ApiOptions } from './base-class';
import { ModuleClassParams, Extensions } from '../../types';

export default class ImportExtensions extends BaseClass {
  private fs: FsUtility;
  private mapperDirPath: string;
  private extensionsFolderPath: string;
  private extUidMapperPath: string;
  private extSuccessPath: string;
  private extFailsPath: string;
  private extensionsConfig: Extensions;
  private extensions: Record<string, unknown>;
  private extUidMapper: Record<string, unknown>;
  private extSuccess: Record<string, unknown>[];
  private extFailed: Record<string, unknown>[];

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.extensionsConfig = config.modules.extensions;
    this.mapperDirPath = join(this.importConfig.backupDir, 'mapper', 'extensions');
    this.extensionsFolderPath = join(this.importConfig.backupDir, this.extensionsConfig.dirName);
    this.extUidMapperPath = join(this.mapperDirPath, 'uid-mapping.json');
    this.extSuccessPath = join(this.importConfig.backupDir, 'extensions', 'success.json');
    this.extFailsPath = join(this.importConfig.backupDir, 'extensions', 'fails.json');
    this.fs = new FsUtility({ basePath: this.mapperDirPath });
    this.extensions = this.fs.readFile(
      join(this.importConfig.backupDir, 'extensions', 'extensions.json'),
      true,
    ) as Record<string, unknown>;
    this.extFailed = [];
    this.extSuccess = [];
    this.extUidMapper = {};
  }

  /**
   * @method start
   * @returns {Promise<void>} Promise<void>
   */
  async start(): Promise<void> {
    log(this.importConfig, 'Migrating extensions', 'info');

    this.extUidMapper = this.fs.readFile(join(this.extUidMapperPath), true) as Record<string, unknown> || {};

    await this.importExtensions();

    if (this.extSuccess?.length) {
      new FsUtility({ basePath: this.extensionsFolderPath }).writeFile(this.extSuccessPath, this.extSuccess);
    }

    if (this.extFailed?.length) {
      new FsUtility({ basePath: this.extensionsFolderPath }).writeFile(this.extFailsPath, this.extFailed);
    }
  }

  async importExtensions(): Promise<any> {
    if (this.extensions === undefined || isEmpty(this.extensions)) {
      log(this.importConfig, 'No Extensions Found', 'info');
      return resolve();
    }

    const apiContent = values(this.extensions);

    const onSuccess = ({ response, apiData: { uid, title } = { uid: null, title: '' } }: any) => {
      this.extSuccess.push(response);
      this.extUidMapper[uid] = response.uid;
      log(this.importConfig, `Extension '${title}' imported successfully`, 'success');
      new FsUtility({ basePath: this.extensionsFolderPath }).writeFile(this.extUidMapperPath, this.extUidMapper);
    };

    const onReject = ({ error, apiData }: any) => {
      const err = error?.message ? JSON.parse(error.message): error;
      const { title } = apiData;
      if (err?.errors?.title) {
        log(this.importConfig, `Extension '${title}' already exists`, 'info');
      } else {
        this.extFailed.push(apiData);
        log(this.importConfig, `Extension '${title}' failed to be import ${formatError(error)}`, 'error');
        log(this.importConfig, error, 'error');
      }
    };

    /* eslint-disable no-await-in-loop */
    await this.makeConcurrentCall(
      {
        apiContent,
        processName: 'import extensions',
        apiParams: {
          serializeData: this.serializeExtensions.bind(this),
          reject: onReject.bind(this),
          resolve: onSuccess.bind(this),
          entity: 'create-extensions',
          includeParamOnCompletion: true,
        },
        concurrencyLimit: config.concurrency || config.fetchConcurrency || 1,
      },
      undefined,
      false,
    );
  }

  /**
   * @method serializeExtensions
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeExtensions(apiOptions: ApiOptions): ApiOptions {
    const { apiData: extension } = apiOptions;
    if (this.extUidMapper.hasOwnProperty(extension.uid)) {
      log(this.importConfig, `Extension '${extension.title}' already exists. Skipping it to avoid duplicates!`, 'info');
      apiOptions.entity = undefined;
    } else {
      apiOptions.apiData = extension;
    }
    return apiOptions;
  }
}
