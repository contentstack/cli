import omit from 'lodash/omit';
import isEmpty from 'lodash/isEmpty';
import { resolve as pResolve } from 'node:path';
import { handleAndLogError, messageHandler, v2Logger } from '@contentstack/cli-utilities';

import BaseClass from './base-class';
import { fsUtil } from '../../utils';
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
    this.exportConfig.context.module = 'extensions';
  }

  async start(): Promise<void> {
    this.extensionsFolderPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.extensionConfig.dirName,
    );

    await fsUtil.makeDirectory(this.extensionsFolderPath);
    await this.getExtensions();

    if (this.extensions === undefined || isEmpty(this.extensions)) {
      v2Logger.info(messageHandler.parse('EXTENSION_NOT_FOUND'), this.exportConfig.context);
    } else {
      fsUtil.writeFile(pResolve(this.extensionsFolderPath, this.extensionConfig.fileName), this.extensions);
      v2Logger.success(
        messageHandler.parse('EXTENSION_EXPORT_COMPLETE', Object.keys(this.extensions).length ),
        this.exportConfig.context,
      );
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
        handleAndLogError(error, { ...this.exportConfig.context });
      });
  }

  sanitizeAttribs(extensions: Record<string, string>[]) {
    for (let index = 0; index < extensions?.length; index++) {
      const extUid = extensions[index].uid;
      const extTitle = extensions[index]?.title;
      this.extensions[extUid] = omit(extensions[index], ['SYS_ACL']);
      v2Logger.info(messageHandler.parse('EXTENSION_EXPORT_SUCCESS', extTitle), this.exportConfig.context);
    }
  }
}
