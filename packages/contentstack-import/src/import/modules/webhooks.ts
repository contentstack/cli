import isEmpty from 'lodash/isEmpty';
import values from 'lodash/values';
import { join } from 'node:path';
import { log, handleAndLogError } from '@contentstack/cli-utilities';

import { fsUtil, fileHelper } from '../../utils';
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
    this.currentModuleName = 'Webhooks';
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
    try {
      log.debug('Starting webhooks import process...', this.importConfig.context);

      const [webhooksCount] = await this.analyzeWebhooks();

      if (webhooksCount === 0) {
        log.info(`No Webhooks Found - '${this.webhooksFolderPath}'`, this.importConfig.context);
        return;
      }

      const progress = this.createSimpleProgress(this.currentModuleName, webhooksCount);
      await this.prepareWebhookMapper();

      progress.updateStatus('Importing webhooks...');
      await this.importWebhooks();

      this.processWebhookResults();

      this.completeProgress(true);
      log.success('Webhooks have been imported successfully!', this.importConfig.context);
    } catch (error) {
      this.completeProgress(false, error?.message || 'Webhooks import failed');
      handleAndLogError(error, { ...this.importConfig.context });
    }
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
      this.progressManager?.tick(true, `webhook: ${name || uid}`);
      log.success(`Webhook '${name}' imported successfully`, this.importConfig.context);
      log.debug(`Webhook UID mapping: ${uid} → ${response.uid}`, this.importConfig.context);
      fsUtil.writeFile(this.webhookUidMapperPath, this.webhookUidMapper);
    };

    const onReject = ({ error, apiData }: any) => {
      const err = error?.message ? JSON.parse(error.message) : error;
      const { name, uid } = apiData;
      log.debug(`Webhook '${name}' (${uid}) failed to import`, this.importConfig.context);

      if (err?.errors?.name) {
        this.progressManager?.tick(true, `webhook: ${name || uid} (already exists)`);
        log.info(`Webhook '${name}' already exists`, this.importConfig.context);
      } else {
        this.failedWebhooks.push(apiData);
        this.progressManager?.tick(false, `webhook: ${name || uid}`, error?.message || 'Failed to import webhook');
        handleAndLogError(
          error,
          { ...this.importConfig.context, webhookName: name },
          `Webhook '${name}' failed to import`,
        );
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
      this.progressManager?.tick(true, `webhook: ${webhook.name} (skipped - already exists)`);
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

  private async analyzeWebhooks(): Promise<[number]> {
    return this.withLoadingSpinner('WEBHOOKS: Analyzing import data...', async () => {
      log.debug('Checking for webhooks folder existence', this.importConfig.context);

      if (!fileHelper.fileExistsSync(this.webhooksFolderPath)) {
        log.info(`No Webhooks Found - '${this.webhooksFolderPath}'`, this.importConfig.context);
        return [0];
      }

      log.debug(`Found webhooks folder: ${this.webhooksFolderPath}`, this.importConfig.context);

      this.webhooks = fsUtil.readFile(join(this.webhooksFolderPath, 'webhooks.json'), true) as Record<string, unknown>;

      if (!this.webhooks) {
        log.info(
          `No webhooks found in file - '${join(this.webhooksFolderPath, 'webhooks.json')}'`,
          this.importConfig.context,
        );
        return [0];
      }

      const count = Object.keys(this.webhooks || {}).length;
      log.debug(`Loaded ${count} webhook items from file`, this.importConfig.context);
      return [count];
    });
  }

  private async prepareWebhookMapper(): Promise<void> {
    log.debug('Creating webhooks mapper directory', this.importConfig.context);
    await fsUtil.makeDirectory(this.mapperDirPath);

    log.debug('Loading existing webhook UID mappings', this.importConfig.context);
    this.webhookUidMapper = fileHelper.fileExistsSync(this.webhookUidMapperPath)
      ? (fsUtil.readFile(join(this.webhookUidMapperPath), true) as Record<string, unknown>) || {}
      : {};

    const count = Object.keys(this.webhookUidMapper || {}).length;
    if (count > 0) {
      log.debug(`Loaded existing webhook UID data: ${count} items`, this.importConfig.context);
    } else {
      log.debug('No existing webhook UID mappings found', this.importConfig.context);
    }
  }

  private processWebhookResults() {
    log.debug('Processing webhook import results', this.importConfig.context);

    if (this.createdWebhooks?.length) {
      fsUtil.writeFile(this.createdWebhooksPath, this.createdWebhooks);
      log.debug(`Written ${this.createdWebhooks.length} successful webhooks to file`, this.importConfig.context);
    }

    if (this.failedWebhooks?.length) {
      fsUtil.writeFile(this.failedWebhooksPath, this.failedWebhooks);
      log.debug(`Written ${this.failedWebhooks.length} failed webhooks to file`, this.importConfig.context);
    }
  }
}
