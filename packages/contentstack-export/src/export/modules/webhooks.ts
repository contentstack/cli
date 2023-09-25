import omit from 'lodash/omit';
import isEmpty from 'lodash/isEmpty';
import { resolve as pResolve } from 'node:path';

import BaseClass from './base-class';
import { log, formatError, fsUtil } from '../../utils';
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
  }

  async start(): Promise<void> {
    log(this.exportConfig, 'Starting webhooks export', 'info');

    this.webhooksFolderPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.webhookConfig.dirName,
    );

    await fsUtil.makeDirectory(this.webhooksFolderPath);
    await this.getWebhooks();
    if (this.webhooks === undefined || isEmpty(this.webhooks)) {
      log(this.exportConfig, 'No webhooks found', 'info');
    } else {
      fsUtil.writeFile(pResolve(this.webhooksFolderPath, this.webhookConfig.fileName), this.webhooks);
      log(this.exportConfig, 'All the webhooks have been exported successfully!', 'success');
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
        log(this.exportConfig, `Failed to export webhooks.${formatError(error)}`, 'error');
        log(this.exportConfig, error, 'error');
      });
  }

  sanitizeAttribs(webhooks: Record<string, string>[]) {
    for (let index = 0; index < webhooks?.length; index++) {
      const webhookUid = webhooks[index].uid;
      const webhookName = webhooks[index]?.name;
      this.webhooks[webhookUid] = omit(webhooks[index], ['SYS_ACL']);
      log(this.exportConfig, `'${webhookName}' webhook was exported successfully`, 'success');
    }
  }
}
