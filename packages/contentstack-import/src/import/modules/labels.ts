import omit from 'lodash/omit';
import { join } from 'node:path';
import isEmpty from 'lodash/isEmpty';
import values from 'lodash/values';
import { log, handleAndLogError } from '@contentstack/cli-utilities';

import { fsUtil, fileHelper } from '../../utils';
import BaseClass, { ApiOptions } from './base-class';
import { ModuleClassParams, LabelConfig } from '../../types';

export default class ImportLabels extends BaseClass {
  private mapperDirPath: string;
  private labelsFolderPath: string;
  private labelUidMapperPath: string;
  private createdLabelPath: string;
  private labelFailsPath: string;
  private labelsConfig: LabelConfig;
  private labels: Record<string, unknown>;
  private labelUidMapper: Record<string, unknown>;
  private createdLabel: Record<string, unknown>[];
  private failedLabel: Record<string, unknown>[];

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.importConfig.context.module = 'labels';
    this.currentModuleName = 'Labels';
    this.labelsConfig = importConfig.modules.labels;
    this.mapperDirPath = join(this.importConfig.backupDir, 'mapper', 'labels');
    this.labelsFolderPath = join(this.importConfig.backupDir, this.labelsConfig.dirName);
    this.labelUidMapperPath = join(this.mapperDirPath, 'uid-mapping.json');
    this.createdLabelPath = join(this.mapperDirPath, 'success.json');
    this.labelFailsPath = join(this.mapperDirPath, 'fails.json');
    this.labels = {};
    this.failedLabel = [];
    this.createdLabel = [];
    this.labelUidMapper = {};
  }

  /**
   * @method start
   * @returns {Promise<void>} Promise<void>
   */
  async start(): Promise<void> {
    try {
      log.debug('Starting labels import process...', this.importConfig.context);
      const [labelsCount] = await this.analyzeLabels();
      if (labelsCount === 0) {
        log.info('No labels found to import', this.importConfig.context);
        return;
      }

      const progress = this.createNestedProgress(this.currentModuleName);
      progress.addProcess('Create', labelsCount);
      progress.addProcess('Update', labelsCount);

      await this.prepareLabelMapper();

      // Step 1: Import labels (without parent references)
      progress.startProcess('Create').updateStatus('Creating labels...', 'Create');
      log.info('Starting labels creation process', this.importConfig.context);
      await this.importLabels();
      progress.completeProcess('Create', true);

      // Step 2: Update labels with parent references
      progress.startProcess('Update').updateStatus('Updating labels with parent references...', 'Update');
      log.info('Starting labels update process', this.importConfig.context);
      await this.updateLabels();
      progress.completeProcess('Update', true);

      this.processLabelResults();

      this.completeProgress(true);
      log.success('Labels have been imported successfully!', this.importConfig.context);
    } catch (error) {
      this.completeProgress(false, error?.message || 'Labels import failed');
      handleAndLogError(error, { ...this.importConfig.context });
    }
  }

  async importLabels() {
    log.debug('Validating labels data', this.importConfig.context);
    if (this.labels === undefined || isEmpty(this.labels)) {
      log.info('No Labels Found', this.importConfig.context);
      return;
    }

    const apiContent = values(this.labels);
    log.debug(`Starting to import ${apiContent.length} labels`, this.importConfig.context);

    const onSuccess = ({ response, apiData: { uid, name } = { uid: null, name: '' } }: any) => {
      this.labelUidMapper[uid] = response;
      this.progressManager?.tick(true, `label: ${name || uid}`, null, 'Create');
      log.success(`Label '${name}' imported successfully`, this.importConfig.context);
      log.debug(`Label UID mapping: ${uid} → ${response.uid}`, this.importConfig.context);
      fsUtil.writeFile(this.labelUidMapperPath, this.labelUidMapper);
    };

    const onReject = ({ error, apiData }: any) => {
      const err = error?.message ? JSON.parse(error.message) : error;
      const { name, uid } = apiData;
      log.debug(`Label '${name}' (${uid}) failed to import`, this.importConfig.context);

      if (err?.errors?.name) {
        this.progressManager?.tick(true, `label: ${name || uid} (already exists)`, null, 'Create');
        log.info(`Label '${name}' already exists`, this.importConfig.context);
      } else {
        this.failedLabel.push(apiData);
        this.progressManager?.tick(
          false,
          `label: ${name || uid}`,
          error?.message || 'Failed to import label',
          'Create',
        );
        handleAndLogError(error, { ...this.importConfig.context, name }, `Label '${name}' failed to be import`);
      }
    };

    log.debug(`Using concurrency limit: ${this.importConfig.fetchConcurrency || 1}`, this.importConfig.context);
    await this.makeConcurrentCall(
      {
        apiContent,
        processName: 'create labels',
        apiParams: {
          serializeData: this.serializeLabels.bind(this),
          reject: onReject.bind(this),
          resolve: onSuccess.bind(this),
          entity: 'create-labels',
          includeParamOnCompletion: true,
        },
        concurrencyLimit: this.importConfig.fetchConcurrency || 1,
      },
      undefined,
      false,
    );

    log.debug('Labels creation process completed', this.importConfig.context);
  }

  /**
   * @method serializeLabels
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeLabels(apiOptions: ApiOptions): ApiOptions {
    const { apiData: label } = apiOptions;
    log.debug(`Serializing label: ${label.name} (${label.uid})`, this.importConfig.context);

    if (this.labelUidMapper.hasOwnProperty(label.uid)) {
      log.info(`Label '${label.name}' already exists. Skipping it to avoid duplicates!`, this.importConfig.context);
      log.debug(`Skipping label serialization for: ${label.uid}`, this.importConfig.context);
      this.progressManager?.tick(true, `label: ${label.name} (skipped - already exists)`, null, 'Create');
      apiOptions.entity = undefined;
    } else {
      let labelReq = label;
      if (label?.parent?.length != 0) {
        log.debug(
          `Label '${label.name}' has parent labels, removing parent for initial creation`,
          this.importConfig.context,
        );
        labelReq = omit(label, ['parent']);
      }
      apiOptions.apiData = labelReq;
    }
    return apiOptions;
  }

  async updateLabels() {
    log.debug('Starting labels update process', this.importConfig.context);
    if (!isEmpty(this.labels)) {
      const apiContent = values(this.labels);
      log.debug(`Updating ${apiContent.length} labels`, this.importConfig.context);

      const onSuccess = ({ response, apiData: { uid, name } = { uid: null, name: '' } }: any) => {
        this.createdLabel.push(response);
        this.progressManager?.tick(true, `label: ${name || uid}`, null, 'Update');
        log.success(`Label '${name}' updated successfully`, this.importConfig.context);
        log.debug(`Label update completed: ${name} (${uid})`, this.importConfig.context);
      };

      const onReject = ({ error, apiData }: any) => {
        const { name, uid } = apiData;
        this.progressManager?.tick(
          false,
          `label: ${name || uid}`,
          error?.message || 'Failed to update label',
          'Update',
        );
        log.debug(`Label '${name}' update failed`, this.importConfig.context);
        handleAndLogError(error, { ...this.importConfig.context, name: name }, `Failed to update label '${name}'`);
      };

      log.debug(
        `Using concurrency limit for updates: ${this.importConfig.fetchConcurrency || 1}`,
        this.importConfig.context,
      );
      await this.makeConcurrentCall(
        {
          apiContent,
          processName: 'update labels',
          apiParams: {
            serializeData: this.serializeUpdateLabels.bind(this),
            reject: onReject.bind(this),
            resolve: onSuccess.bind(this),
            entity: 'update-labels',
            includeParamOnCompletion: true,
          },
          concurrencyLimit: this.importConfig.fetchConcurrency || 1,
        },
        undefined,
        false,
      );
    } else {
      log.debug('No labels to update', this.importConfig.context);
    }

    log.debug('Labels update process completed', this.importConfig.context);
  }

  /**
   * @method serializeUpdatelabels
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeUpdateLabels(apiOptions: ApiOptions): ApiOptions {
    const { apiData: label } = apiOptions;
    const labelUid = label.uid;
    log.debug(`Serializing label update: ${label.name} (${labelUid})`, this.importConfig.context);

    if (this.labelUidMapper.hasOwnProperty(labelUid)) {
      const newLabel = this.labelUidMapper[labelUid] as Record<string, any>;
      if (label?.parent?.length > 0) {
        log.debug(
          `Label '${label.name}' has ${label.parent.length} parent labels to update`,
          this.importConfig.context,
        );
        for (let i = 0; i < label?.parent?.length; i++) {
          const parentUid = label.parent[i];
          if (this.labelUidMapper.hasOwnProperty(parentUid)) {
            const mappedLabel = this.labelUidMapper[parentUid] as Record<string, any>;
            label.parent[i] = mappedLabel.uid;
            log.debug(`Parent label mapping: ${parentUid} → ${mappedLabel.uid}`, this.importConfig.context);
          }
        }
        const createdLabelRes = this.labelUidMapper[labelUid] as Record<string, any>;
        createdLabelRes.parent = label.parent;
        apiOptions.apiData = createdLabelRes;
        log.debug(`Updated label '${label.name}' with parent references`, this.importConfig.context);
      } else {
        log.debug(`Label '${label.name}' has no parent labels, adding to created list`, this.importConfig.context);
        this.progressManager?.tick(true, `label: ${label.name} (no parent update needed)`, null, 'Update');
        apiOptions.entity = undefined;
        this.createdLabel.push(newLabel);
      }
    } else {
      log.debug(`Label '${label.name}' not found in UID mapper, skipping update`, this.importConfig.context);
      this.progressManager?.tick(true, `label: ${label.name} (skipped - not found)`, null, 'Update');
      apiOptions.entity = undefined;
    }
    return apiOptions;
  }

  private async analyzeLabels(): Promise<[number]> {
    return this.withLoadingSpinner('LABELS: Analyzing import data...', async () => {
      log.debug('Checking for labels folder existence', this.importConfig.context);

      if (!fileHelper.fileExistsSync(this.labelsFolderPath)) {
        log.info(`No labels found - '${this.labelsFolderPath}'`, this.importConfig.context);
        return [0];
      }

      log.debug(`Found labels folder: ${this.labelsFolderPath}`, this.importConfig.context);

      this.labels = fsUtil.readFile(join(this.labelsFolderPath, 'labels.json'), true) as Record<string, unknown>;

      if (!this.labels) {
        log.info(
          `No labels found in file - '${join(this.labelsFolderPath, 'labels.json')}'`,
          this.importConfig.context,
        );
        return [0];
      }

      const count = Object.keys(this.labels || {}).length;
      log.debug(`Loaded ${count} label items from file`, this.importConfig.context);
      return [count];
    });
  }

  private async prepareLabelMapper(): Promise<void> {
    log.debug('Creating labels mapper directory', this.importConfig.context);
    await fsUtil.makeDirectory(this.mapperDirPath);

    log.debug('Loading existing label UID mappings', this.importConfig.context);
    this.labelUidMapper = fileHelper.fileExistsSync(this.labelUidMapperPath)
      ? (fsUtil.readFile(join(this.labelUidMapperPath), true) as Record<string, unknown>) || {}
      : {};

    const count = Object.keys(this.labelUidMapper || {}).length;
    if (count > 0) {
      log.debug(`Loaded existing label UID data: ${count} items`, this.importConfig.context);
    } else {
      log.debug('No existing label UID mappings found', this.importConfig.context);
    }
  }

  private processLabelResults() {
    log.debug('Processing labels import results', this.importConfig.context);

    if (this.createdLabel?.length) {
      fsUtil.writeFile(this.createdLabelPath, this.createdLabel);
      log.debug(`Written ${this.createdLabel.length} successful labels to file`, this.importConfig.context);
    }

    if (this.failedLabel?.length) {
      fsUtil.writeFile(this.labelFailsPath, this.failedLabel);
      log.debug(`Written ${this.failedLabel.length} failed labels to file`, this.importConfig.context);
    }
  }
}
