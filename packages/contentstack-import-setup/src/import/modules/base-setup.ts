import { log, fsUtil } from '../../utils';
import { ApiOptions, CustomPromiseHandler, EnvType, ImportConfig, ModuleClassParams } from '../../types';
import { chunk, entries, isEmpty, isEqual, last } from 'lodash';

export default class BaseImportSetup {
  public config: ImportConfig;
  public stackAPIClient: ModuleClassParams['stackAPIClient'];
  public dependencies: ModuleClassParams['dependencies'];

  constructor({ config, stackAPIClient, dependencies }: ModuleClassParams) {
    this.config = config;
    this.stackAPIClient = stackAPIClient;
    this.dependencies = dependencies;
  }

  async setupDependencies() {
    for (const moduleName of Object.keys(this.dependencies)) {
      try {
        const modulePath = `./${moduleName}`;
        const { default: ModuleClass } = await import(modulePath);

        const modulePayload = {
          config: this.config,
          stackAPIClient: this.stackAPIClient,
        };

        const moduleInstance = new ModuleClass(modulePayload);
        await moduleInstance.start();
      } catch (error) {
        log(this.config, `Error importing '${moduleName}': ${error.message}`, 'error');
      }
    }
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
      concurrencyLimit = this.config.fetchConcurrency,
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

      log(this.config, `Batch No. (${batchNo}/${totelBatches}) of ${processName} is complete`, 'success');
    }

    // if (this.config.modules.assets.displayExecutionTime) {
    //   console.log(
    //     `Time taken to execute: ${exeTime} milliseconds; wait time: ${
    //       exeTime < 1000 ? 1000 - exeTime : 0
    //     } milliseconds`,
    //   );
    // }

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

    if (!apiData) {
      return Promise.resolve();
    }
    switch (entity) {
      case 'fetch-assets':
        return this.stackAPIClient
          .asset()
          .query({
            query: {
              $and: [
                { file_size: Number(apiData.file_size) },
                { filename: apiData.filename },
                { title: apiData.title },
              ],
            },
          })
          .find()
          .then(onSuccess)
          .catch(onReject);
      default:
        return Promise.resolve();
    }
  }
}
