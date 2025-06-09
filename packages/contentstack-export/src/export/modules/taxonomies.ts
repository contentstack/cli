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
    this.exportConfig.context.module = 'taxonomies';
  }

  async start(): Promise<void> {
    //create taxonomies folder
    this.taxonomiesFolderPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.taxonomiesConfig.dirName,
    );
    await fsUtil.makeDirectory(this.taxonomiesFolderPath);

    //fetch all taxonomies and write into taxonomies folder
    await this.getAllTaxonomies();
    if (this.taxonomies === undefined || isEmpty(this.taxonomies)) {
      log.info(messageHandler.parse('TAXONOMY_NOT_FOUND'), this.exportConfig.context);
      return;
    } else {
      fsUtil.writeFile(pResolve(this.taxonomiesFolderPath, 'taxonomies.json'), this.taxonomies);
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
          skip += this.qs.limit || 100;
          if (skip >= taxonomiesCount) {
            return;
          }
          return await this.getAllTaxonomies(skip);
        }
      })
      .catch((error: any) => {
        handleAndLogError(error, { ...this.exportConfig.context });
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
    }
  }

  /**
   * Export all taxonomies details using metadata(this.taxonomies) and write it into respective <taxonomy-uid>.json file
   * @returns {Promise<void>}
   */
  async exportTaxonomies(): Promise<void> {
    const taxonomiesUID = keys(this.taxonomies) || [];

    const onSuccess = ({ response, uid }: any) => {
      const filePath = pResolve(this.taxonomiesFolderPath, `${uid}.json`);
      fsUtil.writeFile(filePath, response);
      log.success(
        messageHandler.parse('TAXONOMY_EXPORT_SUCCESS', uid),
        this.exportConfig.context,
      );
    };

    const onReject = ({ error, uid }: any) => {
      handleAndLogError(error, { ...this.exportConfig.context, uid });
    };

    for (let index = 0; index < taxonomiesUID?.length; index++) {
      const taxonomyUID = taxonomiesUID[index];
      await this.makeAPICall({
        reject: onReject,
        resolve: onSuccess,
        uid: taxonomyUID,
        module: 'export-taxonomy',
      });
    }
  }
}
