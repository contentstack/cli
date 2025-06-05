import omit from 'lodash/omit';
import isEmpty from 'lodash/isEmpty';
import { resolve as pResolve } from 'node:path';
import { handleAndLogError, messageHandler, v2Logger } from '@contentstack/cli-utilities';

import BaseClass from './base-class';
import { fsUtil } from '../../utils';
import { WebhookConfig, ModuleClassParams } from '../../types';

export default class ExportWebhooks extends BaseClass {
  private webhooks: Record<string, Record<string, string>>;
  private webhookConfig: WebhookConfig;
  public webhooksFolderPath: string;
  private qs: {
    include_count: boolean;
    skip?: number;
    asc: string;
  };

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.webhooks = {};
    this.webhookConfig = exportConfig.modules.webhooks;
    this.qs = { include_count: true, asc: 'updated_at' };
    this.exportConfig.context.module = 'webhooks';
  }

  async start(): Promise<void> {
    this.webhooksFolderPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.webhookConfig.dirName,
    );

    await fsUtil.makeDirectory(this.webhooksFolderPath);
    await this.getWebhooks();
    if (this.webhooks === undefined || isEmpty(this.webhooks)) {
      v2Logger.info(messageHandler.parse('WEBHOOK_NOT_FOUND'), this.exportConfig.context);
    } else {
      fsUtil.writeFile(pResolve(this.webhooksFolderPath, this.webhookConfig.fileName), this.webhooks);
      v2Logger.success(
        messageHandler.parse('WEBHOOK_EXPORT_COMPLETE', Object.keys(this.webhooks).length),
        this.exportConfig.context,
      );
    }
  }

  async getWebhooks(skip = 0): Promise<void> {
    if (skip) {
      this.qs.skip = skip;
    }

    await this.stack
      .webhook()
      .fetchAll(this.qs)
      .then(async (data: any) => {
        const { items, count } = data;
        if (items?.length) {
          this.sanitizeAttribs(items);
          skip += this.webhookConfig.limit || 100;
          if (skip >= count) {
            return;
          }
          return await this.getWebhooks(skip);
        }
      })
      .catch((error: any) => {
        handleAndLogError(error, { ...this.exportConfig.context });
      });
  }

  sanitizeAttribs(webhooks: Record<string, string>[]) {
    for (let index = 0; index < webhooks?.length; index++) {
      const webhookUid = webhooks[index].uid;
      const webhookName = webhooks[index]?.name;
      this.webhooks[webhookUid] = omit(webhooks[index], ['SYS_ACL']);
      v2Logger.success(messageHandler.parse('WEBHOOK_EXPORT_SUCCESS', webhookName), this.exportConfig.context);
    }
  }
}
