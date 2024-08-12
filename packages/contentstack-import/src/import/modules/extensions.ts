import isEmpty from 'lodash/isEmpty';
import values from 'lodash/values';
import cloneDeep from 'lodash/cloneDeep';
import { join } from 'node:path';

import { log, formatError, fsUtil, fileHelper } from '../../utils';
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
    log(this.importConfig, 'Migrating extensions', 'info');

    //Step1 check folder exists or not
    if (fileHelper.fileExistsSync(this.extensionsFolderPath)) {
      this.extensions = fsUtil.readFile(join(this.extensionsFolderPath, 'extensions.json'), true) as Record<
        string,
        Record<string, unknown>
      >;
    } else {
      log(this.importConfig, `No Extensions Found - '${this.extensionsFolderPath}'`, 'info');
      return;
    }

    await fsUtil.makeDirectory(this.mapperDirPath);
    this.extUidMapper = fileHelper.fileExistsSync(this.extUidMapperPath)
      ? (fsUtil.readFile(join(this.extUidMapperPath), true) as Record<string, unknown>)
      : {};

    // Check whether the scope of an extension contains content-types in scope
    // Remove the scope and store the scope with uid in pending extensions
    this.getContentTypesInScope();

    await this.importExtensions();

    // Update the uid of the extension
    this.updateUidExtension();
    // Note: if any extensions present, then update it
    if (this.importConfig.replaceExisting && this.existingExtensions.length > 0) {
      await this.replaceExtensions().catch((error: Error) => {
        log(this.importConfig, `Error while replacing extensions ${formatError(error)}`, 'error');
      });
    }

    if (this.extSuccess?.length) {
      fsUtil.writeFile(this.extSuccessPath, this.extSuccess);
    }

    if (this.extFailed?.length) {
      fsUtil.writeFile(this.extFailsPath, this.extFailed);
    }

    log(this.importConfig, 'Extensions have been imported successfully!', 'success');
  }

  async importExtensions(): Promise<any> {
    if (this.extensions === undefined || isEmpty(this.extensions)) {
      log(this.importConfig, 'No Extensions Found', 'info');
      return;
    }

    const apiContent = values(this.extensions);

    const onSuccess = ({ response, apiData: { uid, title } = { uid: null, title: '' } }: any) => {
      this.extSuccess.push(response);
      this.extUidMapper[uid] = response.uid;
      log(this.importConfig, `Extension '${title}' imported successfully`, 'success');
      fsUtil.writeFile(this.extUidMapperPath, this.extUidMapper);
    };

    const onReject = ({ error, apiData }: any) => {
      const { title } = apiData;
      if (error?.errors?.title) {
        if (this.importConfig.replaceExisting) {
          this.existingExtensions.push(apiData);
        }
        if (!this.importConfig.skipExisting) {
          log(this.importConfig, `Extension '${title}' already exists`, 'info');
        }
      } else {
        this.extFailed.push(apiData);
        log(this.importConfig, `Extension '${title}' failed to be import ${formatError(error)}`, 'error');
        log(this.importConfig, error, 'error');
      }
    };

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
  }

  async replaceExtensions(): Promise<any> {
    const onSuccess = ({ response, apiData: { uid, title } = { uid: null, title: '' } }: any) => {
      this.extSuccess.push(response);
      this.extUidMapper[uid] = response.uid;
      log(this.importConfig, `Extension '${title}' replaced successfully`, 'success');
      fsUtil.writeFile(this.extUidMapperPath, this.extUidMapper);
    };

    const onReject = ({ error, apiData }: any) => {
      this.extFailed.push(apiData);
      log(this.importConfig, `Extension '${apiData.title}' failed to replace ${formatError(error)}`, 'error');
      log(this.importConfig, error, 'error');
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
    return new Promise(async (resolve, reject) => {
      const { items: [extensionsInStack] = [] }: any = await this.stack
        .extension()
        .query({ query: { title: extension.title } })
        .findOne()
        .catch((error) => {
          apiParams.reject({
            error,
            apiData: extension,
          });
          reject(true);
        });
      if (extensionsInStack) {
        const extensionPayload = this.stack.extension(extension.uid);
        Object.assign(extensionPayload, extensionsInStack, cloneDeep(extension), {
          uid: extensionsInStack.uid,
          urlPath: extensionsInStack.urlPath,
          _version: extensionsInStack._version,
          stackHeaders: extensionsInStack.stackHeaders,
        });
        return extensionPayload
          .update()
          .then((response) => {
            apiParams.resolve({
              response,
              apiData: extension,
            });
            resolve(true);
          })
          .catch((error) => {
            apiParams.reject({
              error,
              apiData: extension,
            });
            reject(true);
          });
      } else {
        apiParams.reject({
          error: new Error(`Extension with title ${extension.title} not found in the stack`),
          apiData: extension,
        });
        reject(true);
      }
    });
  }

  getContentTypesInScope() {
    const extension = values(this.extensions);
    extension.forEach((ext: ExtensionType) => {
      let ct: any = ext?.scope?.content_types || [];
      if ((ct.length === 1 && ct[0] !== '$all') || ct?.length > 1) {
        log(this.importConfig, `Removing the content-types ${ct.join(',')} from the extension ${ext.title} ...`, 'info');
        const { uid, scope } = ext;
        this.extensionObject.push({ uid, scope });
        delete ext.scope;
        this.extensions[ext.uid] = ext;
      }
    });
  }

  updateUidExtension() {
    for (let i in this.extensionObject) {
      this.extensionObject[i].uid = this.extUidMapper[this.extensionObject[i].uid as string];
    }
    fsUtil.writeFile(this.extPendingPath, this.extensionObject);
  }
}
