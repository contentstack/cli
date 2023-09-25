import isEmpty from 'lodash/isEmpty';
import values from 'lodash/values';
import keys from 'lodash/keys';
import flatten from 'lodash/flatten';
import { join, resolve as pResolve } from 'node:path';
import { cliux, configHandler, HttpClient } from '@contentstack/cli-utilities';

import config from '../../config';
import { log, formatError, fsUtil, fileHelper } from '../../utils';
import BaseClass, { ApiOptions } from './base-class';
import { ModuleClassParams, TaxonomiesConfig, TermsConfig } from '../../types';

//NOTE: Temp types need to remove once sdk available
type TaxonomyPayload = {
  baseUrl: string;
  url: string;
  mgToken: string;
  reqPayload: Record<string, unknown>;
  headers: Record<string, unknown>;
};

export default class ImportTaxonomies extends BaseClass {
  private taxonomiesMapperDirPath: string;
  private termsMapperDirPath: string;
  private taxonomiesFolderPath: string;
  private termsFolderPath: string;
  private taxSuccessPath: string;
  private taxFailsPath: string;
  private taxonomiesConfig: TaxonomiesConfig;
  private termsConfig: TermsConfig;
  private taxonomies: Record<string, unknown>;
  private taxonomiesSuccess: Record<string, unknown> = {};
  private taxonomiesFailed: Record<string, unknown> = {};
  private taxonomyPayload: TaxonomyPayload;

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.taxonomiesConfig = importConfig.modules.taxonomies;
    this.termsConfig = importConfig.modules.terms;
    this.taxonomiesMapperDirPath = join(importConfig.backupDir, 'mapper', 'taxonomies');
    this.termsMapperDirPath = join(this.taxonomiesMapperDirPath, 'terms');
    this.taxonomiesFolderPath = join(importConfig.backupDir, this.taxonomiesConfig.dirName);
    this.termsFolderPath = join(this.taxonomiesFolderPath, this.termsConfig.dirName);
    this.taxSuccessPath = join(this.taxonomiesMapperDirPath, 'success.json');
    this.taxFailsPath = join(this.taxonomiesMapperDirPath, 'fails.json');
    this.taxonomyPayload = {
      baseUrl: '',
      url: '',
      mgToken: importConfig.management_token,
      reqPayload: {},
      headers: {
        'Content-Type': 'application/json',
        api_key: importConfig.target_stack,
      },
    };
  }

  /**
   * @method start
   * @returns {Promise<void>} Promise<void>
   */
  async start(): Promise<void> {
    log(this.importConfig, 'Migrating taxonomies', 'info');

    //Step1 check folder exists or not
    if (fileHelper.fileExistsSync(this.taxonomiesFolderPath)) {
      this.taxonomies = fsUtil.readFile(join(this.taxonomiesFolderPath, 'taxonomies.json'), true) as Record<
        string,
        unknown
      >;
    } else {
      log(this.importConfig, `No such file or directory - '${this.taxonomiesFolderPath}'`, 'error');
      return;
    }

    //NOTE - Temp code for api request
    const { cma } = configHandler.get('region') || {};
    this.taxonomyPayload.baseUrl = `${cma}/v3/taxonomies`;
    this.taxonomyPayload.url = this.taxonomyPayload.baseUrl;
    if (this.taxonomyPayload?.mgToken) this.taxonomyPayload.headers['authorization'] = this.taxonomyPayload.mgToken;
    else this.taxonomyPayload.headers['authtoken'] = configHandler.get('authtoken');

    //Step 2 create taxonomies & terms mapper directory
    await fsUtil.makeDirectory(this.taxonomiesMapperDirPath);
    await fsUtil.makeDirectory(this.termsMapperDirPath);

    await this.importTaxonomies();
    // create terms related to respective taxonomy
    if (!fileHelper.fileExistsSync(this.termsFolderPath)) {
      log(this.importConfig, `No such file or directory - '${this.taxonomiesFolderPath}'`, 'error');
      return;
    }
    await this.importTerms();

    if (this.taxonomiesSuccess !== undefined && !isEmpty(this.taxonomiesSuccess)) {
      fsUtil.writeFile(this.taxSuccessPath, this.taxonomiesSuccess);
    }

    if (this.taxonomiesFailed !== undefined &&!isEmpty(this.taxonomiesFailed)) {
      fsUtil.writeFile(this.taxFailsPath, this.taxonomiesFailed);
    }

    log(this.importConfig, 'Taxonomies have been imported successfully!', 'success');
  }

  async importTaxonomies(): Promise<any> {
    if (this.taxonomies === undefined || isEmpty(this.taxonomies)) {
      log(this.importConfig, 'No Taxonomies Found', 'info');
      return;
    }

    const apiContent = values(this.taxonomies);

    const onSuccess = ({
      response: { data, status } = { data: null, status: null },
      apiData: { uid, name } = { uid: null, name: '' },
    }: any) => {
      //NOTE - Temp code to handle error thru API. Will remove this once sdk is ready
      if ([200, 201, 202].includes(status)) {
        this.taxonomiesSuccess[uid] = data;
        log(this.importConfig, `Taxonomy '${name}' imported successfully`, 'success');
      } else {
        let errorMsg;
        if ([500, 503, 502].includes(status)) errorMsg = data?.message || data;
        else errorMsg = data?.error_message;
        this.taxonomiesFailed[uid] = `Taxonomy '${name}' failed to be import. ${JSON.stringify(errorMsg)}`;
        log(this.importConfig, `Taxonomy '${name}' failed to be import. ${JSON.stringify(errorMsg)}`, 'error');
      }
    };

    const onReject = ({ error, apiData }: any) => {
      const err = error?.message ? JSON.parse(error.message) : error;
      const { name } = apiData;
      if (err?.errors?.name) {
        log(this.importConfig, `Taxonomy '${name}' already exists`, 'info');
      } else {
        this.taxonomiesFailed[apiData.uid] = apiData;
        log(this.importConfig, `Taxonomy '${name}' failed to be import ${formatError(error)}`, 'error');
        log(this.importConfig, error, 'error');
      }
    };

    await this.makeConcurrentCall(
      {
        apiContent,
        processName: 'import taxonomies',
        apiParams: {
          serializeData: this.serializeTaxonomy.bind(this),
          reject: onReject,
          resolve: onSuccess,
          entity: 'create-taxonomies',
          includeParamOnCompletion: true,
          additionalInfo: this.taxonomyPayload,
        },
        concurrencyLimit: config.concurrency || config.fetchConcurrency || 1,
      },
      undefined,
      false,
    );
  }

  /**
   * @method serializeTaxonomy
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeTaxonomy(apiOptions: ApiOptions): ApiOptions {
    const { apiData: taxonomy } = apiOptions;
    if (this.taxonomiesSuccess.hasOwnProperty(taxonomy.uid)) {
      log(this.importConfig, `Taxonomy '${taxonomy.title}' already exists. Skipping it to avoid duplicates!`, 'info');
      apiOptions.entity = undefined;
    } else {
      apiOptions.apiData = taxonomy;
    }
    apiOptions.apiData = taxonomy;
    return apiOptions;
  }

  async importTerms(): Promise<any> {
    if (this.taxonomies === undefined || isEmpty(this.taxonomies)) {
      return;
    }

    const listOfTaxonomyUIDs = keys(this.taxonomies);

    const onSuccess = ({
      response,
      apiData: { uid, name, taxonomy_uid } = { uid: null, name: '', taxonomy_uid: '' },
    }: any) => {
      this.taxonomiesSuccess[uid] = response;
      log(this.importConfig, `Term '${name}' imported successfully`, 'success');
    };

    const onReject = ({ error, apiData }: any) => {
      const err = error?.message ? JSON.parse(error.message) : error;
      const { name } = apiData;
      if (err?.errors?.name) {
        log(this.importConfig, `Term '${name}' already exists`, 'info');
      } else {
        this.taxonomiesSuccess[apiData.uid] = apiData;
        log(this.importConfig, `Term '${name}' failed to be import ${formatError(error)}`, 'error');
        log(this.importConfig, error, 'error');
      }
    };

    for (const taxUID of listOfTaxonomyUIDs) {
      const terms = fsUtil.readFile(
        join(this.termsFolderPath, `${taxUID}-${this.termsConfig.fileName}`),
        true,
      ) as Record<string, unknown>;
      const dirPath = pResolve(this.termsMapperDirPath, `${taxUID}-terms`);
      if (!fileHelper.fileExistsSync(dirPath)) {
        await fsUtil.makeDirectory(dirPath);
      }
      //success and fail path for particular taxonomy uid
      const apiContent = values(terms);
      await this.makeConcurrentCall(
        {
          apiContent,
          processName: 'import terms',
          apiParams: {
            serializeData: this.serializeTerms.bind(this),
            reject: onReject,
            resolve: onSuccess,
            entity: 'create-terms',
            includeParamOnCompletion: true,
            additionalInfo: this.taxonomyPayload,
          },
          concurrencyLimit: config.concurrency || config.fetchConcurrency || 1,
        },
        undefined,
        false,
      );
    }
  }

  /**
   * @method serializeTerms
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeTerms(apiOptions: ApiOptions): ApiOptions {
    const { apiData: term } = apiOptions;
    apiOptions.apiData = term;
    return apiOptions;
  }
}
