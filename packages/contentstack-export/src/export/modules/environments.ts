import { resolve as pResolve } from 'node:path';
import { FsUtility } from '@contentstack/cli-utilities';

import config from '../../config';
import BaseClass from './base-class';
import { log, formatError } from '../../utils';
import { EnvironmentConfig, ModuleClassParams } from '../../types';

export default class ExportEnvironments extends BaseClass {
  private environments: Record<string, unknown>;
  private environmentConfig: EnvironmentConfig;
  public environmentsFolderPath: string;

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.environments = {};
    this.environmentConfig = config.modules.environments;
  }

  get queryParam(): Record<string, unknown> {
    return {
      asc: 'updated_at',
      include_count: true,
    };
  }

  async start(): Promise<void> {
    log(this.exportConfig, 'Starting environment export', 'info');

    this.environmentsFolderPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.environmentConfig.dirName,
    );

    await this.getEnvironments();
  }

  async getEnvironments(): Promise<void> {
    const environments = await this.stack
      .environment()
      .query(this.queryParam)
      .find()
      .then((data: any) => data)
      .catch(({ error }: any) => {
        log(this.exportConfig, `Failed to export environments. ${formatError(error)}`, 'error');
        log(this.exportConfig, error, 'error');
      });

    if (environments?.items?.length) {
      for (let index = 0; index < environments?.count; index++) {
        const extUid = environments.items[index].uid;
        this.environments[extUid] = environments.items[index];
      }
      new FsUtility({ basePath: this.environmentsFolderPath }).writeFile(
        pResolve(this.environmentsFolderPath, this.environmentConfig.fileName),
        this.environments,
      );
      log(this.exportConfig, 'All the environments have been exported successfully!', 'success');
    } else {
      log(this.exportConfig, 'No environments found', 'info');
    }
  }
}
