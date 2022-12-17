import map from "lodash/map";
import fill from "lodash/fill";
import last from "lodash/last";
import chunk from "lodash/chunk";
import entries from "lodash/entries";
import isEqual from "lodash/isEqual";
import { Command, Flags, Interfaces } from "@oclif/core";
import { addlogs as log } from "@/old-scripts/lib/util/log";
import { Stack } from "@contentstack/management/types/stack";
import { ContentstackClient } from "@contentstack/management";
import { Client } from "@/old-scripts/lib/util/contentstack-management-sdk";

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
  apiParams?: ApiOptions;
  isLastRequest: boolean;
};

export type CustomPromiseHandler = (
  input: CustomPromiseHandlerInput
) => Promise<any>;

export type ApiModuleType =
  | "stack"
  | "asset"
  | "assets"
  | "entry"
  | "entries"
  | "content-type"
  | "content-types"
  | "stacks"
  | "download-asset";

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<
  typeof BaseClass["globalFlags"] & T["flags"]
>;

export default abstract class BaseClass extends Command {
  public exportConfig = require("@/config/default");

  get client(): ContentstackClient {
    return Client(this.exportConfig);
  }

  get stack(): Stack {
    return this.client.stack({
      api_key: this.exportConfig.source_stack,
      management_token: this.exportConfig.management_token,
    });
  }

  delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms <= 0 ? 0 : ms));
  }

  makeConcurrentCall(
    env: EnvType,
    promisifyHandler?: CustomPromiseHandler
  ): Promise<void> {
    const { module, apiBatches, totalCount, apiParams, concurrencyLimit } = env;

    return new Promise(async (resolve) => {
      let batchNo = 0;
      let isLastRequest = false;
      const batch = fill(new Array(parseInt("" + totalCount / 100)), 100);

      if (totalCount % 100) batch.push(100);

      const batches: Array<number | any> =
        apiBatches ||
        chunk(
          map(batch, (skip: number, i: number) => skip * i),
          concurrencyLimit
        );

      for (const [batchIndex, batch] of entries(batches)) {
        batchNo += 1;
        const allPromise = [];
        const start = +new Date();

        for (const [index, element] of entries(batch)) {
          let promise;
          isLastRequest =
            isEqual(last(batch), element) && isEqual(last(batches), batch);

          if (promisifyHandler instanceof Function) {
            promise = promisifyHandler({
              apiParams,
              index: +index,
              isLastRequest,
              batchIndex: +batchIndex,
            });
          } else if (apiParams?.queryParam) {
            apiParams.queryParam.skip = element;
            promise = this.makeAPICall(apiParams, isLastRequest);
          }

          allPromise.push(promise);
        }

        await Promise.allSettled(allPromise);
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
   */
  async logMsgAndWaitIfRequired(
    module: string,
    start: number,
    batchNo: number
  ) {
    const end = +new Date();
    const exeTime = end - start;
    log(
      this.config,
      `Batch No. ${batchNo} of ${module} is complete.`,
      "success"
    );

    if (this.exportConfig.modules.assets.displayExecutionTime) {
      console.log(
        `Time taken to execute: ${exeTime} milliseconds; wait time: ${
          exeTime < 1000 ? 1000 - exeTime : 0
        } milliseconds`
      );
    }

    if (exeTime < 1000) await this.delay(1000 - exeTime);
  }

  /**
   * @method makeAPICall
   * @param {Record<string, any>} options - Api related params
   * @param {Record<string, any>} param - Promise resolve and reject methods
   */
  makeAPICall(
    {
      module,
      reject,
      resolve,
      url = "",
      uid = "",
      additionalInfo,
      queryParam = {},
    }: ApiOptions,
    isLastRequest: boolean = false
  ) {
    switch (module) {
      case "asset":
        return this.stack
          .asset(uid)
          .fetch(queryParam)
          .then((response) =>
            resolve({ response, isLastRequest, additionalInfo })
          )
          .catch((error) => reject({ error, isLastRequest, additionalInfo }));
      case "assets":
        return this.stack
          .asset()
          .query(queryParam)
          .find()
          .then((response) =>
            resolve({ response, isLastRequest, additionalInfo })
          )
          .catch((error) => reject({ error, isLastRequest, additionalInfo }));
      case "download-asset":
        return this.stack
          .asset()
          .download({ url, responseType: "stream" })
          .then((response: any) =>
            resolve({ response, isLastRequest, additionalInfo })
          )
          .catch((error: any) =>
            reject({ error, isLastRequest, additionalInfo })
          );
      default:
        return Promise.resolve();
    }
  }
}
