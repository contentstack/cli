import omit from 'lodash/omit';
import keys from 'lodash/keys';
import isEmpty from 'lodash/isEmpty';
import { resolve as pResolve } from 'node:path';
import { handleAndLogError, messageHandler, log } from '@contentstack/cli-utilities';

import BaseClass from './base-class';
import { fsUtil } from '../../utils';
import { ModuleClassParams, ExportConfig } from '../../types';

export default class ExportTaxonomies extends BaseClass {
  private taxonomies: Record<string, Record<string, string>>;
  private taxonomiesConfig: ExportConfig['modules']['taxonomies'];
  private qs: {
    include_count: boolean;
    skip: number;
    asc?: string;
    limit: number;
  };
  public taxonomiesFolderPath: string;

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.taxonomies = {};
    this.taxonomiesConfig = exportConfig.modules.taxonomies;
    this.qs = { include_count: true, limit: this.taxonomiesConfig.limit || 100, skip: 0 };
    this.applyQueryFilters(this.qs, 'taxonomies');
    this.exportConfig.context.module = 'taxonomies';
  }

  async start(): Promise<void> {
    log.debug('Starting export process for taxonomies...', this.exportConfig.context);
    
    //create taxonomies folder
    this.taxonomiesFolderPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.taxonomiesConfig.dirName,
    );
    log.debug(`Taxonomies folder path: '${this.taxonomiesFolderPath}'`, this.exportConfig.context);
    
    await fsUtil.makeDirectory(this.taxonomiesFolderPath);
    log.debug('Created taxonomies directory.', this.exportConfig.context);

    //fetch all taxonomies and write into taxonomies folder
    log.debug('Fetching all taxonomies...', this.exportConfig.context);
    await this.getAllTaxonomies();
    log.debug(`Retrieved ${Object.keys(this.taxonomies).length} taxonomies.`, this.exportConfig.context);
    
    if (this.taxonomies === undefined || isEmpty(this.taxonomies)) {
      log.info(messageHandler.parse('TAXONOMY_NOT_FOUND'), this.exportConfig.context);
      return;
    } else {
      const taxonomiesFilePath = pResolve(this.taxonomiesFolderPath, 'taxonomies.json');
      log.debug(`Writing taxonomy metadata to: '${taxonomiesFilePath}'`, this.exportConfig.context);
      fsUtil.writeFile(taxonomiesFilePath, this.taxonomies);
      
      log.debug('Starting detailed taxonomy export...', this.exportConfig.context);
      await this.exportTaxonomies();
    }
    log.success(
      messageHandler.parse('TAXONOMY_EXPORT_COMPLETE', keys(this.taxonomies).length ),
      this.exportConfig.context,
    );
  }

  /**
   * fetch all taxonomies in the provided stack
   * @param {number} skip
   * @returns {Promise<any>}
   */
  async getAllTaxonomies(skip: number = 0): Promise<any> {
    if (skip) {
      this.qs.skip = skip;
      log.debug(`Fetching taxonomies with skip: ${skip}`, this.exportConfig.context);
    } else {
      log.debug('Fetching taxonomies with initial query', this.exportConfig.context);
    }
    
    log.debug(`Query parameters: ${JSON.stringify(this.qs)}`, this.exportConfig.context);
    
    await this.stack
      .taxonomy()
      .query(this.qs)
      .find()
      .then(async (data: any) => {
        const { items, count } = data;
        const taxonomiesCount = count !== undefined ? count : items?.length;
        log.debug(`Fetched ${items?.length || 0} taxonomies out of total ${taxonomiesCount}`, this.exportConfig.context);

        if (items?.length) {
          log.debug(`Processing ${items.length} taxonomies`, this.exportConfig.context);
          this.sanitizeTaxonomiesAttribs(items);
          skip += this.qs.limit || 100;
          if (skip >= taxonomiesCount) {
            log.debug('Completed fetching all taxonomies', this.exportConfig.context);
            return;
          }
          log.debug(`Continuing to fetch taxonomies with skip: ${skip}`, this.exportConfig.context);
          return await this.getAllTaxonomies(skip);
        } else {
          log.debug('No taxonomies found to process', this.exportConfig.context);
        }
      })
      .catch((error: any) => {
        log.debug('Error occurred while fetching taxonomies', this.exportConfig.context);
        handleAndLogError(error, { ...this.exportConfig.context });
      });
  }

  /**
   * remove invalid keys and write data into taxonomies
   * @function sanitizeTaxonomiesAttribs
   * @param taxonomies
   */
  sanitizeTaxonomiesAttribs(taxonomies: Record<string, string>[]) {
    log.debug(`Sanitizing ${taxonomies.length} taxonomies`, this.exportConfig.context);
    
    for (let index = 0; index < taxonomies?.length; index++) {
      const taxonomyUID = taxonomies[index].uid;
      const taxonomyName = taxonomies[index]?.name;
      log.debug(`Processing taxonomy: ${taxonomyName} (${taxonomyUID})`, this.exportConfig.context);
      
      this.taxonomies[taxonomyUID] = omit(taxonomies[index], this.taxonomiesConfig.invalidKeys);
    }
    
    log.debug(`Sanitization complete. Total taxonomies processed: ${Object.keys(this.taxonomies).length}`, this.exportConfig.context);
  }

  /**
   * Export all taxonomies details using metadata(this.taxonomies) and write it into respective <taxonomy-uid>.json file
   * @returns {Promise<void>}
   */
  async exportTaxonomies(): Promise<void> {
    const taxonomiesUID = keys(this.taxonomies) || [];
    log.debug(`Exporting detailed data for ${taxonomiesUID.length} taxonomies`, this.exportConfig.context);

    const onSuccess = ({ response, uid }: any) => {
      const filePath = pResolve(this.taxonomiesFolderPath, `${uid}.json`);
      log.debug(`Writing detailed taxonomy data to: ${filePath}`, this.exportConfig.context);
      fsUtil.writeFile(filePath, response);
      log.success(
        messageHandler.parse('TAXONOMY_EXPORT_SUCCESS', uid),
        this.exportConfig.context,
      );
    };

    const onReject = ({ error, uid }: any) => {
      log.debug(`Failed to export detailed data for taxonomy: ${uid}`, this.exportConfig.context);
      handleAndLogError(error, { ...this.exportConfig.context, uid });
    };

    for (let index = 0; index < taxonomiesUID?.length; index++) {
      const taxonomyUID = taxonomiesUID[index];
      log.debug(`Processing detailed export for taxonomy: ${taxonomyUID}`, this.exportConfig.context);
      
      await this.makeAPICall({
        reject: onReject,
        resolve: onSuccess,
        uid: taxonomyUID,
        module: 'export-taxonomy',
      });
    }
    
    log.debug('Completed detailed taxonomy export process', this.exportConfig.context);
  }
}
