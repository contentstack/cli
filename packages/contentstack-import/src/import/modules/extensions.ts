import isEmpty from 'lodash/isEmpty';
import values from 'lodash/values';
import cloneDeep from 'lodash/cloneDeep';
import { join } from 'node:path';
import { log, handleAndLogError } from '@contentstack/cli-utilities';

import { fsUtil, fileHelper, PROCESS_NAMES, MODULE_CONTEXTS, PROCESS_STATUS, MODULE_NAMES } from '../../utils';
import BaseClass, { ApiOptions } from './base-class';
import { ModuleClassParams, Extensions, ExtensionType } from '../../types';

export default class ImportExtensions extends BaseClass {
  private mapperDirPath: string;
  private extensionsFolderPath: string;
  private extUidMapperPath: string;
  private extSuccessPath: string;
  private extFailsPath: string;
  private extensionsConfig: Extensions;
  private extensions: Record<string, unknown>;
  private extUidMapper: Record<string, unknown>;
  private extSuccess: Record<string, unknown>[];
  private extFailed: Record<string, unknown>[];
  private existingExtensions: Record<string, unknown>[];
  private extPendingPath: string;
  private extensionObject: Record<string, unknown>[];

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.importConfig.context.module = MODULE_CONTEXTS.EXTENSIONS;
    this.currentModuleName = MODULE_NAMES[MODULE_CONTEXTS.EXTENSIONS];
    this.extensionsConfig = importConfig.modules.extensions;
    this.mapperDirPath = join(this.importConfig.backupDir, 'mapper', 'extensions');
    this.extensionsFolderPath = join(this.importConfig.backupDir, this.extensionsConfig.dirName);
    this.extUidMapperPath = join(this.mapperDirPath, 'uid-mapping.json');
    this.extSuccessPath = join(this.mapperDirPath, 'success.json');
    this.extFailsPath = join(this.mapperDirPath, 'fails.json');
    this.extPendingPath = join(this.mapperDirPath, 'pending_extensions.js');
    this.extFailed = [];
    this.extSuccess = [];
    this.existingExtensions = [];
    this.extUidMapper = {};
    this.extensionObject = [];
  }

  /**
   * @method start
   * @returns {Promise<void>} Promise<void>
   */
  async start(): Promise<void> {
    try {
      log.debug('Starting Create process...', this.importConfig.context);
      const [extensionsCount] = await this.analyzeExtensions();
      if (extensionsCount === 0) {
        log.info('No extensions found to import', this.importConfig.context);
        return;
      }

      const progress = this.createNestedProgress(this.currentModuleName);
      progress.addProcess(PROCESS_NAMES.EXTENSIONS_CREATE, extensionsCount);

      await this.prepareExtensionMapper();
      log.debug('Checking content types in extension scope', this.importConfig.context);

      this.getContentTypesInScope();

      progress
        .startProcess(PROCESS_NAMES.EXTENSIONS_CREATE)
        .updateStatus(PROCESS_STATUS[PROCESS_NAMES.EXTENSIONS_CREATE].CREATING, PROCESS_NAMES.EXTENSIONS_CREATE);
      log.debug('Starting Create', this.importConfig.context);
      await this.importExtensions();
      progress.completeProcess(PROCESS_NAMES.EXTENSIONS_CREATE, true);

      log.debug('Updating extension UIDs', this.importConfig.context);
      this.updateUidExtension();

      if (this.importConfig.replaceExisting && this.existingExtensions.length > 0) {
        progress.addProcess(PROCESS_NAMES.EXTENSIONS_REPLACE_EXISTING, this.existingExtensions.length);
        progress
          .startProcess(PROCESS_NAMES.EXTENSIONS_REPLACE_EXISTING)
          .updateStatus(
            PROCESS_STATUS[PROCESS_NAMES.EXTENSIONS_REPLACE_EXISTING].REPLACING,
            PROCESS_NAMES.EXTENSIONS_REPLACE_EXISTING,
          );
        await this.replaceExtensions();
        progress.completeProcess(PROCESS_NAMES.EXTENSIONS_REPLACE_EXISTING, true);
      }

      await this.processExtensionResults();

      this.completeProgress(true);
      log.success('Extensions have been imported successfully!', this.importConfig.context);
    } catch (error) {
      this.completeProgress(false, error?.message || 'Create failed');
      handleAndLogError(error, { ...this.importConfig.context });
    }
  }

  async importExtensions(): Promise<any> {
    log.debug('Starting Create process', this.importConfig.context);
    if (this.extensions === undefined || isEmpty(this.extensions)) {
      log.info('No Extensions Found', this.importConfig.context);
      return;
    }

    const apiContent = values(this.extensions);
    log.debug(`Importing ${apiContent.length} extensions`, this.importConfig.context);

    const onSuccess = ({ response, apiData: { uid, title } = { uid: null, title: '' } }: any) => {
      this.extSuccess.push(response);
      this.extUidMapper[uid] = response.uid;
      this.progressManager?.tick(true, `extension: ${title || uid}`, null, PROCESS_NAMES.EXTENSIONS_CREATE);
      log.success(`Extension '${title}' imported successfully`, this.importConfig.context);
      log.debug(`Extension import completed: ${title} (${uid})`, this.importConfig.context);
      fsUtil.writeFile(this.extUidMapperPath, this.extUidMapper);
    };

    const onReject = ({ error, apiData }: any) => {
      const { title, uid } = apiData;
      log.debug(`Extension '${title}' import failed`, this.importConfig.context);

      if (error?.errors?.title) {
        if (this.importConfig.replaceExisting) {
          this.existingExtensions.push(apiData);
          this.progressManager?.tick(
            true,
            `extension: ${title || uid} (marked for replacement)`,
            null,
            PROCESS_NAMES.EXTENSIONS_CREATE,
          );
          log.debug(`Extension '${title}' marked for replacement`, this.importConfig.context);
        } else {
          this.progressManager?.tick(
            true,
            `extension: ${title || uid} (already exists)`,
            null,
            PROCESS_NAMES.EXTENSIONS_CREATE,
          );
        }
        if (!this.importConfig.skipExisting) {
          log.info(`Extension '${title}' already exists`, this.importConfig.context);
        }
      } else {
        this.extFailed.push(apiData);
        this.progressManager?.tick(
          false,
          `extension: ${title || uid}`,
          error?.message || 'Failed to import extension',
          PROCESS_NAMES.EXTENSIONS_CREATE,
        );
        handleAndLogError(error, { ...this.importConfig.context, title }, `Extension '${title}' failed to be import`);
      }
    };

    log.debug(
      `Using concurrency limit: ${this.importConfig.concurrency || this.importConfig.fetchConcurrency || 1}`,
      this.importConfig.context,
    );
    await this.makeConcurrentCall(
      {
        apiContent,
        processName: 'import extensions',
        apiParams: {
          reject: onReject.bind(this),
          resolve: onSuccess.bind(this),
          entity: 'create-extensions',
          includeParamOnCompletion: true,
        },
        concurrencyLimit: this.importConfig.concurrency || this.importConfig.fetchConcurrency || 1,
      },
      undefined,
      false,
    );

    log.debug('Create process completed', this.importConfig.context);
  }

  async replaceExtensions(): Promise<any> {
    log.debug(`Replacing ${this.existingExtensions.length} existing extensions`, this.importConfig.context);

    const onSuccess = ({ response, apiData: { uid, title } = { uid: null, title: '' } }: any) => {
      this.extSuccess.push(response);
      this.extUidMapper[uid] = response.uid;
      this.progressManager?.tick(
        true,
        `extension: ${title || uid} (updated)`,
        null,
        PROCESS_NAMES.EXTENSIONS_REPLACE_EXISTING,
      );
      log.success(`Extension '${title}' updated successfully`, this.importConfig.context);
      log.debug(`Extension update completed: ${title} (${uid})`, this.importConfig.context);
      fsUtil.writeFile(this.extUidMapperPath, this.extUidMapper);
    };

    const onReject = ({ error, apiData }: any) => {
      const { title, uid } = apiData;
      this.extFailed.push(apiData);
      this.progressManager?.tick(
        false,
        `extension: ${title || uid}`,
        error?.message || `Extension '${title}' failed to be updated`,
        PROCESS_NAMES.EXTENSIONS_REPLACE_EXISTING,
      );
      log.debug(`Extension '${title}' update failed`, this.importConfig.context);
      handleAndLogError(error, { ...this.importConfig.context, title }, `Extension '${title}' failed to be updated`);
    };

    await this.makeConcurrentCall(
      {
        apiContent: this.existingExtensions,
        processName: 'Replace extensions',
        apiParams: {
          reject: onReject.bind(this),
          resolve: onSuccess.bind(this),
          entity: 'update-extensions',
          includeParamOnCompletion: true,
        },
        concurrencyLimit: this.importConfig.concurrency || this.importConfig.fetchConcurrency || 1,
      },
      this.replaceExtensionHandler.bind(this),
    );

    log.debug('Extensions replacement process completed', this.importConfig.context);
  }

  async replaceExtensionHandler({
    apiParams,
    element: extension,
    isLastRequest,
  }: {
    apiParams: ApiOptions;
    element: Record<string, string>;
    isLastRequest: boolean;
  }) {
    log.debug(`Processing extension replacement: ${extension.title}`, this.importConfig.context);

    return new Promise(async (resolve, reject) => {
      log.debug(`Searching for existing extension: ${extension.title}`, this.importConfig.context);

      const { items: [extensionsInStack] = [] }: any = await this.stack
        .extension()
        .query({ query: { title: extension.title } })
        .findOne()
        .catch((error) => {
          log.debug(`Error searching for extension: ${extension.title}`, this.importConfig.context);
          apiParams.reject({
            error,
            apiData: extension,
          });
          reject(true);
        });

      if (extensionsInStack) {
        log.debug(
          `Found existing extension in stack: ${extension.title} (${extensionsInStack.uid})`,
          this.importConfig.context,
        );

        const extensionPayload = this.stack.extension(extension.uid);
        Object.assign(extensionPayload, extensionsInStack, cloneDeep(extension), {
          uid: extensionsInStack.uid,
          urlPath: extensionsInStack.urlPath,
          _version: extensionsInStack._version,
          stackHeaders: extensionsInStack.stackHeaders,
        });

        log.debug(`Updating extension: ${extension.title}`, this.importConfig.context);
        return extensionPayload
          .update()
          .then((response) => {
            log.debug(`Extension update successful: ${extension.title}`, this.importConfig.context);
            apiParams.resolve({
              response,
              apiData: extension,
            });
            resolve(true);
          })
          .catch((error) => {
            log.debug(`Extension update failed: ${extension.title}`, this.importConfig.context);
            apiParams.reject({
              error,
              apiData: extension,
            });
            reject(true);
          });
      } else {
        log.debug(`Extension not found in stack: ${extension.title}`, this.importConfig.context);
        apiParams.reject({
          error: new Error(`Extension with title ${extension.title} not found in the stack`),
          apiData: extension,
        });
        reject(true);
      }
    });
  }

  getContentTypesInScope() {
    log.debug('Processing content types in extension scope', this.importConfig.context);

    const extension = values(this.extensions);
    let processedExtensions = 0;

    extension.forEach((ext: ExtensionType) => {
      let ct: any = ext?.scope?.content_types || [];
      if ((ct.length === 1 && ct[0] !== '$all') || ct?.length > 1) {
        log.info(
          `Removing the content-types ${ct.join(',')} from the extension ${ext.title} ...`,
          this.importConfig.context,
        );
        log.debug(`Extension '${ext.title}' has ${ct.length} content types in scope`, this.importConfig.context);

        const { uid, scope } = ext;
        this.extensionObject.push({ uid, scope });
        delete ext.scope;
        this.extensions[ext.uid] = ext;
        processedExtensions++;
      }
    });

    log.debug(`Processed ${processedExtensions} extensions with content type scope`, this.importConfig.context);
    log.debug(`Total extensions with pending scope: ${this.extensionObject.length}`, this.importConfig.context);
  }

  updateUidExtension() {
    log.debug('Updating extension UIDs in pending extensions', this.importConfig.context);

    let updatedCount = 0;
    for (let i in this.extensionObject) {
      const originalUid = this.extensionObject[i].uid as string;
      this.extensionObject[i].uid = this.extUidMapper[originalUid];
      if (this.extUidMapper[originalUid]) {
        updatedCount++;
        log.debug(
          `Updated extension UID: ${originalUid} → ${this.extUidMapper[originalUid]}`,
          this.importConfig.context,
        );
      }
    }

    log.debug(`Updated ${updatedCount} extension UIDs in pending extensions`, this.importConfig.context);

    if (this.extensionObject.length > 0) {
      fsUtil.writeFile(this.extPendingPath, this.extensionObject);
      log.debug(`Written ${this.extensionObject.length} pending extensions to file`, this.importConfig.context);
    }
  }

  private async analyzeExtensions(): Promise<[number]> {
    return this.withLoadingSpinner('EXTENSIONS: Analyzing import data...', async () => {
      log.debug('Checking for extensions folder existence', this.importConfig.context);

      if (!fileHelper.fileExistsSync(this.extensionsFolderPath)) {
        log.info(`No Extensions Found - '${this.extensionsFolderPath}'`, this.importConfig.context);
        return [0];
      }

      log.debug(`Found extensions folder: ${this.extensionsFolderPath}`, this.importConfig.context);

      this.extensions = fsUtil.readFile(join(this.extensionsFolderPath, 'extensions.json'), true) as Record<
        string,
        Record<string, unknown>
      >;

      if (!this.extensions) {
        log.info(
          `No extensions found in file - '${join(this.extensionsFolderPath, 'extensions.json')}'`,
          this.importConfig.context,
        );
        return [0];
      }

      const count = Object.keys(this.extensions || {}).length;
      log.debug(`Loaded ${count} extension items from file`, this.importConfig.context);
      return [count];
    });
  }

  private async prepareExtensionMapper(): Promise<void> {
    log.debug('Creating extensions mapper directory', this.importConfig.context);
    await fsUtil.makeDirectory(this.mapperDirPath);

    log.debug('Loading existing extensions UID data', this.importConfig.context);
    this.extUidMapper = fileHelper.fileExistsSync(this.extUidMapperPath)
      ? (fsUtil.readFile(this.extUidMapperPath, true) as Record<string, unknown>) || {}
      : {};

    const count = Object.keys(this.extUidMapper || {}).length;
    if (count > 0) {
      log.debug(`Loaded existing extensions UID data: ${count} items`, this.importConfig.context);
    } else {
      log.debug('No existing extensions UID data found', this.importConfig.context);
    }
  }

  private async processExtensionResults(): Promise<void> {
    log.debug('Processing Create results', this.importConfig.context);

    if (this.extSuccess?.length) {
      fsUtil.writeFile(this.extSuccessPath, this.extSuccess);
      log.debug(`Written ${this.extSuccess.length} successful extensions to file`, this.importConfig.context);
    }

    if (this.extFailed?.length) {
      fsUtil.writeFile(this.extFailsPath, this.extFailed);
      log.debug(`Written ${this.extFailed.length} failed extensions to file`, this.importConfig.context);
    }
  }
}
