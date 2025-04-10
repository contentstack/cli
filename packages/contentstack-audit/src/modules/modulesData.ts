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
    this.folderPath = resolve(sanitizePath(config.basePath));
  }

  async getModuleItemCount(moduleName: string): Promise<number> {
    let count = 0;
    switch (moduleName) {
      case "content-types":
        count = this.ctSchema.length;
        break;
      case 'global-fields':
        count = this.gfSchema.length;
        break;
      case 'assets': 
        count = keys(await this.readEntryAssetsModule(this.folderPath,'assets')).length;
        break;
      case 'entries':
        {
          const localesFolderPath = resolve(this.config.basePath, this.config.moduleConfig.locales.dirName);
          const localesPath = join(localesFolderPath, this.config.moduleConfig.locales.fileName);
          const masterLocalesPath = join(localesFolderPath, 'master-locale.json');
          this.locales = values(await this.readUsingFsModule(masterLocalesPath));

          if (existsSync(localesPath)) {
            this.locales.push(...values(JSON.parse(readFileSync(localesPath, 'utf8'))));
          }
          for (const {code} of this.locales) {
            for (const ctSchema of this.ctSchema) {
              const basePath = join(this.folderPath,'entries', ctSchema.uid, code);
              count = count + await this.readEntryAssetsModule(basePath, 'index') || 0;
            }
          }
        }
        break;
      case 'custom-roles':
      case 'extensions':
      case 'workflows':
        count = keys(await (this.readUsingFsModule(
          resolve(
            this.folderPath,
            sanitizePath(this.config.moduleConfig[moduleName].dirName),
            sanitizePath(this.config.moduleConfig[moduleName].fileName),
          ),
        ))).length;
        break;
    }
    return count;

  }

  async readUsingFsModule(path: string): Promise<Record<string,any>>{
    const data = existsSync(path) ? (JSON.parse(readFileSync(path, 'utf-8'))) : [];
    return data;
  }

  async readEntryAssetsModule(basePath: string, module: string): Promise<number> {
    let fsUtility = new FsUtility({ basePath, indexFileName: `${module}.json` });
    let indexer = fsUtility.indexFileContent;
    let count = 0;
    for (const _ in indexer) {
      const entries = (await fsUtility.readChunkFiles.next()) as Record<string, any>;
      count = count + Object.keys(entries).length;
    }
    return count;
  }

  async run(): Promise<Object> {
    await Promise.allSettled(
      Object.keys(this.config.moduleConfig).map(async (module) => {
        this.auditData[module] = { Total: await this.getModuleItemCount(module) };
      })
    );
    return this.auditData;
  }
}
