import { join } from 'path';
import omit from 'lodash/omit';
import isEmpty from 'lodash/isEmpty';

import { log, fsUtil } from '../../utils';
import { ImportConfig, ModuleClassParams, TaxonomyQueryParams } from '../../types';

export default class TaxonomiesImportSetup {
  private config: ImportConfig;
  private taxonomiesFilePath: string;
  private stackAPIClient: ModuleClassParams['stackAPIClient'];
  private dependencies: ModuleClassParams['dependencies'];
  private taxonomiesConfig: ImportConfig['modules']['taxonomies'];
  private termsSuccessPath: string;
  private taxSuccessPath: string;
  private taxonomiesMapperDirPath: string;
  private termsMapperDirPath: string;
  public taxonomiesMapper: Record<string, unknown> = {};
  public termsMapper: Record<string, unknown> = {};

  constructor({ config, stackAPIClient }: ModuleClassParams) {
    this.config = config;
    this.stackAPIClient = stackAPIClient;
    this.taxonomiesFilePath = join(this.config.contentDir, 'taxonomies', 'taxonomies.json');
    this.taxonomiesConfig = config.modules.taxonomies;
    this.taxonomiesMapperDirPath = join(this.config.backupDir, 'mapper', 'taxonomies');
    this.taxSuccessPath = join(this.taxonomiesMapperDirPath, 'success.json');
    this.termsMapperDirPath = join(this.taxonomiesMapperDirPath, 'terms');
    this.termsSuccessPath = join(this.termsMapperDirPath, 'success.json');
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
        // 2. Create mapper directory
        fsUtil.makeDirectory(this.taxonomiesMapperDirPath);
        fsUtil.makeDirectory(this.termsMapperDirPath);

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

        if (this.taxonomiesMapper !== undefined && !isEmpty(this.taxonomiesMapper)) {
          fsUtil.writeFile(this.taxSuccessPath, this.taxonomiesMapper);
        }
        if (this.termsMapper !== undefined && !isEmpty(this.termsMapper)) {
          fsUtil.writeFile(this.termsSuccessPath, this.termsMapper);
        }

        log(this.config, `Generated required setup files for taxonomies`, 'success');
      } else {
        log(this.config, 'No taxonomies found in the content folder!', 'info');
      }
    } catch (error) {
      log(this.config, `Error generating taxonomies mapper: ${error.message}`, 'error');
    }
  }

  /**
   * Retrieves the taxonomies based on the provided taxonomy UID.
   *
   * @param taxonomy - The UID of the taxonomy to retrieve.
   * @returns A promise that resolves to the retrieved taxonomies.
   */
  async getTaxonomies(taxonomy: any): Promise<any> {
    return await this.stackAPIClient
      .taxonomy(taxonomy.uid)
      .fetch()
      .then((data: any) => data)
      .catch((err: any) => this.handleTaxonomyErrorMsg(err));
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
   * @param skip - The number of terms to skip (default: 0).
   * @param terms - An array to store the retrieved terms (default: []).
   * @returns A promise that resolves to an array of terms.
   */
  async getAllTermsOfTaxonomy(taxonomy: any, skip = 0, terms: any[] = []): Promise<any> {
    const queryParams: TaxonomyQueryParams = {
      include_count: true,
      limit: 100,
      skip,
    };

    if (skip >= 0) queryParams['skip'] = skip || 0;
    queryParams['depth'] = 0;

    await this.stackAPIClient
      .taxonomy(taxonomy.uid)
      .terms()
      .query(queryParams)
      .find()
      .then((data: any) => {
        terms = terms.concat(data.items);
        if (data.count >= skip + queryParams.limit) {
          return this.getAllTermsOfTaxonomy(taxonomy, skip + 100, terms);
        }
      })
      .catch((err: any) => this.handleTaxonomyErrorMsg(err));
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

  handleTaxonomyErrorMsg(err: any) {
    if (err?.errorMessage || err?.message) {
      const errorMsg = err?.errorMessage || err?.errors?.taxonomy || err?.errors?.term || err?.message;
      log(this.config, errorMsg, 'error');
    } else {
      log(this.config, 'Error fetching taxonomy data!', 'error');
      log(this.config, err, 'error');
    }
  }
}
