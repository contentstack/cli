import isEmpty from 'lodash/isEmpty';
import values from 'lodash/values';
import omit from 'lodash/omit';
import {join, resolve } from 'node:path';
import { FsUtility } from '@contentstack/cli-utilities';

import config from '../../config';
import { log, formatError } from '../../utils';
import BaseClass, { ApiOptions } from './base-class';
import { ModuleClassParams, EnvironmentConfig, } from '../../types';

export default class ImportEnvironments extends BaseClass {
  private fs: FsUtility;
  private mapperDirPath: string;
  private environmentsFolderPath: string;
  private envUidMapperPath: string;
  private envSuccessPath: string;
  private envFailsPath: string;
  private environmentsConfig: EnvironmentConfig;
  private environments: Record<string, unknown>;
  private envUidMapper: Record<string, unknown>;
  private envSuccess: Record<string, unknown>[];
  private envFailed: Record<string, unknown>[];

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.environmentsConfig = config.modules.environments;
    this.mapperDirPath = join(this.importConfig.backupDir, 'mapper', 'environments');
    this.environmentsFolderPath = join(this.importConfig.backupDir, this.environmentsConfig.dirName);
    this.envUidMapperPath = join(this.mapperDirPath, 'uid-mapping.json');
    this.envSuccessPath = join(this.importConfig.backupDir, 'environments', 'success.json');
    this.envFailsPath = join(this.importConfig.backupDir, 'environments', 'fails.json');
    this.fs = new FsUtility({ basePath: this.mapperDirPath });
    this.environments = this.fs.readFile(
      join(this.importConfig.backupDir, 'environments', 'environments.json'),
      true,
    ) as Record<string, unknown>;
    this.envFailed = [];
    this.envSuccess = [];
    this.envUidMapper = {};
  }

  /**
   * @method start
   * @returns {Promise<void>} Promise<void>
   */
  async start(): Promise<void> {
    log(this.importConfig, 'Migrating environments', 'info');

    this.envUidMapper = this.fs.readFile(join(this.envUidMapperPath), true) as Record<string, unknown> || {};

    await this.importEnvironments();

    if (this.envSuccess?.length) {
      new FsUtility({ basePath: this.environmentsFolderPath }).writeFile(this.envSuccessPath, this.envSuccess);
    }

    if (this.envFailed?.length) {
      new FsUtility({ basePath: this.environmentsFolderPath }).writeFile(this.envFailsPath, this.envFailed);
    }
  }

  async importEnvironments() {
    if (this.environments === undefined || isEmpty(this.environments)) {
      log(this.importConfig, 'No Environment Found', 'info');
      return resolve();
    }

    const apiContent = values(this.environments);

    const onSuccess = ({ response, apiData: { uid, name } = { uid: null, name: '' } }: any) => {
      this.envSuccess.push(response);
      this.envUidMapper[uid] = response.uid;
      log(this.importConfig, `Environment '${name}' imported successfully`, 'success');
      new FsUtility({ basePath: this.environmentsFolderPath }).writeFile(this.envUidMapperPath, this.envUidMapper);
    };

    const onReject = ({ error, apiData }: any) => {
      const err = error?.message ? JSON.parse(error.message): error;
      const { name } = apiData;
      if (err?.errors?.name) {
        log(this.importConfig, `Environment '${name}' already exists`, 'info');
      } else {
        this.envFailed.push(apiData);
        log(this.importConfig, `Environment '${name}' failed to be import. ${formatError(error)}`, 'error');
        log(this.importConfig, error, 'error');
      }
    };

    await this.makeConcurrentCall(
      {
        apiContent,
        processName: 'import environments',
        apiParams: {
          serializeData: this.serializeEnvironments.bind(this),
          reject: onReject.bind(this),
          resolve: onSuccess.bind(this),
          entity: 'create-environments',
          includeParamOnCompletion: true,
        },
        concurrencyLimit: config.fetchConcurrency || 2,
      },
      undefined,
      false,
    );
  }

  /**
   * @method serializeEnvironments
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeEnvironments(apiOptions: ApiOptions): ApiOptions {
    const { apiData: environment } = apiOptions;
    if (this.envUidMapper.hasOwnProperty(environment.uid)) {
      log(this.importConfig, `Environment '${environment.name}' already exists. Skipping it to avoid duplicates!`, 'info');
      apiOptions.entity = undefined;
    } else {
      apiOptions.apiData = environment;
    }
    return apiOptions;
  }
}
