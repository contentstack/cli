import isEmpty from 'lodash/isEmpty';
import values from 'lodash/values';
import { join } from 'node:path';
import { log, handleAndLogError } from '@contentstack/cli-utilities';

import { fsUtil, fileHelper, PROCESS_NAMES, MODULE_CONTEXTS, PROCESS_STATUS, MODULE_NAMES } from '../../utils';
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
    this.importConfig.context.module = MODULE_CONTEXTS.ENVIRONMENTS;
    this.currentModuleName = MODULE_NAMES[MODULE_CONTEXTS.ENVIRONMENTS];
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
    try {
      log.debug('Starting environments import process...', this.importConfig.context);

      const [environmentsCount] = await this.analyzeEnvironments();
      if (environmentsCount === 0) {
        log.info('No Environments Found', this.importConfig.context);
        return;
      }

      const progress = this.createSimpleProgress(this.currentModuleName, environmentsCount);
      await this.prepareEnvironmentMapper();

      progress.updateStatus(PROCESS_STATUS[PROCESS_NAMES.ENVIRONMENTS_IMPORT].IMPORTING);
      await this.importEnvironments();

      await this.processImportResults();
      this.completeProgressWithMessage();
    } catch (error) {
      this.completeProgress(false, error?.message || 'Environments import failed');
      handleAndLogError(error, { ...this.importConfig.context });
    }
  }

  async importEnvironments() {
    log.debug('Validating environments data', this.importConfig.context);
    if (this.environments === undefined || isEmpty(this.environments)) {
      log.info('No Environment Found', this.importConfig.context);
      return;
    }

    const apiContent = values(this.environments);
    log.debug(`Starting to import ${apiContent.length} environments`, this.importConfig.context);
    log.debug(`Environment names: ${apiContent.map((e: any) => e.name).join(', ')}`, this.importConfig.context);

    const onSuccess = ({ response, apiData: { uid, name } = { uid: null, name: '' } }: any) => {
      this.envSuccess.push(response);
      this.envUidMapper[uid] = response.uid;
      this.progressManager?.tick(true, `environment: ${name || uid}`, null, PROCESS_NAMES.ENVIRONMENTS_IMPORT);
      log.success(`Environment '${name}' imported successfully`, this.importConfig.context);
      log.debug(`Environment UID mapping: ${uid} → ${response.uid}`, this.importConfig.context);
      fsUtil.writeFile(this.envUidMapperPath, this.envUidMapper);
    };

    const onReject = async ({ error, apiData }: any) => {
      const err = error?.message ? JSON.parse(error.message) : error;
      const { name, uid } = apiData;
      log.debug(`Environment '${name}' (${uid}) failed to import`, this.importConfig.context);

      if (err?.errors?.name) {
        log.debug(`Environment '${name}' already exists, fetching details`, this.importConfig.context);
        const res = await this.getEnvDetails(name);
        this.envUidMapper[uid] = res?.uid || ' ';
        fsUtil.writeFile(this.envUidMapperPath, this.envUidMapper);
        this.progressManager?.tick(
          true,
          null,
          `environment: ${name || uid} (already exists)`,
          PROCESS_NAMES.ENVIRONMENTS_IMPORT,
        );
        log.info(`Environment '${name}' already exists`, this.importConfig.context);
        log.debug(`Added existing environment UID mapping: ${uid} → ${res?.uid}`, this.importConfig.context);
      } else {
        this.envFailed.push(apiData);
        this.envFailed.push(apiData);
        this.progressManager?.tick(
          false,
          `environment: ${name || uid}`,
          error?.message || 'Failed to import environment',
          PROCESS_NAMES.ENVIRONMENTS_IMPORT,
        );
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

    log.debug('Environments import process completed', this.importConfig.context);
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
      // Still tick progress for skipped environments
      this.progressManager?.tick(
        true,
        `environment: ${environment.name}`,
        `environment: ${environment.name} (skipped - already exists)`,
        PROCESS_NAMES.ENVIRONMENTS_IMPORT,
      );
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

  private async analyzeEnvironments(): Promise<[number]> {
    return this.withLoadingSpinner('ENVIRONMENTS: Analyzing import data...', async () => {
      log.debug('Checking for environments folder existence', this.importConfig.context);

      if (!fileHelper.fileExistsSync(this.environmentsFolderPath)) {
        log.info(`No Environments Found - '${this.environmentsFolderPath}'`, this.importConfig.context);
        return [0];
      }

      log.debug(`Found environments folder: ${this.environmentsFolderPath}`, this.importConfig.context);

      this.environments = fsUtil.readFile(join(this.environmentsFolderPath, 'environments.json'), true) as Record<
        string,
        unknown
      >;

      const count = Object.keys(this.environments || {}).length;
      log.debug(`Loaded ${count} environment items from file`, this.importConfig.context);
      return [count];
    });
  }

  private async prepareEnvironmentMapper(): Promise<void> {
    log.debug('Creating environments mapper directory', this.importConfig.context);
    await fsUtil.makeDirectory(this.mapperDirPath);

    log.debug('Loading existing environment UID mappings', this.importConfig.context);
    this.envUidMapper = fileHelper.fileExistsSync(this.envUidMapperPath)
      ? (fsUtil.readFile(this.envUidMapperPath, true) as Record<string, unknown>)
      : {};

    const count = Object.keys(this.envUidMapper || {}).length;
    if (count > 0) {
      log.debug(`Loaded existing environment UID data: ${count} items`, this.importConfig.context);
    } else {
      log.debug('No existing environment UID mappings found', this.importConfig.context);
    }
  }

  private async processImportResults(): Promise<void> {
    log.debug('Processing environment import results', this.importConfig.context);

    if (this.envSuccess?.length) {
      fsUtil.writeFile(this.envSuccessPath, this.envSuccess);
      log.debug(`Written ${this.envSuccess.length} successful environments to file`, this.importConfig.context);
    }

    if (this.envFailed?.length) {
      fsUtil.writeFile(this.envFailsPath, this.envFailed);
      log.debug(`Written ${this.envFailed.length} failed environments to file`, this.importConfig.context);
    }
  }
}
