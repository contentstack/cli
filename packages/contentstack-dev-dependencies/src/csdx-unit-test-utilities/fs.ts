import { FsUtility } from '@contentstack/cli-utilities';
import { Chunk, PageInfo, WriteFileOptions } from '@contentstack/cli-utilities';

class TestFsUtility extends FsUtility {
  public pageInfo: PageInfo = {
    after: 0,
    before: 0,
    hasNextPage: false,
    hasPreviousPage: false,
    pageInfoUpdated: false,
  };

  readFile(
    filePath: string,
    parse: boolean | undefined = undefined,
  ): string | Record<string, unknown> | Record<string, unknown>[] | undefined {
    return {};
  }
  writeFile(filePath: string, data: Chunk, mapKeyVal: boolean = false): void {}
  makeDirectory(path: string): Promise<string | undefined> {
    return Promise.resolve(undefined);
  }
  readdir(dirPath: string | Buffer | URL): string[] | [] {
    return [];
  }
  createFolderIfNotExist(path: string): void {}
  writeIntoFile(chunk: Record<string, string>[], options?: WriteFileOptions): void {}
  handleKeyValMapAndMetaData(chunk: Chunk, keyName?: string | string[] | undefined): Chunk {
    return {};
  }
  completeFile(closeIndexer?: boolean): void {}

  saveMeta(meta: Chunk): void {}

  getPlainMeta(basePath?: string): Record<string, unknown> {
    return {};
  }
  protected next(): Promise<Record<string, unknown> | Record<string, unknown>[]> {
    return Promise.resolve({});
  }
  protected previous(): Promise<Record<string, unknown> | Record<string, unknown>[] | Error> {
    return Promise.resolve({});
  }
  updatePageInfo(isNext: boolean | null = true, index: number | null = null): void {}

  removeFile(path: string): void {}
}

function overrideFsMethods() {
  FsUtility.prototype.constructor = TestFsUtility.prototype.constructor;
  FsUtility.prototype.readFile = TestFsUtility.prototype.readFile;
  FsUtility.prototype.writeFile = TestFsUtility.prototype.writeFile;
  FsUtility.prototype.makeDirectory = TestFsUtility.prototype.makeDirectory;
  FsUtility.prototype.readdir = TestFsUtility.prototype.readdir;
  FsUtility.prototype.createFolderIfNotExist = TestFsUtility.prototype.createFolderIfNotExist;
  FsUtility.prototype.writeIntoFile = TestFsUtility.prototype.writeIntoFile.bind(FsUtility);
  FsUtility.prototype.handleKeyValMapAndMetaData = TestFsUtility.prototype.handleKeyValMapAndMetaData;
  FsUtility.prototype.completeFile = TestFsUtility.prototype.completeFile;
  FsUtility.prototype.saveMeta = TestFsUtility.prototype.saveMeta;
  FsUtility.prototype.getPlainMeta = TestFsUtility.prototype.getPlainMeta;
  FsUtility.prototype.updatePageInfo = TestFsUtility.prototype.updatePageInfo;
  FsUtility.prototype.removeFile = TestFsUtility.prototype.removeFile;
}

export { overrideFsMethods };
