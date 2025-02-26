import { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

import { FsUtility, sanitizePath, ux } from '@contentstack/cli-utilities';

import {
  LogFn,
  ConfigType,
  ContentTypeStruct,
  CtConstructorParam,
  ModuleConstructorParam,
  EntryStruct,
} from '../types';
import auditConfig from '../config';
import { $t, auditFixMsg, auditMsg, commonMsg } from '../messages';
import values from 'lodash/values';
import { keys } from 'lodash';

/* The `ContentType` class is responsible for scanning content types, looking for references, and
generating a report in JSON and CSV formats. */
export default class Assets {
  public log: LogFn;
  protected fix: boolean;
  public fileName: string;
  public config: ConfigType;
  public folderPath: string;
  public currentUid!: string;
  public currentTitle!: string;
  public assets!: Record<string, any>;
  public locales: string[] = [];
  public environments: string[] = [];
  protected schema: ContentTypeStruct[] = [];
  protected missingEnvLocales: Record<string, any> = {};
  public moduleName: keyof typeof auditConfig.moduleConfig;

  constructor({ log, fix, config, moduleName }: ModuleConstructorParam & CtConstructorParam) {
    this.log = log;
    this.config = config;
    this.fix = fix ?? false;
    this.moduleName = this.validateModules(moduleName!, this.config.moduleConfig);
    this.fileName = config.moduleConfig[this.moduleName].fileName;
    this.folderPath = resolve(
      sanitizePath(config.basePath),
      sanitizePath(config.moduleConfig[this.moduleName].dirName),
    );
  }

  validateModules(
    moduleName: keyof typeof auditConfig.moduleConfig,
    moduleConfig: Record<string, unknown>,
  ): keyof typeof auditConfig.moduleConfig {
    if (Object.keys(moduleConfig).includes(moduleName)) {
      return moduleName;
    }
    return 'assets';
  }
  /**
   * The `run` function checks if a folder path exists, sets the schema based on the module name,
   * iterates over the schema and looks for references, and returns a list of missing references.
   * @returns the `missingEnvLocales` object.
   */
  async run(returnFixSchema = false) {
    if (!existsSync(this.folderPath)) {
      this.log(`Skipping ${this.moduleName} audit`, 'warn');
      this.log($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
      return returnFixSchema ? [] : {};
    }

    await this.prerequisiteData();
    await this.lookForReference();

    if (returnFixSchema) {
      return this.schema;
    }

    for (let propName in this.missingEnvLocales) {
      if (!this.missingEnvLocales[propName].length) {
        delete this.missingEnvLocales[propName];
      }
    }

    return this.missingEnvLocales;
  }

  /**
   * @method prerequisiteData
   * The `prerequisiteData` function reads and parses JSON files to retrieve extension and marketplace
   * app data, and stores them in the `extensions` array.
   */
  async prerequisiteData() {
    this.log(auditMsg.PREPARING_ENTRY_METADATA, 'info');

    const localesFolderPath = resolve(this.config.basePath, this.config.moduleConfig.locales.dirName);
    const localesPath = join(localesFolderPath, this.config.moduleConfig.locales.fileName);
    const masterLocalesPath = join(localesFolderPath, 'master-locale.json');
    this.locales = existsSync(masterLocalesPath) ? values(JSON.parse(readFileSync(masterLocalesPath, 'utf8'))) : [];

    if (existsSync(localesPath)) {
      this.locales.push(...values(JSON.parse(readFileSync(localesPath, 'utf8'))));
    }
    this.locales = this.locales.map((locale: any) => locale.code);
    const environmentPath = resolve(
      this.config.basePath,
      this.config.moduleConfig.environments.dirName,
      this.config.moduleConfig.environments.fileName,
    );
    this.environments = existsSync(environmentPath) ? keys(JSON.parse(readFileSync(environmentPath, 'utf8'))) : [];
    console.log(JSON.stringify(this.environments), JSON.stringify(this.locales));
  }

  /**
   * The function checks if it can write the fix content to a file and if so, it writes the content as
   * JSON to the specified file path.
   */
  async writeFixContent(filePath: string, schema: Record<string, EntryStruct>) {
    let canWrite = true;

    if (this.fix) {
      if (!this.config.flags['copy-dir'] && !this.config.flags['external-config']?.skipConfirm) {
        canWrite = this.config.flags.yes || (await ux.confirm(commonMsg.FIX_CONFIRMATION));
      }

      if (canWrite) {
        writeFileSync(filePath, JSON.stringify(schema));
      }
    }
  }

  /**
   * This function traverse over the publish detials of the assets and remove the publish details where the locale or environment does not exist
   */
  async lookForReference(): Promise<void> {
    let basePath = join(this.folderPath);
    let fsUtility = new FsUtility({ basePath, indexFileName: 'assets.json' });
    let indexer = fsUtility.indexFileContent;
    for (const fileIndex in indexer) {
      const assets = (await fsUtility.readChunkFiles.next()) as Record<string, EntryStruct>;
      this.assets = assets;
      for (const assetUid in assets) {
        this.assets[assetUid].publish_details = this.assets[assetUid].publish_details.filter((pd: any) => {
          if (this.locales.includes(pd.locale) && this.environments.includes(pd.environment)) {
            this.log($t(auditMsg.SCAN_ASSET_SUCCESS_MSG, { uid: assetUid }), { color: 'green' });
            return true;
          } else {
            this.log(
              $t(auditMsg.SCAN_ASSET_WARN_MSG, { uid: assetUid, locale: pd.locale, environment: pd.environment }),
              { color: 'yellow' },
            );
            if (!this.missingEnvLocales[assetUid]) {
              this.missingEnvLocales[assetUid] = [{ uid: assetUid, locale: pd.locale, environment: pd.environment }];
            } else {
              this.missingEnvLocales[assetUid].push([
                ...this.missingEnvLocales[assetUid],
                { uid: assetUid, locale: pd.locale, environment: pd.environment },
              ]);
            }
            this.log($t(auditMsg.SCAN_ASSET_SUCCESS_MSG, { uid: assetUid }), { color: 'green' });
            return false;
          }
        });
        if (this.fix) {
          this.log($t(auditFixMsg.ASSET_FIX, { uid: assetUid }), { color: 'green' });
          await this.writeFixContent(`${basePath}/${indexer[fileIndex]}`, this.assets);
        }
      }
    }
  }
}
