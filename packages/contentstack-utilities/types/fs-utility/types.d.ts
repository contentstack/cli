declare enum FileType {
    json = "json",
    text = "txt"
}
declare type WriteFileOptions = {
    keyName?: string;
    closeFile?: boolean;
    mapKeyVal?: boolean;
    closeIndexer?: boolean;
};
declare type FsConstructorOptions = {
    basePath: string;
    fileExt?: FileType;
    moduleName?: string;
    indexFileName?: string;
    chunkFileSize?: number;
    omitKeys?: Array<string>;
    defaultInitContent?: string;
};
export { FileType, WriteFileOptions, FsConstructorOptions };
