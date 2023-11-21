import omit from 'lodash/omit';
import keys from 'lodash/keys';
import isEmpty from 'lodash/isEmpty';
import { resolve as pResolve } from 'node:path';

import BaseClass from './base-class';
import { log, fsUtil } from '../../utils';
import { TaxonomiesConfig, TermsConfig, ModuleClassParams } from '../../types';

export default class ExportTaxonomies extends BaseClass {
  private taxonomies: Record<string, Record<string, string>>;
  private terms: Record<string, unknown>[];
  private taxonomiesConfig: TaxonomiesConfig;
  private termsConfig: TermsConfig;
  private qs: {
    include_count: boolean;
    skip: number;
    asc: string;
    depth?: number;
  };
  public taxonomiesFolderPath: string;
  public termsFolderPath: string;

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.taxonomies = {};
    this.terms = [];
    this.taxonomiesConfig = exportConfig.modules.taxonomies;
    this.termsConfig = exportConfig.modules.terms;
    this.qs = { include_count: true, skip: 0, asc: 'created_at' };
  }

  async start(): Promise<void> {
    log(this.exportConfig, 'Starting taxonomies export', 'info');

    //create taxonomies and terms folder in data directory path
    this.taxonomiesFolderPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.taxonomiesConfig.dirName,
    );
    await fsUtil.makeDirectory(this.taxonomiesFolderPath);
    this.termsFolderPath = pResolve(this.taxonomiesFolderPath, this.termsConfig.dirName);
    await fsUtil.makeDirectory(this.termsFolderPath);

    //fetch all taxonomies and write into taxonomies folder
    await this.getAllTaxonomies();
    if (this.taxonomies === undefined || isEmpty(this.taxonomies)) {
      log(this.exportConfig, 'No taxonomies found!', 'info');
      return;
    } else {
      fsUtil.writeFile(pResolve(this.taxonomiesFolderPath, this.taxonomiesConfig.fileName), this.taxonomies);
      log(this.exportConfig, 'All taxonomies exported successfully!', 'success');
    }

    //fetch all terms of respective and write into taxonomies/terms folder
    await this.getAllTerms();
  }

  /**
   * fetch all taxonomies in the provided stack
   * @param {number} skip
   * @returns {Promise<any>}
   */
  async getAllTaxonomies(skip = 0): Promise<any> {
    if (skip) {
      this.qs.skip = skip;
    }
    await this.stack
      .taxonomy()
      .query(this.qs)
      .find()
      .then(async (data: any) => {
        const { items, count } = data;
        const taxonomiesCount = count !== undefined ? count : items?.length;

        if (items?.length) {
          this.sanitizeTaxonomiesAttribs(items);
          skip += this.taxonomiesConfig.limit || 100;
          if (skip >= taxonomiesCount) {
            return;
          }
          return await this.getAllTaxonomies(skip);
        }
      })
      .catch((error: any) => {
        this.handleErrorMsg(error);
      });
  }

  /**
   * remove invalid keys and write data into taxonomies
   * @function sanitizeTaxonomiesAttribs
   * @param taxonomies
   */
  sanitizeTaxonomiesAttribs(taxonomies: Record<string, string>[]) {
    for (let index = 0; index < taxonomies?.length; index++) {
      const taxonomyUID = taxonomies[index].uid;
      this.taxonomies[taxonomyUID] = omit(taxonomies[index], this.taxonomiesConfig.invalidKeys);
      log(this.exportConfig, `'${taxonomyUID}' taxonomy exported successfully!`, 'success');
    }
  }

  /**
   * fetch all terms of respective taxonomy and write it into <taxonomy-uid>-terms file
   * @returns {Promise<void>}
   */
  async getAllTerms() {
    const taxonomiesUID = keys(this.taxonomies) || [];
    this.qs.depth = 0;

    for (let index = 0; index < taxonomiesUID?.length; index++) {
      const taxonomyUID = taxonomiesUID[index];
      this.terms = [];
      await this.fetchTermsOfTaxonomy(taxonomyUID);
      if (!this.terms?.length) {
        log(this.exportConfig, `No terms found for taxonomy - '${taxonomyUID}'!`, 'info');
      } else {
        fsUtil.writeFile(pResolve(this.termsFolderPath, `${taxonomyUID}-${this.termsConfig.fileName}`), this.terms);
        log(this.exportConfig, `Terms from taxonomy '${taxonomyUID}' exported successfully!`, 'success');
      }
    }
    log(this.exportConfig, `All the terms exported successfully!`, 'success');
  }

  /**
   * fetch all terms of the provided taxonomy uid
   * @async
   * @param {string} taxonomyUID
   * @param {number} skip
   * @returns {Promise<any>}
   */
  async fetchTermsOfTaxonomy(taxonomyUID: string, skip = 0): Promise<any> {
    if (skip) {
      this.qs.skip = skip;
    }
    await this.stack
      .taxonomy(taxonomyUID)
      .terms()
      .query(this.qs)
      .find()
      .then(async (data: any) => {
        const { items, count } = data;
        const termsCount = count !== undefined ? count : items?.length;

        if (items?.length) {
          this.sanitizeTermsAttribs(items);
          skip += this.taxonomiesConfig.limit || 100;
          if (skip >= termsCount) {
            return;
          }
          return await this.fetchTermsOfTaxonomy(taxonomyUID, skip);
        }
      })
      .catch((error: any) => {
        this.handleErrorMsg(error);
      });
  }

  /**
   * remove invalid keys and write data into taxonomies
   * @function sanitizeTaxonomiesAttribs
   * @param terms
   */
  sanitizeTermsAttribs(terms: Record<string, string>[]) {
    for (let index = 0; index < terms?.length; index++) {
      const term = omit(terms[index], this.termsConfig.invalidKeys);
      this.terms.push(term)
    }
  }

  handleErrorMsg(err: any) {
    if (err?.errorMessage) {
      log(this.exportConfig, `Failed to export! ${err.errorMessage}`, 'error');
    } else if (err?.message) {
      const errorMsg = err?.errors?.taxonomy || err?.errors?.term || err?.message;
      log(this.exportConfig, `Failed to export! ${errorMsg}`, 'error');
    }else{
      log(this.exportConfig, `Failed to export! ${err}`, 'error');
    }
  }
}
