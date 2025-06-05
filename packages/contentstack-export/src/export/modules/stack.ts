import find from 'lodash/find';
import { resolve as pResolve } from 'node:path';
import { handleAndLogError, isAuthenticated, managementSDKClient, v2Logger } from '@contentstack/cli-utilities';

import BaseClass from './base-class';
import { fsUtil } from '../../utils';
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
    this.stackFolderPath = pResolve(this.exportConfig.data, this.stackConfig.dirName);
    this.exportConfig.context.module = 'stack';
  }

  async start(): Promise<void> {
    if (isAuthenticated()) {
      const stackData = await this.getStack();
      if (stackData?.org_uid) {
        this.exportConfig.org_uid = stackData.org_uid;
        this.exportConfig.sourceStackName = stackData.name;
      }
    }
    if (!this.exportConfig.preserveStackVersion && !this.exportConfig.hasOwnProperty('master_locale')) {
      //fetch master locale details
      return this.getLocales();
    } else if (this.exportConfig.preserveStackVersion) {
      return this.exportStack();
    }
  }

  async getStack(): Promise<any> {
    const tempAPIClient = await managementSDKClient({ host: this.exportConfig.host });
    return await tempAPIClient
      .stack({ api_key: this.exportConfig.source_stack })
      .fetch()
      .catch((error: any) => {});
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
            v2Logger.error(
              `Master locale not found in the stack ${this.exportConfig.source_stack}. Please ensure that the stack has a master locale.`,
              this.exportConfig.context,
            );

            return;
          } else {
            return await this.getLocales(skip);
          }
        }
      })
      .catch((error: any) => {
        handleAndLogError(
          error,
          { ...this.exportConfig.context },
          `Failed to fetch locales for stack ${this.exportConfig.source_stack}`,
        );
      });
  }

  async exportStack(): Promise<any> {
    await fsUtil.makeDirectory(this.stackFolderPath);
    return this.stack
      .fetch()
      .then((resp: any) => {
        fsUtil.writeFile(pResolve(this.stackFolderPath, this.stackConfig.fileName), resp);
        v2Logger.success(
          `Stack details exported successfully for stack ${this.exportConfig.source_stack}`,
          this.exportConfig.context,
        );
        return resp;
      })
      .catch((error: any) => {
        handleAndLogError(error, { ...this.exportConfig.context });
      });
  }
}
