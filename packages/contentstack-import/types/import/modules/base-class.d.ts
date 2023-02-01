import { Stack } from '@contentstack/management/types/stack';
import configType from '../../../types/config';
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
    importConfig: typeof configType & AdditionalKeys;
    modulesConfig: typeof configType.modules;
    constructor({ importConfig, stackAPIClient }: {
        importConfig: any;
        stackAPIClient: any;
    });
    get stack(): Stack;
    /**
     * @method delay
     * @param {number} ms number
     * @returns {Promise} Promise<void>
     */
    delay(ms: number): Promise<void>;
    /**
     * @method makeConcurrentCall
     * @param {Record<string, any>} env EnvType
     * @param {CustomPromiseHandler} promisifyHandler CustomPromiseHandler
     * @param {boolean} logBatchCompletionMsg boolean
     * @returns {Promise} Promise<void>
     */
    makeConcurrentCall(env: EnvType, promisifyHandler?: CustomPromiseHandler, logBatchCompletionMsg?: boolean): Promise<void>;
    /**
     * @method logMsgAndWaitIfRequired
     * @param {string} processName string
     * @param {number} start number
     * @param {number} batchNo - number
     * @returns {Promise} Promise<void>
     */
    logMsgAndWaitIfRequired(processName: string, start: number, totelBatches: number, batchNo: number, logBatchCompletionMsg?: boolean, indexerCount?: number, currentIndexer?: number): Promise<void>;
    /**
     * @method makeAPICall
     * @param {Record<string, any>} apiOptions - Api related params
     * @param {Record<string, any>} isLastRequest - Boolean
     * @return {Promise} Promise<void>
     */
    makeAPICall(apiOptions: ApiOptions, isLastRequest?: boolean): Promise<void>;
}
