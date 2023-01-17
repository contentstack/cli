import map from 'lodash/map';
import pick from 'lodash/pick';
import fill from 'lodash/fill';
import last from 'lodash/last';
import chunk from 'lodash/chunk';
import isEmpty from 'lodash/isEmpty';
import entries from 'lodash/entries';
import isEqual from 'lodash/isEqual';
import { Stack } from '@contentstack/management/types/stack';

import { log } from '../../utils';

export type ApiOptions = {
  uid?: string;
  url?: string;
  entity: ApiModuleType;
  queryParam?: Record<any, any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  additionalInfo?: Record<any, any>;
  serialiseData?: (input: any) => any;
  includeParamOnCompletion?: boolean;
};

export type EnvType = {
  processName: string;
  totalCount?: number;
  apiContent: Record<string, any>[];
  concurrencyLimit?: number;
  apiParams?: ApiOptions;
};

export type CustomPromiseHandlerInput = {
  index: number;
  batchIndex: number;
  apiParams?: ApiOptions;
  isLastRequest: boolean;
};

export type CustomPromiseHandler = (input: CustomPromiseHandlerInput) => Promise<any>;

export type ApiModuleType = 'create-assets' | 'create-assets-folder';

export default abstract class BaseClass {
  readonly client: Stack;
  public importConfig: Record<string, any>;

  constructor({ importConfig, stackAPIClient }) {
    this.client = stackAPIClient;
    this.importConfig = importConfig;
  }

  get stack(): Stack {
    return this.client;
  }

  delay(ms: number): Promise<void> {
    /* eslint-disable no-promise-executor-return */
    return new Promise((resolve) => setTimeout(resolve, ms <= 0 ? 0 : ms));
  }

  makeConcurrentCall(
    env: EnvType,
    promisifyHandler?: CustomPromiseHandler,
    logBatchCompletionMsg: boolean = true,
  ): Promise<void> {
    const { processName, apiContent, apiParams, concurrencyLimit } = env;

    /* eslint-disable no-async-promise-executor */
    return new Promise(async (resolve) => {
      let batchNo = 0;
      let isLastRequest = false;
      const batches: Array<number | any> = chunk(apiContent, concurrencyLimit);

      /* eslint-disable no-promise-executor-return */
      if (isEmpty(batches)) return resolve();

      for (const [batchIndex, batch] of entries(batches)) {
        batchNo += 1;
        const allPromise = [];
        const start = Date.now();

        for (const [index, element] of entries(batch)) {
          let promise;
          isLastRequest = isEqual(last(batch), element) && isEqual(last(batches), batch);

          if (promisifyHandler instanceof Function) {
            promise = promisifyHandler({
              apiParams,
              isLastRequest,
              index: Number(index),
              batchIndex: Number(batchIndex),
            });
          } else if (apiParams) {
            apiParams.queryParam = element;
            promise = this.makeAPICall(apiParams, isLastRequest);
          }

          allPromise.push(promise);
        }

        /* eslint-disable no-await-in-loop */
        await Promise.allSettled(allPromise);

        if (logBatchCompletionMsg) {
          /* eslint-disable no-await-in-loop */
          await this.logMsgAndWaitIfRequired(processName, start, batchNo);
        }

        if (isLastRequest) resolve();
      }
    });
  }

  /**
   * @method logMsgAndWaitIfRequired
   * @param module string
   * @param start number
   * @param batchNo number
   * @returns Promise<void>
   */
  async logMsgAndWaitIfRequired(processName: string, start: number, batchNo: number): Promise<void> {
    const end = Date.now();
    const exeTime = end - start;
    log(this.importConfig, `Batch No. ${batchNo} of ${processName} is complete.`, 'success');

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
   * @param {Record<string, any>} options - Api related params
   * @param {Record<string, any>} isLastRequest - Boolean
   * @returns Promise<any>
   */
  makeAPICall(apiOptions: ApiOptions, isLastRequest = false): Promise<any> {
    let { entity, reject, resolve, queryParam, serialiseData, additionalInfo, includeParamOnCompletion } = apiOptions;
    if (serialiseData instanceof Function) queryParam = serialiseData(queryParam);

    switch (entity) {
      case 'create-assets-folder':
        const folder: any = { asset: pick(queryParam, ['name', 'parent_uid']) };
        return this.stack
          .asset()
          .folder()
          .create(folder)
          .then((response) =>
            resolve({
              response,
              isLastRequest,
              additionalInfo,
              queryParam: includeParamOnCompletion ? queryParam : undefined,
            }),
          )
          .catch((error) =>
            reject({
              error,
              isLastRequest,
              additionalInfo,
              queryParam: includeParamOnCompletion ? queryParam : undefined,
            }),
          );
      default:
        return Promise.resolve();
    }
  }
}
