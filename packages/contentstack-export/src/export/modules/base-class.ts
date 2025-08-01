import map from 'lodash/map';
import fill from 'lodash/fill';
import last from 'lodash/last';
import chunk from 'lodash/chunk';
import isEmpty from 'lodash/isEmpty';
import entries from 'lodash/entries';
import isEqual from 'lodash/isEqual';
import { log, CLIProgressManager, configHandler } from '@contentstack/cli-utilities';

import { ExportConfig, ModuleClassParams } from '../../types';

export type ApiOptions = {
  uid?: string;
  url?: string;
  module: ApiModuleType;
  queryParam?: Record<any, any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  additionalInfo?: Record<any, any>;
};

export type EnvType = {
  module: string;
  totalCount: number;
  apiBatches?: number[];
  concurrencyLimit: number;
  apiParams?: ApiOptions;
};

export type CustomPromiseHandlerInput = {
  index: number;
  batchIndex: number;
  element?: Record<string, any>;
  apiParams?: ApiOptions;
  isLastRequest: boolean;
};

export type CustomPromiseHandler = (input: CustomPromiseHandlerInput) => Promise<any>;

export type ApiModuleType =
  | 'stack'
  | 'asset'
  | 'assets'
  | 'entry'
  | 'entries'
  | 'content-type'
  | 'content-types'
  | 'stacks'
  | 'versioned-entries'
  | 'download-asset'
  | 'export-taxonomy';

export default abstract class BaseClass {
  readonly client: any;
  public exportConfig: ExportConfig;
  protected progressManager: CLIProgressManager | null = null;
  protected currentModuleName: string = '';

  constructor({ exportConfig, stackAPIClient }: Omit<ModuleClassParams, 'moduleName'>) {
    this.client = stackAPIClient;
    this.exportConfig = exportConfig;
  }

  static printFinalSummary(): void {
    CLIProgressManager.printGlobalSummary();
  }

  /**
   * Create simple progress manager 
   */
  protected createSimpleProgress(moduleName: string, total?: number): CLIProgressManager {
    this.currentModuleName = moduleName;
    const logConfig = configHandler.get('log') || {};
    const showConsoleLogs = logConfig.showConsoleLogs ?? false; // Default to true for better UX
    this.progressManager = CLIProgressManager.createSimple(moduleName, total, showConsoleLogs);
    return this.progressManager;
  }

  /**
   * Create nested progress manager
   */
  protected createNestedProgress(moduleName: string): CLIProgressManager {
    this.currentModuleName = moduleName;
    const logConfig = configHandler.get('log') || {};
    const showConsoleLogs = logConfig.showConsoleLogs ?? false; // Default to true for better UX
    this.progressManager = CLIProgressManager.createNested(moduleName, showConsoleLogs);
    return this.progressManager;
  }

  /**
   * Complete progress manager
   */
  protected completeProgress(success: boolean = true, error?: string): void {
    this.progressManager?.complete(success, error);
    this.progressManager = null;
  }

  protected async withLoadingSpinner<T>(message: string, action: () => Promise<T>): Promise<T> {
    const logConfig = configHandler.get('log') || {};
    const showConsoleLogs = logConfig.showConsoleLogs ?? false;

    if (showConsoleLogs) {
      // If console logs are enabled, don't show spinner, just execute the action
      return await action();
    }
    return await CLIProgressManager.withLoadingSpinner(message, action);
  }

  get stack(): any {
    return this.client;
  }

  delay(ms: number): Promise<void> {
    /* eslint-disable no-promise-executor-return */
    return new Promise((resolve) => setTimeout(resolve, ms <= 0 ? 0 : ms));
  }

  makeConcurrentCall(env: EnvType, promisifyHandler?: CustomPromiseHandler): Promise<void> {
    const { module, apiBatches, totalCount, apiParams, concurrencyLimit } = env;

    /* eslint-disable no-async-promise-executor */
    return new Promise(async (resolve) => {
      let batchNo = 0;
      let isLastRequest = false;
      const batch = fill(Array.from({ length: Number.parseInt(String(totalCount / 100), 10) }), 100);

      if (totalCount % 100) batch.push(100);

      const batches: Array<number | any> =
        apiBatches ||
        chunk(
          map(batch, (skip: number, i: number) => skip * i),
          concurrencyLimit,
        );

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
              element,
              isLastRequest,
              index: Number(index),
              batchIndex: Number(batchIndex),
            });
          } else if (apiParams?.queryParam) {
            apiParams.queryParam.skip = element;
            promise = this.makeAPICall(apiParams, isLastRequest);
          }

          allPromise.push(promise);
        }

        /* eslint-disable no-await-in-loop */
        await Promise.allSettled(allPromise);
        /* eslint-disable no-await-in-loop */
        await this.logMsgAndWaitIfRequired(module, start, batchNo);

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
  async logMsgAndWaitIfRequired(module: string, start: number, batchNo: number): Promise<void> {
    const end = Date.now();
    const exeTime = end - start;
    log.success(
      `Batch No. ${batchNo} of ${module} is complete. Time taken: ${exeTime} milliseconds`,
      this.exportConfig.context,
    );

    if (this.exportConfig.modules.assets.displayExecutionTime) {
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
  makeAPICall(
    { module: moduleName, reject, resolve, url = '', uid = '', additionalInfo, queryParam = {} }: ApiOptions,
    isLastRequest = false,
  ): Promise<any> {
    switch (moduleName) {
      case 'asset':
        return this.stack
          .asset(uid)
          .fetch(queryParam)
          .then((response: any) => resolve({ response, isLastRequest, additionalInfo }))
          .catch((error: Error) => reject({ error, isLastRequest, additionalInfo }));
      case 'assets':
        return this.stack
          .asset()
          .query(queryParam)
          .find()
          .then((response: any) => resolve({ response, isLastRequest, additionalInfo }))
          .catch((error: Error) => reject({ error, isLastRequest, additionalInfo }));
      case 'download-asset':
        return this.stack
          .asset()
          .download({ url, responseType: 'stream' })
          .then((response: any) => resolve({ response, isLastRequest, additionalInfo }))
          .catch((error: any) => reject({ error, isLastRequest, additionalInfo }));
      case 'export-taxonomy':
        return this.stack
          .taxonomy(uid)
          .export()
          .then((response: any) => resolve({ response, uid }))
          .catch((error: any) => reject({ error, uid }));
      default:
        return Promise.resolve();
    }
  }

  protected applyQueryFilters(requestObject: any, moduleName: string): any {
    if (this.exportConfig.query?.modules?.[moduleName]) {
      const moduleQuery = this.exportConfig.query.modules[moduleName];
      // Merge the query parameters with existing requestObject
      if (moduleQuery) {
        if (!requestObject.query) {
          requestObject.query = moduleQuery;
        }
        Object.assign(requestObject.query, moduleQuery);
      }
    }
    return requestObject;
  }
}
