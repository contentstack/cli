import { resolve as pResolve } from 'node:path';
import omit from 'lodash/omit';
import isEmpty from 'lodash/isEmpty';
import { handleAndLogError, messageHandler, log } from '@contentstack/cli-utilities';

import BaseClass from './base-class';
import { EnvironmentConfig, ModuleClassParams } from '../../types';
import { fsUtil, MODULE_CONTEXTS, MODULE_NAMES } from '../../utils';

export default class ExportEnvironments extends BaseClass {
  private environments: Record<string, unknown>;
  private environmentConfig: EnvironmentConfig;
  public environmentsFolderPath: string;
  private qs: {
    include_count: boolean;
    skip?: number;
  };

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.environments = {};
    this.environmentConfig = exportConfig.modules.environments;
    this.qs = { include_count: true };
    this.exportConfig.context.module = MODULE_CONTEXTS.ENVIRONMENTS;
    this.currentModuleName = MODULE_NAMES[MODULE_CONTEXTS.ENVIRONMENTS];
  }

  async start(): Promise<void> {
    try {
      log.debug('Starting environment export process...', this.exportConfig.context);

      // Setup with loading spinner
      const [totalCount] = await this.withLoadingSpinner('ENVIRONMENTS: Analyzing environments...', async () => {
        this.environmentsFolderPath = pResolve(
          this.exportConfig.exportDir,
          this.exportConfig.branchName || '',
          this.environmentConfig.dirName,
        );
        await fsUtil.makeDirectory(this.environmentsFolderPath);
        log.debug(`Environments folder path: ${this.environmentsFolderPath}`, this.exportConfig.context);

        // Get count for progress tracking
        const countResponse = await this.stack
          .environment()
          .query({ ...this.qs, include_count: true, limit: 1 })
          .find();
        return [countResponse.count || 0];
      });

      if (totalCount === 0) {
        log.info(messageHandler.parse('ENVIRONMENT_NOT_FOUND'), this.exportConfig.context);
        return;
      }

      // Create simple progress manager with total count
      const progress = this.createSimpleProgress(this.currentModuleName, totalCount);

      progress.updateStatus('Fetching environments...');
      await this.getEnvironments();
      log.debug(`Retrieved ${Object.keys(this.environments || {}).length} environments`, this.exportConfig.context);

      if (this.environments === undefined || isEmpty(this.environments)) {
        log.info(messageHandler.parse('ENVIRONMENT_NOT_FOUND'), this.exportConfig.context);
      } else {
        const environmentsFilePath = pResolve(this.environmentsFolderPath, this.environmentConfig.fileName);
        log.debug(`Writing environments to: ${environmentsFilePath}`, this.exportConfig.context);
        fsUtil.writeFile(environmentsFilePath, this.environments);
        log.success(
          messageHandler.parse('ENVIRONMENT_EXPORT_COMPLETE', Object.keys(this.environments || {}).length),
          this.exportConfig.context,
        );
      }
      this.completeProgress(true);
    } catch (error) {
      handleAndLogError(error, { ...this.exportConfig.context });
      this.completeProgress(false, error?.message || 'Environments export failed');
    }
  }

  async getEnvironments(skip = 0): Promise<void> {
    if (skip) {
      this.qs.skip = skip;
      log.debug(`Fetching environments with skip: ${skip}`, this.exportConfig.context);
    } else {
      log.debug('Fetching environments with initial query', this.exportConfig.context);
    }

    log.debug(`Query parameters: ${JSON.stringify(this.qs)}`, this.exportConfig.context);

    await this.stack
      .environment()
      .query(this.qs)
      .find()
      .then(async (data: any) => {
        const { items, count } = data;
        log.debug(`Fetched ${items?.length || 0} environments out of total ${count}`, this.exportConfig.context);

        if (items?.length) {
          log.debug(`Processing ${items.length} environments`, this.exportConfig.context);
          this.sanitizeAttribs(items);
          skip += this.environmentConfig.limit || 100;
          if (skip >= count) {
            log.debug('Completed fetching all environments', this.exportConfig.context);
            return;
          }
          log.debug(`Continuing to fetch environments with skip: ${skip}`, this.exportConfig.context);
          return await this.getEnvironments(skip);
        } else {
          log.debug('No environments found to process', this.exportConfig.context);
        }
      })
      .catch((error: any) => {
        log.debug('Error occurred while fetching environments', this.exportConfig.context);
        handleAndLogError(error, { ...this.exportConfig.context });
      });
  }

  sanitizeAttribs(environments: Record<string, string>[]) {
    log.debug(`Sanitizing ${environments.length} environments`, this.exportConfig.context);

    for (let index = 0; index < environments?.length; index++) {
      const envUID = environments[index].uid;
      const envName = environments[index]?.name;
      log.debug(`Processing environment: ${envName} (${envUID})`, this.exportConfig.context);

      this.environments[envUID] = omit(environments[index], ['ACL']);
      // Track progress for each environment
      this.progressManager?.tick(true, `environment: ${envName || envUID}`);
      log.success(messageHandler.parse('ENVIRONMENT_EXPORT_SUCCESS', envName), this.exportConfig.context);
    }

    log.debug(
      `Sanitization complete. Total environments processed: ${Object.keys(this.environments || {}).length}`,
      this.exportConfig.context,
    );
  }
}
