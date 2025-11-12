import omit from 'lodash/omit';
import keys from 'lodash/keys';
import isEmpty from 'lodash/isEmpty';
import { resolve as pResolve } from 'node:path';
import { handleAndLogError, messageHandler, log, sanitizePath } from '@contentstack/cli-utilities';

import BaseClass from './base-class';
import { fsUtil } from '../../utils';
import { ModuleClassParams, ExportConfig } from '../../types';

export default class ExportTaxonomies extends BaseClass {
  private taxonomies: Record<string, Record<string, string>>;
  private taxonomiesByLocale: Record<string, Set<string>>;
  private taxonomiesConfig: ExportConfig['modules']['taxonomies'];
  private isLocaleBasedExportSupported: boolean = true; // Flag to track if locale-based export is supported
  private qs: {
    include_count: boolean;
    skip: number;
    asc?: string;
    limit: number;
    locale?: string;
    branch?: string;
    include_fallback?: boolean;
    fallback_locale?: string;
  };
  public taxonomiesFolderPath: string;
  private localesFilePath: string;

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.taxonomies = {};
    this.taxonomiesByLocale = {};
    this.taxonomiesConfig = exportConfig.modules.taxonomies;
    this.qs = { include_count: true, limit: this.taxonomiesConfig.limit || 100, skip: 0 };

