import isEmpty from 'lodash/isEmpty';
import values from 'lodash/values';
import { join } from 'node:path';

import { log, formatError, fsUtil, fileHelper } from '../../utils';
import BaseClass, { ApiOptions } from './base-class';
import { ModuleClassParams, EnvironmentConfig } from '../../types';

export default class ImportEnvironments extends BaseClass {
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
    this.environmentsConfig = importConfig.modules.environments;
    this.mapperDirPath = join(this.importConfig.backupDir, 'mapper', 'environments');
    this.environmentsFolderPath = join(this.importConfig.backupDir, this.environmentsConfig.dirName);
    this.envUidMapperPath = join(this.mapperDirPath, 'uid-mapping.json');
    this.envSuccessPath = join(this.mapperDirPath, 'success.json');
    this.envFailsPath = join(this.mapperDirPath, 'fails.json');
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

    //Step1 check folder exists or not
    if (fileHelper.fileExistsSync(this.environmentsFolderPath)) {
      this.environments = fsUtil.readFile(join(this.environmentsFolderPath, 'environments.json'), true) as Record<
        string,
        unknown
      >;
    } else {
      log(this.importConfig, `No Environments Found - '${this.environmentsFolderPath}'`, 'info');
      return;
    }

    await fsUtil.makeDirectory(this.mapperDirPath);
    this.envUidMapper = fileHelper.fileExistsSync(this.envUidMapperPath)
      ? (fsUtil.readFile(join(this.envUidMapperPath), true) as Record<string, unknown>)
      : {};

    await this.importEnvironments();

    if (this.envSuccess?.length) {
      fsUtil.writeFile(this.envSuccessPath, this.envSuccess);
    }

    if (this.envFailed?.length) {
      fsUtil.writeFile(this.envFailsPath, this.envFailed);
    }

    log(this.importConfig, 'Environments have been imported successfully!', 'success');
  }

  async importEnvironments() {
    if (this.environments === undefined || isEmpty(this.environments)) {
      log(this.importConfig, 'No Environment Found', 'info');
      return;
    }

    const apiContent = values(this.environments);

    const onSuccess = ({ response, apiData: { uid, name } = { uid: null, name: '' } }: any) => {
      this.envSuccess.push(response);
      this.envUidMapper[uid] = response.uid;
      log(this.importConfig, `Environment '${name}' imported successfully`, 'success');
      fsUtil.writeFile(this.envUidMapperPath, this.envUidMapper);
    };

    const onReject = async ({ error, apiData }: any) => {
      const err = error?.message ? JSON.parse(error.message) : error;
      const { name, uid } = apiData;
      if (err?.errors?.name) {
        const res = await this.getEnvDetails(name);
        this.envUidMapper[uid] = res?.uid || ' ';
        fsUtil.writeFile(this.envUidMapperPath, this.envUidMapper);
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
        concurrencyLimit: this.importConfig.fetchConcurrency || 2,
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
      log(
        this.importConfig,
        `Environment '${environment.name}' already exists. Skipping it to avoid duplicates!`,
        'info',
      );
      apiOptions.entity = undefined;
    } else {
      apiOptions.apiData = environment;
    }
    return apiOptions;
  }

  async getEnvDetails(envName: string) {
    return await this.stack
      .environment(envName)
      .fetch()
      .then((data: any) => data)
      .catch((error: any) => {
        log(this.importConfig, `Failed to fetch environment details. ${formatError(error)}`, 'error');
      });
  }
}
