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
    this.currentModuleName = 'Taxonomies';
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
    try {
      log.debug('Starting taxonomies import process...', this.importConfig.context);

      const [taxonomiesCount] = await this.analyzeTaxonomies();
      if (taxonomiesCount === 0) {
        log.info('No taxonomies found to import', this.importConfig.context);
        return;
      }

      const progress = this.createSimpleProgress(this.currentModuleName, taxonomiesCount);
      await this.prepareMapperDirectories();
      progress.updateStatus('Importing taxonomies...');
      log.debug('Starting taxonomies import', this.importConfig.context);
      await this.importTaxonomies();
      this.createSuccessAndFailedFile();

      this.completeProgress(true);
    log.success('Taxonomies imported successfully!', this.importConfig.context);
    } catch (error) {
      this.completeProgress(false, error?.message || 'Taxonomies import failed');
      handleAndLogError(error, { ...this.importConfig.context });
    }
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

      this.progressManager?.tick(true, `taxonomy: ${taxonomyName || taxonomyUID} (${termsCount} terms)`);
      log.success(`Taxonomy '${taxonomyUID}' imported successfully!`, this.importConfig.context);
      log.debug(
        `Taxonomy '${taxonomyName}' imported with ${termsCount} terms successfully!`,
        this.importConfig.context,
      );
    };

    const onReject = ({ error, apiData }: any) => {
      const taxonomyUID = apiData?.taxonomy?.uid;
      const taxonomyName = apiData?.taxonomy?.name;
      if (error?.status === 409 && error?.statusText === 'Conflict') {
        log.info(`Taxonomy '${taxonomyUID}' already exists!`, this.importConfig.context);
        log.debug(`Adding existing taxonomy '${taxonomyUID}' to created list`, this.importConfig.context);
        this.createdTaxonomies[taxonomyUID] = apiData?.taxonomy;
        this.createdTerms[taxonomyUID] = apiData?.terms;
        this.progressManager?.tick(true, `taxonomy: ${taxonomyName || taxonomyUID}`);
      } else {
        this.failedTaxonomies[taxonomyUID] = apiData?.taxonomy;
        this.failedTerms[taxonomyUID] = apiData?.terms;

        this.progressManager?.tick(
          false,
          `taxonomy: ${taxonomyName || taxonomyUID}`,
          error?.message || 'Failed to import taxonomy',
        );
        handleAndLogError(
          error,
          { ...this.importConfig.context, taxonomyUID },
          `Taxonomy '${taxonomyUID}' failed to be imported`,
        );
      }
    };

    log.debug(`Using concurrency limit: ${this.importConfig.fetchConcurrency || 2}`, this.importConfig.context);
    await this.makeConcurrentCall(
      {
        apiContent,
        processName: 'import taxonomies',
        apiParams: {
          serializeData: this.serializeTaxonomiesData.bind(this),
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
   * @method serializeTaxonomiesData
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeTaxonomiesData(apiOptions: ApiOptions): ApiOptions {
    const { apiData: taxonomyData } = apiOptions;
    log.debug(
      `Serializing taxonomy: ${taxonomyData.taxonomy?.name} (${taxonomyData.taxonomy?.uid})`,
      this.importConfig.context,
    );

    const taxonomyUID = taxonomyData?.uid;
    const filePath = join(this.taxonomiesFolderPath, `${taxonomyUID}.json`);

    log.debug(`Looking for taxonomy file: ${filePath}`, this.importConfig.context);

    if (fileHelper.fileExistsSync(filePath)) {
      const taxonomyDetails = fsUtil.readFile(filePath, true) as Record<string, unknown>;
      log.debug(`Successfully loaded taxonomy details from ${filePath}`, this.importConfig.context);
      const termCount = Object.keys(taxonomyDetails?.terms || {}).length;
      log.debug(`Taxonomy has ${termCount} term entries`, this.importConfig.context);
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

  private async analyzeTaxonomies(): Promise<[number]> {
    return this.withLoadingSpinner('TAXONOMIES: Analyzing import data...', async () => {
      log.debug('Checking for taxonomies folder existence', this.importConfig.context);

      if (fileHelper.fileExistsSync(this.taxonomiesFolderPath)) {
        log.debug(`Found taxonomies folder: ${this.taxonomiesFolderPath}`, this.importConfig.context);

        this.taxonomies = fsUtil.readFile(join(this.taxonomiesFolderPath, 'taxonomies.json'), true) as Record<
          string,
          unknown
        >;

        const taxonomyCount = Object.keys(this.taxonomies || {}).length;
        log.debug(`Loaded ${taxonomyCount} taxonomy items from file`, this.importConfig.context);
        return [taxonomyCount];
      } else {
        log.info(`No Taxonomies Found! - '${this.taxonomiesFolderPath}'`, this.importConfig.context);
        return [0];
      }
    });
  }

  private async prepareMapperDirectories(): Promise<void> {
    log.debug('Creating mapper directories', this.importConfig.context);
    await fsUtil.makeDirectory(this.taxonomiesMapperDirPath);
    await fsUtil.makeDirectory(this.termsMapperDirPath);
    log.debug('Created taxonomies and terms mapper directories', this.importConfig.context);
  }
}
