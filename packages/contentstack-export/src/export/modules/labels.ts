import omit from 'lodash/omit';
import isEmpty from 'lodash/isEmpty';
import { resolve as pResolve } from 'node:path';
import { handleAndLogError, messageHandler, v2Logger } from '@contentstack/cli-utilities';

import BaseClass from './base-class';
import { fsUtil } from '../../utils';
import { LabelConfig, ModuleClassParams } from '../../types';

export default class ExportLabels extends BaseClass {
  private labels: Record<string, Record<string, string>>;
  private labelConfig: LabelConfig;
  public labelsFolderPath: string;
  private qs: {
    include_count: boolean;
    skip?: number;
  };

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.labels = {};
    this.labelConfig = exportConfig.modules.labels;
    this.qs = { include_count: true };
    this.exportConfig.context.module = 'labels';
  }

  async start(): Promise<void> {
    this.labelsFolderPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.labelConfig.dirName,
    );

    await fsUtil.makeDirectory(this.labelsFolderPath);
    await this.getLabels();
    if (this.labels === undefined || isEmpty(this.labels)) {
      v2Logger.info(messageHandler.parse('LABELS_NOT_FOUND'), this.exportConfig.context);
    } else {
      fsUtil.writeFile(pResolve(this.labelsFolderPath, this.labelConfig.fileName), this.labels);
      v2Logger.success(
        messageHandler.parse('LABELS_EXPORT_COMPLETE', Object.keys(this.labels).length),
        this.exportConfig.context,
      );
    }
  }

  async getLabels(skip = 0): Promise<void> {
    if (skip) {
      this.qs.skip = skip;
    }
    await this.stack
      .label()
      .query(this.qs)
      .find()
      .then(async (data: any) => {
        const { items, count } = data;
        if (items?.length) {
          this.sanitizeAttribs(items);
          skip += this.labelConfig.limit || 100;
          if (skip >= count) {
            return;
          }
          return await this.getLabels(skip);
        }
      })
      .catch((error: any) => {
        handleAndLogError(error, { ...this.exportConfig.context });
      });
  }

  sanitizeAttribs(labels: Record<string, string>[]) {
    for (let index = 0; index < labels?.length; index++) {
      const labelUid = labels[index].uid;
      const labelName = labels[index]?.name;
      this.labels[labelUid] = omit(labels[index], this.labelConfig.invalidKeys);
      v2Logger.info(messageHandler.parse('LABEL_EXPORT_SUCCESS', labelName), this.exportConfig.context);
    }
  }
}
