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
    
    log.debug(`Initializing ModuleDataReader`, this.config.auditContext);
    log.debug(`Content types count: ${ctSchema.length}`, this.config.auditContext);
    log.debug(`Global fields count: ${gfSchema.length}`, this.config.auditContext);
    
    this.folderPath = resolve(sanitizePath(config.basePath));
    log.debug(`Folder path: ${this.folderPath}`, this.config.auditContext);
    
    log.debug(`ModuleDataReader initialization completed`, this.config.auditContext);
  }

  async getModuleItemCount(moduleName: string): Promise<number> {
    log.debug(`Getting item count for module: ${moduleName}`, this.config.auditContext);
    let count = 0;
    switch (moduleName) {
      case "content-types":
        log.debug(`Counting content types`, this.config.auditContext);
        count = this.ctSchema.length;
        log.debug(`Content types count: ${count}`, this.config.auditContext);
        break;
      case 'global-fields':
        log.debug(`Counting global fields`, this.config.auditContext);
        count = this.gfSchema.length;
        log.debug(`Global fields count: ${count}`, this.config.auditContext);
        break;
      case 'assets': {
        log.debug(`Counting assets`, this.config.auditContext);
        const assetsPath = join(this.folderPath, 'assets');
        log.debug(`Assets path: ${assetsPath}`, this.config.auditContext);
        count = await this.readEntryAssetsModule(assetsPath,'assets') || 0;
        log.debug(`Assets count: ${count}`, this.config.auditContext);
        break;
      }
      case 'entries':
        log.debug(`Counting entries`, this.config.auditContext);
        {
          const localesFolderPath = resolve(this.config.basePath, this.config.moduleConfig.locales.dirName);
          const localesPath = join(localesFolderPath, this.config.moduleConfig.locales.fileName);
          const masterLocalesPath = join(localesFolderPath, 'master-locale.json');
          
          log.debug(`Locales folder path: ${localesFolderPath}`, this.config.auditContext);
          log.debug(`Locales path: ${localesPath}`, this.config.auditContext);
          log.debug(`Master locales path: ${masterLocalesPath}`, this.config.auditContext);
          
          log.debug(`Loading master locales`, this.config.auditContext);
          this.locales = values(await this.readUsingFsModule(masterLocalesPath));
          log.debug(`Loaded ${this.locales.length} master locales: ${this.locales.map(locale => locale.code).join(', ')}`, this.config.auditContext);

          if (existsSync(localesPath)) {
            log.debug(`Loading additional locales from file`, this.config.auditContext);
            this.locales.push(...values(JSON.parse(readFileSync(localesPath, 'utf8'))));
            log.debug(`Total locales after loading: ${this.locales.length} - ${this.locales.map(locale => locale.code).join(', ')}`, this.config.auditContext);
          } else {
            log.debug(`Additional locales file not found`, this.config.auditContext);
          }
          
          log.debug(`Processing ${this.locales.length} locales and ${this.ctSchema.length} content types`, this.config.auditContext);
          for (const {code} of this.locales) {
            log.debug(`Processing locale: ${code}`, this.config.auditContext);
            for (const ctSchema of this.ctSchema) {
              log.debug(`Processing content type: ${ctSchema.uid}`, this.config.auditContext);
              const basePath = join(this.folderPath,'entries', ctSchema.uid, code);
              log.debug(`Base path: ${basePath}`, this.config.auditContext);
              const entryCount = await this.readEntryAssetsModule(basePath, 'index') || 0;
              log.debug(`Found ${entryCount} entries for ${ctSchema.uid} in ${code}`, this.config.auditContext);
              count = count + entryCount;
            }
          }
          log.debug(`Total entries count: ${count}`, this.config.auditContext);
        }
        break;
      case 'custom-roles':
      case 'extensions':
      case 'workflows': {
        log.debug(`Counting ${moduleName}`, this.config.auditContext);
        const modulePath = resolve(
          this.folderPath,
          sanitizePath(this.config.moduleConfig[moduleName].dirName),
          sanitizePath(this.config.moduleConfig[moduleName].fileName),
        );
        log.debug(`Reading module: ${moduleName} from file: ${modulePath}`, this.config.auditContext);
        
        const moduleData = await this.readUsingFsModule(modulePath);
        count = keys(moduleData).length;
        log.debug(`module:${moduleName} count: ${count}`, this.config.auditContext);
        break;
      }
    }
    
    log.debug(`Module ${moduleName} item count: ${count}`, this.config.auditContext);
    return count;

  }

  async readUsingFsModule(path: string): Promise<Record<string,any>>{
    log.debug(`Reading file: ${path}`, this.config.auditContext);
    
    const data = existsSync(path) ? (JSON.parse(readFileSync(path, 'utf-8'))) : [];
    log.debug(`File ${existsSync(path) ? 'exists' : 'not found'}, data type: ${Array.isArray(data) ? 'array' : 'object'}`, this.config.auditContext);
    
    if (existsSync(path)) {
      const dataSize = Array.isArray(data) ? data.length : Object.keys(data).length;
      log.debug(`Loaded ${dataSize} items from file`, this.config.auditContext);
    } else {
      log.debug(`Returning empty array for non-existent file`, this.config.auditContext);
    }
    
    return data;
  }

  async readEntryAssetsModule(basePath: string, module: string): Promise<number> {
    log.debug(`Reading entry/assets module: ${module}`, this.config.auditContext);
    log.debug(`Base path: ${basePath}`, this.config.auditContext);
    
    let fsUtility = new FsUtility({ basePath, indexFileName: `${module}.json` });
    let indexer = fsUtility.indexFileContent;
    log.debug(`Found ${Object.keys(indexer).length} index files`, this.config.auditContext);
    
    let count = 0;
    for (const _ in indexer) {
      log.debug(`Reading chunk file`, this.config.auditContext);
      const entries = (await fsUtility.readChunkFiles.next()) as Record<string, any>;
      const chunkCount = Object.keys(entries).length;
      log.debug(`Loaded ${chunkCount} items from chunk`, this.config.auditContext);
      count = count + chunkCount;
    }
    
    log.debug(`Total ${module} count: ${count}`, this.config.auditContext);
    return count;
  }

  async run(): Promise<Object> {
    log.debug(`Starting ModuleDataReader run process`, this.config.auditContext);
    log.debug(`Available modules: ${Object.keys(this.config.moduleConfig).join(', ')}`, this.config.auditContext);
    
    await Promise.allSettled(
      Object.keys(this.config.moduleConfig).map(async (module) => {
        log.debug(`Processing module: ${module}`, this.config.auditContext);
        const count = await this.getModuleItemCount(module);
        this.auditData[module] = { Total: count };
        log.debug(`Module ${module} processed with count: ${count}`, this.config.auditContext);
      })
    );
    
    log.debug(`ModuleDataReader run completed`, this.config.auditContext);
    log.debug(`Audit data: ${JSON.stringify(this.auditData)}`, this.config.auditContext);
    return this.auditData;
  }
}
