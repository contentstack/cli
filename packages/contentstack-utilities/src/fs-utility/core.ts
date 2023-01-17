import mkdirp from 'mkdirp';
import keys from 'lodash/keys';
import { resolve as pResolve } from 'node:path';
import { v4 as uidV4 } from 'uuid';
import isEmpty from 'lodash/isEmpty';
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
  WriteStream,
} from 'node:fs';

import { getMetaData, mapKeyAndVal } from './helper';
import { Chunk, PageInfo, FileType, WriteFileOptions, FsConstructorOptions } from './types';

export default class FsUtility {
  private prefixKey = '';
  private basePath: string;
  private fileExt: FileType;
  private moduleName: string;
  private currentFileName = '';
  private keepMetadata = false;
  private indexFileName: string;
  private chunkFileSize: number;
  private omitKeys: Array<string>;
  private defaultInitContent: string;
  private metaPickKeys: Array<string>;
  private currentFileRelativePath: string;
  private writableStream: WriteStream | null;
  private metaData: Record<string, any> = {};
  private readIndexer: Record<string, string> = {};
  private writeIndexer: Record<string, string> = {};
  private metaHandler: ((array: any) => any) | undefined;

  public pageInfo: PageInfo = {
    after: 0,
    before: 0,
    hasNextPage: false,
    hasPreviousPage: false,
    pageInfoUpdated: false,
  };

  constructor(options: FsConstructorOptions = {}) {
    const {
      fileExt,
      omitKeys,
      basePath,
      moduleName,
      metaHandler,
      keepMetadata,
      metaPickKeys,
      chunkFileSize,
      indexFileName,
      defaultInitContent,
      createDirIfNotExist = true,
    } = options;
    this.metaHandler = metaHandler;
    this.basePath = basePath || '';
    this.omitKeys = omitKeys || [];
    this.fileExt = fileExt || 'json';
    this.metaPickKeys = metaPickKeys || [];
    this.moduleName = moduleName || 'chunk';
    this.chunkFileSize = chunkFileSize || 10;
    this.keepMetadata = keepMetadata || (keepMetadata === undefined ?? true);
    this.indexFileName = indexFileName || 'index.json';
    this.pageInfo.hasNextPage = keys(this.indexFileContent).length > 0;
    this.defaultInitContent = defaultInitContent || (this.fileExt === 'json' ? '{' : '');

    if (createDirIfNotExist) {
      this.createFolderIfNotExist(this.basePath);
    }
  }

  get isIndexFileExist(): boolean {
    return existsSync(`${this.basePath}/${this.indexFileName}`);
  }

  get currentPageDetails(): PageInfo {
    return this.pageInfo;
  }

  get indexFileContent(): Record<string, any> {
    let indexData = {};
    const indexPath = `${this.basePath}/${this.indexFileName}`;

    if (existsSync(indexPath)) {
      indexData = JSON.parse(readFileSync(indexPath, 'utf-8'));
    }

    return indexData;
  }

  // STUB old utility methods
  /**
   * @method readFile
   * @param filePath string
   * @param parse boolean | undefined
   * @returns string | undefined
   */
  readFile(filePath: string, parse: boolean | undefined): string | undefined {
    let data;
    filePath = pResolve(filePath);
    parse = typeof parse === 'undefined' ? true : parse;

    if (existsSync(filePath)) {
      data = parse ? JSON.parse(readFileSync(filePath, 'utf-8')) : data;
    }

    return data;
  }

  /**
   * @method writeFile
   * @param filePath string
   * @param data Object | undefined
   * @return void
   */
  writeFile(filePath: string, data: Chunk, mapKeyVal: boolean = false): void {
    if (mapKeyVal) {
      data = mapKeyAndVal(data as Record<string, any>[], 'uid', this.omitKeys); // NOTE Map values as Key/value pair object
    }

    data = typeof data === 'object' ? JSON.stringify(data) : data || '{}';
    writeFileSync(filePath, data);
  }

  /**
   * @method makeDirectory
   * @param path string
   * @return Promise<string | undefined>
   */
  makeDirectory(path: string): Promise<string | undefined> {
    return mkdirp(path);
  }

  /**
   * @method readdir
   * @param dirPath string | Buffer | URL
   * @returns [string]
   */
  readdir(dirPath: string | Buffer | URL): string[] | [] {
    return existsSync(dirPath) ? readdirSync(dirPath) : [];
  }
  // STUB End of old utility

