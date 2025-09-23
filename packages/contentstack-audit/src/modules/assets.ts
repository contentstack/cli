import { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { FsUtility, sanitizePath, cliux } from '@contentstack/cli-utilities';
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
    this.log(`Starting ${this.moduleName} audit process`, 'debug');
    this.log(`Data directory: ${this.folderPath}`, 'debug');
    this.log(`Fix mode: ${this.fix}`, 'debug');

    if (!existsSync(this.folderPath)) {
      this.log(`Skipping ${this.moduleName} audit - path does not exist`, 'debug');
      this.log(`Skipping ${this.moduleName} audit`, 'warn');
      this.log($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
      return returnFixSchema ? [] : {};
    }

    this.log('Loading prerequisite data (locales and environments)', 'debug');
    await this.prerequisiteData();
    
    this.log('Starting asset Reference, Environment and Locale validation', 'debug');
    await this.lookForReference();

    if (returnFixSchema) {
      this.log(`Returning fixed schema with ${this.schema?.length || 0} items`, 'debug');
      return this.schema;
    }

    this.log('Cleaning up empty missing environment/locale references', 'debug');
    for (let propName in this.missingEnvLocales) {
      if (Array.isArray(this.missingEnvLocales[propName])) {
        if (!this.missingEnvLocales[propName].length) {
          delete this.missingEnvLocales[propName];
        }
      }
    }

    const totalIssues = Object.keys(this.missingEnvLocales).length;
    this.log(`${this.moduleName} audit completed. Found ${totalIssues} assets with missing environment/locale references`, 'debug');
    return this.missingEnvLocales;
  }

  /**
   * @method prerequisiteData
   * The `prerequisiteData` function reads and parses JSON files to retrieve extension and marketplace
   * app data, and stores them in the `extensions` array.
   */
  async prerequisiteData() {
    this.log('Loading prerequisite data (locales and environments)', 'debug');
    this.log(auditMsg.PREPARING_ENTRY_METADATA, 'info');

    const localesFolderPath = resolve(this.config.basePath, this.config.moduleConfig.locales.dirName);
    const localesPath = join(localesFolderPath, this.config.moduleConfig.locales.fileName);
    const masterLocalesPath = join(localesFolderPath, 'master-locale.json');
    
    this.log(`Loading locales from: ${localesFolderPath}`, 'debug');
    this.log(`Master locales path: ${masterLocalesPath}`, 'debug');
    this.log(`Locales path: ${localesPath}`, 'debug');
    
    this.locales = existsSync(masterLocalesPath) ? values(JSON.parse(readFileSync(masterLocalesPath, 'utf8'))) : [];
    this.log(`Loaded ${this.locales.length} locales from master-locale.json`, 'debug');

    if (existsSync(localesPath)) {
      this.log(`Loading additional locales from: ${localesPath}`, 'debug');
      const additionalLocales = values(JSON.parse(readFileSync(localesPath, 'utf8')));
      this.locales.push(...additionalLocales);
      this.log(`Added ${additionalLocales.length} additional locales`, 'debug');
    } else {
      this.log('No additional locales file found', 'debug');
    }
    this.locales = this.locales.map((locale: any) => locale.code);
    this.log(`Total locales loaded: ${this.locales.length}`, 'debug');
    this.log(`Locale codes: ${this.locales.join(', ')}`, 'debug');
    
    const environmentPath = resolve(
      this.config.basePath,
      this.config.moduleConfig.environments.dirName,
      this.config.moduleConfig.environments.fileName,
    );
    this.log(`Loading environments from: ${environmentPath}`, 'debug');
    
    this.environments = existsSync(environmentPath) ? keys(JSON.parse(readFileSync(environmentPath, 'utf8'))) : [];
    this.log(`Total environments loaded: ${this.environments.length}`, 'debug');
    this.log(`Environment names: ${this.environments.join(', ')}`, 'debug');
  }

  /**
   * The function checks if it can write the fix content to a file and if so, it writes the content as
   * JSON to the specified file path.
   */
  async writeFixContent(filePath: string, schema: Record<string, EntryStruct>) {
    this.log(`Starting writeFixContent process for: ${filePath}`, 'debug');
    let canWrite = true;

    if (this.fix) {
      this.log('Fix mode enabled, checking write permissions', 'debug');
      if (!this.config.flags['copy-dir'] && !this.config.flags['external-config']?.skipConfirm) {
        this.log(`Asking user for confirmation to write fix content (--yes flag: ${this.config.flags.yes})`, 'debug');
        canWrite = this.config.flags.yes || (await cliux.confirm(commonMsg.FIX_CONFIRMATION));
      } else {
        this.log('Skipping confirmation due to copy-dir or external-config flags', 'debug');
      }

      if (canWrite) {
        this.log(`Writing fixed assets to: ${filePath}`, 'debug');
        writeFileSync(filePath, JSON.stringify(schema));
        this.log(`Successfully wrote ${Object.keys(schema).length} assets to file`, 'debug');
      } else {
        this.log('User declined to write fix content', 'debug');
      }
    } else {
      this.log('Skipping writeFixContent - not in fix mode', 'debug');
    }
  }

  /**
   * This function traverse over the publish detials of the assets and remove the publish details where the locale or environment does not exist
   */
  async lookForReference(): Promise<void> {
    this.log('Starting asset reference validation', 'debug');
    let basePath = join(this.folderPath);
    this.log(`Assets base path: ${basePath}`, 'debug');
    
    let fsUtility = new FsUtility({ basePath, indexFileName: 'assets.json' });
    let indexer = fsUtility.indexFileContent;
    this.log(`Found ${Object.keys(indexer).length} asset files to process`, 'debug');
    
    for (const fileIndex in indexer) {
      this.log(`Processing asset file: ${indexer[fileIndex]}`, 'debug');
      const assets = (await fsUtility.readChunkFiles.next()) as Record<string, EntryStruct>;
      this.assets = assets;
      this.log(`Loaded ${Object.keys(assets).length} assets from file`, 'debug');
      
      for (const assetUid in assets) {
        this.log(`Processing asset: ${assetUid}`, 'debug');
        
        if (this.assets[assetUid]?.publish_details && !Array.isArray(this.assets[assetUid].publish_details)) {
          this.log(`Asset ${assetUid} has invalid publish_details format`, 'debug');
          this.log($t(auditMsg.ASSET_NOT_EXIST, { uid: assetUid }), { color: 'red' });
        }

        const publishDetails = this.assets[assetUid]?.publish_details;
        this.log(`Asset ${assetUid} has ${publishDetails?.length || 0} publish details`, 'debug');

        this.assets[assetUid].publish_details = this.assets[assetUid]?.publish_details.filter((pd: any) => {
          this.log(`Checking publish detail: locale=${pd?.locale}, environment=${pd?.environment}`, 'debug');
          
          if (this.locales?.includes(pd?.locale) && this.environments?.includes(pd?.environment)) {
            this.log(`Publish detail valid for asset ${assetUid}: locale=${pd.locale}, environment=${pd.environment}`, 'debug');
            this.log($t(auditMsg.SCAN_ASSET_SUCCESS_MSG, { uid: assetUid }), { color: 'green' });
            return true;
          } else {
            this.log(`Publish detail invalid for asset ${assetUid}: locale=${pd.locale}, environment=${pd.environment}`, 'debug');
            this.log(
              $t(auditMsg.SCAN_ASSET_WARN_MSG, { uid: assetUid, locale: pd.locale, environment: pd.environment }),
              { color: 'yellow' },
            );
            if (!Object.keys(this.missingEnvLocales).includes(assetUid)) {
              this.log(`Creating new missing reference entry for asset ${assetUid}`, 'debug');
              this.missingEnvLocales[assetUid] = [
                { asset_uid: assetUid, publish_locale: pd.locale, publish_environment: pd.environment },
              ];
            } else {
              this.log(`Adding to existing missing reference entry for asset ${assetUid}`, 'debug');
              this.missingEnvLocales[assetUid].push({
                asset_uid: assetUid,
                publish_locale: pd.locale,
                publish_environment: pd.environment,
              });
            }
            this.log($t(auditMsg.SCAN_ASSET_SUCCESS_MSG, { uid: assetUid }), { color: 'green' });
            return false;
          }
        });
        
        const remainingPublishDetails = this.assets[assetUid].publish_details?.length || 0;
        this.log(`Asset ${assetUid} now has ${remainingPublishDetails} valid publish details`, 'debug');
        
        if (this.fix) {
          this.log(`Fixing asset ${assetUid}`, 'debug');
          this.log($t(auditFixMsg.ASSET_FIX, { uid: assetUid }), { color: 'green' });
          await this.writeFixContent(`${basePath}/${indexer[fileIndex]}`, this.assets);
        }
      }
    }
    
    this.log(`Asset reference validation completed. Processed ${Object.keys(this.missingEnvLocales).length} assets with issues`, 'debug');
  }
}
