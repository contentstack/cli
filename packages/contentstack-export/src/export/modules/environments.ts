import { resolve as pResolve } from 'node:path';
import omit from 'lodash/omit';
import isEmpty from 'lodash/isEmpty';
import { handleAndLogError, messageHandler, log } from '@contentstack/cli-utilities';

import BaseClass from './base-class';
import { fsUtil } from '../../utils';
import { EnvironmentConfig, ModuleClassParams } from '../../types';

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
    this.exportConfig.context.module = 'environments';
  }

  async start(): Promise<void> {
    log.debug('Starting environment export process...', this.exportConfig.context);
    this.environmentsFolderPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.environmentConfig.dirName,
    );
    log.debug(`Environments folder path: ${this.environmentsFolderPath}`, this.exportConfig.context);

    await fsUtil.makeDirectory(this.environmentsFolderPath);
    log.debug('Created environments directory', this.exportConfig.context);
    
    await this.getEnvironments();
    log.debug(`Retrieved ${Object.keys(this.environments).length} environments`, this.exportConfig.context);

    if (this.environments === undefined || isEmpty(this.environments)) {
      log.info(messageHandler.parse('ENVIRONMENT_NOT_FOUND'), this.exportConfig.context);
    } else {
      const environmentsFilePath = pResolve(this.environmentsFolderPath, this.environmentConfig.fileName);
      log.debug(`Writing environments to: ${environmentsFilePath}`, this.exportConfig.context);
      fsUtil.writeFile(environmentsFilePath, this.environments);
      log.success(
        messageHandler.parse('ENVIRONMENT_EXPORT_COMPLETE', Object.keys(this.environments).length),
        this.exportConfig.context,
      );
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
      const extUid = environments[index].uid;
      const envName = environments[index]?.name;
      log.debug(`Processing environment: ${envName} (${extUid})`, this.exportConfig.context);
      
      this.environments[extUid] = omit(environments[index], ['ACL']);
      log.success(messageHandler.parse('ENVIRONMENT_EXPORT_SUCCESS', envName ), this.exportConfig.context);
    }
    
    log.debug(`Sanitization complete. Total environments processed: ${Object.keys(this.environments).length}`, this.exportConfig.context);
  }
}
