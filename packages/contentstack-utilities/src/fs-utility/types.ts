enum FileType {
  json = 'json',
  text = 'txt'
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
  WriteFileOptions,
  FsConstructorOptions
}