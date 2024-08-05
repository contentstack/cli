import pick from 'lodash/pick';
import last from 'lodash/last';
import chunk from 'lodash/chunk';
import isEmpty from 'lodash/isEmpty';
import entries from 'lodash/entries';
import isEqual from 'lodash/isEqual';
import omit from 'lodash/omit';
import { Stack } from '@contentstack/management/types/stack';
import { AssetData } from '@contentstack/management/types/stack/asset';
import { LocaleData } from '@contentstack/management/types/stack/locale';
import { PublishConfig } from '@contentstack/management/types/utility/publish';
import { FolderData } from '@contentstack/management/types/stack/asset/folder';
import { ExtensionData } from '@contentstack/management/types/stack/extension';
import { EnvironmentData } from '@contentstack/management/types/stack/environment';
import { LabelData } from '@contentstack/management/types/stack/label';
import { WebhookData } from '@contentstack/management/types/stack/webhook';
import { WorkflowData } from '@contentstack/management/types/stack/workflow';
import { RoleData } from '@contentstack/management/types/stack/role';

import { log } from '../../utils';
import { ImportConfig, ModuleClassParams } from '../../types';

export type AdditionalKeys = {
  backupDir: string;
};

export type ApiModuleType =
  | 'create-assets'
  | 'replace-assets'
  | 'publish-assets'
  | 'create-assets-folder'
  | 'create-extensions'
  | 'update-extensions'
  | 'create-locale'
  | 'update-locale'
  | 'create-gfs'
  | 'create-cts'
  | 'update-cts'
  | 'update-gfs'
  | 'create-environments'
  | 'create-labels'
  | 'update-labels'
  | 'create-webhooks'
  | 'create-workflows'
  | 'create-custom-role'
  | 'create-entries'
  | 'update-entries'
  | 'publish-entries'
  | 'delete-entries'
  | 'create-taxonomies'
  | 'create-terms'
  | 'import-taxonomy';

export type ApiOptions = {
  uid?: string;
  url?: string;
  entity: ApiModuleType;
  apiData?: Record<any, any> | any;
  resolve: (value: any) => Promise<void> | void;
  reject: (error: any) => Promise<void> | void;
  additionalInfo?: Record<any, any>;
  includeParamOnCompletion?: boolean;
  serializeData?: (input: ApiOptions) => any;
};

export type EnvType = {
  processName: string;
  totalCount?: number;
  indexerCount?: number;
  currentIndexer?: number;
  apiParams?: ApiOptions;
  concurrencyLimit?: number;
  apiContent: Record<string, any>[];
};

export type CustomPromiseHandlerInput = {
  index: number;
  batchIndex: number;
  element?: Record<string, unknown>;
  apiParams?: ApiOptions;
  isLastRequest: boolean;
};

export type CustomPromiseHandler = (input: CustomPromiseHandlerInput) => Promise<any>;

export default abstract class BaseClass {
  readonly client: Stack;

  public importConfig: ImportConfig;

  public modulesConfig: any;

  constructor({ importConfig, stackAPIClient }: Omit<ModuleClassParams, 'moduleName'>) {
    this.client = stackAPIClient;
    this.importConfig = importConfig;
    this.modulesConfig = importConfig.modules;
  }

  get stack(): Stack {
    return this.client;
  }

  /**
   * @method delay
   * @param {number} ms number
   * @returns {Promise} Promise<void>
   */
  delay(ms: number): Promise<void> {
    /* eslint-disable no-promise-executor-return */
    return new Promise((resolve) => setTimeout(resolve, ms <= 0 ? 0 : ms));
  }

