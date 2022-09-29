import mkdirp from 'mkdirp'
import { log } from 'winston'
import keys from 'lodash/keys'
import { resolve } from 'path'
import { v4 as uidV4 } from 'uuid'
import isEmpty from 'lodash/isEmpty'
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, WriteStream } from "fs"

import { mapKeyAndVal } from './helper'
import { PageInfo, FileType, WriteFileOptions, FsConstructorOptions } from './types'

export default class FsUtility {
  private basePath: string
  private fileExt: FileType
  private moduleName: string
  private indexFileName: string
  private chunkFileSize: number
  private omitKeys: Array<string>
  private currentFileName: string
  private defaultInitContent: string
  private writableStream: WriteStream
  private currentFileRelativePath: string
  private readIndexer: Record<string, string> = {}
  private writeIndexer: Record<string, string> = {}
  public pageInfo: PageInfo = { after: 0, before: 0, hasNextPage: false, hasPreviousPage: false, pageInfoUpdated: false }

  constructor(options?: FsConstructorOptions) {
    const { fileExt, omitKeys, chunkFileSize, moduleName, indexFileName, basePath, defaultInitContent } = (options || {})
    this.basePath = basePath
    this.moduleName = moduleName
    this.omitKeys = omitKeys || []
    this.fileExt = fileExt || FileType.json
    this.chunkFileSize = chunkFileSize || 10
    this.indexFileName = indexFileName || 'index.json'
    this.pageInfo.hasNextPage = keys(this.indexFileContent).length > 0
    this.defaultInitContent = defaultInitContent || (this.fileExt === 'json' ? '{' : '')

    this.createFolderIfNotExist(this.basePath)
  }

  get isIndexFileExist() {
    return existsSync(`${this.basePath}/${this.indexFileName}`)
  }

  get currentPageDetails() {
    return this.pageInfo
  }

  get indexFileContent() {
    let indexData = {}
    const indexPath = `${this.basePath}/${this.indexFileName}`

    if (existsSync(indexPath)) {
      indexData = JSON.parse(readFileSync(indexPath, 'utf-8'))
    }

    return indexData
  }

  // STUB old utility methods
  /**
   * @method readFile
   * @param filePath string
   * @param parse boolean | undefined
   * @returns string | undefined
   */
  readFile(filePath, parse) {
    let data;
    filePath = resolve(filePath);
    parse = typeof parse === 'undefined' ? true : parse;

    if (existsSync(filePath)) {
      data = parse ? JSON.parse(readFileSync(filePath, 'utf-8')) : data
    }

    return data
  }

  /**
   * @method writeFile
   * @param filePath 
   * @param data Object | undefined
   * @return void
   */
  writeFile (filePath, data) {
    data = typeof data === 'object' ? JSON.stringify(data) : data || '{}';
    writeFileSync(filePath, data)
  }
  
  /**
   * @method makeDirectory
   * @return void
   */
  makeDirectory () {
    for (var key in arguments) {
      let dirname = resolve(arguments[key])
      if (!existsSync(dirname)) {
        mkdirp.sync(dirname)
      }
    }
  }
  
  /**
   * @method readdir
   * @param dirPath String
   * @returns [string]
   */
  readdir (dirPath) {
    if (existsSync(dirPath)) {
      return readdirSync(dirPath)
    } else {
      return []
    }
  }
  // STUB End of old utility

