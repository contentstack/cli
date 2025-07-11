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
  }

  /**
   * @method start
   * @returns {Promise<void>} Promise<void>
   */
  async start(): Promise<void> {
    log.debug('Checking for taxonomies folder existence', this.importConfig.context);

    //Step1 check folder exists or not
    if (fileHelper.fileExistsSync(this.taxonomiesFolderPath)) {
      log.debug(`Found taxonomies folder: ${this.taxonomiesFolderPath}`, this.importConfig.context);
      this.taxonomies = fsUtil.readFile(join(this.taxonomiesFolderPath, 'taxonomies.json'), true) as Record<
        string,
        unknown
      >;
      const taxonomyCount = Object.keys(this.taxonomies || {}).length;
      log.debug(`Loaded ${taxonomyCount} taxonomy items from file`, this.importConfig.context);
    } else {
      log.info(`No Taxonomies Found! - '${this.taxonomiesFolderPath}'`, this.importConfig.context);
      return;
    }

    //Step 2 create taxonomies & terms mapper directory
    log.debug('Creating mapper directories', this.importConfig.context);
    await fsUtil.makeDirectory(this.taxonomiesMapperDirPath);
    await fsUtil.makeDirectory(this.termsMapperDirPath);
    log.debug('Created taxonomies and terms mapper directories', this.importConfig.context);

    // Step 3 import taxonomies
    log.debug('Starting taxonomies import', this.importConfig.context);
    await this.importTaxonomies();

    //Step 4 create taxonomy & related terms success & failure file
    log.debug('Creating success and failure files', this.importConfig.context);
    this.createSuccessAndFailedFile();

    log.success('Taxonomies imported successfully!', this.importConfig.context);
  }

  /**
   * create taxonomy and enter success & failure related data into taxonomies mapper file
   * @method importTaxonomies
   * @async
   * @returns {Promise<any>} Promise<any>
   */
  async importTaxonomies(): Promise<any> {
    log.debug('Validating taxonomies data', this.importConfig.context);
    if (this.taxonomies === undefined || isEmpty(this.taxonomies)) {
      log.info('No Taxonomies Found!', this.importConfig.context);
      return;
    }

    const apiContent = values(this.taxonomies);
    log.debug(`Starting to import ${apiContent.length} taxonomies`, this.importConfig.context);

    const onSuccess = ({ apiData }: any) => {
      const taxonomyUID = apiData?.taxonomy?.uid;
      const taxonomyName = apiData?.taxonomy?.name;
      const termsCount = Object.keys(apiData?.terms || {}).length;

      this.createdTaxonomies[taxonomyUID] = apiData?.taxonomy;
      this.createdTerms[taxonomyUID] = apiData?.terms;

      log.success(`Taxonomy '${taxonomyUID}' imported successfully!`, this.importConfig.context);
      log.debug(`Created taxonomy '${taxonomyName}' with ${termsCount} terms`, this.importConfig.context);
      log.debug(
        `Taxonomy details: ${JSON.stringify({ uid: taxonomyUID, name: taxonomyName, termsCount })}`,
        this.importConfig.context,
      );
    };

    const onReject = ({ error, apiData }: any) => {
      const taxonomyUID = apiData?.taxonomy?.uid;
      const taxonomyName = apiData?.taxonomy?.name;

      log.debug(`Taxonomy '${taxonomyUID}' failed to import`, this.importConfig.context);

      if (error?.status === 409 && error?.statusText === 'Conflict') {
        log.info(`Taxonomy '${taxonomyUID}' already exists!`, this.importConfig.context);
        log.debug(`Adding existing taxonomy '${taxonomyUID}' to created list`, this.importConfig.context);
        this.createdTaxonomies[taxonomyUID] = apiData?.taxonomy;
        this.createdTerms[taxonomyUID] = apiData?.terms;
      } else {
        log.debug(`Adding taxonomy '${taxonomyUID}' to failed list`, this.importConfig.context);
        if (error?.errorMessage || error?.message) {
          const errorMsg = error?.errorMessage || error?.errors?.taxonomy || error?.errors?.term || error?.message;
          log.error(`Taxonomy '${taxonomyUID}' failed to be import! ${errorMsg}`, this.importConfig.context);
        } else {
          handleAndLogError(
            error,
            { ...this.importConfig.context, taxonomyUID },
            `Taxonomy '${taxonomyUID}' failed to import`,
          );
        }
        this.failedTaxonomies[taxonomyUID] = apiData?.taxonomy;
        this.failedTerms[taxonomyUID] = apiData?.terms;
      }
    };

    log.debug(
      `Using concurrency limit: ${this.importConfig.concurrency || this.importConfig.fetchConcurrency || 1}`,
      this.importConfig.context,
    );
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

    log.debug('Taxonomies import process completed', this.importConfig.context);
  }

  /**
   * @method serializeTaxonomy
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeTaxonomy(apiOptions: ApiOptions): ApiOptions {
    const { apiData } = apiOptions;
    const taxonomyUID = apiData?.uid;
    const filePath = join(this.taxonomiesFolderPath, `${taxonomyUID}.json`);

    log.debug(`Serializing taxonomy: ${taxonomyUID}`, this.importConfig.context);
    log.debug(`Looking for taxonomy file: ${filePath}`, this.importConfig.context);

    if (fileHelper.fileExistsSync(filePath)) {
      const taxonomyDetails = fsUtil.readFile(filePath, true) as Record<string, unknown>;
      log.debug(`Successfully loaded taxonomy details from ${filePath}`, this.importConfig.context);
      log.debug(`Taxonomy has ${Object.keys(taxonomyDetails?.terms || {}).length} terms`, this.importConfig.context);
      apiOptions.apiData = { filePath, taxonomy: taxonomyDetails?.taxonomy, terms: taxonomyDetails?.terms };
    } else {
      log.debug(`File does not exist for taxonomy: ${taxonomyUID}`, this.importConfig.context);
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
    log.debug('Creating success and failed files for taxonomies and terms', this.importConfig.context);

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
}