  /**
   * @method makeConcurrentCall
   * @param {Record<string, any>} env EnvType
   * @param {CustomPromiseHandler} promisifyHandler CustomPromiseHandler
   * @param {boolean} logBatchCompletionMsg boolean
   * @returns {Promise} Promise<void>
   */
  makeConcurrentCall(
    env: EnvType,
    promisifyHandler?: CustomPromiseHandler,
    logBatchCompletionMsg = true,
  ): Promise<void> {
    const {
      apiParams,
      apiContent,
      processName,
      indexerCount,
      currentIndexer,
      concurrencyLimit = this.importConfig.modules.apiConcurrency,
    } = env;

    /* eslint-disable no-async-promise-executor */
    return new Promise(async (resolve) => {
      let batchNo = 0;
      let isLastRequest = false;
      const batches: Array<Record<string, any>> = chunk(apiContent, concurrencyLimit);

      /* eslint-disable no-promise-executor-return */
      if (isEmpty(batches)) return resolve();

      for (const [batchIndex, batch] of entries(batches)) {
        batchNo += 1;
        const allPromise = [];
        const start = Date.now();

        for (const [index, element] of entries(batch)) {
          let promise = Promise.resolve();
          isLastRequest = isEqual(last(batch as ArrayLike<any>), element) && isEqual(last(batches), batch);

          if (promisifyHandler instanceof Function) {
            promise = promisifyHandler({
              apiParams,
              isLastRequest,
              element,
              index: Number(index),
              batchIndex: Number(batchIndex),
            });
          } else if (apiParams) {
            apiParams.apiData = element;
            promise = this.makeAPICall(apiParams, isLastRequest);
          }

          allPromise.push(promise);
        }

        /* eslint-disable no-await-in-loop */
        await Promise.allSettled(allPromise);

        /* eslint-disable no-await-in-loop */
        await this.logMsgAndWaitIfRequired(
          processName,
          start,
          batches.length,
          batchNo,
          logBatchCompletionMsg,
          indexerCount,
          currentIndexer,
        );

        if (isLastRequest) resolve();
      }
    });
  }

  /**
   * @method logMsgAndWaitIfRequired
   * @param {string} processName string
   * @param {number} start number
   * @param {number} batchNo - number
   * @returns {Promise} Promise<void>
   */
  async logMsgAndWaitIfRequired(
    processName: string,
    start: number,
    totelBatches: number,
    batchNo: number,
    logBatchCompletionMsg = true,
    indexerCount?: number,
    currentIndexer?: number,
  ): Promise<void> {
    const end = Date.now();
    const exeTime = end - start;

    if (logBatchCompletionMsg) {
      let batchMsg = '';
      // info: Batch No. 20 of import assets is complete
      if (currentIndexer) batchMsg += `Current chunk processing is (${currentIndexer}/${indexerCount})`;

      log(this.importConfig, `Batch No. (${batchNo}/${totelBatches}) of ${processName} is complete`, 'success');
    }

    if (this.importConfig.modules.assets.displayExecutionTime) {
      console.log(
        `Time taken to execute: ${exeTime} milliseconds; wait time: ${
          exeTime < 1000 ? 1000 - exeTime : 0
        } milliseconds`,
      );
    }

    if (exeTime < 1000) await this.delay(1000 - exeTime);
  }

