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
    this.environmentsFolderPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.environmentConfig.dirName,
    );

    await fsUtil.makeDirectory(this.environmentsFolderPath);
    await this.getEnvironments();

    if (this.environments === undefined || isEmpty(this.environments)) {
      log.info(messageHandler.parse('ENVIRONMENT_NOT_FOUND'), this.exportConfig.context);
    } else {
      fsUtil.writeFile(pResolve(this.environmentsFolderPath, this.environmentConfig.fileName), this.environments);
      log.success(
        messageHandler.parse('ENVIRONMENT_EXPORT_COMPLETE', Object.keys(this.environments).length),
        this.exportConfig.context,
      );
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
        handleAndLogError(error, { ...this.exportConfig.context });
      });
  }

  sanitizeAttribs(environments: Record<string, string>[]) {
    for (let index = 0; index < environments?.length; index++) {
      const extUid = environments[index].uid;
      const envName = environments[index]?.name;
      this.environments[extUid] = omit(environments[index], ['ACL']);
      log.success(messageHandler.parse('ENVIRONMENT_EXPORT_SUCCESS', envName ), this.exportConfig.context);
    }
  }
}
