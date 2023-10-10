import omit from 'lodash/omit';
import keys from 'lodash/keys';
import isEmpty from 'lodash/isEmpty';
import flatten from 'lodash/flatten';
import { resolve as pResolve } from 'node:path';
import { cliux, configHandler, HttpClient } from '@contentstack/cli-utilities';

import BaseClass from './base-class';
import { log, fsUtil } from '../../utils';
import { TaxonomiesConfig, TermsConfig, ModuleClassParams } from '../../types';

//NOTE: Temp types need to remove once sdk available
type TaxonomyPayload = {
  baseUrl: string;
  url: string;
  mgToken: string;
  apiKey: string;
};

export default class ExportTaxonomies extends BaseClass {
  private taxonomies: Record<string, Record<string, string>>;
  private terms: Record<string, Record<string, string>>;
  private taxonomiesConfig: TaxonomiesConfig;
  private taxonomyPayload: TaxonomyPayload;
  private termsConfig: TermsConfig;
  public taxonomiesFolderPath: string;
  public termsFolderPath: string;

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.taxonomies = {};
    this.terms = {};
    this.taxonomiesConfig = exportConfig.modules.taxonomies;
    this.termsConfig = exportConfig.modules.terms;
    this.taxonomyPayload = {
      baseUrl: '',
      url: '',
      mgToken: exportConfig.management_token,
      apiKey: exportConfig.source_stack,
    };
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

    const { cma } = configHandler.get('region') || {};
    this.taxonomyPayload.baseUrl = `${cma}/v3/taxonomies`;
    this.taxonomyPayload.url = this.taxonomyPayload.baseUrl;
    
    //fetch all taxonomies and write into taxonomies folder
    await this.getAllTaxonomies(this.taxonomyPayload);
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
   * @param {TaxonomyPayload} payload
   * @param {number} skip
   * @returns
   */
  async getAllTaxonomies(payload: TaxonomyPayload, skip = 0): Promise<any> {
    const response = await this.apiRequestHandler(payload, skip);
    if (response?.taxonomies) {
      skip += this.taxonomiesConfig.limit || 100;
      this.sanitizeTaxonomiesAttribs(response.taxonomies);
      if (skip >= response?.count) {
        return;
      } else {
        return await this.getAllTaxonomies(payload, skip);
      }
    }
    return;
  }

  /**
   * remove invalid keys and write data into taxonomies
   * @function sanitizeTaxonomiesAttribs
   * @param taxonomies
   */
  sanitizeTaxonomiesAttribs(taxonomies: Record<string, string>[]) {
    for (let index = 0; index < taxonomies?.length; index++) {
      const taxonomyUID = taxonomies[index].uid;
      const taxonomyName = taxonomies[index]?.name;
      this.taxonomies[taxonomyUID] = omit(taxonomies[index], this.taxonomiesConfig.invalidKeys);
      log(this.exportConfig, `'${taxonomyName}' taxonomy exported successfully!`, 'success');
    }
  }

  /**
   * fetch all terms of respective taxonomy and write it into <taxonomy-uid>-terms file
   */
  async getAllTerms() {
    const taxonomiesUID = keys(this.taxonomies) || [];
    for (let index = 0; index < taxonomiesUID?.length; index++) {
      const taxonomyUID = taxonomiesUID[index];
      this.taxonomyPayload.url = `${this.taxonomyPayload.baseUrl}/${taxonomyUID}/terms`;
      this.terms = {};
      await this.fetchTermsOfTaxonomy(this.taxonomyPayload);

      if (this.terms === undefined || isEmpty(this.terms)) {
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
   * @param {TaxonomyPayload} payload
   * @param {number} skip
   * @returns
   */
  async fetchTermsOfTaxonomy(payload: TaxonomyPayload, skip = 0): Promise<any> {
    const response = await this.apiRequestHandler(payload, skip);
    if (response?.terms) {
      skip += this.termsConfig.limit || 100;
      this.sanitizeTermsAttribs(response.terms);
      if (skip >= response?.count) {
        return;
      } else {
        return await this.fetchTermsOfTaxonomy(payload, skip);
      }
    }
    return;
  }

  /**
   * remove invalid keys and write data into taxonomies
   * @function sanitizeTaxonomiesAttribs
   * @param terms
   */
  sanitizeTermsAttribs(terms: Record<string, string>[]) {
    for (let index = 0; index < terms?.length; index++) {
      const termUID = terms[index]?.uid;
      this.terms[termUID] = omit(terms[index], this.termsConfig.invalidKeys);
    }
  }

  //NOTE: Temp code need to remove once sdk available
  async apiRequestHandler(payload: TaxonomyPayload, skip: number) {
    const headers: any = {
      api_key: payload.apiKey,
      'Content-Type': 'application/json',
    };

    if (payload?.mgToken) headers['authorization'] = payload.mgToken;
    else headers['authToken'] = configHandler.get('authtoken');

    const params = {
      include_count: true,
      skip: 0,
      limit: this.taxonomiesConfig.limit || 100,
      depth: 0 // include all the terms if set to 0
    };

    if (skip >= 0) params['skip'] = skip;

    return await new HttpClient()
      .headers(headers)
      .queryParams(params)
      .get(payload.url)
      .then((res: any) => {
        //NOTE - temporary code for handling api errors response
        const { status, data } = res;
        if ([200, 201, 202].includes(status)) return data;
        else {
          let errorMsg;
          if ([500, 503, 502].includes(status)) errorMsg = data?.message || data;
          else errorMsg = data?.error_message;
          if (errorMsg === undefined) {
            errorMsg = Object.values(data?.errors) && flatten(Object.values(data.errors));
          }
          cliux.print(`Error: ${errorMsg}`, { color: 'red' });
        }
      })
      .catch((err: any) => this.handleErrorMsg(err));
  }

  //NOTE: Temp code need to remove once sdk available
  handleErrorMsg(err: any) {
    if (err?.errorMessage) {
      cliux.print(`Error: ${err.errorMessage}`, { color: 'red' });
    } else if (err?.message) {
      cliux.print(`Error: ${err.message}`, { color: 'red' });
    } else {
      cliux.print(`Error: Something went wrong! Please try again.`, { color: 'red' });
    }
  }
}
