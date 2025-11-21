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
  private isLocaleBasedStructure = false;
  public taxonomiesMapper: Record<string, unknown> = {};
  public termsMapper: Record<string, unknown> = {};
  public masterLocaleFilePath: string;

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
      if (Array.isArray(terms) && terms.length > 0) {
        log(this.config, `Terms found for taxonomy '${taxonomy.uid}', processing...`, 'info');
        const sanitizedTerms = this.sanitizeTermsAttribs(terms);
        this.termsMapper[taxonomy.uid] = sanitizedTerms;
      } else {
        log(this.config, `No terms found for taxonomy '${taxonomy.uid}', skipping...`, 'info');
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
        // const mapperKey = `${taxonomy.uid}_${localeCode}`; // TODO: Unsure about this required or not
        this.taxonomiesMapper[taxonomy.uid] = targetTaxonomy;
        const terms = await this.getAllTermsOfTaxonomy(targetTaxonomy, localeCode);
        if (Array.isArray(terms) && terms.length > 0) {
          log(
            this.config,
            `Terms found for taxonomy '${taxonomy.uid} for locale: ${localeCode}', processing...`,
            'info',
          );
          const sanitizedTerms = this.sanitizeTermsAttribs(terms);
          this.termsMapper[taxonomy.uid] = sanitizedTerms;
        } else {
          log(
            this.config,
            `No terms found for taxonomy '${taxonomy.uid} for locale: ${localeCode}', skipping...`,
            'info',
          );
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
      log(this.config, 'No locale-based folder structure detected', 'info');
      return false;
    }

    log(this.config, 'Locale-based folder structure detected', 'info');
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
          log(this.config, `Master locale loaded from file: ${firstLocale.code}`, 'info');
          return firstLocale.code;
        }
      } catch (error) {
        log(this.config, 'Error reading master-locale.json, using fallback', 'warn');
      }
    }

    // Fallback to config or default
    const fallbackCode = this.config.master_locale?.code || 'en-us';
    log(this.config, `Using fallback master locale: ${fallbackCode}`, 'info');
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
      log(this.config, 'No locales file found, using only master locale', 'info');
      return locales;
    }

    try {
      const localesData = fsUtil.readFile(this.localesFilePath, true) as Record<string, Record<string, any>>;

      for (const [uid, locale] of Object.entries(localesData)) {
        if (locale?.code) {
          locales[locale.code] = locale.code;
        }
      }

      log(
        this.config,
        `Loaded ${Object.keys(locales).length} locales (1 master + ${Object.keys(locales).length - 1} additional)`,
        'info',
      );
      return locales;
    } catch (error) {
      log(this.config, 'Error loading locales file, using only master locale', 'error');
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
      log(this.config, `${errorMsg}${taxInfo}`, 'error');
    } else {
      log(this.config, `Error fetching taxonomy data${taxInfo}!`, 'error');
      log(this.config, err, 'error');
    }
  }
}