    this.applyQueryFilters(this.qs, 'taxonomies');
    this.exportConfig.context.module = 'taxonomies';
    this.localesFilePath = pResolve(
      sanitizePath(exportConfig.data),
      sanitizePath(exportConfig.branchName || ''),
      sanitizePath(exportConfig.modules.locales.dirName),
      sanitizePath(exportConfig.modules.locales.fileName),
    );
  }

  async start(): Promise<void> {
    log.debug('Starting taxonomies export process...', this.exportConfig.context);

    //create taxonomies folder
    this.taxonomiesFolderPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.taxonomiesConfig.dirName,
    );
    log.debug(`Taxonomies folder path: ${this.taxonomiesFolderPath}`, this.exportConfig.context);

    await fsUtil.makeDirectory(this.taxonomiesFolderPath);
    log.debug('Created taxonomies directory', this.exportConfig.context);

    const localesToExport = this.getLocalesToExport();
    log.debug(
      `Will attempt to export taxonomies for ${localesToExport.length} locale(s): ${localesToExport.join(', ')}`,
      this.exportConfig.context,
    );

    if (localesToExport.length === 0) {
      log.warn('No locales found to export', this.exportConfig.context);
      return;
    }

    // Test locale-based export support with master locale
    const masterLocale = this.exportConfig.master_locale?.code;
    await this.fetchTaxonomies(masterLocale, true);

    if (!this.isLocaleBasedExportSupported) {
      log.debug('Localization disabled, falling back to legacy export method', this.exportConfig.context);
      await this.exportTaxonomies();
      await this.writeTaxonomiesMetadata();
    } else {
      // Process all locales with locale-based export
      log.debug('Localization enabled, proceeding with locale-based export', this.exportConfig.context);

      for (const localeCode of localesToExport) {
        await this.fetchTaxonomies(localeCode);
        await this.processLocaleExport(localeCode);
      }

      await this.writeTaxonomiesMetadata();
    }

    log.success(
      messageHandler.parse('TAXONOMY_EXPORT_COMPLETE', keys(this.taxonomies || {}).length),
      this.exportConfig.context,
    );
  }

  /**
   * Process and export taxonomies for a specific locale
   */
  async processLocaleExport(localeCode: string): Promise<void> {
    const localeTaxonomies = this.taxonomiesByLocale[localeCode];

    if (localeTaxonomies?.size > 0) {
      log.info(`Found ${localeTaxonomies.size} taxonomies for locale: ${localeCode}`, this.exportConfig.context);
      await this.exportTaxonomies(localeCode);
    } else {
      log.debug(`No taxonomies found for locale: ${localeCode}`, this.exportConfig.context);
    }
  }

  /**
   * Write taxonomies metadata file
   */
  async writeTaxonomiesMetadata(): Promise<void> {
    if (!this.taxonomies || isEmpty(this.taxonomies)) {
      log.info(messageHandler.parse('TAXONOMY_NOT_FOUND'), this.exportConfig.context);
      return;
    }

    const taxonomiesFilePath = pResolve(this.taxonomiesFolderPath, 'taxonomies.json');
    log.debug(`Writing taxonomies metadata to: ${taxonomiesFilePath}`, this.exportConfig.context);
    fsUtil.writeFile(taxonomiesFilePath, this.taxonomies);
  }

  /**
   * Fetch taxonomies
   *
   * @async
   * @param {?string} [localeCode]
   * @param {boolean} [checkLocaleSupport=false]
   * @returns {Promise<void>}
   */
  async fetchTaxonomies(localeCode?: string, checkLocaleSupport: boolean = false): Promise<void> {
    let skip = 0;
    const localeInfo = localeCode ? `for locale: ${localeCode}` : '';

    if (localeCode && !this.taxonomiesByLocale[localeCode]) {
      this.taxonomiesByLocale[localeCode] = new Set<string>();
    }

    do {
      const queryParams = { ...this.qs, skip };
      if (localeCode) {
        queryParams.locale = localeCode;
      }

      log.debug(`Fetching taxonomies ${localeInfo} with skip: ${skip}`, this.exportConfig.context);

      try {
        const data = await this.stack.taxonomy().query(queryParams).find();
        const { items, count } = data;
        const taxonomiesCount = count ?? items?.length ?? 0;

        log.debug(
          `Fetched ${items?.length || 0} taxonomies out of total ${taxonomiesCount} ${localeInfo}`,
          this.exportConfig.context,
        );

        if (!items?.length) {
          log.debug(`No taxonomies found ${localeInfo}`, this.exportConfig.context);
          break;
        }

        // Check localization support
        if (checkLocaleSupport && localeCode && skip === 0 && !items[0].locale) {
          log.debug('API does not support locale-based taxonomy export', this.exportConfig.context);
          this.isLocaleBasedExportSupported = false;
        }

        this.sanitizeTaxonomiesAttribs(items, localeCode);
        skip += this.qs.limit || 100;

        if (skip >= taxonomiesCount) {
          log.debug(`Completed fetching all taxonomies ${localeInfo}`, this.exportConfig.context);
          break;
        }
      } catch (error) {
        log.debug(`Error fetching taxonomies ${localeInfo}`, this.exportConfig.context);
        handleAndLogError(error, {
          ...this.exportConfig.context,
          ...(localeCode && { locale: localeCode }),
        });
        if (checkLocaleSupport) {
          this.isLocaleBasedExportSupported = false;
        }
        // Break to avoid infinite retry loop on errors
        break;
      }
    } while (true);
  }

  /**
   * remove invalid keys and write data into taxonomies
   * @function sanitizeTaxonomiesAttribs
   * @param {Record<string, string>[]} taxonomies
   * @param {?string} [localeCode]
   */
  sanitizeTaxonomiesAttribs(taxonomies: Record<string, string>[], localeCode?: string): void {
    const localeInfo = localeCode ? ` for locale: ${localeCode}` : '';
    log.debug(`Processing ${taxonomies.length} taxonomies${localeInfo}`, this.exportConfig.context);

    for (const taxonomy of taxonomies) {
      const taxonomyUID = taxonomy.uid;
      const taxonomyName = taxonomy.name;

      log.debug(`Processing taxonomy: ${taxonomyName} (${taxonomyUID})${localeInfo}`, this.exportConfig.context);

      // Store taxonomy metadata (only once per taxonomy)
      if (!this.taxonomies[taxonomyUID]) {
        this.taxonomies[taxonomyUID] = omit(taxonomy, this.taxonomiesConfig.invalidKeys);
      }

      // Track taxonomy for this locale
      if (localeCode) {
        this.taxonomiesByLocale[localeCode].add(taxonomyUID);
      }
    }

    log.debug(
      `Processing complete${localeInfo}. Total taxonomies processed: ${keys(this.taxonomies).length}`,
      this.exportConfig.context,
    );
  }

  /**
   * Export taxonomies - supports both locale-based and legacy export
   */
  async exportTaxonomies(localeCode?: string): Promise<void> {
    const taxonomiesUID = localeCode ? Array.from(this.taxonomiesByLocale[localeCode] || []) : keys(this.taxonomies);

    const localeInfo = localeCode ? ` for locale: ${localeCode}` : '';
    if (taxonomiesUID.length === 0) {
      log.debug(`No taxonomies to export${localeInfo}`, this.exportConfig.context);
      return;
    }
    log.debug(`Exporting detailed data for ${taxonomiesUID.length} taxonomies${localeInfo}`, this.exportConfig.context);

    const exportFolderPath = localeCode ? pResolve(this.taxonomiesFolderPath, localeCode) : this.taxonomiesFolderPath;
    if (localeCode) {
      await fsUtil.makeDirectory(exportFolderPath);
      log.debug(`Created locale folder: ${exportFolderPath}`, this.exportConfig.context);
    }

    const onSuccess = ({ response, uid }: any) => {
      const filePath = pResolve(exportFolderPath, `${uid}.json`);
      log.debug(`Writing detailed taxonomy data to: ${filePath}`, this.exportConfig.context);
      fsUtil.writeFile(filePath, response);
      log.success(messageHandler.parse('TAXONOMY_EXPORT_SUCCESS', uid), this.exportConfig.context);
    };

    const onReject = ({ error, uid }: any) => {
      log.debug(`Failed to export detailed data for taxonomy: ${uid}${localeInfo}`, this.exportConfig.context);
      handleAndLogError(error, { ...this.exportConfig.context, uid, ...(localeCode && { locale: localeCode }) });
    };

    for (const taxonomyUID of taxonomiesUID) {
      log.debug(`Processing detailed export for taxonomy: ${taxonomyUID}${localeInfo}`, this.exportConfig.context);

      const exportParams: any = { format: 'json' };
      if (localeCode) {
        exportParams.locale = localeCode;
        if (this.qs.include_fallback !== undefined) exportParams.include_fallback = this.qs.include_fallback;
        if (this.qs.fallback_locale) exportParams.fallback_locale = this.qs.fallback_locale;
      }
      if (this.qs.branch) exportParams.branch = this.qs.branch;

      await this.makeAPICall({
        reject: onReject,
        resolve: onSuccess,
        uid: taxonomyUID,
        module: 'export-taxonomy',
        queryParam: exportParams,
      });
    }
    log.debug(`Completed detailed taxonomy export process${localeInfo}`, this.exportConfig.context);
  }

  /**
   * Get all locales to export
   */
  getLocalesToExport(): string[] {
    log.debug('Determining locales to export...', this.exportConfig.context);

    const masterLocaleCode = this.exportConfig.master_locale?.code || 'en-us';
    const localeSet = new Set<string>([masterLocaleCode]);

    try {
      const locales = fsUtil.readFile(this.localesFilePath) as Record<string, Record<string, any>>;

      if (locales && keys(locales || {}).length > 0) {
        log.debug(
          `Loaded ${keys(locales || {}).length} locales from ${this.localesFilePath}`,
          this.exportConfig.context,
        );

        for (const localeUid of keys(locales)) {
          const localeCode = locales[localeUid].code;
          if (localeCode && !localeSet.has(localeCode)) {
            localeSet.add(localeCode);
            log.debug(`Added locale: ${localeCode} (uid: ${localeUid})`, this.exportConfig.context);
          }
        }
      } else {
        log.debug(`No locales found in ${this.localesFilePath}`, this.exportConfig.context);
      }
    } catch (error) {
      log.warn(`Failed to read locales file: ${this.localesFilePath}`, this.exportConfig.context);
    }

    const localesToExport = Array.from(localeSet);
    log.debug(`Total unique locales to export: ${localesToExport.length}`, this.exportConfig.context);

    return localesToExport;
  }
}
