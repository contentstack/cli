import isEmpty from 'lodash/isEmpty';
import values from 'lodash/values';
import { join } from 'node:path';

import { log, formatError, fsUtil, fileHelper } from '../../utils';
import BaseClass, { ApiOptions } from './base-class';
import { ModuleClassParams, Extensions } from '../../types';

export default class ImportExtensions extends BaseClass {
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
    this.extensionsConfig = importConfig.modules.extensions;
    this.mapperDirPath = join(this.importConfig.backupDir, 'mapper', 'extensions');
    this.extensionsFolderPath = join(this.importConfig.backupDir, this.extensionsConfig.dirName);
    this.extUidMapperPath = join(this.mapperDirPath, 'uid-mapping.json');
    this.extSuccessPath = join(this.mapperDirPath, 'success.json');
    this.extFailsPath = join(this.mapperDirPath, 'fails.json');
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

    //Step1 check folder exists or not
    if (fileHelper.fileExistsSync(this.extensionsFolderPath)) {
      this.extensions = fsUtil.readFile(join(this.extensionsFolderPath, 'extensions.json'), true) as Record<string,unknown>;
    } else {
      log(this.importConfig, `No such file or directory - '${this.extensionsFolderPath}'`, 'error');
      return;
    }

    await fsUtil.makeDirectory(this.mapperDirPath);
    this.extUidMapper = fileHelper.fileExistsSync(this.extUidMapperPath)
      ? (fsUtil.readFile(join(this.extUidMapperPath), true) as Record<string, unknown>)
      : {};

    await this.importExtensions();

    if (this.extSuccess?.length) {
      fsUtil.writeFile(this.extSuccessPath, this.extSuccess);
    }

    if (this.extFailed?.length) {
      fsUtil.writeFile(this.extFailsPath, this.extFailed);
    }

    log(this.importConfig, 'Extensions have been imported successfully!', 'success');
  }

  async importExtensions(): Promise<any> {
    if (this.extensions === undefined || isEmpty(this.extensions)) {
      log(this.importConfig, 'No Extensions Found', 'info');
      return;
    }

    const apiContent = values(this.extensions);

    const onSuccess = ({ response, apiData: { uid, title } = { uid: null, title: '' } }: any) => {
      this.extSuccess.push(response);
      this.extUidMapper[uid] = response.uid;
      log(this.importConfig, `Extension '${title}' imported successfully`, 'success');
      fsUtil.writeFile(this.extUidMapperPath, this.extUidMapper);
    };

    const onReject = ({ error, apiData }: any) => {
      const err = error?.message ? JSON.parse(error.message) : error;
      const { title } = apiData;
      if (err?.errors?.title) {
        log(this.importConfig, `Extension '${title}' already exists`, 'info');
      } else {
        this.extFailed.push(apiData);
        log(this.importConfig, `Extension '${title}' failed to be import ${formatError(error)}`, 'error');
        log(this.importConfig, error, 'error');
      }
    };

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
        concurrencyLimit: this.importConfig.concurrency || this.importConfig.fetchConcurrency || 1,
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
