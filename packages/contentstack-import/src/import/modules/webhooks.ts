import isEmpty from 'lodash/isEmpty';
import values from 'lodash/values';
import { join } from 'node:path';
import { log, handleAndLogError } from '@contentstack/cli-utilities';

import { formatError, fsUtil, fileHelper } from '../../utils';
import BaseClass, { ApiOptions } from './base-class';
import { ModuleClassParams, WebhookConfig } from '../../types';

export default class ImportWebhooks extends BaseClass {
  private mapperDirPath: string;
  private webhooksFolderPath: string;
  private webhookUidMapperPath: string;
  private createdWebhooksPath: string;
  private failedWebhooksPath: string;
  private webhooksConfig: WebhookConfig;
  private webhooks: Record<string, unknown>;
  private webhookUidMapper: Record<string, unknown>;
  private createdWebhooks: Record<string, unknown>[];
  private failedWebhooks: Record<string, unknown>[];

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.importConfig.context.module = 'webhooks';
    this.webhooksConfig = importConfig.modules.webhooks;
    this.mapperDirPath = join(this.importConfig.backupDir, 'mapper', 'webhooks');
    this.webhooksFolderPath = join(this.importConfig.backupDir, this.webhooksConfig.dirName);
    this.webhookUidMapperPath = join(this.mapperDirPath, 'uid-mapping.json');
    this.createdWebhooksPath = join(this.mapperDirPath, 'success.json');
    this.failedWebhooksPath = join(this.mapperDirPath, 'fails.json');
    this.webhooks = {};
    this.failedWebhooks = [];
    this.createdWebhooks = [];
    this.webhookUidMapper = {};
  }

  /**
   * @method start
   * @returns {Promise<void>} Promise<void>
   */
  async start(): Promise<void> {
    log.debug('Checking for webhooks folder existence', this.importConfig.context);

    //Step1 check folder exists or not
    if (fileHelper.fileExistsSync(this.webhooksFolderPath)) {
      this.webhooks = fsUtil.readFile(join(this.webhooksFolderPath, 'webhooks.json'), true) as Record<string, unknown>;
      log.debug(`Found webhooks folder: ${this.webhooksFolderPath}`, this.importConfig.context);
      log.debug(`Loaded ${Object.keys(this.webhooks).length} webhooks from file`, this.importConfig.context);
    } else {
      log.info(`No Webhooks Found - '${this.webhooksFolderPath}'`, this.importConfig.context);
      return;
    }

    //create webhooks in mapper directory
    log.debug('Creating webhooks mapper directory', this.importConfig.context);
    await fsUtil.makeDirectory(this.mapperDirPath);
    log.debug('Created webhooks mapper directory', this.importConfig.context);
    
    log.debug('Loading existing webhook UID mappings', this.importConfig.context);
    this.webhookUidMapper = fileHelper.fileExistsSync(this.webhookUidMapperPath)
      ? (fsUtil.readFile(join(this.webhookUidMapperPath), true) as Record<string, unknown>)
      : {};
    
    if (Object.keys(this.webhookUidMapper)?.length > 0) {
      log.debug(`Loaded existing webhook UID mappings: ${Object.keys(this.webhookUidMapper).length} entries`, this.importConfig.context);
    } else {
      log.debug('No existing webhook UID mappings found', this.importConfig.context);
    }

    log.debug('Starting webhook import process', this.importConfig.context);
    await this.importWebhooks();

    log.debug('Processing webhook import results', this.importConfig.context);
    if (this.createdWebhooks?.length) {
      fsUtil.writeFile(this.createdWebhooksPath, this.createdWebhooks);
      log.debug(`Written ${this.createdWebhooks.length} successful webhooks to file`, this.importConfig.context);
    }

    if (this.failedWebhooks?.length) {
      fsUtil.writeFile(this.failedWebhooksPath, this.failedWebhooks);
      log.debug(`Written ${this.failedWebhooks.length} failed webhooks to file`, this.importConfig.context);
    }

    log.success('Webhooks have been imported successfully!', this.importConfig.context);
  }

  async importWebhooks() {
    log.debug('Validating webhooks data', this.importConfig.context);
    if (this.webhooks === undefined || isEmpty(this.webhooks)) {
      log.info('No Webhook Found', this.importConfig.context);
      return;
    }

    const apiContent = values(this.webhooks);
    log.debug(`Starting to import ${apiContent.length} webhooks`, this.importConfig.context);

    const onSuccess = ({ response, apiData: { uid, name } = { uid: null, name: '' } }: any) => {
      this.createdWebhooks.push(response);
      this.webhookUidMapper[uid] = response.uid;
      log.success(`Webhook '${name}' imported successfully`, this.importConfig.context);
      log.debug(`Webhook UID mapping: ${uid} → ${response.uid}`, this.importConfig.context);
      fsUtil.writeFile(this.webhookUidMapperPath, this.webhookUidMapper);
    };

    const onReject = ({ error, apiData }: any) => {
      const err = error?.message ? JSON.parse(error.message) : error;
      const { name, uid } = apiData;
      log.debug(`Webhook '${name}' (${uid}) failed to import`, this.importConfig.context);
      if (err?.errors?.name) {
        log.info(`Webhook '${name}' already exists`, this.importConfig.context);
      } else {
        this.failedWebhooks.push(apiData);
        handleAndLogError(error, { ...this.importConfig.context, webhookName: name }, `Webhook '${name}' failed to import`);
      }
    };

    log.debug(`Using concurrency limit: ${this.importConfig.fetchConcurrency || 1}`, this.importConfig.context);
    await this.makeConcurrentCall(
      {
        apiContent,
        processName: 'create webhooks',
        apiParams: {
          serializeData: this.serializeWebhooks.bind(this),
          reject: onReject.bind(this),
          resolve: onSuccess.bind(this),
          entity: 'create-webhooks',
          includeParamOnCompletion: true,
        },
        concurrencyLimit: this.importConfig.fetchConcurrency || 1,
      },
      undefined,
      false,
    );
    
    log.debug('Webhook import process completed', this.importConfig.context);
  }

  /**
   * @method serializeWebhooks
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeWebhooks(apiOptions: ApiOptions): ApiOptions {
    const { apiData: webhook } = apiOptions;
    log.debug(`Serializing webhook: ${webhook.name} (${webhook.uid})`, this.importConfig.context);

    if (this.webhookUidMapper.hasOwnProperty(webhook.uid)) {
      log.info(`Webhook '${webhook.name}' already exists. Skipping it to avoid duplicates!`, this.importConfig.context);
      log.debug(`Skipping webhook serialization for: ${webhook.uid}`, this.importConfig.context);
      apiOptions.entity = undefined;
    } else {
      log.debug(`Processing webhook status configuration`, this.importConfig.context);
      if (this.importConfig.importWebhookStatus === 'disable' || this.importConfig.importWebhookStatus !== 'current') {
        webhook.disabled = true;
        log.debug(`Webhook '${webhook.name}' will be imported as disabled`, this.importConfig.context);
      } else {
        log.debug(`Webhook '${webhook.name}' will be imported with current status`, this.importConfig.context);
      }
      apiOptions.apiData = webhook;
    }
    return apiOptions;
  }
}