import { WriteFileOptions, FsConstructorOptions } from './types';
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
    private indexer;
    constructor(options?: FsConstructorOptions);
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
}
