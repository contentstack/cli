import { PageInfo, WriteFileOptions, FsConstructorOptions } from './types';
export default class FsUtility {
    private basePath;
    private fileExt;
    private moduleName;
    private indexFileName;
    private chunkFileSize;
    private omitKeys;
    private currentFileName;
    private defaultInitContent;
    private writableStream;
    private currentFileRelativePath;
    private readIndexer;
    private writeIndexer;
    pageInfo: PageInfo;
    constructor(options?: FsConstructorOptions);
    get currentPageDetails(): PageInfo;
    /**
     * @method createFolderIfNotExist
     * @return {void}
     */
    createFolderIfNotExist(path: any): void;
    /**
     * @method writeIntoFile
     * @param {String|Object|Array} chunk
     * @param {WriteFileOptions} options
     */
    writeIntoFile(chunk: any, options?: WriteFileOptions): void;
    /**
     * @method createNewFile
     * @return {void}
     * @description creating new chunk file
     */
    createNewFile(): void;
    /**
     * @method writeIntoExistingFile
     * @return {void}
     * @description writing chunks into existing file
     */
    writeIntoExistingFile(chunk: any, options?: WriteFileOptions): void;
    /**
     * @method writeIntoExistingFile
     * @return {void}
     * @description writing chunks into existing file
     */
    onErrorCompleteFile(): void;
    /**
     * @method closeFile
     * @return {void}
     * @description closing current write stream
     */
    closeFile(closeIndexer?: boolean): void;
    readFile(): {
        next: () => Promise<string>;
        previous: () => Promise<string>;
        get: (index?: number) => Promise<string>;
    };
    getFileByIndex(index?: number): Promise<string>;
    next(): Promise<string>;
    previous(): Promise<string>;
    updatePageInfo(isNext?: boolean, index?: number): void;
}
