import { join } from 'node:path';
import values from 'lodash/values';
import isEmpty from 'lodash/isEmpty';

import BaseClass, { ApiOptions } from './base-class';
import { log, formatError, fsUtil, fileHelper } from '../../utils';
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
  public createdTaxonomies: Record<string, unknown> = {};
  public failedTaxonomies: Record<string, unknown> = {};
  public createdTerms: Record<string, Record<string, unknown>> = {};
  public failedTerms: Record<string, Record<string, unknown>> = {};

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.taxonomiesConfig = importConfig.modules.taxonomies;
    this.taxonomiesMapperDirPath = join(importConfig.backupDir, 'mapper', 'taxonomies');
    this.termsMapperDirPath = join(this.taxonomiesMapperDirPath, 'terms');
    this.taxonomiesFolderPath = join(importConfig.backupDir, this.taxonomiesConfig.dirName);
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
      log(this.importConfig, `No Taxonomies Found! - '${this.taxonomiesFolderPath}'`, 'info');
      return;
    }

    //Step 2 create taxonomies & terms mapper directory
    await fsUtil.makeDirectory(this.taxonomiesMapperDirPath);
    await fsUtil.makeDirectory(this.termsMapperDirPath);
    // Step 3 import taxonomies
    await this.importTaxonomies();
    //Step 4 create taxonomy & related terms success & failure file
    this.createSuccessAndFailedFile();

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

    const apiContent = values(this.taxonomies);

    const onSuccess = ({ apiData }: any) => {
      const taxonomyUID = apiData?.taxonomy?.uid;
      this.createdTaxonomies[taxonomyUID] = apiData?.taxonomy;
      this.createdTerms[taxonomyUID] = apiData?.terms;
      log(this.importConfig, `Taxonomy '${taxonomyUID}' imported successfully!`, 'success');
    };

    const onReject = ({ error, apiData }: any) => {
      const taxonomyUID = apiData?.taxonomy?.uid;
      if (error?.status === 409 && error?.statusText === 'Conflict') {
        log(this.importConfig, `Taxonomy '${taxonomyUID}' already exists!`, 'info');
        this.createdTaxonomies[taxonomyUID] = apiData?.taxonomy;
        this.createdTerms[taxonomyUID] = apiData?.terms;
      } else {
        if (error?.errorMessage || error?.message) {
          const errorMsg = error?.errorMessage || error?.errors?.taxonomy || error?.errors?.term || error?.message;
          log(this.importConfig, `Taxonomy '${taxonomyUID}' failed to be import! ${errorMsg}`, 'error');
        } else {
          log(this.importConfig, `Taxonomy '${taxonomyUID}' failed to be import! ${formatError(error)}`, 'error');
        }
        this.failedTaxonomies[taxonomyUID] = apiData?.taxonomy;
        this.failedTerms[taxonomyUID] = apiData?.terms;
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
          entity: 'import-taxonomy',
          includeParamOnCompletion: true,
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
    const { apiData } = apiOptions;
    const filePath = join(this.taxonomiesFolderPath, `${apiData?.uid}.json`);
    if (fileHelper.fileExistsSync(filePath)) {
      const taxonomyDetails = fsUtil.readFile(filePath, true) as Record<string, unknown>;
      apiOptions.apiData = { filePath, taxonomy: taxonomyDetails?.taxonomy, terms: taxonomyDetails?.terms };
    } else {
      log(this.importConfig, `No such file - ${filePath}`, 'error');
      apiOptions.apiData = undefined;
    }
    return apiOptions;
  }

  /**
   * create taxonomies success and fail in (mapper/taxonomies)
   * create terms success and fail in (mapper/taxonomies/terms)
   * @method createSuccessAndFailedFile
   */
  createSuccessAndFailedFile() {
    if (this.createdTaxonomies !== undefined && !isEmpty(this.createdTaxonomies)) {
      fsUtil.writeFile(this.taxSuccessPath, this.createdTaxonomies);
    }

    if (this.failedTaxonomies !== undefined && !isEmpty(this.failedTaxonomies)) {
      fsUtil.writeFile(this.taxFailsPath, this.failedTaxonomies);
    }

    if (this.createdTerms !== undefined && !isEmpty(this.createdTerms)) {
      fsUtil.writeFile(this.termsSuccessPath, this.createdTerms);
    }

    if (this.failedTerms !== undefined && !isEmpty(this.failedTerms)) {
      fsUtil.writeFile(this.termsFailsPath, this.failedTerms);
    }
  }
}
