import omit from 'lodash/omit';
import isEmpty from 'lodash/isEmpty';
import { resolve as pResolve } from 'node:path';
import { handleAndLogError, messageHandler, log } from '@contentstack/cli-utilities';

import BaseClass from './base-class';
import { LabelConfig, ModuleClassParams } from '../../types';
import { fsUtil, EXPORT_MODULE_CONTEXTS, EXPORT_MODULE_NAMES } from '../../utils';

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
    this.exportConfig.context.module = EXPORT_MODULE_CONTEXTS.LABELS;
    this.currentModuleName = EXPORT_MODULE_NAMES[EXPORT_MODULE_CONTEXTS.LABELS];
  }

  async start(): Promise<void> {
    try {
      log.debug('Starting labels export process...', this.exportConfig.context);

      // Setup with loading spinner
      const [totalCount] = await this.withLoadingSpinner('LABELS: Analyzing labels...', async () => {
        this.labelsFolderPath = pResolve(
          this.exportConfig.data,
          this.exportConfig.branchName || '',
          this.labelConfig.dirName,
        );

        await fsUtil.makeDirectory(this.labelsFolderPath);
        log.debug(`Labels folder path: ${this.labelsFolderPath}`, this.exportConfig.context);

        // Get count for progress tracking
        const countResponse = await this.stack
          .label()
          .query({ ...this.qs, include_count: true, limit: 1 })
          .find();
        return [countResponse.count || 0];
      });

      if (totalCount === 0) {
        log.info(messageHandler.parse('LABELS_NOT_FOUND'), this.exportConfig.context);
        return;
      }

      // Create simple progress manager with total count
      const progress = this.createSimpleProgress(this.currentModuleName, totalCount);

      progress.updateStatus('Fetching labels...');
      await this.getLabels();
      log.debug(`Retrieved ${Object.keys(this.labels).length} labels`, this.exportConfig.context);

      if (this.labels === undefined || isEmpty(this.labels)) {
        log.info(messageHandler.parse('LABELS_NOT_FOUND'), this.exportConfig.context);
      } else {
        const labelsFilePath = pResolve(this.labelsFolderPath, this.labelConfig.fileName);
        log.debug(`Writing labels to: ${labelsFilePath}`, this.exportConfig.context);
        fsUtil.writeFile(labelsFilePath, this.labels);
        log.success(
          messageHandler.parse('LABELS_EXPORT_COMPLETE', Object.keys(this.labels).length),
          this.exportConfig.context,
        );
      }

      this.completeProgress(true);
    } catch (error) {
      handleAndLogError(error, { ...this.exportConfig.context });
      this.completeProgress(false, error?.message || 'Labels export failed');
    }
  }

  async getLabels(skip = 0): Promise<void> {
    if (skip) {
      this.qs.skip = skip;
      log.debug(`Fetching labels with skip: ${skip}`, this.exportConfig.context);
    } else {
      log.debug('Fetching labels with initial query', this.exportConfig.context);
    }

    log.debug(`Query parameters: ${JSON.stringify(this.qs)}`, this.exportConfig.context);

    await this.stack
      .label()
      .query(this.qs)
      .find()
      .then(async (data: any) => {
        const { items, count } = data;
        log.debug(`Fetched ${items?.length || 0} labels out of total ${count}`, this.exportConfig.context);

        if (items?.length) {
          log.debug(`Processing ${items.length} labels`, this.exportConfig.context);
          this.sanitizeAttribs(items);
          skip += this.labelConfig.limit || 100;
          if (skip >= count) {
            log.debug('Completed fetching all labels', this.exportConfig.context);
            return;
          }
          log.debug(`Continuing to fetch labels with skip: ${skip}`, this.exportConfig.context);
          return await this.getLabels(skip);
        } else {
          log.debug('No labels found to process', this.exportConfig.context);
        }
      })
      .catch((error: any) => {
        this.progressManager?.tick(false, 'labels', error?.message || 'Failed to export labels');
        log.debug('Error occurred while fetching labels', this.exportConfig.context);
        handleAndLogError(error, { ...this.exportConfig.context });
      });
  }

  sanitizeAttribs(labels: Record<string, string>[]) {
    log.debug(`Sanitizing ${labels.length} labels`, this.exportConfig.context);

    for (let index = 0; index < labels?.length; index++) {
      const labelUid = labels[index].uid;
      const labelName = labels[index]?.name;
      log.debug(`Processing label: ${labelName} (${labelUid})`, this.exportConfig.context);

      this.labels[labelUid] = omit(labels[index], this.labelConfig.invalidKeys);
      log.info(messageHandler.parse('LABEL_EXPORT_SUCCESS', labelName), this.exportConfig.context);

      // Track progress for each label
      this.progressManager?.tick(true, `label: ${labelName}`);
    }

    log.debug(
      `Sanitization complete. Total labels processed: ${Object.keys(this.labels).length}`,
      this.exportConfig.context,
    );
  }
}
