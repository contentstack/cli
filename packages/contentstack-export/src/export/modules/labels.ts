import * as path from 'path';
import { logger } from '@contentstack/cli-utilities';
import { fileHelper } from '../../utils';
export default class LabelsExport {
  private context: any;
  private stackAPIClient: any;
  private exportConfig: any;
  private qs: any;
  private labelsConfig: any;
  private labelsPath: string;

  constructor(context, stackAPIClient, exportConfig) {
    this.context = context;
    this.stackAPIClient = stackAPIClient;
    this.exportConfig = exportConfig;
    this.labelsConfig = exportConfig.moduleLevelConfig.labels;
    this.labelsPath = path.resolve(exportConfig.branchDir || exportConfig.exportDir, this.labelsConfig.dirName);
  }

  async start() {
    try {
      await fileHelper.makeDirectory(this.labelsPath);
      const labels = await this.getLabels();
      await fileHelper.writeFile(path.join(this.labelsPath, this.labelsConfig.fileName), labels);
      console.log('completed labels export');
    } catch (error) {
      logger.error('error in labels export', error);
    }
  }

  async getLabels() {
    let labels = await this.stackAPIClient.label().query().find();
    if (Array.isArray(labels.items) && labels.items.length > 0) {
      let updatedLabels = this.sanitizeAttribs(labels.items);
      return updatedLabels;
    }
    logger.info('No labels found');
  }

  sanitizeAttribs(labels) {
    let updatedLabels = {};
    labels.forEach((label) => {
      for (let key in label) {
        if (this.labelsConfig.invalidKeys.indexOf(key) !== -1) {
          delete label[key];
        }
      }
      updatedLabels[label.uid] = label;
    });
    return updatedLabels;
  }
}