  /**
   * @method makeAPICall
   * @param {Record<string, any>} apiOptions - Api related params
   * @param {Record<string, any>} isLastRequest - Boolean
   * @return {Promise} Promise<void>
   */
  makeAPICall(apiOptions: ApiOptions, isLastRequest = false): Promise<void> {
    if (apiOptions.serializeData instanceof Function) {
      apiOptions = apiOptions.serializeData(apiOptions);
    }

    const { uid, entity, reject, resolve, apiData, additionalInfo = {}, includeParamOnCompletion } = apiOptions;

    const onSuccess = (response: any) =>
      resolve({
        response,
        isLastRequest,
        additionalInfo,
        apiData: includeParamOnCompletion ? apiData : undefined,
      });
    const onReject = (error: Error) =>
      reject({
        error,
        isLastRequest,
        additionalInfo,
        apiData: includeParamOnCompletion ? apiData : undefined,
      });

    if (
      !apiData ||
      (entity === 'publish-entries' && !apiData.entryUid) ||
      (entity === 'update-extensions' && !apiData.uid)
    ) {
      return Promise.resolve();
    }
    switch (entity) {
      case 'create-assets-folder':
        return this.stack
          .asset()
          .folder()
          .create({ asset: pick(apiData, this.modulesConfig.assets.folderValidKeys) as FolderData })
          .then(onSuccess)
          .catch(onReject);
      case 'create-assets':
        return this.stack
          .asset()
          .create(pick(apiData, [...this.modulesConfig.assets.validKeys, 'upload']) as AssetData)
          .then(onSuccess)
          .catch(onReject);
      case 'replace-assets':
        return this.stack
          .asset(uid)
          .replace(pick(apiData, [...this.modulesConfig.assets.validKeys, 'upload']) as AssetData)
          .then(onSuccess)
          .catch(onReject);
      case 'publish-assets':
        return this.stack
          .asset(uid)
          .publish(pick(apiData, ['publishDetails']) as PublishConfig)
          .then(onSuccess)
          .catch(onReject);
      case 'create-extensions':
        return this.stack
          .extension()
          .create({ extension: omit(apiData, ['uid']) as ExtensionData })
          .then(onSuccess)
          .catch(onReject);
      case 'update-extensions':
        return this.stack
          .extension(apiData.uid)
          .fetch()
          .then((extension) => {
            extension.scope = apiData.scope;
            return extension.update();
          })
          .then(onSuccess)
          .catch(onReject);
      case 'create-locale':
        return this.stack
          .locale()
          .create({ locale: pick(apiData, ['name', 'code']) as LocaleData })
          .then(onSuccess)
          .catch(onReject);
      case 'update-locale':
        return this.stack
          .locale(apiData.code)
          .update({ locale: pick(apiData, [...this.modulesConfig.locales.requiredKeys]) as LocaleData })
          .then(onSuccess)
          .catch(onReject);
      case 'create-cts':
        return this.stack.contentType().create(apiData).then(onSuccess).catch(onReject);
      case 'update-cts':
        return apiData.update().then(onSuccess).catch(onReject);
      case 'update-gfs':
        return apiData.update().then(onSuccess).catch(onReject);
      case 'create-environments':
        return this.stack
          .environment()
          .create({ environment: omit(apiData, ['uid']) as EnvironmentData })
          .then(onSuccess)
          .catch(onReject);
      case 'create-labels':
        return this.stack
          .label()
          .create({ label: omit(apiData, ['uid']) as LabelData })
          .then(onSuccess)
          .catch(onReject);
      case 'update-labels':
        return this.stack
          .label(apiData.uid)
          .fetch()
          .then(async (response) => {
            response.parent = apiData.parent;
            await response.update().then(onSuccess).catch(onReject);
          })
          .catch(onReject);
      case 'create-webhooks':
        return this.stack
          .webhook()
          .create({ webhook: omit(apiData, ['uid']) as WebhookData })
          .then(onSuccess)
          .catch(onReject);
      case 'create-workflows':
        return this.stack
          .workflow()
          .create({ workflow: apiData as WorkflowData })
          .then(onSuccess)
          .catch(onReject);
      case 'create-custom-role':
        return this.stack
          .role()
          .create({ role: apiData as RoleData })
          .then(onSuccess)
          .catch(onReject);
      case 'create-entries':
        if (additionalInfo[apiData?.uid]?.isLocalized) {
          return apiData.update({ locale: additionalInfo.locale }).then(onSuccess).catch(onReject);
        }
        return this.stack
          .contentType(additionalInfo.cTUid)
          .entry()
          .create({ entry: apiData }, { locale: additionalInfo.locale })
          .then(onSuccess)
          .catch(onReject);
      case 'update-entries':
        return apiData.update({ locale: additionalInfo.locale }).then(onSuccess).catch(onReject);
      case 'publish-entries':
        return this.stack
          .contentType(additionalInfo.cTUid)
          .entry(apiData.entryUid)
          .publish({
            publishDetails: { environments: apiData.environments, locales: apiData.locales },
            locale: apiData.locales[0],
          })
          .then(onSuccess)
          .catch(onReject);
      case 'delete-entries':
        return this.stack
          .contentType(apiData.cTUid)
          .entry(apiData.entryUid)
          .delete({ locale: additionalInfo.locale })
          .then(onSuccess)
          .catch(onReject);
      case 'create-taxonomies':
        return this.stack.taxonomy().create({ taxonomy: apiData }).then(onSuccess).catch(onReject);
      case 'create-terms':
        return this.stack
          .taxonomy(apiData.taxonomy_uid)
          .terms()
          .create({ term: apiData })
          .then(onSuccess)
          .catch(onReject);
      case 'import-taxonomy':
        if (!apiData || !apiData.filePath) {
          return Promise.resolve();
        }
        return this.stack.taxonomy(uid).import({ taxonomy: apiData.filePath }).then(onSuccess).catch(onReject);
      default:
        return Promise.resolve();
    }
  }
}
