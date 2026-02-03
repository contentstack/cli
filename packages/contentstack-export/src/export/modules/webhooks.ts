import omit from 'lodash/omit';
import isEmpty from 'lodash/isEmpty';
import { resolve as pResolve } from 'node:path';
import { handleAndLogError, messageHandler, log } from '@contentstack/cli-utilities';

import BaseClass from './base-class';
import { WebhookConfig, ModuleClassParams } from '../../types';
import { fsUtil, MODULE_CONTEXTS, MODULE_NAMES } from '../../utils';

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
    this.exportConfig.context.module = MODULE_CONTEXTS.WEBHOOKS;
    this.currentModuleName = MODULE_NAMES[MODULE_CONTEXTS.WEBHOOKS];
  }

  async start(): Promise<void> {
    try {
      log.debug('Starting webhooks export process...', this.exportConfig.context);

      // Setup with loading spinner
      const [totalCount] = await this.withLoadingSpinner('WEBHOOKS: Analyzing webhooks...', async () => {
        this.webhooksFolderPath = pResolve(
          this.exportConfig.exportDir,
          this.exportConfig.branchName || '',
          this.webhookConfig.dirName,
        );

        await fsUtil.makeDirectory(this.webhooksFolderPath);

        // Get count for progress tracking
        const countResponse = await this.stack.webhook().fetchAll({ ...this.qs, limit: 1 });
        return [countResponse.count || 0];
      });

      if (totalCount === 0) {
        log.info(messageHandler.parse('WEBHOOK_NOT_FOUND'), this.exportConfig.context);
        return;
      }

      // Create simple progress manager with total count
      const progress = this.createSimpleProgress(this.currentModuleName, totalCount);

      progress.updateStatus('Fetching webhooks...');
      await this.getWebhooks();
      log.debug(`Retrieved ${Object.keys(this.webhooks || {}).length} webhooks`, this.exportConfig.context);

      if (this.webhooks === undefined || isEmpty(this.webhooks)) {
        log.info(messageHandler.parse('WEBHOOK_NOT_FOUND'), this.exportConfig.context);
      } else {
        const webhooksFilePath = pResolve(this.webhooksFolderPath, this.webhookConfig.fileName);
        log.debug(`Writing webhooks to: ${webhooksFilePath}`, this.exportConfig.context);
        fsUtil.writeFile(webhooksFilePath, this.webhooks);
      }

      this.completeProgressWithMessage();
    } catch (error) {
      handleAndLogError(error, { ...this.exportConfig.context });
      this.completeProgress(false, error?.message || 'Webhooks export failed');
    }
  }

  async getWebhooks(skip = 0): Promise<void> {
    if (skip) {
      this.qs.skip = skip;
      log.debug(`Fetching webhooks with skip: ${skip}`, this.exportConfig.context);
    } else {
      log.debug('Fetching webhooks with initial query', this.exportConfig.context);
    }

    log.debug(`Query parameters: ${JSON.stringify(this.qs)}`, this.exportConfig.context);

    await this.stack
      .webhook()
      .fetchAll(this.qs)
      .then(async (data: any) => {
        const { items, count } = data;
        log.debug(`Fetched ${items?.length || 0} webhooks out of total ${count}`, this.exportConfig.context);

        if (items?.length) {
          log.debug(`Processing ${items.length} webhooks`, this.exportConfig.context);
          this.sanitizeAttribs(items);
          skip += this.webhookConfig.limit || 100;
          if (skip >= count) {
            log.debug('Completed fetching all webhooks', this.exportConfig.context);
            return;
          }
          log.debug(`Continuing to fetch webhooks with skip: ${skip}`, this.exportConfig.context);
          return await this.getWebhooks(skip);
        } else {
          log.debug('No webhooks found to process', this.exportConfig.context);
        }
      })
      .catch((error: any) => {
        this.progressManager?.tick(false, 'webhooks', error?.message || 'Failed to export webhooks');
        log.debug('Error occurred while fetching webhooks', this.exportConfig.context);
        handleAndLogError(error, { ...this.exportConfig.context });
      });
  }

  sanitizeAttribs(webhooks: Record<string, string>[]) {
    log.debug(`Sanitizing ${webhooks.length} webhooks`, this.exportConfig.context);

    for (let index = 0; index < webhooks?.length; index++) {
      const webhookUid = webhooks[index].uid;
      const webhookName = webhooks[index]?.name;
      log.debug(`Processing webhook: ${webhookName} (${webhookUid})`, this.exportConfig.context);

      this.webhooks[webhookUid] = omit(webhooks[index], ['SYS_ACL']);
      log.success(messageHandler.parse('WEBHOOK_EXPORT_SUCCESS', webhookName), this.exportConfig.context);

      // Track progress for each webhook
      this.progressManager?.tick(true, `webhook: ${webhookName}`);
    }

    log.debug(
      `Sanitization complete. Total webhooks processed: ${Object.keys(this.webhooks || {}).length}`,
      this.exportConfig.context,
    );
  }
}
