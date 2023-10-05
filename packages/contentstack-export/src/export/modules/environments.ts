import { resolve as pResolve } from 'node:path';
import omit from 'lodash/omit';
import isEmpty from 'lodash/isEmpty';

import BaseClass from './base-class';
import { log, formatError, fsUtil } from '../../utils';
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
  }


  async start(): Promise<void> {
    log(this.exportConfig, 'Starting environment export', 'info');

    this.environmentsFolderPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.environmentConfig.dirName,
    );

    await fsUtil.makeDirectory(this.environmentsFolderPath);
    await this.getEnvironments();

    if (this.environments === undefined || isEmpty(this.environments)) {
      log(this.exportConfig, 'No environments found', 'info');
    } else {
      fsUtil.writeFile(pResolve(this.environmentsFolderPath, this.environmentConfig.fileName), this.environments);
      log(this.exportConfig, 'All the environments have been exported successfully!', 'success');
    }
  }

  async getEnvironments(skip = 0): Promise<void> {
    if (skip) {
      this.qs.skip = skip;
    }
    await this.stack
      .environment()
      .query(this.qs)
      .find()
      .then(async (data: any) => {
        const { items, count } = data;
        if (items?.length) {
          this.sanitizeAttribs(items);
          skip += this.environmentConfig.limit || 100;
          if (skip >= count) {
            return;
          }
          return await this.getEnvironments(skip);
        }
      })
      .catch((error: any) => {
        log(this.exportConfig, `Failed to export environments. ${formatError(error)}`, 'error');
        log(this.exportConfig, error, 'error');
      });
  }

  sanitizeAttribs(environments: Record<string, string>[]) {
    for (let index = 0; index < environments?.length; index++) {
      const extUid = environments[index].uid;
      const envName = environments[index]?.name;
      this.environments[extUid] = omit(environments[index], ['ACL']);
      log(this.exportConfig, `'${envName}' environment was exported successfully`, 'success');
    }
  }
}
