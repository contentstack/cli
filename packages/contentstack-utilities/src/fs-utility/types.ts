type FileType = 'json' | 'txt';

type Chunk = Record<string, unknown>[] | Record<string, unknown> | Array<unknown> | string;

type PageInfo = {
  after: number;
  before: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  pageInfoUpdated?: boolean;
};

type WriteFileOptions = {
  keyName?: string | string[];
  closeFile?: boolean;
  mapKeyVal?: boolean;
  closeIndexer?: boolean;
};

type FsConstructorOptions = {
  createDirIfNotExist?: boolean;
  /**
   * basePath is used to pass base paths of an content to be written to
   *
   * Example: ```./contents/data```
   */
  basePath?: string;
  /**
   * chunk file extension
   *
   * Ex: ```fileExt: 'json' | 'txt'```
   */
  fileExt?: FileType;
  /**
   * Name of the module data which is going to be written to drive
   *
   * Ex: ```moduleName: 'assets' | 'entries' | 'content-type'```
   */
  moduleName?: string;
  /**
   * Name of the index manager file name. Which will have all chunk file details
   *
   * ```defaultValue: index.json```
   *
   * Ex: ```indexFileName: 'assets.json' | 'index.json'```
   */
  indexFileName?: string;
  /**
   * Chunk file size in megabytes
   *
   * ```chunkFileSize: 5``` => 5Mb
   */
  chunkFileSize?: number;
  omitKeys?: Array<string>;
  /**
   * on initialization if any content needs to be put in the file which can be passed through this key
   *
   * Ex: ```defaultInitContent: '{ title: "test" }'```
   */
  defaultInitContent?: string;
  /**
   * metaPickKeys is to pik list of key to keep like an index key of entity
   *
   * Ex. ```['title'] | handler: () => {}```
   *
   * Result will be in metadata file: ```{ title: ['title1', 'title2'], versionedAssets: [{ 89987iu89434: 4 }] }```
   */
  metaPickKeys?: Array<string>;

  keepMetadata?: boolean;

  useIndexer?: boolean;

  metaHandler?: (array: any) => any;
};

type ChunkFilesGetterType = Promise<Record<string, unknown> | Record<string, unknown>[] | Error>;

export { Chunk, FileType, PageInfo, WriteFileOptions, FsConstructorOptions, ChunkFilesGetterType };
