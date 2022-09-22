import { log } from 'winston'
import keys from 'lodash/keys'
import { v4 as uidV4 } from 'uuid'
import { createWriteStream, existsSync, mkdirSync, statSync, writeFileSync, WriteStream } from "fs"

import { mapKeyAndVal } from './helper'
import { FileType, WriteFileOptions, FsConstructorOptions } from './types'

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
  private indexer: Record<string, string> = {}

  constructor(options?: FsConstructorOptions) {
    const { fileExt, omitKeys, chunkFileSize, moduleName, indexFileName, basePath, defaultInitContent } = (options || {})
    this.basePath = basePath
    this.moduleName = moduleName
    this.omitKeys = omitKeys || []
    this.fileExt = fileExt || FileType.json
    this.chunkFileSize = chunkFileSize || 10
    this.indexFileName = indexFileName || 'index.json'
    this.defaultInitContent = defaultInitContent || (this.fileExt === 'json' ? '{' : '')

    this.createFolderIfNotExist(this.basePath)
  }

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
    this.indexer[keys(this.indexer).length + 1] = fileName
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
        this.writableStream.write(`"": {} \n}`)
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
      writeFileSync(`${this.basePath}/${this.indexFileName}`, JSON.stringify(this.indexer))
    }
    this.writableStream.end()
    this.writableStream = null
  }
}
