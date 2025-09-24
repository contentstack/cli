import { join, resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { FsUtility, sanitizePath, log } from '@contentstack/cli-utilities';
import {
  ConfigType,
  ContentTypeStruct,
  CtConstructorParam,
  ModuleConstructorParam,
} from '../types';
import { keys, values } from 'lodash';


export default class ModuleDataReader {
  public config: ConfigType;
  public folderPath: string;
  public assets!: Record<string, any>;
  public locales: any[] = [];
  public gfSchema: ContentTypeStruct[];
  public ctSchema: ContentTypeStruct[];
  public environments: string[] = [];
  public auditData: Record<string, unknown> = {};
  protected schema: ContentTypeStruct[] = [];

  constructor({ config, ctSchema, gfSchema }: ModuleConstructorParam & CtConstructorParam) {
    this.config = config;
    this.ctSchema = ctSchema;
    this.gfSchema = gfSchema;
    
    log.debug(`Initializing ModuleDataReader`);
    log.debug(`Content types count: ${ctSchema.length}`);
    log.debug(`Global fields count: ${gfSchema.length}`);
    
    this.folderPath = resolve(sanitizePath(config.basePath));
    log.debug(`Folder path: ${this.folderPath}`);
    
    log.debug(`ModuleDataReader initialization completed`);
  }

  async getModuleItemCount(moduleName: string): Promise<number> {
    log.debug(`Getting item count for module: ${moduleName}`);
    let count = 0;
    switch (moduleName) {
      case "content-types":
        log.debug(`Counting content types`);
        count = this.ctSchema.length;
        log.debug(`Content types count: ${count}`);
        break;
      case 'global-fields':
        log.debug(`Counting global fields`);
        count = this.gfSchema.length;
        log.debug(`Global fields count: ${count}`);
        break;
      case 'assets': {
        log.debug(`Counting assets`);
        const assetsPath = join(this.folderPath, 'assets');
        log.debug(`Assets path: ${assetsPath}`);
        count = await this.readEntryAssetsModule(assetsPath,'assets') || 0;
        log.debug(`Assets count: ${count}`);
        break;
      }
      case 'entries':
        log.debug(`Counting entries`);
        {
          const localesFolderPath = resolve(this.config.basePath, this.config.moduleConfig.locales.dirName);
          const localesPath = join(localesFolderPath, this.config.moduleConfig.locales.fileName);
          const masterLocalesPath = join(localesFolderPath, 'master-locale.json');
          
          log.debug(`Locales folder path: ${localesFolderPath}`);
          log.debug(`Locales path: ${localesPath}`);
          log.debug(`Master locales path: ${masterLocalesPath}`);
          
          log.debug(`Loading master locales`);
          this.locales = values(await this.readUsingFsModule(masterLocalesPath));
          log.debug(`Loaded ${this.locales.length} master locales: ${this.locales.map(locale => locale.code).join(', ')}`);

          if (existsSync(localesPath)) {
            log.debug(`Loading additional locales from file`);
            this.locales.push(...values(JSON.parse(readFileSync(localesPath, 'utf8'))));
            log.debug(`Total locales after loading: ${this.locales.length} - ${this.locales.map(locale => locale.code).join(', ')}`);
          } else {
            log.debug(`Additional locales file not found`);
          }
          
          log.debug(`Processing ${this.locales.length} locales and ${this.ctSchema.length} content types`);
          for (const {code} of this.locales) {
            log.debug(`Processing locale: ${code}`);
            for (const ctSchema of this.ctSchema) {
              log.debug(`Processing content type: ${ctSchema.uid}`);
              const basePath = join(this.folderPath,'entries', ctSchema.uid, code);
              log.debug(`Base path: ${basePath}`);
              const entryCount = await this.readEntryAssetsModule(basePath, 'index') || 0;
              log.debug(`Found ${entryCount} entries for ${ctSchema.uid} in ${code}`);
              count = count + entryCount;
            }
          }
          log.debug(`Total entries count: ${count}`);
        }
        break;
      case 'custom-roles':
      case 'extensions':
      case 'workflows': {
        log.debug(`Counting ${moduleName}`);
        const modulePath = resolve(
          this.folderPath,
          sanitizePath(this.config.moduleConfig[moduleName].dirName),
          sanitizePath(this.config.moduleConfig[moduleName].fileName),
        );
        log.debug(`Reading module: ${moduleName} from file: ${modulePath}`);
        
        const moduleData = await this.readUsingFsModule(modulePath);
        count = keys(moduleData).length;
        log.debug(`module:${moduleName} count: ${count}`);
        break;
      }
    }
    
    log.debug(`Module ${moduleName} item count: ${count}`);
    return count;

  }

  async readUsingFsModule(path: string): Promise<Record<string,any>>{
    log.debug(`Reading file: ${path}`);
    
    const data = existsSync(path) ? (JSON.parse(readFileSync(path, 'utf-8'))) : [];
    log.debug(`File ${existsSync(path) ? 'exists' : 'not found'}, data type: ${Array.isArray(data) ? 'array' : 'object'}`);
    
    if (existsSync(path)) {
      const dataSize = Array.isArray(data) ? data.length : Object.keys(data).length;
      log.debug(`Loaded ${dataSize} items from file`);
    } else {
      log.debug(`Returning empty array for non-existent file`);
    }
    
    return data;
  }

  async readEntryAssetsModule(basePath: string, module: string): Promise<number> {
    log.debug(`Reading entry/assets module: ${module}`);
    log.debug(`Base path: ${basePath}`);
    
    let fsUtility = new FsUtility({ basePath, indexFileName: `${module}.json` });
    let indexer = fsUtility.indexFileContent;
    log.debug(`Found ${Object.keys(indexer).length} index files`);
    
    let count = 0;
    for (const _ in indexer) {
      log.debug(`Reading chunk file`);
      const entries = (await fsUtility.readChunkFiles.next()) as Record<string, any>;
      const chunkCount = Object.keys(entries).length;
      log.debug(`Loaded ${chunkCount} items from chunk`);
      count = count + chunkCount;
    }
    
    log.debug(`Total ${module} count: ${count}`);
    return count;
  }

  async run(): Promise<Object> {
    log.debug(`Starting ModuleDataReader run process`);
    log.debug(`Available modules: ${Object.keys(this.config.moduleConfig).join(', ')}`);
    
    await Promise.allSettled(
      Object.keys(this.config.moduleConfig).map(async (module) => {
        log.debug(`Processing module: ${module}`);
        const count = await this.getModuleItemCount(module);
        this.auditData[module] = { Total: count };
        log.debug(`Module ${module} processed with count: ${count}`);
      })
    );
    
    log.debug(`ModuleDataReader run completed`);
    log.debug(`Audit data: ${JSON.stringify(this.auditData)}`);
    return this.auditData;
  }
}
