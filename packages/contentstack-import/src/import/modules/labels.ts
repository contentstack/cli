import isEmpty from 'lodash/isEmpty';
import values from 'lodash/values';
import omit from 'lodash/omit';
import { join } from 'node:path';

import { log, formatError, fsUtil, fileHelper } from '../../utils';
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
    log(this.importConfig, 'Migrating labels', 'info');

    //Step1 check folder exists or not
    if (fileHelper.fileExistsSync(this.labelsFolderPath)) {
      this.labels = fsUtil.readFile(join(this.labelsFolderPath, 'labels.json'), true) as Record<string, unknown>;
    } else {
      log(this.importConfig, `No labels found - '${this.labelsFolderPath}'`, 'info');
      return;
    }

    //create labels in mapper directory
    await fsUtil.makeDirectory(this.mapperDirPath);
    this.labelUidMapper = fileHelper.fileExistsSync(this.labelUidMapperPath)
      ? (fsUtil.readFile(join(this.labelUidMapperPath), true) as Record<string, unknown>)
      : {};

    await this.importlabels();
    //update parent in created label
    await this.updateLabels();

    if (this.createdLabel?.length) {
      fsUtil.writeFile(this.createdLabelPath, this.createdLabel);
    }

    if (this.failedLabel?.length) {
      fsUtil.writeFile(this.labelFailsPath, this.failedLabel);
    }

    log(this.importConfig, 'Labels have been imported successfully!', 'success');
  }

  async importlabels() {
    if (this.labels === undefined || isEmpty(this.labels)) {
      log(this.importConfig, 'No Labels Found', 'info');
      return;
    }

    const apiContent = values(this.labels);

    const onSuccess = ({ response, apiData: { uid, name } = { uid: null, name: '' } }: any) => {
      this.labelUidMapper[uid] = response;
      log(this.importConfig, `Label '${name}' imported successfully`, 'success');
      fsUtil.writeFile(this.labelUidMapperPath, this.labelUidMapper);
    };

    const onReject = ({ error, apiData }: any) => {
      const err = error?.message ? JSON.parse(error.message) : error;
      const { name } = apiData;
      if (err?.errors?.name) {
        log(this.importConfig, `Label '${name}' already exists`, 'info');
      } else {
        this.failedLabel.push(apiData);
        log(this.importConfig, `Label '${name}' failed to be import. ${formatError(error)}`, 'error');
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

    if (this.labelUidMapper.hasOwnProperty(label.uid)) {
      log(this.importConfig, `Label '${label.name}' already exists. Skipping it to avoid duplicates!`, 'info');
      apiOptions.entity = undefined;
    } else {
      let labelReq = label;
      if (label?.parent?.length != 0) {
        labelReq = omit(label, ['parent']);
      }
      apiOptions.apiData = labelReq;
    }
    return apiOptions;
  }

  async updateLabels() {
    if (!isEmpty(this.labels)) {
      const apiContent = values(this.labels);

      const onSuccess = ({ response, apiData: { uid, name } = { uid: null, name: '' } }: any) => {
        this.createdLabel.push(response);
        log(this.importConfig, `Label '${name}' updated successfully`, 'success');
      };

      const onReject = ({ error, apiData }: any) => {
        log(this.importConfig, `Failed to update label '${apiData?.name}'. ${formatError(error)}`, 'error');
      };

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
    }
  }

  /**
   * @method serializeUpdatelabels
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeUpdateLabels(apiOptions: ApiOptions): ApiOptions {
    const { apiData: label } = apiOptions;
    const labelUid = label.uid;
    if (this.labelUidMapper.hasOwnProperty(labelUid)) {
      const newLabel = this.labelUidMapper[labelUid] as Record<string, any>;
      if (label?.parent?.length > 0) {
        for (let i = 0; i < label?.parent?.length; i++) {
          const parentUid = label.parent[i];
          if (this.labelUidMapper.hasOwnProperty(parentUid)) {
            const mappedLabel = this.labelUidMapper[parentUid] as Record<string, any>;
            label.parent[i] = mappedLabel.uid;
          }
        }
        const createdLabelRes = this.labelUidMapper[labelUid] as Record<string, any>;
        createdLabelRes.parent = label.parent;
        apiOptions.apiData = createdLabelRes;
      } else {
        apiOptions.entity = undefined;
        this.createdLabel.push(newLabel);
      }
    } else {
      apiOptions.entity = undefined;
    }
    return apiOptions;
  }
}