  /**
   * @method createFolderIfNotExist
   * @return {void}
   */
  createFolderIfNotExist(path) {
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true })
    }
  }

  /**
   * @method writeIntoFile
   * @param {String|Object|Array} chunk
   * @param {WriteFileOptions} options
   */
  writeIntoFile(chunk, options?: WriteFileOptions) {
    if (!this.writableStream) {
      this.createNewFile()
    }

    this.writeIntoExistingFile(chunk, options)
  }

  /**
   * @method createNewFile
   * @return {void}
   * @description creating new chunk file
   */
  createNewFile() {
    const fileName = `${uidV4()}-${this.moduleName || 'chunk'}.${this.fileExt}`
    this.currentFileName = fileName
    this.writeIndexer[keys(this.writeIndexer).length + 1] = fileName
    this.currentFileRelativePath = `${this.basePath}/${fileName}`
    writeFileSync(this.currentFileRelativePath, this.defaultInitContent)
    this.writableStream = createWriteStream(this.currentFileRelativePath, { flags: 'a' })
  }

  /**
   * @method writeIntoExistingFile
   * @return {void}
   * @description writing chunks into existing file
   */
  writeIntoExistingFile(chunk, options?: WriteFileOptions) {
    let fileContent = chunk
    let fileSizeReachedLimit = false
    const { keyName, mapKeyVal } = options || { keyName: 'uid', mapKeyVal: false }

    if (mapKeyVal) {
      fileContent = mapKeyAndVal(chunk, keyName || 'uid', this.omitKeys) // NOTE Map values as Key/value pair object
    }

    if (typeof fileContent === 'object') {
      fileContent = JSON.stringify(fileContent).slice(1, -1)
    }
    
    const { size } = statSync(this.currentFileRelativePath)

    if ((options.closeFile === true) || (size / (1024 * 1024)) >= this.chunkFileSize) { // NOTE Each chunk file size Ex. 5 (MB)
      fileSizeReachedLimit = true
      fileContent = this.fileExt === 'json' ? `${fileContent}}` : fileContent
    } else {
      fileContent = this.fileExt === 'json' ? `${fileContent},` : fileContent
    }

    this.writableStream.write(fileContent)

    if (fileSizeReachedLimit) {
      this.closeFile((options.closeFile === true))
    }
  }

  /**
   * @method writeIntoExistingFile
   * @return {void}
   * @description writing chunks into existing file
   */
  onErrorCompleteFile() {
    if (this.writableStream) {
      if (this.fileExt === 'json') {
        this.writableStream.write(`"": {}}`)
      }
      this.closeFile()
      log('info', this.currentFileName)
    }
  }

  /**
   * @method closeFile
   * @return {void}
   * @description closing current write stream
   */
  closeFile(closeIndexer = true) {
    if (closeIndexer) {
      writeFileSync(`${this.basePath}/${this.indexFileName}`, JSON.stringify(this.writeIndexer))
    }
    if (this.writableStream instanceof WriteStream) {
      this.writableStream.end()
    }

    this.writableStream = null
  }

  /**
   * @method readChunkFiles
   * @returns Object
   */
  readChunkFiles() {
    return {
      next: this.next,
      previous: this.previous,
      get: this.getFileByIndex
    }
  }

  /**
   * @method getFileByIndex
   * @param index number
   * @returns Promise<string>
   */
  getFileByIndex(index: number = 1) {
    return new Promise<string>((resolve, reject) => {
      if (index <= 0) return reject({ code: 400, message: 'Invalid index' })

      this.updatePageInfo(null, index)
  
      if (isEmpty(this.readIndexer[index])) {
        return reject({ code: 404, message: 'File not found!' })
      }
  
      resolve(readFileSync(this.readIndexer[index], { encoding: 'utf-8' }))
    })
  }

  /**
   * @method next
   * @returns Promise<string>
   */
  next() {
    return new Promise<string>((resolve, reject) => {
      this.updatePageInfo(true)
  
      if (isEmpty(this.readIndexer[this.pageInfo.after])) {
        return reject({ code: 404, message: 'File not found!' })
      }
  
      resolve(readFileSync(this.readIndexer[this.pageInfo.after], { encoding: 'utf-8' }))
    })
  }

  /**
   * @method previous
   * @returns Promise<string>
   */
  previous() {
    return new Promise<string>((resolve, reject) => {
      this.updatePageInfo(false)
  
      if (isEmpty(this.readIndexer[this.pageInfo.before])) {
        return reject({ code: 404, message: 'File not found!' })
      }
  
      resolve(readFileSync(this.readIndexer[this.pageInfo.before], { encoding: 'utf-8' }))
    })
  }

  /**
   * @method updatePageInfo
   * @param isNext boolean
   * @param index number
   * @returns void
   */
  updatePageInfo(isNext: boolean = true, index: number = null) {
    if (!this.pageInfo.pageInfoUpdated) {
      this.readIndexer = this.indexFileContent
      this.pageInfo.pageInfoUpdated = true
    }

    const { after, before } = this.pageInfo

    if (isNext === true) {
      this.pageInfo.before = 1
      this.pageInfo.after = after + 1
    } else if(isNext === false) {
      this.pageInfo.after = 0
      this.pageInfo.before = before - 1
    } else {
      this.pageInfo.after = index || 0
      this.pageInfo.before = 1
    }

    if (!isEmpty(this.readIndexer[this.pageInfo.after + 1])) {
      this.pageInfo.hasNextPage = true
    }
    if (!isEmpty(this.readIndexer[this.pageInfo.after - 1])) {
      this.pageInfo.hasPreviousPage = true
    }
  }
}
