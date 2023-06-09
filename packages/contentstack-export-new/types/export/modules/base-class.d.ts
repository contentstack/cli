import { Stack } from '@contentstack/management/types/stack';
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
export type CustomPromiseHandler = (input: CustomPromiseHandlerInput) => Promise<any>;
export type ApiModuleType = 'stack' | 'asset' | 'assets' | 'entry' | 'entries' | 'content-type' | 'content-types' | 'stacks' | 'download-asset';
export default abstract class BaseClass {
    readonly client: Stack;
    exportConfig: Record<string, any>;
    constructor({ exportConfig, stackAPIClient }: {
        exportConfig: any;
        stackAPIClient: any;
    });
    get stack(): Stack;
    delay(ms: number): Promise<void>;
    makeConcurrentCall(env: EnvType, promisifyHandler?: CustomPromiseHandler): Promise<void>;
    /**
     * @method logMsgAndWaitIfRequired
     * @param module string
     * @param start number
     * @param batchNo number
     * @returns Promise<void>
     */
    logMsgAndWaitIfRequired(module: string, start: number, batchNo: number): Promise<void>;
    /**
     * @method makeAPICall
     * @param {Record<string, any>} options - Api related params
     * @param {Record<string, any>} isLastRequest - Boolean
     * @returns Promise<any>
     */
    makeAPICall({ module: moduleName, reject, resolve, url, uid, additionalInfo, queryParam }: ApiOptions, isLastRequest?: boolean): Promise<any>;
}
