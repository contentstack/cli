import find from 'lodash/find';
import { resolve as pResolve } from 'node:path';
import { isAuthenticated, managementSDKClient } from '@contentstack/cli-utilities';

import BaseClass from './base-class';
import { log, formatError, fsUtil } from '../../utils';
import { StackConfig, ModuleClassParams } from '../../types';

export default class ExportStack extends BaseClass {
  private stackConfig: StackConfig;
  private stackFolderPath: string;
  private qs: {
    include_count: boolean;
    skip?: number;
  };

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.stackConfig = exportConfig.modules.stack;
    this.qs = { include_count: true };
    this.stackFolderPath = exportConfig.branchEnabled && exportConfig.branchDir
      ? pResolve(exportConfig.branchDir, this.stackConfig.dirName)
      : pResolve(exportConfig.data, this.stackConfig.dirName);
  }

  async start(): Promise<void> {
    if (isAuthenticated()) {
      const stackData = await this.getStack();
      if (stackData?.org_uid) {
        this.exportConfig.org_uid = stackData.org_uid;
        this.exportConfig.sourceStackName = stackData.name;
      }
    }

    await this.exportStackSettings();

    if (!this.exportConfig.hasOwnProperty('master_locale')) {
      return this.getLocales();
    }
  }

  async getStack(): Promise<any> {
    const tempAPIClient = await managementSDKClient({ host: this.exportConfig.host });
    return await tempAPIClient
      .stack({ api_key: this.exportConfig.source_stack })
      .fetch()
      .catch((error: any) => {
        log(this.exportConfig, `Failed to fetch stack details. ${formatError(error)}`, 'error');
      });
  }

  async getLocales(skip: number = 0) {
    if (skip) {
      this.qs.skip = skip;
    }
    return await this.stack
      .locale()
      .query(this.qs)
      .find()
      .then(async (data: any) => {
        const { items, count } = data;
        if (items?.length) {
          skip += this.stackConfig.limit || 100;
          const masterLocalObj = find(items, (locale: any) => {
            if (locale.fallback_locale === null) {
              return locale;
            }
          });
          if (masterLocalObj) {
            return masterLocalObj;
          } else if (skip >= count) {
            log(this.exportConfig, 'Master locale not found', 'error');
            return;
          } else {
            return await this.getLocales(skip);
          }
        }
      })
      .catch((error: any) => {
        log(this.exportConfig, `Failed to export locales. ${formatError(error)}`, 'error');
        log(this.exportConfig, error, 'error');
      });
  }

  async exportStackSettings(): Promise<any> {
    log(this.exportConfig, 'Exporting stack details', 'success');
    
    try {
      const stackData = await this.stack.settings();
      
      // Always export to root directory
      const rootStackPath = pResolve(this.exportConfig.data, this.stackConfig.dirName);
      await fsUtil.makeDirectory(rootStackPath);
      await fsUtil.writeFile(pResolve(rootStackPath, "settings.json"), stackData);
      log(this.exportConfig, `Exported stack settings details to root directory successfully!`, 'success');

      // If branch is enabled, also export to branch directory
      if (this.exportConfig.branchEnabled && this.exportConfig.branchDir) {
      await fsUtil.makeDirectory(this.stackFolderPath);
      await fsUtil.writeFile(pResolve(this.stackFolderPath, "settings.json"), stackData);
        log(this.exportConfig, `Exported stack settings details to branch directory successfully!`, 'success');
      }
      
      return stackData;
    } catch (error) {
      log(this.exportConfig, `Failed to export stack settings. ${formatError(error)}`, 'error');
      throw error;
    }
  }
}
