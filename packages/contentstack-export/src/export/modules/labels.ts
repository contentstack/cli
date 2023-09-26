import omit from 'lodash/omit';
import isEmpty from 'lodash/isEmpty';
import { resolve as pResolve } from 'node:path';

import BaseClass from './base-class';
import { log, formatError, fsUtil } from '../../utils';
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
  }

  async start(): Promise<void> {
    log(this.exportConfig, 'Starting labels export', 'info');

    this.labelsFolderPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.labelConfig.dirName,
    );

    await fsUtil.makeDirectory(this.labelsFolderPath);
    await this.getLabels();
    if (this.labels === undefined || isEmpty(this.labels)) {
      log(this.exportConfig, 'No labels found', 'info');
    } else {
      fsUtil.writeFile(pResolve(this.labelsFolderPath, this.labelConfig.fileName), this.labels);
      log(this.exportConfig, 'All the labels have been exported successfully!', 'success');
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
        log(this.exportConfig, `Failed to export labels. ${formatError(error)}`, 'error');
        log(this.exportConfig, error, 'error');
      });
  }

  sanitizeAttribs(labels: Record<string, string>[]) {
    for (let index = 0; index < labels?.length; index++) {
      const labelUid = labels[index].uid;
      const labelName = labels[index]?.name;
      this.labels[labelUid] = omit(labels[index], this.labelConfig.invalidKeys);
      log(this.exportConfig, `'${labelName}' label was exported successfully`, 'success');
    }
  }
}
