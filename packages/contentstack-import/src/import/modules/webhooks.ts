import isEmpty from 'lodash/isEmpty';
import values from 'lodash/values';
import { join } from 'node:path';

import { log, formatError, fsUtil, fileHelper } from '../../utils';
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
    log(this.importConfig, 'Migrating webhooks', 'info');

    //Step1 check folder exists or not
    if (fileHelper.fileExistsSync(this.webhooksFolderPath)) {
      this.webhooks = fsUtil.readFile(join(this.webhooksFolderPath, 'webhooks.json'), true) as Record<string, unknown>;
    } else {
      log(this.importConfig, `No Webhooks Found - '${this.webhooksFolderPath}'`, 'info');
      return;
    }

    //create webhooks in mapper directory
    await fsUtil.makeDirectory(this.mapperDirPath);
    this.webhookUidMapper = fileHelper.fileExistsSync(this.webhookUidMapperPath)
      ? (fsUtil.readFile(join(this.webhookUidMapperPath), true) as Record<string, unknown>)
      : {};

    await this.importWebhooks();

    if (this.createdWebhooks?.length) {
      fsUtil.writeFile(this.createdWebhooksPath, this.createdWebhooks);
    }

    if (this.failedWebhooks?.length) {
      fsUtil.writeFile(this.failedWebhooksPath, this.failedWebhooks);
    }

    log(this.importConfig, 'Webhooks have been imported successfully!', 'success');
  }

  async importWebhooks() {
    if (this.webhooks === undefined || isEmpty(this.webhooks)) {
      log(this.importConfig, 'No Webhook Found', 'info');
      return;
    }

    const apiContent = values(this.webhooks);

    const onSuccess = ({ response, apiData: { uid, name } = { uid: null, name: '' } }: any) => {
      this.createdWebhooks.push(response);
      this.webhookUidMapper[uid] = response.uid;
      log(this.importConfig, `Webhook '${name}' imported successfully`, 'success');
      fsUtil.writeFile(this.webhookUidMapperPath, this.webhookUidMapper);
    };

    const onReject = ({ error, apiData }: any) => {
      const err = error?.message ? JSON.parse(error.message) : error;
      const { name } = apiData;
      if (err?.errors?.name) {
        log(this.importConfig, `Webhook '${name}' already exists`, 'info');
      } else {
        this.failedWebhooks.push(apiData);
        log(this.importConfig, `Webhook '${name}' failed to be import. ${formatError(error)}`, 'error');
      }
    };

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
  }

  /**
   * @method serializeWebhooks
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeWebhooks(apiOptions: ApiOptions): ApiOptions {
    const { apiData: webhook } = apiOptions;

    if (this.webhookUidMapper.hasOwnProperty(webhook.uid)) {
      log(this.importConfig, `Webhook '${webhook.name}' already exists. Skipping it to avoid duplicates!`, 'info');
      apiOptions.entity = undefined;
    } else {
      if (this.importConfig.importWebhookStatus === 'disable' || this.importConfig.importWebhookStatus !== 'current') {
        webhook.disabled = true;
      }
      apiOptions.apiData = webhook;
    }
    return apiOptions;
  }
}