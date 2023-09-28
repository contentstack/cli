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
    this.stackFolderPath = pResolve(this.exportConfig.data, this.stackConfig.dirName);
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

  async exportStack(): Promise<any> {
    log(this.exportConfig, 'Exporting stack details', 'success');
    await fsUtil.makeDirectory(this.stackFolderPath);
    return this.stack
      .fetch()
      .then((resp: any) => {
        fsUtil.writeFile(pResolve(this.stackFolderPath, this.stackConfig.fileName), resp);
        log(this.exportConfig, 'Exported stack details successfully!', 'success');
        return resp;
      })
      .catch((error: any) => {
        log(this.exportConfig, `Failed to export stack. ${formatError(error)}`, 'error');
      });
  }
}
