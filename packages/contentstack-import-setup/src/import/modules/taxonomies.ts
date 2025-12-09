import { join } from 'path';
import omit from 'lodash/omit';
import isEmpty from 'lodash/isEmpty';

import { fsUtil, fileHelper } from '../../utils';
import { ImportConfig, ModuleClassParams, TaxonomyQueryParams } from '../../types';
import { sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';

export default class TaxonomiesImportSetup {
  private config: ImportConfig;
  private taxonomiesFilePath: string;
  private taxonomiesFolderPath: string;
  private stackAPIClient: ModuleClassParams['stackAPIClient'];
  private dependencies: ModuleClassParams['dependencies'];
  private taxonomiesConfig: ImportConfig['modules']['taxonomies'];
  private termsSuccessPath: string;
  private taxSuccessPath: string;
  private taxonomiesMapperDirPath: string;
  private termsMapperDirPath: string;
  private localesFilePath: string;
  private isLocaleBasedStructure: boolean = false;
  public taxonomiesMapper: Record<string, unknown> = {};
  public termsMapper: Record<string, unknown> = {};
  public masterLocaleFilePath: string;

  constructor({ config, stackAPIClient, dependencies }: ModuleClassParams) {
    this.config = config;
    if (this.config.context) {
      this.config.context.module = 'taxonomies';
    }
    this.stackAPIClient = stackAPIClient;
    this.taxonomiesFolderPath = join(sanitizePath(this.config.contentDir), 'taxonomies');
    this.taxonomiesFilePath = join(this.taxonomiesFolderPath, 'taxonomies.json');
    this.taxonomiesConfig = config.modules.taxonomies;
    this.taxonomiesMapperDirPath = join(sanitizePath(this.config.backupDir), 'mapper', 'taxonomies');
    this.taxSuccessPath = join(sanitizePath(this.taxonomiesMapperDirPath), 'success.json');
    this.termsMapperDirPath = join(sanitizePath(this.taxonomiesMapperDirPath), 'terms');
    this.termsSuccessPath = join(sanitizePath(this.termsMapperDirPath), 'success.json');
    this.localesFilePath = join(
      sanitizePath(this.config.contentDir),
      config.modules.locales?.dirName || 'locales',
      config.modules.locales?.fileName || 'locales.json',
    );
    this.masterLocaleFilePath = join(
      sanitizePath(this.config.contentDir),
      config.modules.locales?.dirName || 'locales',
      'master-locale.json',
    );

    this.taxonomiesMapper = {};
    this.termsMapper = {};
  }

  /**
   * Start the taxonomies import setup
   * This method reads the taxonomies from the content folder and generates a mapper file
   * @returns {Promise<void>}
   */
  async start(): Promise<void> {
    try {
      const taxonomies: any = fsUtil.readFile(this.taxonomiesFilePath);
      if (!isEmpty(taxonomies)) {
        // 1. Detect locale-based structure
        this.isLocaleBasedStructure = this.detectLocaleBasedStructure();

        // 2. Create mapper directory
        fsUtil.makeDirectory(this.taxonomiesMapperDirPath);
        fsUtil.makeDirectory(this.termsMapperDirPath);

        if (this.isLocaleBasedStructure) {
          log.info('Detected locale-based folder structure for taxonomies');
          await this.setupTaxonomiesByLocale(taxonomies);
        } else {
          log.info('Using legacy folder structure for taxonomies');
          await this.setupTaxonomiesLegacy(taxonomies);
        }

        if (this.taxonomiesMapper !== undefined && !isEmpty(this.taxonomiesMapper)) {
          fsUtil.writeFile(this.taxSuccessPath, this.taxonomiesMapper);
        }
        if (this.termsMapper !== undefined && !isEmpty(this.termsMapper)) {
          fsUtil.writeFile(this.termsSuccessPath, this.termsMapper);
        }

        log.success(`The required setup files for taxonomies have been generated successfully.`);
      } else {
        log.info('No taxonomies found in the content folder.');
      }
    } catch (error) {
      handleAndLogError(error, { ...this.config.context }, 'Error generating taxonomies mapper');
    }
  }

  /**
   * Setup taxonomies using legacy format (root-level taxonomy files)
   */
  async setupTaxonomiesLegacy(taxonomies: any): Promise<void> {
    for (const taxonomy of Object.values(taxonomies) as any) {
      let targetTaxonomy: any = await this.getTaxonomies(taxonomy);
      if (!targetTaxonomy) {
        log.info(`Taxonomies with uid '${taxonomy.uid}' not found in the stack!`);
        continue;
      }
      targetTaxonomy = this.sanitizeTaxonomyAttribs(targetTaxonomy);
      this.taxonomiesMapper[taxonomy.uid] = targetTaxonomy;
      const terms = await this.getAllTermsOfTaxonomy(targetTaxonomy);
      if (Array.isArray(terms) && terms.length > 0) {
        log.info(`Terms found for taxonomy '${taxonomy.uid}', processing...`);
        const sanitizedTerms = this.sanitizeTermsAttribs(terms);
        this.termsMapper[taxonomy.uid] = sanitizedTerms;
      } else {
        log.info(`No terms found for taxonomy '${taxonomy.uid}', skipping...`);
      }
    }
  }

  /**
   * Setup taxonomies using locale-based format (taxonomies organized by locale)
   * For locale-based structure, we query the target stack for each taxonomy+locale combination
   */
  async setupTaxonomiesByLocale(taxonomies: any): Promise<void> {
    const locales = this.loadAvailableLocales();

    for (const localeCode of Object.keys(locales)) {
      log.info(`Processing taxonomies for locale: ${localeCode}`);

      for (const taxonomy of Object.values(taxonomies) as any) {
        // Query target stack for this taxonomy in this locale
        let targetTaxonomy: any = await this.getTaxonomies(taxonomy, localeCode);
        if (!targetTaxonomy) {
          log.info(`Taxonomy '${taxonomy.uid}' not found in target stack for locale: ${localeCode}`);
          continue;
        }

        targetTaxonomy = this.sanitizeTaxonomyAttribs(targetTaxonomy);

        // Store with composite key: taxonomyUID_locale
        // const mapperKey = `${taxonomy.uid}_${localeCode}`; // TODO: Unsure about this required or not
        this.taxonomiesMapper[taxonomy.uid] = targetTaxonomy;
        const terms = await this.getAllTermsOfTaxonomy(targetTaxonomy, localeCode);
        if (Array.isArray(terms) && terms.length > 0) {
          log.info(`Terms found for taxonomy '${taxonomy.uid} for locale: ${localeCode}', processing...`);
          const sanitizedTerms = this.sanitizeTermsAttribs(terms);
          this.termsMapper[taxonomy.uid] = sanitizedTerms;
        } else {
          log.info(`No terms found for taxonomy '${taxonomy.uid} for locale: ${localeCode}', skipping...`);
        }
      }
    }
  }

  /**
   * Detect if locale-based folder structure exists
   * @returns {boolean} true if locale-based structure detected, false otherwise
   */
  detectLocaleBasedStructure(): boolean {
    const masterLocaleCode = this.getMasterLocaleCode();
    const masterLocaleFolder = join(this.taxonomiesFolderPath, masterLocaleCode);

    // Check if master locale folder exists (indicates new locale-based structure)
    if (!fileHelper.fileExistsSync(masterLocaleFolder)) {
      log.info('No locale-based folder structure detected');
      return false;
    }

    log.info('Locale-based folder structure detected');
    return true;
  }

  /**
   * Get the master locale code
   * First tries to read from master-locale.json, then falls back to config, then 'en-us'
   * @returns {string} The master locale code
   */
  getMasterLocaleCode(): string {
    // Try to read from master-locale.json file
    if (fileHelper.fileExistsSync(this.masterLocaleFilePath)) {
      try {
        const masterLocaleData = fsUtil.readFile(this.masterLocaleFilePath, true) as Record<
          string,
          Record<string, any>
        >;
        // The file contains an object with UID as key, extract the code
        const firstLocale = Object.values(masterLocaleData)[0];
        if (firstLocale?.code) {
          log.info(`Master locale loaded from file: ${firstLocale.code}`);
          return firstLocale.code;
        }
      } catch (error) {
        log.warn('Error reading master-locale.json, using fallback', { error });
      }
    }

    // Fallback to config or default
    const fallbackCode = this.config.master_locale?.code || 'en-us';
    log.info(`Using fallback master locale: ${fallbackCode}`);
    return fallbackCode;
  }

  /**
   * Load available locales from locales file
   * @returns {Record<string, string>} Map of locale codes
   */
  loadAvailableLocales(): Record<string, string> {
    const locales: Record<string, string> = {};

    // First, get the master locale
    const masterLocaleCode = this.getMasterLocaleCode();
    locales[masterLocaleCode] = masterLocaleCode;

    // Then load additional locales from locales.json if it exists
    if (!fileHelper.fileExistsSync(this.localesFilePath)) {
      log.info('No locales file found, using only master locale');
      return locales;
    }

    try {
      const localesData = fsUtil.readFile(this.localesFilePath, true) as Record<string, Record<string, any>>;

      for (const [uid, locale] of Object.entries(localesData)) {
        if (locale?.code) {
          locales[locale.code] = locale.code;
        }
      }

      log.info(`Loaded ${Object.keys(locales).length} locales (1 master + ${Object.keys(locales).length - 1} additional)`);
      return locales;
    } catch (error) {
      log.error('Error loading locales file, using only master locale', { error });
      return locales;
    }
  }

  /**
   * Retrieves the taxonomies based on the provided taxonomy UID.
   *
   * @param taxonomy - The UID of the taxonomy to retrieve.
   * @param locale - Optional locale code to query taxonomy in specific locale
   * @returns A promise that resolves to the retrieved taxonomies.
   */
  async getTaxonomies(taxonomy: any, locale?: string): Promise<any> {
    const query: any = {};
    if (locale) {
      query.locale = locale;
    }

    return await this.stackAPIClient
      .taxonomy(taxonomy.uid)
      .fetch(query)
      .then((data: any) => data)
      .catch((err: any) => this.handleTaxonomyErrorMsg(err, taxonomy.uid, locale));
  }

  /**
   * Sanitizes the attributes of a taxonomy object.
   *
   * @param taxonomy - The taxonomy object to sanitize.
   * @returns The sanitized taxonomy object with invalid keys omitted.
   */
  sanitizeTaxonomyAttribs(taxonomy: Record<string, string>) {
    return omit(taxonomy, this.taxonomiesConfig.invalidKeys);
  }

  /**
   * Retrieves all terms of a taxonomy.
   *
   * @param taxonomy - The taxonomy object.
   * @param locale - Optional locale code to query terms in specific locale
   * @param skip - The number of terms to skip (default: 0).
   * @param terms - An array to store the retrieved terms (default: []).
   * @returns A promise that resolves to an array of terms.
   */
  async getAllTermsOfTaxonomy(taxonomy: any, locale?: string, skip = 0, terms: any[] = []): Promise<any> {
    const queryParams: TaxonomyQueryParams = {
      include_count: true,
      limit: 100,
      skip,
      depth: 0,
    };

    if (locale) {
      queryParams.locale = locale;
    }

    await this.stackAPIClient
      .taxonomy(taxonomy.uid)
      .terms()
      .query(queryParams)
      .find()
      .then((data: any) => {
        terms = terms.concat(data.items);
        if (data.count >= skip + queryParams.limit) {
          return this.getAllTermsOfTaxonomy(taxonomy, locale, skip + 100, terms);
        }
      })
      .catch((err: any) => this.handleTaxonomyErrorMsg(err, taxonomy.uid, locale));
    return terms;
  }

  /**
   * Sanitizes the attributes of the given terms.
   *
   * @param terms - An array of terms to sanitize.
   * @returns The sanitized terms.
   */
  sanitizeTermsAttribs(terms: Record<string, unknown>[]) {
    for (let index = 0; index < terms?.length; index++) {
      terms[index] = omit(terms[index], this.taxonomiesConfig.invalidKeys);
    }
    return terms;
  }

  handleTaxonomyErrorMsg(err: any, taxonomyUid?: string, locale?: string) {
    const context = locale ? ` for locale: ${locale}` : '';
    const taxInfo = taxonomyUid ? ` (${taxonomyUid}${context})` : '';

    if (err?.errorMessage || err?.message) {
      const errorMsg = err?.errorMessage || err?.errors?.taxonomy || err?.errors?.term || err?.message;
      log.error(`${errorMsg}${taxInfo}`, { error: err, taxonomyUid, locale });
    } else {
      log.error(`Error fetching taxonomy data${taxInfo}!`, { error: err, taxonomyUid, locale });
    }
  }
}
