import isEmpty from 'lodash/isEmpty';
import values from 'lodash/values';
import { join } from 'node:path';
import { log, handleAndLogError } from '@contentstack/cli-utilities';

import { fsUtil, fileHelper } from '../../utils';
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
    this.importConfig.context.module = 'environments';
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
    log.debug('Checking if environments folder exists...', this.importConfig.context);

    //Step1 check folder exists or not
    if (fileHelper.fileExistsSync(this.environmentsFolderPath)) {
      log.debug(`Found environments folder: ${this.environmentsFolderPath}`, this.importConfig.context);
      this.environments = fsUtil.readFile(join(this.environmentsFolderPath, 'environments.json'), true) as Record<
        string,
        unknown
      >;
      const envCount = Object.keys(this.environments || {}).length;
      log.debug(`Loaded ${envCount} environment items from file`, this.importConfig.context);
    } else {
      log.info(`No environments found: '${this.environmentsFolderPath}'`, this.importConfig.context);
      return;
    }

    log.debug('Creating environments mapper directory...', this.importConfig.context);
    await fsUtil.makeDirectory(this.mapperDirPath);
    log.debug('Loading existing environment UID mappings...', this.importConfig.context);
    this.envUidMapper = fileHelper.fileExistsSync(this.envUidMapperPath)
      ? (fsUtil.readFile(join(this.envUidMapperPath), true) as Record<string, unknown>)
      : {};

    if (Object.keys(this.envUidMapper)?.length > 0) {
      const envUidCount = Object.keys(this.envUidMapper || {}).length;
      log.debug(`Loaded existing environment UID data: ${envUidCount} items`, this.importConfig.context);
    } else {
      log.debug('No existing environment UID mappings found.', this.importConfig.context);
    }

    log.debug('Starting environment import process...', this.importConfig.context);
    await this.importEnvironments();

    log.debug('Processing environment import results...', this.importConfig.context);
    if (this.envSuccess?.length) {
      fsUtil.writeFile(this.envSuccessPath, this.envSuccess);
      log.debug(`Written ${this.envSuccess.length} successful environments to file`, this.importConfig.context);
    }

    if (this.envFailed?.length) {
      fsUtil.writeFile(this.envFailsPath, this.envFailed);
      log.debug(`Written ${this.envFailed.length} failed environments to file`, this.importConfig.context);
    }

    log.success('Environments have been imported successfully!', this.importConfig.context);
  }

  async importEnvironments() {
    log.debug('Validating environment data...', this.importConfig.context);
    if (this.environments === undefined || isEmpty(this.environments)) {
      log.info('No environment found.', this.importConfig.context);
      return;
    }

    const apiContent = values(this.environments);
    log.debug(`Starting to import ${apiContent.length} environments`, this.importConfig.context);
    log.debug(`Environment names: ${apiContent.map((e: any) => e.name).join(', ')}`, this.importConfig.context);

    const onSuccess = ({ response, apiData: { uid, name } = { uid: null, name: '' } }: any) => {
      this.envSuccess.push(response);
      this.envUidMapper[uid] = response.uid;
      log.success(`Environment '${name}' imported successfully`, this.importConfig.context);
      log.debug(`Environment UID mapping: ${uid} → ${response.uid}`, this.importConfig.context);
      fsUtil.writeFile(this.envUidMapperPath, this.envUidMapper);
    };

    const onReject = async ({ error, apiData }: any) => {
      const err = error?.message ? JSON.parse(error.message) : error;
      const { name, uid } = apiData;
      log.debug(`Environment '${name}' (${uid}) failed to import`, this.importConfig.context);
      if (err?.errors?.name) {
        log.debug(`Environment '${name}' already exists`, this.importConfig.context);
        const res = await this.getEnvDetails(name);
        this.envUidMapper[uid] = res?.uid || ' ';
        fsUtil.writeFile(this.envUidMapperPath, this.envUidMapper);
        log.info(`Environment '${name}' already exists`, this.importConfig.context);
        log.debug(`Added existing environment UID mapping: ${uid} → ${res?.uid}`, this.importConfig.context);
      } else {
        this.envFailed.push(apiData);
        handleAndLogError(error, { ...this.importConfig.context, name }, `Environment '${name}' failed to be import`);
      }
    };

    log.debug(`Using concurrency limit: ${this.importConfig.fetchConcurrency || 2}`, this.importConfig.context);
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

    log.debug('Environment import process completed.', this.importConfig.context);
  }

  /**
   * @method serializeEnvironments
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeEnvironments(apiOptions: ApiOptions): ApiOptions {
    const { apiData: environment } = apiOptions;
    log.debug(`Serializing environment: ${environment.name} (${environment.uid})`, this.importConfig.context);

    if (this.envUidMapper.hasOwnProperty(environment.uid)) {
      log.info(
        `Environment '${environment.name}' already exists. Skipping it to avoid duplicates!`,
        this.importConfig.context,
      );
      log.debug(`Skipping environment serialization for: ${environment.uid}`, this.importConfig.context);
      apiOptions.entity = undefined;
    } else {
      log.debug(`Processing environment: ${environment.name}`, this.importConfig.context);
      apiOptions.apiData = environment;
    }
    return apiOptions;
  }

  async getEnvDetails(envName: string) {
    log.debug(`Fetching environment details for: ${envName}`, this.importConfig.context);
    return await this.stack
      .environment(envName)
      .fetch()
      .then((data: any) => {
        log.debug(`Successfully fetched environment details for: ${envName}`, this.importConfig.context);
        return data;
      })
      .catch((error: any) => {
        log.debug(`Error fetching environment details for: ${envName}`, this.importConfig.context);
        handleAndLogError(error, { ...this.importConfig.context, envName });
      });
  }
}
