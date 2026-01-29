import { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { FsUtility, sanitizePath, cliux, log } from '@contentstack/cli-utilities';
import {
  ContentTypeStruct,
  CtConstructorParam,
  ModuleConstructorParam,
  EntryStruct,
} from '../types';
import auditConfig from '../config';
import { $t, auditFixMsg, auditMsg, commonMsg } from '../messages';
import values from 'lodash/values';
import { keys } from 'lodash';
import BaseClass from './base-class';

/* The `Assets` class is responsible for scanning assets, looking for missing environment/locale references,
and generating a report in JSON and CSV formats. */
export default class Assets extends BaseClass {
  protected fix: boolean;
  public fileName: string;
  public folderPath: string;
  public currentUid!: string;
  public currentTitle!: string;
  public assets!: Record<string, any>;
  public locales: string[] = [];
  public environments: string[] = [];
  protected schema: ContentTypeStruct[] = [];
  protected missingEnvLocales: Record<string, any> = {};
  public moduleName: keyof typeof auditConfig.moduleConfig;

  constructor({ fix, config, moduleName }: ModuleConstructorParam & CtConstructorParam) {
    super({ config });
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
   * @param returnFixSchema - If true, returns the fixed schema instead of missing references
   * @param totalCount - Total number of assets to process (for progress tracking)
   * @returns the `missingEnvLocales` object.
   */
  async run(returnFixSchema = false, totalCount?: number) {
    try {
      log.debug(`Starting ${this.moduleName} audit process`, this.config.auditContext);
      log.debug(`Data directory: ${this.folderPath}`, this.config.auditContext);
      log.debug(`Fix mode: ${this.fix}`, this.config.auditContext);

      if (!existsSync(this.folderPath)) {
        log.debug(`Skipping ${this.moduleName} audit - path does not exist`, this.config.auditContext);
        log.warn(`Skipping ${this.moduleName} audit`, this.config.auditContext);
        cliux.print($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
        return returnFixSchema ? [] : {};
      }

      // Load prerequisite data with loading spinner
      await this.withLoadingSpinner('ASSETS: Loading prerequisite data (locales and environments)...', async () => {
        await this.prerequisiteData();
      });

      // Create progress manager if we have a total count
      if (totalCount && totalCount > 0) {
        const progress = this.createSimpleProgress(this.moduleName, totalCount);
        progress.updateStatus('Validating asset references...');
      }

      log.debug('Starting asset Reference, Environment and Locale validation', this.config.auditContext);
      await this.lookForReference();

    if (returnFixSchema) {
      log.debug(`Returning fixed schema with ${this.schema?.length || 0} items`, this.config.auditContext);
      return this.schema;
    }

    log.debug('Cleaning up empty missing environment/locale references', this.config.auditContext);
    for (let propName in this.missingEnvLocales) {
      if (Array.isArray(this.missingEnvLocales[propName])) {
        if (!this.missingEnvLocales[propName].length) {
          delete this.missingEnvLocales[propName];
        }
      }
    }

      const totalIssues = Object.keys(this.missingEnvLocales).length;
      log.debug(`${this.moduleName} audit completed. Found ${totalIssues} assets with missing environment/locale references`, this.config.auditContext);
      
      this.completeProgress(true);
      return this.missingEnvLocales;
    } catch (error: any) {
      this.completeProgress(false, error?.message || 'Assets audit failed');
      throw error;
    }
  }

  /**
   * @method prerequisiteData
   * The `prerequisiteData` function reads and parses JSON files to retrieve extension and marketplace
   * app data, and stores them in the `extensions` array.
   */
  async prerequisiteData() {
    log.debug('Loading prerequisite data (locales and environments)', this.config.auditContext);
    log.info(auditMsg.PREPARING_ENTRY_METADATA, this.config.auditContext);

    const localesFolderPath = resolve(this.config.basePath, this.config.moduleConfig.locales.dirName);
    const localesPath = join(localesFolderPath, this.config.moduleConfig.locales.fileName);
    const masterLocalesPath = join(localesFolderPath, 'master-locale.json');
    
    log.debug(`Loading locales from: ${localesFolderPath}`, this.config.auditContext);
    log.debug(`Master locales path: ${masterLocalesPath}`, this.config.auditContext);
    log.debug(`Locales path: ${localesPath}`, this.config.auditContext);
    
    this.locales = existsSync(masterLocalesPath) ? values(JSON.parse(readFileSync(masterLocalesPath, 'utf8'))) : [];
    log.debug(`Loaded ${this.locales.length} locales from master-locale.json`, this.config.auditContext);

    if (existsSync(localesPath)) {
      log.debug(`Loading additional locales from: ${localesPath}`, this.config.auditContext);
      const additionalLocales = values(JSON.parse(readFileSync(localesPath, 'utf8')));
      this.locales.push(...additionalLocales);
      log.debug(`Added ${additionalLocales.length} additional locales`, this.config.auditContext);
    } else {
      log.debug('No additional locales file found', this.config.auditContext);
    }
    this.locales = this.locales.map((locale: any) => locale.code);
    log.debug(`Total locales loaded: ${this.locales.length}`, this.config.auditContext);
    log.debug(`Locale codes: ${this.locales.join(', ')}`, this.config.auditContext);
    
    const environmentPath = resolve(
      this.config.basePath,
      this.config.moduleConfig.environments.dirName,
      this.config.moduleConfig.environments.fileName,
    );
    log.debug(`Loading environments from: ${environmentPath}`, this.config.auditContext);
    
    this.environments = existsSync(environmentPath) ? keys(JSON.parse(readFileSync(environmentPath, 'utf8'))) : [];
    log.debug(`Total environments loaded: ${this.environments.length}`, this.config.auditContext);
    log.debug(`Environment names: ${this.environments.join(', ')}`, this.config.auditContext);
  }

  /**
   * The function checks if it can write the fix content to a file and if so, it writes the content as
   * JSON to the specified file path.
   */
  async writeFixContent(filePath: string, schema: Record<string, EntryStruct>) {
    log.debug(`Starting writeFixContent process for: ${filePath}`, this.config.auditContext);
    let canWrite = true;

    if (this.fix) {
      log.debug('Fix mode enabled, checking write permissions', this.config.auditContext);
      if (!this.config.flags['copy-dir'] && !this.config.flags['external-config']?.skipConfirm) {
        log.debug(`Asking user for confirmation to write fix content (--yes flag: ${this.config.flags.yes})`, this.config.auditContext);
        canWrite = this.config.flags.yes || (await cliux.confirm(commonMsg.FIX_CONFIRMATION));
      } else {
        log.debug('Skipping confirmation due to copy-dir or external-config flags', this.config.auditContext);
      }

      if (canWrite) {
        log.debug(`Writing fixed assets to: ${filePath}`, this.config.auditContext);
        writeFileSync(filePath, JSON.stringify(schema));
        log.debug(`Successfully wrote ${Object.keys(schema).length} assets to file`, this.config.auditContext);
      } else {
        log.debug('User declined to write fix content', this.config.auditContext);
      }
    } else {
      log.debug('Skipping writeFixContent - not in fix mode', this.config.auditContext);
    }
  }

  /**
   * This function traverse over the publish detials of the assets and remove the publish details where the locale or environment does not exist
   */
  async lookForReference(): Promise<void> {
    log.debug('Starting asset reference validation', this.config.auditContext);
    let basePath = join(this.folderPath);
    log.debug(`Assets base path: ${basePath}`, this.config.auditContext);
    
    let fsUtility = new FsUtility({ basePath, indexFileName: 'assets.json' });
    let indexer = fsUtility.indexFileContent;
    log.debug(`Found ${Object.keys(indexer).length} asset files to process`, this.config.auditContext);
    
    for (const fileIndex in indexer) {
      log.debug(`Processing asset file: ${indexer[fileIndex]}`, this.config.auditContext);
      const assets = (await fsUtility.readChunkFiles.next()) as Record<string, EntryStruct>;
      this.assets = assets;
      log.debug(`Loaded ${Object.keys(assets).length} assets from file`, this.config.auditContext);
      
      for (const assetUid in assets) {
        log.debug(`Processing asset: ${assetUid}`, this.config.auditContext);
        
        if (this.assets[assetUid]?.publish_details && !Array.isArray(this.assets[assetUid].publish_details)) {
          log.debug(`Asset ${assetUid} has invalid publish_details format`, this.config.auditContext);
          cliux.print($t(auditMsg.ASSET_NOT_EXIST, { uid: assetUid }), { color: 'red' });
        }

        const publishDetails = this.assets[assetUid]?.publish_details;
        log.debug(`Asset ${assetUid} has ${publishDetails?.length || 0} publish details`, this.config.auditContext);

        this.assets[assetUid].publish_details = this.assets[assetUid]?.publish_details.filter((pd: any) => {
          log.debug(`Checking publish detail: locale=${pd?.locale}, environment=${pd?.environment}`, this.config.auditContext);
          
          if (this.locales?.includes(pd?.locale) && this.environments?.includes(pd?.environment)) {
            log.debug(`Publish detail valid for asset ${assetUid}: locale=${pd.locale}, environment=${pd.environment}`, this.config.auditContext);
            log.info($t(auditMsg.SCAN_ASSET_SUCCESS_MSG, { uid: assetUid }), this.config.auditContext);
            return true;
          } else {
            log.debug(`Publish detail invalid for asset ${assetUid}: locale=${pd.locale}, environment=${pd.environment}`, this.config.auditContext);
            cliux.print(
              $t(auditMsg.SCAN_ASSET_WARN_MSG, { uid: assetUid, locale: pd.locale, environment: pd.environment }),
              { color: 'yellow' },
            );
            if (!Object.keys(this.missingEnvLocales).includes(assetUid)) {
              log.debug(`Creating new missing reference entry for asset ${assetUid}`, this.config.auditContext);
              this.missingEnvLocales[assetUid] = [
                { asset_uid: assetUid, publish_locale: pd.locale, publish_environment: pd.environment },
              ];
            } else {
              log.debug(`Adding to existing missing reference entry for asset ${assetUid}`, this.config.auditContext);
              this.missingEnvLocales[assetUid].push({
                asset_uid: assetUid,
                publish_locale: pd.locale,
                publish_environment: pd.environment,
              });
            }
            log.success($t(auditMsg.SCAN_ASSET_SUCCESS_MSG, { uid: assetUid }), this.config.auditContext);
            return false;
          }
        });
        
        const remainingPublishDetails = this.assets[assetUid].publish_details?.length || 0;
        log.debug(`Asset ${assetUid} now has ${remainingPublishDetails} valid publish details`, this.config.auditContext);
        
        // Track progress for each asset processed
        if (this.progressManager) {
          this.progressManager.tick(true, `asset: ${assetUid}`, null);
        }
        
        if (this.fix) {
          log.debug(`Fixing asset ${assetUid}`, this.config.auditContext);
          log.info($t(auditFixMsg.ASSET_FIX, { uid: assetUid }), this.config.auditContext);
          await this.writeFixContent(`${basePath}/${indexer[fileIndex]}`, this.assets);
        }
      }
    }
    
    log.debug(`Asset reference validation completed. Processed ${Object.keys(this.missingEnvLocales).length} assets with issues`, this.config.auditContext);
  }
}
