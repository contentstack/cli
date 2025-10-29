import { join } from 'path';
import omit from 'lodash/omit';
import isEmpty from 'lodash/isEmpty';

import { log, fsUtil, fileHelper } from '../../utils';
import { ImportConfig, ModuleClassParams, TaxonomyQueryParams } from '../../types';
import { sanitizePath } from '@contentstack/cli-utilities';

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

  constructor({ config, stackAPIClient }: ModuleClassParams) {
    this.config = config;
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
          log(this.config, 'Detected locale-based folder structure for taxonomies', 'info');
          await this.setupTaxonomiesByLocale(taxonomies);
        } else {
          log(this.config, 'Using legacy folder structure for taxonomies', 'info');
          await this.setupTaxonomiesLegacy(taxonomies);
        }

        if (this.taxonomiesMapper !== undefined && !isEmpty(this.taxonomiesMapper)) {
          fsUtil.writeFile(this.taxSuccessPath, this.taxonomiesMapper);
        }
        if (this.termsMapper !== undefined && !isEmpty(this.termsMapper)) {
          fsUtil.writeFile(this.termsSuccessPath, this.termsMapper);
        }

        log(this.config, `The required setup files for taxonomies have been generated successfully.`, 'success');
      } else {
        log(this.config, 'No taxonomies found in the content folder.', 'info');
      }
    } catch (error) {
      log(this.config, `Error generating taxonomies mapper: ${error.message}`, 'error');
    }
  }

  /**
   * Setup taxonomies using legacy format (root-level taxonomy files)
   */
  async setupTaxonomiesLegacy(taxonomies: any): Promise<void> {
    for (const taxonomy of Object.values(taxonomies) as any) {
      let targetTaxonomy: any = await this.getTaxonomies(taxonomy);
      if (!targetTaxonomy) {
        log(this.config, `Taxonomies with uid '${taxonomy.uid}' not found in the stack!`, 'info');
        continue;
      }
      targetTaxonomy = this.sanitizeTaxonomyAttribs(targetTaxonomy);
      this.taxonomiesMapper[taxonomy.uid] = targetTaxonomy;
      const terms = await this.getAllTermsOfTaxonomy(targetTaxonomy);
      const sanitizedTerms = this.sanitizeTermsAttribs(terms);
      this.termsMapper[taxonomy.uid] = sanitizedTerms;
    }
  }

  /**
   * Setup taxonomies using locale-based format (taxonomies organized by locale)
   * For locale-based structure, we query the target stack for each taxonomy+locale combination
   */
  async setupTaxonomiesByLocale(taxonomies: any): Promise<void> {
    const locales = this.loadAvailableLocales();

    for (const localeCode of Object.keys(locales)) {
      log(this.config, `Processing taxonomies for locale: ${localeCode}`, 'info');

      for (const taxonomy of Object.values(taxonomies) as any) {
        // Query target stack for this taxonomy in this locale
        let targetTaxonomy: any = await this.getTaxonomies(taxonomy, localeCode);
        if (!targetTaxonomy) {
          log(this.config, `Taxonomy '${taxonomy.uid}' not found in target stack for locale: ${localeCode}`, 'info');
          continue;
        }

        targetTaxonomy = this.sanitizeTaxonomyAttribs(targetTaxonomy);

        // Store with composite key: taxonomyUID_locale
        const mapperKey = `${taxonomy.uid}_${localeCode}`;
        this.taxonomiesMapper[mapperKey] = targetTaxonomy;

        // Get terms for this taxonomy+locale from target stack
        const terms = await this.getAllTermsOfTaxonomy(targetTaxonomy, localeCode);
        const sanitizedTerms = this.sanitizeTermsAttribs(terms);
        this.termsMapper[mapperKey] = sanitizedTerms;
      }
    }
  }

  /**
   * Detect if locale-based folder structure exists
   * @returns {boolean} true if locale-based structure detected, false otherwise
   */
  detectLocaleBasedStructure(): boolean {
    const masterLocaleCode = this.config.master_locale?.code || 'en-us';
    const masterLocaleFolder = join(this.taxonomiesFolderPath, masterLocaleCode);

    // Check if master locale folder exists (indicates new locale-based structure)
    if (!fileHelper.fileExistsSync(masterLocaleFolder)) {
      log(this.config, 'No locale-based folder structure detected', 'info');
      return false;
    }

    log(this.config, 'Locale-based folder structure detected', 'info');
    return true;
  }

  /**
   * Load available locales from locales file
   * @returns {Record<string, string>} Map of locale codes
   */
  loadAvailableLocales(): Record<string, string> {
    if (!fileHelper.fileExistsSync(this.localesFilePath)) {
      log(this.config, 'No locales file found, using default locale', 'info');
      return { [this.config.master_locale?.code || 'en-us']: this.config.master_locale?.code || 'en-us' };
    }

    try {
      const localesData = fsUtil.readFile(this.localesFilePath, true) as Record<string, Record<string, any>>;
      const locales: Record<string, string> = {};
      locales[this.config.master_locale?.code] = this.config.master_locale?.code;

      for (const [code, locale] of Object.entries(localesData)) {
        if (locale?.code) {
          locales[locale.code] = code;
        }
      }

      log(this.config, `Loaded ${Object.keys(locales).length} locales from file`, 'info');
      return locales;
    } catch (error) {
      log(this.config, 'Error loading locales file', 'error');
      return { [this.config.master_locale?.code || 'en-us']: this.config.master_locale?.code || 'en-us' };
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
      log(this.config, `${errorMsg}${taxInfo}`, 'error');
    } else {
      log(this.config, `Error fetching taxonomy data${taxInfo}!`, 'error');
      log(this.config, err, 'error');
    }
  }
}
