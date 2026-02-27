export type ExportContext = {
  spacesRootPath: string;
  context?: Record<string, unknown>;
  securedAssets?: boolean;
};

/**
 * Options for writing a list of items to chunked JSON files via FsUtility.
 */
export type ChunkedJsonWriteOptions = {
  dir: string;
  indexFileName: string;
  moduleName: string;
  metaPickKeys: string[];
  items: unknown[];
};