  /**
   * @method createFolderIfNotExist
   * @param path string
   * @return {void}
   */
  createFolderIfNotExist(path: string): void {
    if (path && !existsSync(path)) {
      mkdirSync(path, { recursive: true });
    }
  }

  /**
   * @method writeIntoFile
   * @param {String|Object|Array} chunk Record<string, string>[]
   * @param {WriteFileOptions} options WriteFileOptions
   * @return void
   */
  writeIntoFile(chunk: Record<string, string>[], options?: WriteFileOptions): void {
    if (!this.writableStream) {
      this.createNewFile();
    }

    this.writeIntoExistingFile(chunk, options);
  }

  /**
   * @method createNewFile
   * @return {void}
   * @description creating new chunk file
   */
  private createNewFile(): void {
    const fileName = `${uidV4()}-${this.moduleName || 'chunk'}.${this.fileExt}`;
    this.currentFileName = fileName;
    this.writeIndexer[keys(this.writeIndexer).length + 1] = fileName;
    this.currentFileRelativePath = `${this.basePath}/${fileName}`;
    writeFileSync(this.currentFileRelativePath, this.defaultInitContent);
    this.writableStream = createWriteStream(this.currentFileRelativePath, {
      flags: 'a',
    });
  }

  /**
   * @method writeIntoExistingFile
   * @param chunk Record<string, string>[] | object | Array<any> | string;
   * @param options WriteFileOptions
   * @returns void
   */
  private writeIntoExistingFile(chunk: Chunk, options?: WriteFileOptions): void {
    let fileContent: Chunk = chunk;
    let fileSizeReachedLimit = false;
    const { keyName, mapKeyVal } = options || {
      keyName: 'uid',
      mapKeyVal: false,
    };

    if (mapKeyVal) {
      fileContent = this.handleKeyValMapAndMetaData(chunk, keyName); // NOTE Map values as Key/value pair object
    }

    if (typeof fileContent === 'object') {
      fileContent = JSON.stringify(fileContent).slice(1, -1);
    }

    const { size } = statSync(this.currentFileRelativePath);

    if (options?.closeFile === true || size / (1024 * 1024) >= this.chunkFileSize) {
      // NOTE Each chunk file size Ex. 5 (MB)
      fileSizeReachedLimit = true;
    }

    const suffix = fileSizeReachedLimit ? '}' : '';
    fileContent = this.fileExt === 'json' ? `${this.prefixKey}${fileContent}${suffix}` : fileContent;
    this.writableStream?.write(fileContent);

    if (!this.prefixKey) this.prefixKey = ',';
    if (fileSizeReachedLimit) {
      this.closeFile(options?.closeFile === true);
    }
  }

  /**
   * @method handleKeyValMapAndMetaData
   * @param chunk Chunk
   * @param keyName string
   * @returns Chunk
   */
  handleKeyValMapAndMetaData(chunk: Chunk, keyName?: string | string[] | undefined): Chunk {
    const fileContent = mapKeyAndVal(chunk as Record<string, any>[], keyName || 'uid', this.omitKeys); // NOTE Map values as Key/value pair object

    // NOTE update metadata
    if (this.keepMetadata) {
      const metadata = getMetaData(chunk as Record<string, any>[], this.metaPickKeys, this.metaHandler);

      if (metadata && !isEmpty(metadata)) {
        if (isEmpty(this.metaData[this.currentFileName])) this.metaData[this.currentFileName] = [];

        this.metaData[this.currentFileName].push(...metadata);
      }
    }

    return fileContent;
  }

  /**
   * @method completeFile
   * @param closeIndexer boolean
   * @return {void}
   * @description writing chunks into existing file
   */
  completeFile(closeIndexer?: boolean): void {
    if (this.writableStream) {
      if (this.fileExt === 'json') {
        this.writableStream.write('}');
      }
      this.closeFile(closeIndexer);
    }
  }

  /**
   * @method closeFile
   * @param closeIndexer boolean
   * @return {void}
   * @description closing current write stream
   */
  private closeFile(closeIndexer = true): void {
    if (closeIndexer) {
      // NOTE write file index details into a file
      writeFileSync(`${this.basePath}/${this.indexFileName}`, JSON.stringify(this.writeIndexer));

      // NOTE write metadata into a file
      if (this.keepMetadata) {
        writeFileSync(`${this.basePath}/metadata.json`, JSON.stringify(this.metaData));
      }
    }

    if (this.writableStream instanceof WriteStream) {
      this.writableStream.end();
      this.prefixKey = '';
      this.writableStream = null;
    }
  }

