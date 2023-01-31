import BaseClass from './base-class';
export default class ExportAssets extends BaseClass {
    private assetsRootPath;
    assetConfig: {
        dirName: string;
        fileName: string;
        batchLimit: number;
        host: string;
        invalidKeys: string[];
        downloadLimit: number;
        chunkFileSize: number;
        fetchConcurrency: number;
        securedAssets: boolean;
        enableNewStructure: boolean;
        displayExecutionTime: boolean;
        enableDownloadStatus: boolean;
        includeVersionedAssets: boolean;
    };
    private assetsFolder;
    private versionedAssets;
    constructor({ exportConfig, stackAPIClient }: {
        exportConfig: any;
        stackAPIClient: any;
    });
    get commonQueryParam(): Record<string, unknown>;
    start(): Promise<void>;
    /**
     * @method getAssetsFolders
     * @param {number} totalCount number
     * @returns Promise<any|void>
     */
    getAssetsFolders(totalCount: number | void): Promise<Promise<void> | void>;
    /**
     * @method getAssets
     * @param totalCount number
     * @returns Promise<void>
     */
    getAssets(totalCount: number | void): Promise<any | void>;
    /**
     * @method getVersionedAssets
     * @returns Promise<any|void>
     */
    getVersionedAssets(): Promise<any | void>;
    /**
     * @method getAssetsCount
     * @param isDir boolean
     * @returns Promise<number|undefined>
     */
    getAssetsCount(isDir?: boolean): Promise<number | void>;
    /**
     * @method downloadAssets
     * @returns Promise<any|void>
     */
    downloadAssets(): Promise<any | void>;
}
