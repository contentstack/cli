import keys from 'lodash/keys';
import pick from 'lodash/pick';
import { join } from 'node:path';
import values from 'lodash/values';
import isEmpty from 'lodash/isEmpty';

import BaseClass, { ApiOptions } from './base-class';
import { log, formatError, fsUtil, fileHelper } from '../../utils';
import { ModuleClassParams, TaxonomiesConfig, TermsConfig } from '../../types';


export default class ImportTaxonomies extends BaseClass {
  private taxonomiesMapperDirPath: string;
  private taxonomiesFolderPath: string;
  private taxSuccessPath: string;
  private taxFailsPath: string;
  private taxonomiesConfig: TaxonomiesConfig;
  private taxonomies: Record<string, unknown>;
  private termsFolderPath: string;
  private termsMapperDirPath: string;
  private termsConfig: TermsConfig;
  private termsSuccessPath: string;
  private termsFailsPath: string;
  public taxonomiesSuccess: Record<string, unknown> = {};
  public taxonomiesFailed: Record<string, unknown> = {};
  public termsSuccess: Record<string, Record<string, unknown>> = {};
  public termsFailed: Record<string, Record<string, unknown>> = {};
  public terms: Record<string, unknown> = {};
  public taxonomyUIDs: string[] = [];

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
    this.termsSuccessPath = join(this.termsMapperDirPath, 'success.json');
    this.termsFailsPath = join(this.termsMapperDirPath, 'fails.json');
  }

  /**
   * @method start
   * @returns {Promise<void>} Promise<void>
   */
  async start(): Promise<void> {
    log(this.importConfig, 'Migrating taxonomies...', 'info');

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

    //Step 2 create taxonomies & terms mapper directory
    await fsUtil.makeDirectory(this.taxonomiesMapperDirPath);
    await fsUtil.makeDirectory(this.termsMapperDirPath);

    //Step 3 import taxonomy and create success & failure file
    await this.importTaxonomies();
    this.createTaxonomySuccessAndFailedFile();

    if (!fileHelper.fileExistsSync(this.termsFolderPath)) {
      log(this.importConfig, `No such file or directory - '${this.termsFolderPath}'`, 'error');
      return;
    }
    //Step 4 import terms and create success & failure file
    await this.importTerms();
    this.createTermSuccessAndFailedFile();

    log(this.importConfig, 'Taxonomies imported successfully!', 'success');
  }

  /**
   * create taxonomy and enter success & failure related data into taxonomies mapper file
   * @method importTaxonomies
   * @async
   * @returns {Promise<any>} Promise<any>
   */
  async importTaxonomies(): Promise<any> {
    if (this.taxonomies === undefined || isEmpty(this.taxonomies)) {
      log(this.importConfig, 'No Taxonomies Found!', 'info');
      return;
    }

    const apiContent = values(this.taxonomies) as Record<string, any>[];
    this.taxonomyUIDs = keys(this.taxonomies);

    const onSuccess = ({ response }: any) => {
      const { uid, name } = response;
      this.taxonomiesSuccess[uid] = pick(response, ['name', 'description']);
      log(this.importConfig, `Taxonomy '${name}' imported successfully!`, 'success');
    };

    const onReject = ({ error, apiData }: any) => {
      const err = error?.message ? JSON.parse(error.message) : error;
      const { name } = apiData;
      if (err?.errors?.taxonomy) {
        if (err?.errorCode === 0) {
          log(this.importConfig, `Taxonomy '${name}' already exists!`, 'info');
        } else {
          this.taxonomiesFailed[apiData.uid] = apiData;
          log(this.importConfig, `Taxonomy '${name}' failed to be import! ${err.errors.taxonomy}`, 'error');
        }
      } else {
        this.taxonomiesFailed[apiData.uid] = apiData;
        log(this.importConfig, `Taxonomy '${name}' failed to be import! ${formatError(error)}`, 'error');
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
          includeParamOnCompletion: true
        },
        concurrencyLimit: this.importConfig.concurrency || this.importConfig.fetchConcurrency || 1,
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
    apiOptions.apiData = taxonomy;
    return apiOptions;
  }

  /**
   * create taxonomies success and fail in (mapper/taxonomies)
   * @method createTaxonomySuccessAndFailedFile
   */
  createTaxonomySuccessAndFailedFile() {
    if (this.taxonomiesSuccess !== undefined && !isEmpty(this.taxonomiesSuccess)) {
      fsUtil.writeFile(this.taxSuccessPath, this.taxonomiesSuccess);
    }

    if (this.taxonomiesFailed !== undefined && !isEmpty(this.taxonomiesFailed)) {
      fsUtil.writeFile(this.taxFailsPath, this.taxonomiesFailed);
    }
  }

  /**
   * create terms and enter success & failure related data into terms mapper file
   * @method importTerms
   * @async
   * @returns {Promise<any>} Promise<any>
   */
  async importTerms(): Promise<any> {
    if (!this.taxonomyUIDs?.length) {
      return;
    }

    const onSuccess = ({ response, apiData: { taxonomy_uid } = { taxonomy_uid: null } }: any) => {
      const { uid, name } = response;
      if (!this.termsSuccess[taxonomy_uid]) this.termsSuccess[taxonomy_uid] = {};
      this.termsSuccess[taxonomy_uid][uid] = pick(response, ['name']);
      log(this.importConfig, `Term '${name}' imported successfully!`, 'success');
    };

    const onReject = ({ error, apiData }: any) => {
      const { taxonomy_uid, name } = apiData;
      if (!this.termsFailed[taxonomy_uid]) this.termsFailed[taxonomy_uid] = {};
      const err = error?.message ? JSON.parse(error.message) : error;

      if (err?.errors?.term) {
        if (err?.errorCode === 0) {
          log(this.importConfig, `Term '${name}' already exists!`, 'info');
        } else {
          this.termsFailed[taxonomy_uid][apiData.uid] = apiData;
          log(this.importConfig, `Term '${name}' failed to be import! ${err.errors.term}`, 'error');
        }
      } else {
        this.termsFailed[taxonomy_uid][apiData.uid] = apiData;
        log(this.importConfig, `Term '${name}' failed to be import! ${formatError(error)}`, 'error');
      }
    };

    for (const taxUID of this.taxonomyUIDs) {
      //read terms from respective taxonomy
      this.terms = fsUtil.readFile(
        join(this.termsFolderPath, `${taxUID}-${this.termsConfig.fileName}`),
        true,
      ) as Record<string, unknown>;

      if (this.terms !== undefined && !isEmpty(this.terms)) {
        const apiContent = values(this.terms) as Record<string, any>[];
        await this.makeConcurrentCall(
          {
            apiContent,
            processName: 'import terms',
            apiParams: {
              serializeData: this.serializeTerms.bind(this),
              reject: onReject,
              resolve: onSuccess,
              entity: 'create-terms',
              includeParamOnCompletion: true
            },
            concurrencyLimit: this.importConfig.concurrency || this.importConfig.fetchConcurrency || 1,
          },
          undefined,
          false,
        );
      }
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

  /**
   * create terms success and fail in (mapper/taxonomies/terms)
   * @method createTermSuccessAndFailedFile
   */
  createTermSuccessAndFailedFile() {
    if (this.termsSuccess !== undefined && !isEmpty(this.termsSuccess)) {
      fsUtil.writeFile(this.termsSuccessPath, this.termsSuccess);
    }

    if (this.termsFailed !== undefined && !isEmpty(this.termsFailed)) {
      fsUtil.writeFile(this.termsFailsPath, this.termsFailed);
    }
  }
}
