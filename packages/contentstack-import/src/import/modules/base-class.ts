import pick from 'lodash/pick';
import last from 'lodash/last';
import chunk from 'lodash/chunk';
import isEmpty from 'lodash/isEmpty';
import entries from 'lodash/entries';
import isEqual from 'lodash/isEqual';
import { Stack } from '@contentstack/management/types/stack';
import { AssetData } from '@contentstack/management/types/stack/asset';
import { PublishConfig } from '@contentstack/management/types/utility/publish';
import { FolderData } from '@contentstack/management/types/stack/asset/folder';

import { log } from '../../utils';
import { ImportConfig, ModuleClassParams } from '../../types';

export type AdditionalKeys = {
  backupDir: string;
};

export type ApiModuleType = 'create-assets' | 'replace-assets' | 'publish-assets' | 'create-assets-folder';

export type ApiOptions = {
  uid?: string;
  url?: string;
  entity: ApiModuleType;
  apiData?: Record<any, any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
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

      log(
        this.importConfig,
        `Batch No. (${batchNo}/${totelBatches}) of ${processName} is complete. ${batchMsg}`,
        'success',
      );
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

    const { uid, entity, reject, resolve, apiData, additionalInfo, includeParamOnCompletion } = apiOptions;

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
      default:
        return Promise.resolve();
    }
  }
}
