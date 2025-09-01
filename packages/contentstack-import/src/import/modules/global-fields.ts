/* eslint-disable no-prototype-builtins */
/*!
 * Contentstack Import
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */

import * as path from 'path';
import { isEmpty, cloneDeep } from 'lodash';
import { GlobalField } from '@contentstack/management/types/stack/globalField';
import { sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';

import {
  fsUtil,
  fileHelper,
  lookupExtension,
  removeReferenceFields,
  PROCESS_NAMES,
  MODULE_CONTEXTS,
  PROCESS_STATUS,
  MODULE_NAMES,
} from '../../utils';
import { ImportConfig, ModuleClassParams } from '../../types';
import BaseClass, { ApiOptions } from './base-class';
import { gfSchemaTemplate } from '../../utils/global-field-helper';

export default class ImportGlobalFields extends BaseClass {
  private gFsMapperPath: string;
  private gFsFolderPath: string;
  private gFsFailsPath: string;
  private gFsSuccessPath: string;
  private gFsUidMapperPath: string;
  private gFsPendingPath: string;
  private pendingGFs: string[];
  private failedGFs: Record<string, unknown>[];
  private createdGFs: Record<string, unknown>[];
  private gFs: Record<string, unknown>[];
  private gFsUidMapper: Record<string, string>;
  private config: ImportConfig;
  private stackAPIClient: any;
  private marketplaceAppMapperPath: string;
  private reqConcurrency: number;
  private installedExtensions: Record<string, unknown>;
  private existingGFs: Record<string, any>[];
  private gFsConfig: {
    dirName: string;
    fileName: string;
    validKeys: string[];
    limit: number;
    writeConcurrency?: number;
  };

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.importConfig.context.module = MODULE_CONTEXTS.GLOBAL_FIELDS;
    this.currentModuleName = MODULE_NAMES[MODULE_CONTEXTS.GLOBAL_FIELDS];
    this.config = importConfig;
    this.gFsConfig = importConfig.modules['global-fields'];
    this.gFs = [];
    this.gFsUidMapper = {};
    this.createdGFs = [];
    this.failedGFs = [];
    this.pendingGFs = [];
    this.existingGFs = [];
    this.reqConcurrency = this.gFsConfig.writeConcurrency || this.config.writeConcurrency;
    this.gFsMapperPath = path.resolve(sanitizePath(this.config.data), 'mapper', 'global_fields');
    this.gFsFolderPath = path.resolve(sanitizePath(this.config.data), sanitizePath(this.gFsConfig.dirName));
    this.gFsFailsPath = path.resolve(sanitizePath(this.config.data), 'mapper', 'global_fields', 'fails.json');
    this.gFsSuccessPath = path.resolve(sanitizePath(this.config.data), 'mapper', 'global_fields', 'success.json');
    this.gFsUidMapperPath = path.resolve(sanitizePath(this.config.data), 'mapper', 'global_fields', 'uid-mapping.json');
    this.gFsPendingPath = path.resolve(
      sanitizePath(this.config.data),
      'mapper',
      'global_fields',
      'pending_global_fields.js',
    );
    this.marketplaceAppMapperPath = path.join(
      sanitizePath(this.config.data),
      'mapper',
      'marketplace_apps',
      'uid-mapping.json',
    );
  }

  /**
   * @method start
   * @returns {Promise<void>} Promise<void>
   */
  async start(): Promise<void> {
    try {
      log.debug('Starting global fields import process...', this.importConfig.context);
      const [globalFieldsCount] = await this.analyzeGlobalFields();
      if (globalFieldsCount === 0) {
        log.info('No global fields found to import', this.importConfig.context);
        return;
      }

      const progress = this.createNestedProgress(this.currentModuleName);
      progress.addProcess(PROCESS_NAMES.GLOBAL_FIELDS_CREATE, globalFieldsCount);
      progress.addProcess(PROCESS_NAMES.GLOBAL_FIELDS_UPDATE, globalFieldsCount);

      await this.prepareGlobalFieldMapper();

      // Step 1: Create global fields
      progress
        .startProcess(PROCESS_NAMES.GLOBAL_FIELDS_CREATE)
        .updateStatus(PROCESS_STATUS[PROCESS_NAMES.GLOBAL_FIELDS_CREATE].CREATING, PROCESS_NAMES.GLOBAL_FIELDS_CREATE);
      log.info('Starting Create process', this.importConfig.context);
      await this.seedGFs();
      progress.completeProcess(PROCESS_NAMES.GLOBAL_FIELDS_CREATE, true);

      // Step 2: Update global fields with references
      progress
        .startProcess(PROCESS_NAMES.GLOBAL_FIELDS_UPDATE)
        .updateStatus(PROCESS_STATUS[PROCESS_NAMES.GLOBAL_FIELDS_UPDATE].UPDATING, PROCESS_NAMES.GLOBAL_FIELDS_UPDATE);
      log.info('Starting Update process', this.importConfig.context);
      await this.updateGFs();
      progress.completeProcess(PROCESS_NAMES.GLOBAL_FIELDS_UPDATE, true);

      // Step 3: Replace existing global fields if needed
      if (this.importConfig.replaceExisting && this.existingGFs.length > 0) {
        progress.addProcess(PROCESS_NAMES.GLOBAL_FIELDS_REPLACE_EXISTING, this.existingGFs.length);
        progress
          .startProcess(PROCESS_NAMES.GLOBAL_FIELDS_REPLACE_EXISTING)
          .updateStatus(
            PROCESS_STATUS[PROCESS_NAMES.GLOBAL_FIELDS_REPLACE_EXISTING].REPLACING,
            PROCESS_NAMES.GLOBAL_FIELDS_REPLACE_EXISTING,
          );
        log.info('Starting Replace Existing process', this.importConfig.context);
        await this.replaceGFs();
        progress.completeProcess(PROCESS_NAMES.GLOBAL_FIELDS_REPLACE_EXISTING, true);
      }

      await this.processGlobalFieldResults();

      this.completeProgress(true);
      log.success('Global fields import has been completed!', this.importConfig.context);
    } catch (error) {
      this.completeProgress(false, error?.message || 'Global fields import failed');
      handleAndLogError(error, { ...this.importConfig.context });
    }
  }

  async seedGFs(): Promise<any> {
    log.debug('Starting global fields seeding process', this.importConfig.context);

    const gfsToSeed = Array.isArray(this.gFs) ? this.gFs.length : Object.keys(this.gFs).length;
    log.debug(`Seeding ${gfsToSeed} global fields`, this.importConfig.context);

    const onSuccess = ({ response: globalField, apiData: { uid } = undefined }: any) => {
      this.createdGFs.push(globalField);
      this.gFsUidMapper[uid] = globalField;
      this.progressManager?.tick(true, `global field: ${globalField.uid}`, null, PROCESS_NAMES.GLOBAL_FIELDS_CREATE);
      log.success(`Global field ${globalField.uid} created successfully`, this.importConfig.context);
      log.debug(`Global field Create completed: ${globalField.uid}`, this.importConfig.context);
    };

    const onReject = ({ error, apiData: globalField = undefined }: any) => {
      const uid = globalField?.global_field?.uid;
      log.debug(`Global field '${uid}' Create failed`, this.importConfig.context);

      if (error?.errors?.title) {
        if (this.importConfig.replaceExisting) {
          this.existingGFs.push(globalField);
          this.progressManager?.tick(
            true,
            `global field: ${uid} (marked for replacement)`,
            null,
            PROCESS_NAMES.GLOBAL_FIELDS_CREATE,
          );
          log.debug(`Global field '${uid}' marked for replacement`, this.importConfig.context);
        } else {
          this.progressManager?.tick(
            true,
            `global field: ${uid} (already exists)`,
            null,
            PROCESS_NAMES.GLOBAL_FIELDS_CREATE,
          );
        }
        if (!this.importConfig.skipExisting) {
          log.info(`Global fields '${uid}' already exist`, this.importConfig.context);
        }
      } else {
        this.progressManager?.tick(
          false,
          `global field: ${uid}`,
          error?.message || 'Failed to create global field',
          PROCESS_NAMES.GLOBAL_FIELDS_CREATE,
        );
        handleAndLogError(error, { ...this.importConfig.context, uid }, `Global fields '${uid}' failed to import`);
        this.failedGFs.push({ uid });
      }
    };

    log.debug(`Using concurrency limit for seeding: ${this.reqConcurrency}`, this.importConfig.context);
    const result = await this.makeConcurrentCall({
      processName: 'Import global fields',
      apiContent: this.gFs,
      apiParams: {
        serializeData: this.serializeGFs.bind(this),
        reject: onReject.bind(this),
        resolve: onSuccess.bind(this),
        entity: 'create-gfs',
        includeParamOnCompletion: true,
      },
      concurrencyLimit: this.reqConcurrency,
    });

    log.debug('Global fields seeding process completed', this.importConfig.context);
    return result;
  }

  /**
   * @method serializeGFs
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeGFs(apiOptions: ApiOptions): ApiOptions {
    const { apiData: globalField } = apiOptions;
    log.debug(`Serializing global field: ${globalField.uid}`, this.importConfig.context);

    const updatedGF = cloneDeep(gfSchemaTemplate);
    updatedGF.global_field.uid = globalField.uid;
    updatedGF.global_field.title = globalField.title;

    log.debug(`Global field serialization completed: ${globalField.uid}`, this.importConfig.context);
    apiOptions.apiData = updatedGF;
    return apiOptions;
  }

  async updateGFs(): Promise<any> {
    log.debug('Starting Update process', this.importConfig.context);

    const gfsToUpdate = Array.isArray(this.gFs) ? this.gFs.length : Object.keys(this.gFs).length;
    log.debug(`Updating ${gfsToUpdate} global fields`, this.importConfig.context);

    const onSuccess = ({ response: globalField, apiData: { uid } = undefined }: any) => {
      this.progressManager?.tick(true, `global field: ${uid}`, null, PROCESS_NAMES.GLOBAL_FIELDS_UPDATE);
      log.success(`Updated the global field ${uid}`, this.importConfig.context);
      log.debug(`Global field update completed: ${uid}`, this.importConfig.context);
    };

    const onReject = ({ error, apiData: { uid } = undefined }: any) => {
      this.progressManager?.tick(
        false,
        `global field: ${uid}`,
        error?.message || 'Failed to update global field',
        PROCESS_NAMES.GLOBAL_FIELDS_UPDATE,
      );
      log.debug(`Global field '${uid}' update failed`, this.importConfig.context);
      handleAndLogError(error, { ...this.importConfig.context, uid }, `Failed to update the global field '${uid}'`);
    };

    log.debug(`Using concurrency limit for updates: ${this.reqConcurrency}`, this.importConfig.context);
    const result = await this.makeConcurrentCall(
      {
        processName: 'Update Global Fields',
        apiContent: this.gFs,
        apiParams: {
          reject: onReject.bind(this),
          resolve: onSuccess.bind(this),
          entity: 'update-gfs',
          includeParamOnCompletion: true,
        },
        concurrencyLimit: this.reqConcurrency,
      },
      this.updateSerializedGFs.bind(this),
    );

    log.debug('Update process completed', this.importConfig.context);
    return result;
  }

  async updateSerializedGFs({
    apiParams,
    element: globalField,
    isLastRequest,
  }: {
    apiParams: ApiOptions;
    element: Record<string, string>;
    isLastRequest: boolean;
  }) {
    log.debug(`Processing global field update: ${globalField.uid}`, this.importConfig.context);

    return new Promise(async (resolve, reject) => {
      log.debug(`Looking up extensions for global field: ${globalField.uid}`, this.importConfig.context);
      lookupExtension(this.config, globalField.schema, this.config.preserveStackVersion, this.installedExtensions);

      let flag = { supressed: false };
      log.debug(`Removing reference fields for global field: ${globalField.uid}`, this.importConfig.context);
      await removeReferenceFields(globalField.schema, flag, this.stack);

      if (flag.supressed) {
        log.debug(
          `Global field '${globalField.uid}' has suppressed references, adding to pending`,
          this.importConfig.context,
        );
        this.pendingGFs.push(globalField.uid);
        log.info(`Global field '${globalField.uid}' will be updated later`, this.importConfig.context);
        return resolve(true);
      }

      log.debug(`Fetching existing global field: ${globalField.uid}`, this.importConfig.context);
      return this.stack
        .globalField(globalField.uid, { api_version: '3.2' })
        .fetch()
        .then((response: GlobalField) => {
          log.debug(`Updating global field: ${globalField.uid}`, this.importConfig.context);
          Object.assign(response, globalField);
          return response.update();
        })
        .then((response: GlobalField) => {
          log.debug(`Global field update successful: ${globalField.uid}`, this.importConfig.context);
          apiParams.resolve({
            response,
            apiData: globalField,
          });
          resolve(true);
        })
        .catch((error: unknown) => {
          log.debug(`Global field update failed: ${globalField.uid}`, this.importConfig.context);
          apiParams.reject({
            error,
            apiData: globalField,
          });
          reject(true);
        });
    });
  }

  async replaceGFs(): Promise<any> {
    log.debug(`Replacing ${this.existingGFs.length} existing global fields`, this.importConfig.context);

    const onSuccess = ({ response: globalField, apiData }: any) => {
      const uid = apiData?.uid ?? apiData?.global_field?.uid ?? 'unknown';
      this.createdGFs.push(globalField);
      this.gFsUidMapper[uid] = globalField;
      this.progressManager?.tick(
        true,
        `global field: ${uid} (replaced)`,
        null,
        PROCESS_NAMES.GLOBAL_FIELDS_REPLACE_EXISTING,
      );
      fsUtil.writeFile(this.gFsUidMapperPath, this.gFsUidMapper);
      log.success(`Global field '${uid}' replaced successfully`, this.importConfig.context);
      log.debug(`Global field replacement completed: ${uid}`, this.importConfig.context);
    };

    const onReject = ({ error, apiData }: any) => {
      const uid = apiData?.uid ?? apiData?.global_field?.uid ?? 'unknown';
      this.progressManager?.tick(
        false,
        `global field: ${uid}`,
        error?.message || 'Failed to replace global field',
        PROCESS_NAMES.GLOBAL_FIELDS_REPLACE_EXISTING,
      );
      log.debug(`Global field '${uid}' replacement failed`, this.importConfig.context);
      handleAndLogError(error, { ...this.importConfig.context, uid }, `Global fields '${uid}' failed to replace`);
      this.failedGFs.push({ uid });
    };

    log.debug(
      `Using concurrency limit for replacement: ${
        this.importConfig.concurrency || this.importConfig.fetchConcurrency || 1
      }`,
      this.importConfig.context,
    );
    await this.makeConcurrentCall(
      {
        apiContent: this.existingGFs,
        processName: 'Replace global fields',
        apiParams: {
          serializeData: this.serializeReplaceGFs.bind(this),
          reject: onReject.bind(this),
          resolve: onSuccess.bind(this),
          entity: 'update-gfs',
          includeParamOnCompletion: true,
        },
        concurrencyLimit: this.importConfig.concurrency || this.importConfig.fetchConcurrency || 1,
      },
      undefined,
      false,
    );

    log.debug('Replace Existing process completed', this.importConfig.context);
  }

  /**
   * @method serializeReplaceGFs
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeReplaceGFs(apiOptions: ApiOptions): ApiOptions {
    const { apiData: globalField } = apiOptions;
    const uid = globalField?.uid ?? globalField?.global_field?.uid ?? 'unknown';
    log.debug(`Serializing global field replacement: ${uid}`, this.importConfig.context);

    const globalFieldPayload = this.stack.globalField(globalField.uid, { api_version: '3.2' });
    Object.assign(globalFieldPayload, cloneDeep(globalField), {
      stackHeaders: globalFieldPayload.stackHeaders,
    });

    log.debug(`Global field replacement serialization completed: ${uid}`, this.importConfig.context);
    apiOptions.apiData = globalFieldPayload;
    return apiOptions;
  }

  private async analyzeGlobalFields(): Promise<[number]> {
    return this.withLoadingSpinner('GLOBAL FIELDS: Analyzing import data...', async () => {
      log.debug('Checking for global fields folder existence', this.importConfig.context);

      if (!fileHelper.fileExistsSync(this.gFsFolderPath)) {
        log.info(`No global fields found - '${this.gFsFolderPath}'`, this.importConfig.context);
        return [0];
      }

      log.debug(`Found global fields folder: ${this.gFsFolderPath}`, this.importConfig.context);
      this.gFs = fsUtil.readFile(path.join(this.gFsFolderPath, this.gFsConfig.fileName)) as Record<string, unknown>[];
      if (!this.gFs || isEmpty(this.gFs)) {
        log.info(
          `No global fields found in file - '${path.join(this.gFsFolderPath, this.gFsConfig.fileName)}'`,
          this.importConfig.context,
        );
        return [0];
      }

      const count = Array.isArray(this.gFs) ? this.gFs?.length : Object.keys(this.gFs)?.length;
      log.debug(`Loaded ${count} global field items from file`, this.importConfig.context);
      return [count];
    });
  }

  private async prepareGlobalFieldMapper(): Promise<void> {
    log.debug('Creating global fields mapper directory', this.importConfig.context);
    await fsUtil.makeDirectory(this.gFsMapperPath);

    log.debug('Loading existing global fields UID data', this.importConfig.context);
    if (fileHelper.fileExistsSync(this.gFsUidMapperPath)) {
      this.gFsUidMapper = (fsUtil.readFile(this.gFsUidMapperPath) || {}) as Record<string, string>;
      const gfsUidCount = Object.keys(this.gFsUidMapper || {}).length;
      log.debug(`Loaded existing global fields UID data: ${gfsUidCount} items`, this.importConfig.context);
    } else {
      log.debug('No existing global fields UID data found', this.importConfig.context);
    }

    log.debug('Loading installed extensions data', this.importConfig.context);
    this.installedExtensions = (
      (fsUtil.readFile(this.marketplaceAppMapperPath) as any) || { extension_uid: {} }
    ).extension_uid;

    const installedExtCount = Object.keys(this.installedExtensions || {}).length;
    log.debug(`Loaded ${installedExtCount} installed extension references`, this.importConfig.context);
  }

  private async processGlobalFieldResults(): Promise<void> {
    log.debug('Processing global fields import results', this.importConfig.context);

    if (this.pendingGFs?.length) {
      fsUtil.writeFile(this.gFsPendingPath, this.pendingGFs);
      log.debug(`Written ${this.pendingGFs.length} pending global fields to file`, this.importConfig.context);
    }

    if (this.createdGFs?.length) {
      fsUtil.writeFile(this.gFsSuccessPath, this.createdGFs);
      log.debug(`Written ${this.createdGFs.length} successful global fields to file`, this.importConfig.context);
    }

    if (this.failedGFs?.length) {
      fsUtil.writeFile(this.gFsFailsPath, this.failedGFs);
      log.debug(`Written ${this.failedGFs.length} failed global fields to file`, this.importConfig.context);
    }
  }
}
