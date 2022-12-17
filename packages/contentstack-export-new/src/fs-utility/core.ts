import mkdirp from "mkdirp";
import keys from "lodash/keys";
import { resolve as pResolve } from "path";
import { v4 as uidV4 } from "uuid";
import isEmpty from "lodash/isEmpty";
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
} from "fs";

import { getMetaData, mapKeyAndVal } from "./helper";
import {
  Chunk,
  PageInfo,
  FileType,
  WriteFileOptions,
  FsConstructorOptions,
} from "./types";

export default class FsUtility {
  private basePath: string;
  private fileExt: FileType;
  private moduleName: string;
  private prefixKey: string = "";
  private indexFileName: string;
  private chunkFileSize: number;
  private omitKeys: Array<string>;
  private defaultInitContent: string;
  private keepMetadata: boolean = false;
  private currentFileName: string = "";
  private currentFileRelativePath: string;
  private writableStream: WriteStream | null;
  private metaData: Record<string, any> = {};
  private metaPickKeys: Array<string>;
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
    } = options;
    this.metaHandler = metaHandler;
    this.basePath = basePath || "";
    this.omitKeys = omitKeys || [];
    this.fileExt = fileExt || "json";
    this.metaPickKeys = metaPickKeys || [];
    this.moduleName = moduleName || "chunk";
    this.chunkFileSize = chunkFileSize || 10;
    this.keepMetadata = keepMetadata || (keepMetadata === undefined ?? true);
    this.indexFileName = indexFileName || "index.json";
    this.pageInfo.hasNextPage = keys(this.indexFileContent).length > 0;
    this.defaultInitContent =
      defaultInitContent || (this.fileExt === "json" ? "{" : "");

    this.createFolderIfNotExist(this.basePath);
  }

  get isIndexFileExist() {
    return existsSync(`${this.basePath}/${this.indexFileName}`);
  }

  get currentPageDetails() {
    return this.pageInfo;
  }

  get indexFileContent() {
    let indexData = {};
    const indexPath = `${this.basePath}/${this.indexFileName}`;

    if (existsSync(indexPath)) {
      indexData = JSON.parse(readFileSync(indexPath, "utf-8"));
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
    parse = typeof parse === "undefined" ? true : parse;

    if (existsSync(filePath)) {
      data = parse ? JSON.parse(readFileSync(filePath, "utf-8")) : data;
    }

    return data;
  }

  /**
   * @method writeFile
   * @param filePath
   * @param data Object | undefined
   * @return void
   */
  writeFile(filePath: string, data: Chunk) {
    data = typeof data === "object" ? JSON.stringify(data) : data || "{}";
    writeFileSync(filePath, data);
  }

  /**
   * @method makeDirectory
   * @return void
   */
  makeDirectory(path: any) {
    if (!path) {
      throw new Error("Invalid path to create directory");
    }

    return mkdirp(path);
  }

  /**
   * @method readdir
   * @param dirPath String
   * @returns [string]
   */
  readdir(dirPath: string | Buffer | URL) {
    if (existsSync(dirPath)) {
      return readdirSync(dirPath);
    } else {
      return [];
    }
  }
  // STUB End of old utility

  /**
   * @method createFolderIfNotExist
   * @return {void}
   */
  createFolderIfNotExist(path: string) {
    if (path && !existsSync(path)) {
      mkdirSync(path, { recursive: true });
    }
  }

  /**
   * @method writeIntoFile
   * @param {String|Object|Array} chunk
   * @param {WriteFileOptions} options
   */
  writeIntoFile(chunk: Record<string, string>[], options?: WriteFileOptions) {
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
  private createNewFile() {
    const fileName = `${uidV4()}-${this.moduleName || "chunk"}.${this.fileExt}`;
    this.currentFileName = fileName;
    this.writeIndexer[keys(this.writeIndexer).length + 1] = fileName;
    this.currentFileRelativePath = `${this.basePath}/${fileName}`;
    writeFileSync(this.currentFileRelativePath, this.defaultInitContent);
    this.writableStream = createWriteStream(this.currentFileRelativePath, {
      flags: "a",
    });
  }

  /**
   * @method writeIntoExistingFile
   * @param chunk Record<string, string>[] | object | Array<any> | string;
   * @param options WriteFileOptions
   */
  private writeIntoExistingFile(
    chunk: Chunk,
    options: WriteFileOptions = { mapKeyVal: true }
  ) {
    let fileContent = chunk;
    let fileSizeReachedLimit = false;
    const { keyName, mapKeyVal } = options || {
      keyName: "uid",
      mapKeyVal: false,
    };
    const { size } = statSync(this.currentFileRelativePath);

    if (mapKeyVal) {
      fileContent = mapKeyAndVal(
        chunk as Record<string, any>[],
        keyName || "uid",
        this.omitKeys
      ); // NOTE Map values as Key/value pair object
    }

    // NOTE update metadata
    if (this.keepMetadata) {
      let metadata: any = getMetaData(
        chunk as Record<string, any>[],
        this.metaPickKeys,
        this.metaHandler
      );

      if (!isEmpty(metadata)) {
        if (isEmpty(this.metaData[this.currentFileName]))
          this.metaData[this.currentFileName] = [];

        this.metaData[this.currentFileName].push(...metadata);
      }
    }

    if (typeof fileContent === "object") {
      fileContent = JSON.stringify(fileContent).slice(1, -1);
    }

    if (
      options?.closeFile === true ||
      size / (1024 * 1024) >= this.chunkFileSize
    ) {
      // NOTE Each chunk file size Ex. 5 (MB)
      fileSizeReachedLimit = true;
    }

    const suffix = fileSizeReachedLimit ? "}" : "";
    fileContent =
      this.fileExt === "json"
        ? `${this.prefixKey}${fileContent}${suffix}`
        : fileContent;
    this.writableStream?.write(fileContent);

    if (!this.prefixKey) this.prefixKey = ",";
    if (fileSizeReachedLimit) {
      this.closeFile(options.closeFile === true);
    }
  }

  /**
   * @method completeFile
   * @return {void}
   * @description writing chunks into existing file
   */
  completeFile(closeIndexer?: boolean) {
    if (this.writableStream) {
      if (this.fileExt === "json") {
        this.writableStream.write("}");
      }
      this.closeFile(closeIndexer);
    }
  }

  /**
   * @method closeFile
   * @return {void}
   * @description closing current write stream
   */
  private closeFile(closeIndexer = true) {
    if (closeIndexer) {
      // NOTE write file index details into a file
      writeFileSync(
        `${this.basePath}/${this.indexFileName}`,
        JSON.stringify(this.writeIndexer)
      );

      // NOTE write metadata into a file
      if (this.keepMetadata) {
        writeFileSync(
          `${this.basePath}/metadata.json`,
          JSON.stringify(this.metaData)
        );
      }
    }

    if (this.writableStream instanceof WriteStream) {
      this.writableStream.end();
      this.prefixKey = "";
      this.writableStream = null;
    }
  }

  saveMeta(meta: Chunk) {
    writeFileSync(`${this.basePath}/metadata.json`, JSON.stringify(meta));
  }

  getPlainMeta() {
    const path = pResolve(this.basePath, "metadata.json");
    if (!existsSync(path)) return {};

    const fileContent = readFileSync(pResolve(this.basePath, "metadata.json"), {
      encoding: "utf-8",
    });

    return JSON.parse(fileContent);
  }

  /**
   * @method readChunkFiles
   * @returns Object
   */
  readChunkFiles() {
    return {
      next: this.next,
      previous: this.previous,
      get: this.getFileByIndex,
    };
  }

  /**
   * @method getFileByIndex
   * @param index number
   * @returns Promise<string>
   */
  protected getFileByIndex(_self: FsUtility = this, index: number = 1) {
    return new Promise<string>((resolve, reject) => {
      if (index <= 0) return reject({ code: 400, message: "Invalid index" });

      _self.updatePageInfo(_self, null, index);

      if (isEmpty(_self.readIndexer[index])) {
        return reject({ code: 404, message: "File not found!" });
      }

      const fileContent = readFileSync(
        pResolve(_self.basePath, _self.readIndexer[index]),
        {
          encoding: "utf-8",
        }
      );

      resolve(_self.fileExt === "json" ? JSON.parse(fileContent) : fileContent);
    });
  }

  /**
   * @method next
   * @returns Promise<string>
   */
  next(_self: FsUtility = this) {
    return new Promise<string>((resolve, reject) => {
      _self.updatePageInfo(_self, true);

      if (isEmpty(_self.readIndexer[_self.pageInfo.after])) {
        return reject({ code: 404, message: "File not found!" });
      }

      const fileContent = readFileSync(
        _self.readIndexer[_self.pageInfo.after],
        {
          encoding: "utf-8",
        }
      );

      resolve(_self.fileExt === "json" ? JSON.parse(fileContent) : fileContent);
    });
  }

  /**
   * @method previous
   * @returns Promise<string>
   */
  protected previous(_self: FsUtility = this) {
    return new Promise<string>((resolve, reject) => {
      _self.updatePageInfo(_self, false);

      if (isEmpty(_self.readIndexer[_self.pageInfo.before])) {
        return reject({ code: 404, message: "File not found!" });
      }

      const fileContent = readFileSync(
        _self.readIndexer[_self.pageInfo.before],
        {
          encoding: "utf-8",
        }
      );

      resolve(_self.fileExt === "json" ? JSON.parse(fileContent) : fileContent);
    });
  }

  /**
   * @method updatePageInfo
   * @param isNext boolean
   * @param index number
   * @returns void
   */
  updatePageInfo(
    _self: FsUtility = this,
    isNext: boolean | null = true,
    index: number | null = null
  ) {
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

    if (!isEmpty(_self.readIndexer[_self.pageInfo.after + 1])) {
      _self.pageInfo.hasNextPage = true;
    }

    if (!isEmpty(_self.readIndexer[_self.pageInfo.after - 1])) {
      _self.pageInfo.hasPreviousPage = true;
    }
  }

  removeFile(path: string) {
    if (existsSync(path)) return unlinkSync(path);
  }
}

export async function getDirectories(source: any) {
  if (!existsSync(source)) return [];
  return readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

export async function getFileList(dirName: string, onlyName = true) {
  if (!existsSync(dirName)) return [];

  let files: any = [];
  const items = readdirSync(dirName, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      files = [...files, ...(await getFileList(`${dirName}/${item.name}`))];
    } else {
      files.push(onlyName ? item.name : `${dirName}/${item.name}`);
    }
  }

  return files;
}
