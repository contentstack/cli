import isEmpty from 'lodash/isEmpty';
import values from 'lodash/values';
import omit from 'lodash/omit';
import { join } from 'node:path';

import { fsUtil, fileHelper } from '../../utils';
import { log, handleAndLogError } from '@contentstack/cli-utilities';
import BaseClass, { ApiOptions } from './base-class';
import { ModuleClassParams, LabelConfig } from '../../types';

export default class Importlabels extends BaseClass {
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
    
    log.debug('Initialized ImportLabels class', this.importConfig.context);
    log.debug(`Labels folder path: ${this.labelsFolderPath}`, this.importConfig.context);
    log.debug(`Mapper directory path: ${this.mapperDirPath}`, this.importConfig.context);
  }

  /**
   * @method start
   * @returns {Promise<void>} Promise<void>
   */
  async start(): Promise<void> {
    log.info('Starting labels import process', this.importConfig.context);
    log.debug('Checking for labels folder existence', this.importConfig.context);
    
    //Step1 check folder exists or not
    if (fileHelper.fileExistsSync(this.labelsFolderPath)) {
      log.debug(`Found labels folder: ${this.labelsFolderPath}`, this.importConfig.context);
      this.labels = fsUtil.readFile(join(this.labelsFolderPath, 'labels.json'), true) as Record<string, unknown>;
      log.debug(`Loaded ${Object.keys(this.labels).length} labels from file`, this.importConfig.context);
    } else {
      log.info(`No labels found - '${this.labelsFolderPath}'`, this.importConfig.context);
      return;
    }

    //create labels in mapper directory
    log.debug('Creating labels mapper directory', this.importConfig.context);
    await fsUtil.makeDirectory(this.mapperDirPath);
    log.debug('Loading existing label UID mappings', this.importConfig.context);
    this.labelUidMapper = fileHelper.fileExistsSync(this.labelUidMapperPath)
      ? (fsUtil.readFile(join(this.labelUidMapperPath), true) as Record<string, unknown>)
      : {};

    if (Object.keys(this.labelUidMapper).length > 0) {
      log.debug(`Loaded existing label UID mappings: ${Object.keys(this.labelUidMapper).length} entries`, this.importConfig.context);
    } else {
      log.debug('No existing label UID mappings found', this.importConfig.context);
    }

    log.debug('Starting labels import', this.importConfig.context);
    await this.importlabels();
    //update parent in created label
    log.debug('Starting labels update process', this.importConfig.context);
    await this.updateLabels();

    log.debug('Processing labels import results', this.importConfig.context);
    if (this.createdLabel?.length) {
      fsUtil.writeFile(this.createdLabelPath, this.createdLabel);
      log.debug(`Written ${this.createdLabel.length} successful labels to file`, this.importConfig.context);
    }

    if (this.failedLabel?.length) {
      fsUtil.writeFile(this.labelFailsPath, this.failedLabel);
      log.debug(`Written ${this.failedLabel.length} failed labels to file`, this.importConfig.context);
    }

    log.success('Labels have been imported successfully!', this.importConfig.context);
  }

  async importlabels() {
    if (this.labels === undefined || isEmpty(this.labels)) {
      log.info('No Labels Found', this.importConfig.context);
      return;
    }

    const apiContent = values(this.labels);

    const onSuccess = ({ response, apiData: { uid, name } = { uid: null, name: '' } }: any) => {
      this.labelUidMapper[uid] = response;
      log.success(`Label '${name}' imported successfully`, this.importConfig.context);
      fsUtil.writeFile(this.labelUidMapperPath, this.labelUidMapper);
    };

    const onReject = ({ error, apiData }: any) => {
      const err = error?.message ? JSON.parse(error.message) : error;
      const { name } = apiData;
      if (err?.errors?.name) {
        log.info(`Label '${name}' already exists`, this.importConfig.context);
      } else {
        this.failedLabel.push(apiData);
        handleAndLogError(error, { ...this.importConfig.context, name }, `Label '${name}' failed to be import`);
      }
    };

    await this.makeConcurrentCall(
      {
        apiContent,
        processName: 'create labels',
        apiParams: {
          serializeData: this.serializelabels.bind(this),
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
  }

  /**
   * @method serializelabels
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializelabels(apiOptions: ApiOptions): ApiOptions {
    const { apiData: label } = apiOptions;
    log.debug(`Serializing label: ${label.name} (${label.uid})`, this.importConfig.context);

    if (this.labelUidMapper.hasOwnProperty(label.uid)) {
      log.info(`Label '${label.name}' already exists. Skipping it to avoid duplicates!`, this.importConfig.context);
      log.debug(`Skipping label serialization for: ${label.uid}`, this.importConfig.context);
      apiOptions.entity = undefined;
    } else {
      let labelReq = label;
      if (label?.parent?.length != 0) {
        log.debug(`Label '${label.name}' has parent labels, removing parent for initial creation`, this.importConfig.context);
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
        log.success(`Label '${name}' updated successfully`, this.importConfig.context);
        log.debug(`Label update completed: ${name} (${uid})`, this.importConfig.context);
      };

      const onReject = ({ error, apiData }: any) => {
        log.debug(`Label '${apiData?.name}' update failed`, this.importConfig.context);
        handleAndLogError(error, { ...this.importConfig.context, name: apiData?.name }, `Failed to update label '${apiData?.name}'`);
      };

      log.debug(`Using concurrency limit for updates: ${this.importConfig.fetchConcurrency || 1}`, this.importConfig.context);
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
        log.debug(`Label '${label.name}' has ${label.parent.length} parent labels to update`, this.importConfig.context);
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
        apiOptions.entity = undefined;
        this.createdLabel.push(newLabel);
      }
    } else {
      log.debug(`Label '${label.name}' not found in UID mapper, skipping update`, this.importConfig.context);
      apiOptions.entity = undefined;
    }
    return apiOptions;
  }
}
