import BaseClass, { ApiOptions } from './base-class';
export default class ImportAssets extends BaseClass {
    private fs;
    private assetsPath;
    private mapperDirPath;
    private assetsRootPath;
    private assetUidMapperPath;
    private assetUrlMapperPath;
    private assetFolderUidMapperPath;
    assetConfig: {
        dirName: string;
        assetBatchLimit: number;
        publishAssets: boolean;
        fileName: string;
        importSameStructure: boolean;
        uploadAssetsConcurrency: number;
        displayExecutionTime: boolean;
        importFoldersConcurrency: number;
        includeVersionedAssets: boolean;
        host: string;
        folderValidKeys: string[];
        validKeys: string[];
    };
    private environments;
    private assetsUidMap;
    private assetsUrlMap;
    private assetsFolderMap;
    constructor({ importConfig, stackAPIClient }: {
        importConfig: any;
        stackAPIClient: any;
    });
    /**
     * @method start
     * @returns {Promise<void>} Promise<any>
     */
    start(): Promise<void>;
    /**
     * @method importFolders
     * @returns {Promise<any>} Promise<any>
     */
    importFolders(): Promise<any>;
    /**
     * @method importAssets
     * @param {boolean} isVersion boolean
     * @returns {Promise<void>} Promise<void>
     */
    importAssets(isVersion?: boolean): Promise<void>;
    /**
     * @method serializeAssets
     * @param {ApiOptions} apiOptions ApiOptions
     * @returns {ApiOptions} ApiOptions
     */
    serializeAssets(apiOptions: ApiOptions): ApiOptions;
    /**
     * @method publish
     * @returns {Promise<void>} Promise<void>
     */
    publish(): Promise<void>;
    /**
     * @method constructFolderImportOrder
     * @param {Record<string, any>[]} folders object
     * @returns {Array<Record<string, any>>} Array<Record<string, any>>
     */
    constructFolderImportOrder(folders: any): Array<Record<string, any>>;
}
