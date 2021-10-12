import * as path from 'path';
import { logger } from '@contentstack/cli-utilities';
import { fileHelper } from '../../utils';
export default class WebhooksExport {
  private context: any;
  private stackAPIClient: any;
  private exportConfig: any;
  private qs: any;
  private webhooksConfig: any;
  private webhooksPath: string;

  constructor(context, stackAPIClient, exportConfig) {
    this.context = context;
    this.stackAPIClient = stackAPIClient;
    this.exportConfig = exportConfig;
    this.webhooksConfig = exportConfig.moduleLevelConfig.webhooks;
    this.qs = {
      include_count: true,
      asc: 'updated_at',
    };
    this.webhooksPath = path.resolve(exportConfig.branchDir || exportConfig.exportDir, this.webhooksConfig.dirName);
  }

  async start() {
    try {
      await fileHelper.makeDirectory(this.webhooksPath);
      const webhooks = await this.getWebhooks();
      await fileHelper.writeFile(path.join(this.webhooksPath, this.webhooksConfig.fileName), webhooks);
      console.log('completed webhooks export');
    } catch (error) {
      logger.error('error in webhooks export', error);
    }
  }

  async getWebhooks() {
    let webhooks = await this.stackAPIClient.locale().query(this.qs).find();
    if (Array.isArray(webhooks.items) && webhooks.items.length > 0) {
      let updatedWebhooks = this.sanitizeAttribs(webhooks.items);
      return updatedWebhooks;
    }
    logger.info('No webhooks found');
  }

  sanitizeAttribs(webhooks) {
    let updatedWebhooks = {};
    webhooks.forEach((webhook) => {
      delete webhook.SYS_ACL;
      updatedWebhooks[webhook.uid] = webhook;
    });
    return updatedWebhooks;
  }
}
