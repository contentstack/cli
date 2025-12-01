import { join } from 'node:path';
import values from 'lodash/values';
import isEmpty from 'lodash/isEmpty';
import { log, handleAndLogError } from '@contentstack/cli-utilities';

import BaseClass, { ApiOptions } from './base-class';
import { fsUtil, fileHelper } from '../../utils';
import { ModuleClassParams, TaxonomiesConfig } from '../../types';

export default class ImportTaxonomies extends BaseClass {
  private taxonomiesMapperDirPath: string;
  private taxonomiesFolderPath: string;
  private taxSuccessPath: string;
  private taxFailsPath: string;
  private taxonomiesConfig: TaxonomiesConfig;
  private taxonomies: Record<string, unknown>;
  private termsMapperDirPath: string;
  private termsSuccessPath: string;
  private termsFailsPath: string;
  private localesFilePath: string;
  private isLocaleBasedStructure: boolean = false;
  public createdTaxonomies: Record<string, unknown> = {};
  public failedTaxonomies: Record<string, unknown> = {};
  public createdTerms: Record<string, Record<string, unknown>> = {};
  public failedTerms: Record<string, Record<string, unknown>> = {};

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.importConfig.context.module = 'taxonomies';
    this.taxonomiesConfig = importConfig.modules.taxonomies;
    this.taxonomiesMapperDirPath = join(importConfig.backupDir, 'mapper', 'taxonomies');
    this.termsMapperDirPath = join(this.taxonomiesMapperDirPath, 'terms');
    this.taxonomiesFolderPath = join(importConfig.backupDir, this.taxonomiesConfig.dirName);
    this.taxSuccessPath = join(this.taxonomiesMapperDirPath, 'success.json');
    this.taxFailsPath = join(this.taxonomiesMapperDirPath, 'fails.json');
    this.termsSuccessPath = join(this.termsMapperDirPath, 'success.json');
    this.termsFailsPath = join(this.termsMapperDirPath, 'fails.json');
    this.localesFilePath = join(
      importConfig.backupDir,
      importConfig.modules.locales.dirName,
      importConfig.modules.locales.fileName,
    );
  }

  /**
   * @method start
   * @returns {Promise<void>} Promise<void>
   */
  async start(): Promise<void> {
    log.debug('Checking for taxonomy folder existence…', this.importConfig.context);

    //Step1 check folder exists or not
    if (fileHelper.fileExistsSync(this.taxonomiesFolderPath)) {
      log.debug(`Found taxonomy folder at: ${this.taxonomiesFolderPath}`, this.importConfig.context);
      this.taxonomies = fsUtil.readFile(join(this.taxonomiesFolderPath, 'taxonomies.json'), true) as Record<
        string,
        unknown
      >;
      const taxonomyCount = Object.keys(this.taxonomies || {}).length;
      log.debug(`Loaded ${taxonomyCount} taxonomy items from file.`, this.importConfig.context);
    } else {
      log.info(`No taxonomies found at: '${this.taxonomiesFolderPath}'`, this.importConfig.context);
      return;
    }

    //Step 2 create taxonomies & terms mapper directory
    log.debug('Creating mapper directories...', this.importConfig.context);
    await fsUtil.makeDirectory(this.taxonomiesMapperDirPath);
    await fsUtil.makeDirectory(this.termsMapperDirPath);
    log.debug('Created taxonomies and terms mapper directories.', this.importConfig.context);

    // Step 3: Check if locale-based structure exists and scan taxonomies by locale
    log.debug('Checking for locale-based folder structure', this.importConfig.context);
    this.isLocaleBasedStructure = this.detectAndScanLocaleStructure();

    // Step 4 import taxonomies
    if (this.isLocaleBasedStructure) {
      log.debug('Detected locale-based folder structure for taxonomies', this.importConfig.context);
      log.debug('Starting taxonomies import...', this.importConfig.context);
      await this.importTaxonomiesByLocale();
    } else {
      log.debug('Starting taxonomies import', this.importConfig.context);
      await this.importTaxonomiesLegacy();
      log.debug('Using legacy folder structure for taxonomies', this.importConfig.context);
    }

    //Step 5 create taxonomy & related terms success & failure file
    log.debug('Creating success and failure files...', this.importConfig.context);
    this.createSuccessAndFailedFile();

    log.success('Taxonomies imported successfully!', this.importConfig.context);
  }

  /**
   * create taxonomy and enter success & failure related data into taxonomies mapper file
   * @method importTaxonomies
   * @async
   * @returns {Promise<any>} Promise<any>
   */
  async importTaxonomies({ apiContent, localeCode }: { apiContent: any[]; localeCode?: string }): Promise<void> {
    const onSuccess = ({ apiData }: any) => this.handleSuccess(apiData, localeCode);
    const onReject = ({ error, apiData }: any) => this.handleFailure(error, apiData, localeCode);

    await this.makeConcurrentCall(
      {
        apiContent,
        processName: 'import taxonomies',
        apiParams: {
          serializeData: this.serializeTaxonomy.bind(this),
          reject: onReject,
          resolve: onSuccess,
          entity: 'import-taxonomy',
          includeParamOnCompletion: true,
          queryParam: {
            locale: localeCode,
          },
        },
        concurrencyLimit: this.importConfig.concurrency || this.importConfig.fetchConcurrency || 1,
      },
      undefined,
      false,
    );
  }

  async importTaxonomiesLegacy(): Promise<void> {
    const apiContent = values(this.taxonomies);
    await this.importTaxonomies({
      apiContent,
    });
  }

  async importTaxonomiesByLocale(): Promise<void> {
    const locales = this.loadAvailableLocales();
    const apiContent = values(this.taxonomies);
    for (const localeCode of Object.keys(locales)) {
      await this.importTaxonomies({
        apiContent,
        localeCode,
      });
    }
  }

  handleSuccess(apiData: any, locale?: string) {
    const { taxonomy, terms } = apiData || {};
    const taxonomyUID = taxonomy?.uid;
    const taxonomyName = taxonomy?.name;
    const termsCount = Object.keys(terms || {}).length;

    this.createdTaxonomies[taxonomyUID] = taxonomy;
    this.createdTerms[taxonomyUID] = terms;

    log.success(
      `Taxonomy '${taxonomyUID}' imported successfully${locale ? ` for locale: ${locale}` : ''}!`,
      this.importConfig.context,
    );
    log.debug(
      `Created taxonomy '${taxonomyName}' with ${termsCount} terms${locale ? ` for locale: ${locale}` : ''}`,
      this.importConfig.context,
    );
  }

  handleFailure(error: any, apiData: any, locale?: string) {
    const taxonomyUID = apiData?.taxonomy?.uid;

    if (error?.status === 409 && error?.statusText === 'Conflict') {
      log.info(
        `Taxonomy '${taxonomyUID}' already exists.`,
        this.importConfig.context,
      );
      this.createdTaxonomies[taxonomyUID] = apiData?.taxonomy;
      this.createdTerms[taxonomyUID] = apiData?.terms;
      return;
    }

    const errMsg = error?.errorMessage || error?.errors?.taxonomy || error?.errors?.term || error?.message;

    if (errMsg) {
      log.error(
        `Failed to import taxonomy '${taxonomyUID}': ${errMsg}`,
        this.importConfig.context,
      );
    } else {
      handleAndLogError(
        error,
        { ...this.importConfig.context, taxonomyUID, locale },
        `Taxonomy '${taxonomyUID}' failed`,
      );
    }

    this.failedTaxonomies[taxonomyUID] = apiData?.taxonomy;
    this.failedTerms[taxonomyUID] = apiData?.terms;
  }

  /**
   *
   * @param {ApiOptions} apiOptions
   * @param {?string} [localeCode]
   * @returns {ApiOptions}
   */
  serializeTaxonomy(apiOptions: ApiOptions): ApiOptions {
    const {
      apiData,
      queryParam: { locale },
    } = apiOptions;
    const taxonomyUID = apiData?.uid;

    if (!taxonomyUID) {
      log.debug('No taxonomy UID provided for serialization', this.importConfig.context);
      apiOptions.apiData = undefined;
      return apiOptions;
    }

    const context = locale ? ` for locale: ${locale}` : '';
    log.debug(`Serializing taxonomy: ${taxonomyUID}${context}`, this.importConfig.context);

    // Determine file path - if locale is provided, use it directly, otherwise search
    const filePath = locale
      ? join(this.taxonomiesFolderPath, locale, `${taxonomyUID}.json`)
      : this.findTaxonomyFilePath(taxonomyUID);

    if (!filePath || !fileHelper.fileExistsSync(filePath)) {
      log.debug(`Taxonomy file not found for: ${taxonomyUID}${context}`, this.importConfig.context);
      apiOptions.apiData = undefined;
      return apiOptions;
    }

    const taxonomyDetails = this.loadTaxonomyFile(filePath, locale || 'auto-detected');
    if (taxonomyDetails) {
      const termCount = Object.keys(taxonomyDetails?.terms || {}).length;
      log.debug(`Taxonomy has ${termCount} term entries${context}`, this.importConfig.context);

      apiOptions.apiData = {
        filePath,
        taxonomy: taxonomyDetails?.taxonomy,
        terms: taxonomyDetails?.terms,
      };
    } else {
      apiOptions.apiData = undefined;
    }

    return apiOptions;
  }

  loadTaxonomyFile(filePath: string, context: string): Record<string, unknown> | undefined {
    if (!fileHelper.fileExistsSync(filePath)) {
      log.debug(`File does not exist: ${filePath}`, this.importConfig.context);
      return undefined;
    }

    try {
      const taxonomyDetails = fsUtil.readFile(filePath, true) as Record<string, unknown>;
      log.debug(`Successfully loaded taxonomy from: ${context}`, this.importConfig.context);
      return taxonomyDetails;
    } catch (error) {
      log.debug(`Error loading taxonomy file: ${filePath}`, this.importConfig.context);
      return undefined;
    }
  }

  findTaxonomyFilePath(taxonomyUID: string): string | undefined {
    if (this.isLocaleBasedStructure) {
      // For locale-based structure, search in locale folders
      return this.findTaxonomyInLocaleFolders(taxonomyUID);
    } else {
      // For legacy structure, only check the root folder
      const legacyPath = join(this.taxonomiesFolderPath, `${taxonomyUID}.json`);
      return fileHelper.fileExistsSync(legacyPath) ? legacyPath : undefined;
    }
  }

  findTaxonomyInLocaleFolders(taxonomyUID: string): string | undefined {
    const locales = this.loadAvailableLocales();

    for (const localeCode of Object.keys(locales)) {
      const filePath = join(this.taxonomiesFolderPath, localeCode, `${taxonomyUID}.json`);
      if (fileHelper.fileExistsSync(filePath)) {
        return filePath;
      }
    }

    return undefined;
  }

  loadAvailableLocales(): Record<string, string> {
    if (!fileHelper.fileExistsSync(this.localesFilePath)) {
      log.debug('No locales file found', this.importConfig.context);
      return {};
    }

    try {
      const localesData = fsUtil.readFile(this.localesFilePath, true) as Record<string, Record<string, any>>;
      const locales: Record<string, string> = {};
      locales[this.importConfig.master_locale?.code] = this.importConfig.master_locale?.code;

      for (const [code, locale] of Object.entries(localesData)) {
        if (locale?.code) {
          locales[locale.code] = code;
        }
      }

      log.debug(`Loaded ${Object.keys(locales).length} locales from file`, this.importConfig.context);
      return locales;
    } catch (error) {
      log.debug('Error loading locales file', this.importConfig.context);
      return {};
    }
  }

  /**
   * create taxonomies success and fail in (mapper/taxonomies)
   * create terms success and fail in (mapper/taxonomies/terms)
   * @method createSuccessAndFailedFile
   */
  createSuccessAndFailedFile() {
    log.debug('Creating success and failed files for taxonomies and terms...', this.importConfig.context);

    const createdTaxCount = Object.keys(this.createdTaxonomies)?.length;
    const failedTaxCount = Object.keys(this.failedTaxonomies)?.length;
    const createdTermsCount = Object.keys(this.createdTerms)?.length;
    const failedTermsCount = Object.keys(this.failedTerms)?.length;

    log.debug(
      `Summary - Created taxonomies: ${createdTaxCount}, Failed taxonomies: ${failedTaxCount}`,
      this.importConfig.context,
    );
    log.debug(
      `Summary - Created terms: ${createdTermsCount}, Failed terms: ${failedTermsCount}`,
      this.importConfig.context,
    );

    if (this.createdTaxonomies !== undefined && !isEmpty(this.createdTaxonomies)) {
      fsUtil.writeFile(this.taxSuccessPath, this.createdTaxonomies);
      log.debug(
        `Written ${createdTaxCount} successful taxonomies to file: ${this.taxSuccessPath}`,
        this.importConfig.context,
      );
    }

    if (this.failedTaxonomies !== undefined && !isEmpty(this.failedTaxonomies)) {
      fsUtil.writeFile(this.taxFailsPath, this.failedTaxonomies);
      log.debug(`Written ${failedTaxCount} failed taxonomies to file: ${this.taxFailsPath}`, this.importConfig.context);
    }

    if (this.createdTerms !== undefined && !isEmpty(this.createdTerms)) {
      fsUtil.writeFile(this.termsSuccessPath, this.createdTerms);
      log.debug(
        `Written successful terms for ${createdTermsCount} taxonomies to file: ${this.termsSuccessPath}`,
        this.importConfig.context,
      );
    }

    if (this.failedTerms !== undefined && !isEmpty(this.failedTerms)) {
      fsUtil.writeFile(this.termsFailsPath, this.failedTerms);
      log.debug(
        `Written failed terms for ${failedTermsCount} taxonomies to file: ${this.termsFailsPath}`,
        this.importConfig.context,
      );
    }
  }

  /**
   * Detect if locale-based folder structure exists and scan taxonomies by locale
   * @returns {boolean} true if locale-based structure detected, false otherwise
   */
  detectAndScanLocaleStructure(): boolean {
    const masterLocaleCode = this.importConfig.master_locale?.code || 'en-us';
    const masterLocaleFolder = join(this.taxonomiesFolderPath, masterLocaleCode);

    // Check if master locale folder exists (indicates new locale-based structure)
    if (!fileHelper.fileExistsSync(masterLocaleFolder)) {
      log.debug('No locale-based folder structure detected', this.importConfig.context);
      return false;
    }

    log.debug('Locale-based folder structure detected', this.importConfig.context);

    return true;
  }
}
