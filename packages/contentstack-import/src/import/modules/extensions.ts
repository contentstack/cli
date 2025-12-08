import isEmpty from 'lodash/isEmpty';
import values from 'lodash/values';
import cloneDeep from 'lodash/cloneDeep';
import { join } from 'node:path';
import { log, handleAndLogError } from '@contentstack/cli-utilities';

import { fsUtil, fileHelper } from '../../utils';
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
    this.importConfig.context.module = 'extensions';
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
    log.debug('Checking if extensions folder exists...', this.importConfig.context);
    
    //Step1 check folder exists or not
    if (fileHelper.fileExistsSync(this.extensionsFolderPath)) {
      log.debug(`Found extensions folder: ${this.extensionsFolderPath}`, this.importConfig.context);
      
      this.extensions = fsUtil.readFile(join(this.extensionsFolderPath, 'extensions.json'), true) as Record<
        string,
        Record<string, unknown>
      >;
      
      // Check if extensions file was read successfully
      if (!this.extensions) {
        log.info(`No extensions found in file: '${join(this.extensionsFolderPath, 'extensions.json')}'`, this.importConfig.context);
        return;
      }
      
      const extensionsCount = Object.keys(this.extensions || {}).length;
      log.debug(`Loaded ${extensionsCount} extension items from file`, this.importConfig.context);
    } else {
      log.info(`No extensions found: '${this.extensionsFolderPath}'`, this.importConfig.context);
      return;
    }

    log.debug('Creating extensions mapper directory...', this.importConfig.context);
    await fsUtil.makeDirectory(this.mapperDirPath);
    
    log.debug('Loading existing extension UID data...', this.importConfig.context);
    this.extUidMapper = fileHelper.fileExistsSync(this.extUidMapperPath)
      ? (fsUtil.readFile(join(this.extUidMapperPath), true) as Record<string, unknown>) || {}
      : {};

    if (this.extUidMapper && Object.keys(this.extUidMapper || {}).length > 0) {
      const extUidCount = Object.keys(this.extUidMapper || {}).length;
      log.debug(`Loaded existing extensions UID data: ${extUidCount} items`, this.importConfig.context);
    } else {
      log.debug('No existing extension UID data found.', this.importConfig.context);
    }

    // Check whether the scope of an extension contains content-types in scope
    // Remove the scope and store the scope with uid in pending extensions
    log.debug('Checking content types in extension scope...', this.importConfig.context);
    this.getContentTypesInScope();

    log.debug('Starting extensions import...', this.importConfig.context);
    await this.importExtensions();

    // Update the uid of the extension
    log.debug('Updating extension UIDs...', this.importConfig.context);
    this.updateUidExtension();
    
    // Note: if any extensions present, then update it
    if (this.importConfig.replaceExisting && this.existingExtensions.length > 0) {
      log.debug(`Replacing ${this.existingExtensions.length} existing extensions`, this.importConfig.context);
      await this.replaceExtensions().catch((error: Error) => {
        log.debug('Error replacing extensions!', this.importConfig.context);
        handleAndLogError(error, { ...this.importConfig.context});
      });
    }

    log.debug('Processing extensions import results...', this.importConfig.context);
    if (this.extSuccess?.length) {
      fsUtil.writeFile(this.extSuccessPath, this.extSuccess);
      log.debug(`Written ${this.extSuccess.length} successful extensions to file`, this.importConfig.context);
    }

    if (this.extFailed?.length) {
      fsUtil.writeFile(this.extFailsPath, this.extFailed);
      log.debug(`Written ${this.extFailed.length} failed extensions to file`, this.importConfig.context);
    }

    log.success('Extensions have been imported successfully!', this.importConfig.context);
  }

  async importExtensions(): Promise<any> {
    log.debug('Starting extensions import process', this.importConfig.context);
    if (this.extensions === undefined || isEmpty(this.extensions)) {
      log.info('No extensions found.', this.importConfig.context);
      return;
    }

    const apiContent = values(this.extensions);
    log.debug(`Importing ${apiContent.length} extensions`, this.importConfig.context);

    const onSuccess = ({ response, apiData: { uid, title } = { uid: null, title: '' } }: any) => {
      this.extSuccess.push(response);
      this.extUidMapper[uid] = response.uid;
      log.success(`Extension '${title}' imported successfully`, this.importConfig.context);
      log.debug(`Extension import completed: ${title} (${uid})`, this.importConfig.context);
      fsUtil.writeFile(this.extUidMapperPath, this.extUidMapper);
    };

    const onReject = ({ error, apiData }: any) => {
      const { title } = apiData;
      log.debug(`Extension '${title}' import failed`, this.importConfig.context);
      
      if (error?.errors?.title) {
        if (this.importConfig.replaceExisting) {
          this.existingExtensions.push(apiData);
          log.debug(`Extension '${title}' marked for replacement`, this.importConfig.context);
        }
        if (!this.importConfig.skipExisting) {
          log.info(`Extension '${title}' already exists`, this.importConfig.context);
        }
      } else {
        this.extFailed.push(apiData);
        handleAndLogError(error, { ...this.importConfig.context, title }, `Extension '${title}' failed to be import`);
      }
    };

    log.debug(`Using concurrency limit: ${this.importConfig.concurrency || this.importConfig.fetchConcurrency || 1}`, this.importConfig.context);
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
    
    log.debug('Extensions import process completed.', this.importConfig.context);
  }

  async replaceExtensions(): Promise<any> {
    log.debug(`Replacing ${this.existingExtensions.length} existing extensions`, this.importConfig.context);
    
    const onSuccess = ({ response, apiData: { uid, title } = { uid: null, title: '' } }: any) => {
      this.extSuccess.push(response);
      this.extUidMapper[uid] = response.uid;
      log.success(`Extension '${title}' replaced successfully`, this.importConfig.context);
      log.debug(`Extension replacement completed: ${title} (${uid})`, this.importConfig.context);
      fsUtil.writeFile(this.extUidMapperPath, this.extUidMapper);
    };

    const onReject = ({ error, apiData }: any) => {
      log.debug(`Extension '${apiData.title}' replacement failed`, this.importConfig.context);
      this.extFailed.push(apiData);
      handleAndLogError(error, { ...this.importConfig.context, title: apiData.title }, `Extension '${apiData.title}' failed to replace`);
    };

    log.debug(`Using concurrency limit for replacement: ${this.importConfig.concurrency || this.importConfig.fetchConcurrency || 1}`, this.importConfig.context);
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
    
    log.debug('Extensions replacement process completed.', this.importConfig.context);
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
        log.debug(`Found existing extension in stack: ${extension.title} (${extensionsInStack.uid})`, this.importConfig.context);
        
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
        log.info(`Removing content types: ${ct.join(', ')}...`, this.importConfig.context);
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
    log.debug('Updating extension UIDs in pending extensions...', this.importConfig.context);
    
    let updatedCount = 0;
    for (let i in this.extensionObject) {
      const originalUid = this.extensionObject[i].uid as string;
      this.extensionObject[i].uid = this.extUidMapper[originalUid];
      if (this.extUidMapper[originalUid]) {
        updatedCount++;
        log.debug(`Updated extension UID: ${originalUid} → ${this.extUidMapper[originalUid]}`, this.importConfig.context);
      }
    }
    
    log.debug(`Updated ${updatedCount} extension UIDs in pending extensions`, this.importConfig.context);
    
    if (this.extensionObject.length > 0) {
      fsUtil.writeFile(this.extPendingPath, this.extensionObject);
      log.debug(`Written ${this.extensionObject.length} pending extensions to file`, this.importConfig.context);
    }
  }
}
