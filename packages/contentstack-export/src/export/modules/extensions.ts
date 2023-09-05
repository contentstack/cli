import omit from 'lodash/omit';
import isEmpty from 'lodash/isEmpty';
import { resolve as pResolve } from 'node:path';

import BaseClass from './base-class';
import { log, formatError, fsUtil } from '../../utils';
import { ExtensionsConfig, ModuleClassParams } from '../../types';

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

    if (this.extensions === undefined || isEmpty(this.extensions)) {
      log(this.exportConfig, 'No extensions found', 'info');
    } else {
      fsUtil.writeFile(pResolve(this.extensionsFolderPath, this.extensionConfig.fileName), this.extensions);
      log(this.exportConfig, 'All the extensions have been exported successfully!', 'success');
    }
  }

  async getExtensions(skip = 0): Promise<void> {
    if (skip) {
      this.qs.skip = skip;
    }
    await this.stack
      .extension()
      .query(this.qs)
      .find()
      .then(async (data: any) => {
        const { items, count } = data;
        if (items?.length) {
          this.sanitizeAttribs(items);
          skip += this.extensionConfig.limit || 100;
          if (skip >= count) {
            return;
          }
          return await this.getExtensions(skip);
        }
      })
      .catch((error: any) => {
        log(this.exportConfig, `Failed to export extensions. ${formatError(error)}`, 'error');
        log(this.exportConfig, error, 'error');
      });
  }

  sanitizeAttribs(extensions: Record<string, string>[]) {
    for (let index = 0; index < extensions?.length; index++) {
      const extUid = extensions[index].uid;
      const extTitle = extensions[index]?.title;
      this.extensions[extUid] = omit(extensions[index], ['SYS_ACL']);
      log(this.exportConfig, `'${extTitle}' extension was exported successfully`, 'success');
    }
  }
}