  saveMeta(meta: Chunk): void {
    writeFileSync(`${this.basePath}/metadata.json`, JSON.stringify(meta));
  }

  getPlainMeta(basePath?: string): Record<string, unknown> {
    const path = basePath || pResolve(this.basePath, 'metadata.json');
    if (!existsSync(path)) return {};

    return JSON.parse(readFileSync(path, { encoding: 'utf-8' }));
  }

  /**
   * @method readChunkFiles
   * @returns Object
   */
  readChunkFiles(): Record<string, unknown> {
    return {
      next: this.next,
      previous: this.previous,
      get: this.getFileByIndex,
    };
  }

  /**
   * @method getFileByIndex
   * @param _self FsUtility
   * @param index number
   * @returns Promise<string>
   */
  protected getFileByIndex(_self: FsUtility = this, index = 1): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      if (index <= 0) {
        reject(new Error('Invalid index'));
        return;
      }

      _self.updatePageInfo(_self, null, index);

      if (isEmpty(_self.readIndexer[index])) {
        reject(new Error('File not found!'));
        return;
      }

      const fileContent = readFileSync(pResolve(_self.basePath, _self.readIndexer[index]), {
        encoding: 'utf-8',
      });

      resolve(_self.fileExt === 'json' ? JSON.parse(fileContent) : fileContent);
    });
  }

  /**
   * @method next
   * @param _self FsUtility
   * @returns Promise<string>
   */
  next(_self: FsUtility = this): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      _self.updatePageInfo(_self, true);

      if (isEmpty(_self.readIndexer[_self.pageInfo.after])) {
        reject(new Error('File not found!'));
        return;
      }

      const fileContent = readFileSync(_self.readIndexer[_self.pageInfo.after], {
        encoding: 'utf-8',
      });

      resolve(_self.fileExt === 'json' ? JSON.parse(fileContent) : fileContent);
    });
  }

  /**
   * @method previous
   * @param _self FsUtility
   * @returns Promise<string>
   */
  protected previous(_self: FsUtility = this): Promise<Record<string, unknown> | Error> {
    return new Promise((resolve, reject) => {
      _self.updatePageInfo(_self, false);

      if (isEmpty(_self.readIndexer[_self.pageInfo.before])) {
        reject(new Error('File not found'));
        return;
      }

      const fileContent = readFileSync(_self.readIndexer[_self.pageInfo.before], {
        encoding: 'utf-8',
      });

      resolve(_self.fileExt === 'json' ? JSON.parse(fileContent) : fileContent);
    });
  }

  /**
   * @method updatePageInfo
   * @param _self FsUtility
   * @param isNext boolean
   * @param index number
   * @returns void
   */
  updatePageInfo(_self: FsUtility = this, isNext: boolean | null = true, index: number | null = null): void {
    if (!_self.pageInfo.pageInfoUpdated) {
      _self.readIndexer = _self.indexFileContent;
      _self.pageInfo.pageInfoUpdated = true;
    }

    const { after, before } = _self.pageInfo;

    if (isNext === true) {
      _self.pageInfo.before = 1;
      _self.pageInfo.after = after + 1;
    } else if (isNext === false) {
      _self.pageInfo.after = 0;
      _self.pageInfo.before = before - 1;
    } else {
      _self.pageInfo.after = index || 0;
      _self.pageInfo.before = 1;
    }

    /* eslint-disable unicorn/consistent-destructuring */
    if (!isEmpty(_self.readIndexer[_self.pageInfo.after + 1])) {
      _self.pageInfo.hasNextPage = true;
    }

    /* eslint-disable unicorn/consistent-destructuring */
    if (!isEmpty(_self.readIndexer[_self.pageInfo.after - 1])) {
      _self.pageInfo.hasPreviousPage = true;
    }
  }

  removeFile(path: string): void {
    if (existsSync(path)) unlinkSync(path);
  }
}

export function getDirectories(source: string): string[] | [] {
  if (!existsSync(source)) return [];
  return readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

export async function getFileList(dirName: string, onlyName = true): Promise<string[] | []> {
  if (!existsSync(dirName)) return [];

  let files: any = [];
  const items = readdirSync(dirName, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      /* eslint-disable no-await-in-loop */
      files = [...files, ...(await getFileList(`${dirName}/${item.name}`))];
    } else {
      files.push(onlyName ? item.name : `${dirName}/${item.name}`);
    }
  }

  return files;
}
