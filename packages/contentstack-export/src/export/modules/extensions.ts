import omit from 'lodash/omit';
import isEmpty from 'lodash/isEmpty';
import { resolve as pResolve } from 'node:path';
import { handleAndLogError, messageHandler, log } from '@contentstack/cli-utilities';

import BaseClass from './base-class';
import { ExtensionsConfig, ModuleClassParams } from '../../types';
import { fsUtil, MODULE_CONTEXTS, MODULE_NAMES } from '../../utils';

export default class ExportExtensions extends BaseClass {
  private extensionsFolderPath: string;
  private extensions: Record<string, unknown>;
  public extensionConfig: ExtensionsConfig;
  private qs: {
    include_count: boolean;
    skip?: number;
  };

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.extensions = {};
    this.extensionConfig = exportConfig.modules.extensions;
    this.qs = { include_count: true };
    this.applyQueryFilters(this.qs, 'extensions');
    this.exportConfig.context.module = MODULE_CONTEXTS.EXTENSIONS;
    this.currentModuleName = MODULE_NAMES[MODULE_CONTEXTS.EXTENSIONS];
  }

  async start(): Promise<void> {
    try {
      log.debug('Starting extensions export process...', this.exportConfig.context);

      // Setup with loading spinner
      const [totalCount] = await this.withLoadingSpinner('EXTENSIONS: Analyzing extensions...', async () => {
        this.extensionsFolderPath = pResolve(
          this.exportConfig.exportDir,
          this.exportConfig.branchName || '',
          this.extensionConfig.dirName,
        );
        await fsUtil.makeDirectory(this.extensionsFolderPath);
        log.debug(`Extensions folder path: ${this.extensionsFolderPath}`, this.exportConfig.context);

        // Get count for progress tracking
        const countResponse = await this.stack
          .extension()
          .query({ ...this.qs, include_count: true, limit: 1 })
          .find();
        return [countResponse.count || 0];
      });

      if (totalCount === 0) {
        log.info(messageHandler.parse('EXTENSION_NOT_FOUND'), this.exportConfig.context);
        return;
      }

      // Create simple progress manager with total count
      const progress = this.createSimpleProgress(this.currentModuleName, totalCount);

      progress.updateStatus('Fetching extensions...');
      await this.getExtensions();
      log.debug(`Retrieved ${Object.keys(this.extensions || {}).length} extensions`, this.exportConfig.context);

      if (this.extensions === undefined || isEmpty(this.extensions)) {
        log.info(messageHandler.parse('EXTENSION_NOT_FOUND'), this.exportConfig.context);
      } else {
        const extensionsFilePath = pResolve(this.extensionsFolderPath, this.extensionConfig.fileName);
        log.debug(`Writing extensions to: ${extensionsFilePath}`, this.exportConfig.context);
        fsUtil.writeFile(extensionsFilePath, this.extensions);
    
      }
      this.completeProgressWithMessage();

    } catch (error) {
      handleAndLogError(error, { ...this.exportConfig.context });
      this.completeProgress(false, error?.message || 'Extensions export failed');
    }
  }

  async getExtensions(skip = 0): Promise<void> {
    if (skip) {
      this.qs.skip = skip;
      log.debug(`Fetching extensions with skip: ${skip}`, this.exportConfig.context);
    } else {
      log.debug('Fetching extensions with initial query', this.exportConfig.context);
    }

    log.debug(`Query parameters: ${JSON.stringify(this.qs)}`, this.exportConfig.context);

    await this.stack
      .extension()
      .query(this.qs)
      .find()
      .then(async (data: any) => {
        const { items, count } = data;
        log.debug(`Fetched ${items?.length || 0} extensions out of total ${count}`, this.exportConfig.context);

        if (items?.length) {
          log.debug(`Processing ${items.length} extensions`, this.exportConfig.context);
          this.sanitizeAttribs(items);
          skip += this.extensionConfig.limit || 100;
          if (skip >= count) {
            log.debug('Completed fetching all extensions', this.exportConfig.context);
            return;
          }
          log.debug(`Continuing to fetch extensions with skip: ${skip}`, this.exportConfig.context);
          return await this.getExtensions(skip);
        } else {
          log.debug('No extensions found to process', this.exportConfig.context);
        }
      })
      .catch((error: any) => {
        log.debug('Error occurred while fetching extensions', this.exportConfig.context);
        handleAndLogError(error, { ...this.exportConfig.context });
      });
  }

  sanitizeAttribs(extensions: Record<string, string>[]) {
    log.debug(`Sanitizing ${extensions.length} extensions`, this.exportConfig.context);

    for (let index = 0; index < extensions?.length; index++) {
      const extUid = extensions[index].uid;
      const extTitle = extensions[index]?.title;
      log.debug(`Processing extension: ${extTitle} (${extUid})`, this.exportConfig.context);

      this.extensions[extUid] = omit(extensions[index], ['SYS_ACL']);
      // Track progress for each extension
      this.progressManager?.tick(true, `extension: ${extTitle || extUid}`);
      log.info(messageHandler.parse('EXTENSION_EXPORT_SUCCESS', extTitle), this.exportConfig.context);
    }

    log.debug(
      `Sanitization complete. Total extensions processed: ${Object.keys(this.extensions || {}).length}`,
      this.exportConfig.context,
    );
  }
}
