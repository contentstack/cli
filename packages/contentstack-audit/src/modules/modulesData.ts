import { join, resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { FsUtility, sanitizePath } from '@contentstack/cli-utilities';
import {
  LogFn,
  ConfigType,
  ContentTypeStruct,
  CtConstructorParam,
  ModuleConstructorParam,
} from '../types';
import { keys, values } from 'lodash';


export default class ModuleDataReader {
  public log: LogFn;
  public config: ConfigType;
  public folderPath: string;
  public assets!: Record<string, any>;
  public locales: any[] = [];
  public gfSchema: ContentTypeStruct[];
  public ctSchema: ContentTypeStruct[];
  public environments: string[] = [];
  public auditData: Record<string, unknown> = {};
  protected schema: ContentTypeStruct[] = [];

  constructor({ log, config, ctSchema, gfSchema }: ModuleConstructorParam & CtConstructorParam) {
    this.log = log;
    this.config = config;
    this.ctSchema = ctSchema;
    this.gfSchema = gfSchema;
    
    this.log(`Initializing ModuleDataReader`, 'debug');
    this.log(`Content types count: ${ctSchema.length}`, 'debug');
    this.log(`Global fields count: ${gfSchema.length}`, 'debug');
    
    this.folderPath = resolve(sanitizePath(config.basePath));
    this.log(`Folder path: ${this.folderPath}`, 'debug');
    
    this.log(`ModuleDataReader initialization completed`, 'debug');
  }

  async getModuleItemCount(moduleName: string): Promise<number> {
    this.log(`Getting item count for module: ${moduleName}`, 'debug');
    let count = 0;
    switch (moduleName) {
      case "content-types":
        this.log(`Counting content types`, 'debug');
        count = this.ctSchema.length;
        this.log(`Content types count: ${count}`, 'debug');
        break;
      case 'global-fields':
        this.log(`Counting global fields`, 'debug');
        count = this.gfSchema.length;
        this.log(`Global fields count: ${count}`, 'debug');
        break;
      case 'assets': {
        this.log(`Counting assets`, 'debug');
        const assetsPath = join(this.folderPath, 'assets');
        this.log(`Assets path: ${assetsPath}`, 'debug');
        count = await this.readEntryAssetsModule(assetsPath,'assets') || 0;
        this.log(`Assets count: ${count}`, 'debug');
        break;
      }
      case 'entries':
        this.log(`Counting entries`, 'debug');
        {
          const localesFolderPath = resolve(this.config.basePath, this.config.moduleConfig.locales.dirName);
          const localesPath = join(localesFolderPath, this.config.moduleConfig.locales.fileName);
          const masterLocalesPath = join(localesFolderPath, 'master-locale.json');
          
          this.log(`Locales folder path: ${localesFolderPath}`, 'debug');
          this.log(`Locales path: ${localesPath}`, 'debug');
          this.log(`Master locales path: ${masterLocalesPath}`, 'debug');
          
          this.log(`Loading master locales`, 'debug');
          this.locales = values(await this.readUsingFsModule(masterLocalesPath));
          this.log(`Loaded ${this.locales.length} master locales`, 'debug');

          if (existsSync(localesPath)) {
            this.log(`Loading additional locales from file`, 'debug');
            this.locales.push(...values(JSON.parse(readFileSync(localesPath, 'utf8'))));
            this.log(`Total locales after loading: ${this.locales.length}`, 'debug');
          } else {
            this.log(`Additional locales file not found`, 'debug');
          }
          
          this.log(`Processing ${this.locales.length} locales and ${this.ctSchema.length} content types`, 'debug');
          for (const {code} of this.locales) {
            this.log(`Processing locale: ${code}`, 'debug');
            for (const ctSchema of this.ctSchema) {
              this.log(`Processing content type: ${ctSchema.uid}`, 'debug');
              const basePath = join(this.folderPath,'entries', ctSchema.uid, code);
              this.log(`Base path: ${basePath}`, 'debug');
              const entryCount = await this.readEntryAssetsModule(basePath, 'index') || 0;
              this.log(`Found ${entryCount} entries for ${ctSchema.uid} in ${code}`, 'debug');
              count = count + entryCount;
            }
          }
          this.log(`Total entries count: ${count}`, 'debug');
        }
        break;
      case 'custom-roles':
      case 'extensions':
      case 'workflows': {
        this.log(`Counting ${moduleName}`, 'debug');
        const modulePath = resolve(
          this.folderPath,
          sanitizePath(this.config.moduleConfig[moduleName].dirName),
          sanitizePath(this.config.moduleConfig[moduleName].fileName),
        );
        this.log(`${moduleName} path: ${modulePath}`, 'debug');
        
        const moduleData = await this.readUsingFsModule(modulePath);
        count = keys(moduleData).length;
        this.log(`${moduleName} count: ${count}`, 'debug');
        break;
      }
    }
    
    this.log(`Module ${moduleName} item count: ${count}`, 'debug');
    return count;

  }

  async readUsingFsModule(path: string): Promise<Record<string,any>>{
    this.log(`Reading file: ${path}`, 'debug');
    
    const data = existsSync(path) ? (JSON.parse(readFileSync(path, 'utf-8'))) : [];
    this.log(`File ${existsSync(path) ? 'exists' : 'not found'}, data type: ${Array.isArray(data) ? 'array' : 'object'}`, 'debug');
    
    if (existsSync(path)) {
      const dataSize = Array.isArray(data) ? data.length : Object.keys(data).length;
      this.log(`Loaded ${dataSize} items from file`, 'debug');
    } else {
      this.log(`Returning empty array for non-existent file`, 'debug');
    }
    
    return data;
  }

  async readEntryAssetsModule(basePath: string, module: string): Promise<number> {
    this.log(`Reading entry/assets module: ${module}`, 'debug');
    this.log(`Base path: ${basePath}`, 'debug');
    
    let fsUtility = new FsUtility({ basePath, indexFileName: `${module}.json` });
    let indexer = fsUtility.indexFileContent;
    this.log(`Found ${Object.keys(indexer).length} index files`, 'debug');
    
    let count = 0;
    for (const _ in indexer) {
      this.log(`Reading chunk file`, 'debug');
      const entries = (await fsUtility.readChunkFiles.next()) as Record<string, any>;
      const chunkCount = Object.keys(entries).length;
      this.log(`Loaded ${chunkCount} items from chunk`, 'debug');
      count = count + chunkCount;
    }
    
    this.log(`Total ${module} count: ${count}`, 'debug');
    return count;
  }

  async run(): Promise<Object> {
    this.log(`Starting ModuleDataReader run process`, 'debug');
    this.log(`Available modules: ${Object.keys(this.config.moduleConfig).join(', ')}`, 'debug');
    
    await Promise.allSettled(
      Object.keys(this.config.moduleConfig).map(async (module) => {
        this.log(`Processing module: ${module}`, 'debug');
        const count = await this.getModuleItemCount(module);
        this.auditData[module] = { Total: count };
        this.log(`Module ${module} processed with count: ${count}`, 'debug');
      })
    );
    
    this.log(`ModuleDataReader run completed`, 'debug');
    this.log(`Audit data: ${JSON.stringify(this.auditData)}`, 'debug');
    return this.auditData;
  }
}
