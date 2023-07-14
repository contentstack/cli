import { resolve as pResolve } from 'node:path';

import config from '../../config';
import { log, formatError, fsUtil } from '../../utils';
import BaseClass from './base-class';
import { Extensions, ModuleClassParams } from '../../types';

export default class ExportExtensions extends BaseClass {
  private extensionsFolderPath: string;
  private extensions: Record<string, unknown>;
  public extensionConfig: Extensions;

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.extensions = {};
    this.extensionConfig = config.modules.extensions;
  }

  get queryParam(): Record<string, unknown> {
    return {
      asc: 'updated_at',
      include_count: true,
    };
  }

  async start(): Promise<void> {
    log(this.exportConfig, 'Starting extension export', 'info');

    this.extensionsFolderPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.extensionConfig.dirName,
    );
    await fsUtil.makeDirectory(this.extensionsFolderPath);
    await this.getExtensions();
  }

  async getExtensions(): Promise<void> {
    const extensions = await this.stack
      .extension()
      .query(this.queryParam)
      .find()
      .then((data: any) => data)
      .catch(({ error }: any) => {
        log(this.exportConfig, `Failed to export extensions ${formatError(error)}`, 'error');
        log(this.exportConfig, error, 'error');
      });

    if (extensions?.items?.length) {
      for (let index = 0; index < extensions?.count; index++) {
        const extUid = extensions.items[index].uid;
        this.extensions[extUid] = extensions.items[index];
      }
      fsUtil.writeFile(pResolve(this.extensionsFolderPath, this.extensionConfig.fileName), this.extensions);
      log(this.exportConfig, 'All the extensions have been exported successfully!', 'success');
    } else {
      log(this.exportConfig, 'No extensions found', 'info');
    }
  }
}
