/// <reference types="node" />
import { Chunk, PageInfo, WriteFileOptions, FsConstructorOptions } from './types';
export default class FsUtility {
    private prefixKey;
    private basePath;
    private fileExt;
    private moduleName;
    private currentFileName;
    private keepMetadata;
    private indexFileName;
    private chunkFileSize;
    private omitKeys;
    private defaultInitContent;
    private metaPickKeys;
    private currentFileRelativePath;
    private writableStream;
    private metaData;
    private readIndexer;
    private writeIndexer;
    private metaHandler;
    pageInfo: PageInfo;
    constructor(options?: FsConstructorOptions);
    get isIndexFileExist(): boolean;
    get currentPageDetails(): PageInfo;
    get indexFileContent(): Record<string, any>;
    /**
     * @method readFile
     * @param filePath string
     * @param parse boolean | undefined
     * @returns string | undefined
     */
    readFile(filePath: string, parse: boolean | undefined): string | undefined;
    /**
     * @method writeFile
     * @param filePath string
     * @param data Object | undefined
     * @return void
     */
    writeFile(filePath: string, data: Chunk, mapKeyVal?: boolean): void;
    /**
     * @method makeDirectory
     * @param path string
     * @return Promise<string | undefined>
     */
    makeDirectory(path: string): Promise<string | undefined>;
    /**
     * @method readdir
     * @param dirPath string | Buffer | URL
     * @returns [string]
     */
    readdir(dirPath: string | Buffer | URL): string[] | [];
    /**
     * @method createFolderIfNotExist
     * @param path string
     * @return {void}
     */
    createFolderIfNotExist(path: string): void;
    /**
     * @method writeIntoFile
     * @param {String|Object|Array} chunk Record<string, string>[]
     * @param {WriteFileOptions} options WriteFileOptions
     * @return void
     */
    writeIntoFile(chunk: Record<string, string>[], options?: WriteFileOptions): void;
    /**
     * @method createNewFile
     * @return {void}
     * @description creating new chunk file
     */
    private createNewFile;
    /**
     * @method writeIntoExistingFile
     * @param chunk Record<string, string>[] | object | Array<any> | string;
     * @param options WriteFileOptions
     * @returns void
     */
    private writeIntoExistingFile;
    /**
     * @method handleKeyValMapAndMetaData
     * @param chunk Chunk
     * @param keyName string
     * @returns Chunk
     */
    handleKeyValMapAndMetaData(chunk: Chunk, keyName?: string | string[] | undefined): Chunk;
    /**
     * @method completeFile
     * @param closeIndexer boolean
     * @return {void}
     * @description writing chunks into existing file
     */
    completeFile(closeIndexer?: boolean): void;
    /**
     * @method closeFile
     * @param closeIndexer boolean
     * @return {void}
     * @description closing current write stream
     */
    private closeFile;
    saveMeta(meta: Chunk): void;
    getPlainMeta(basePath?: string): Record<string, unknown>;
    /**
     * @method readChunkFiles
     * @returns Object
     */
    readChunkFiles(): Record<string, unknown>;
    /**
     * @method getFileByIndex
     * @param _self FsUtility
     * @param index number
     * @returns Promise<string>
     */
    protected getFileByIndex(_self?: FsUtility, index?: number): Promise<Record<string, unknown>>;
    /**
     * @method next
     * @param _self FsUtility
     * @returns Promise<string>
     */
    next(_self?: FsUtility): Promise<Record<string, unknown>>;
    /**
     * @method previous
     * @param _self FsUtility
     * @returns Promise<string>
     */
    protected previous(_self?: FsUtility): Promise<Record<string, unknown> | Error>;
    /**
     * @method updatePageInfo
     * @param _self FsUtility
     * @param isNext boolean
     * @param index number
     * @returns void
     */
    updatePageInfo(_self?: FsUtility, isNext?: boolean | null, index?: number | null): void;
    removeFile(path: string): void;
}
export declare function getDirectories(source: string): string[] | [];
export declare function getFileList(dirName: string, onlyName?: boolean): Promise<string[] | []>;
