enum FileType {
  json = 'json',
  text = 'txt'
}

type PageInfo = {
  after: number
  before: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  pageInfoUpdated?: boolean
}

type WriteFileOptions = {
  keyName?: string
  closeFile?: boolean
  mapKeyVal?: boolean,
  closeIndexer?: boolean
}

type FsConstructorOptions = {
  basePath: string
  fileExt?: FileType
  moduleName?: string
  indexFileName?: string
  chunkFileSize?: number
  omitKeys?: Array<string>,
  defaultInitContent?: string
}

export {
  FileType,
  PageInfo,
  WriteFileOptions,
  FsConstructorOptions
}