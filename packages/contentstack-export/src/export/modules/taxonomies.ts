import omit from 'lodash/omit';
import keys from 'lodash/keys';
import isEmpty from 'lodash/isEmpty';
import { resolve as pResolve } from 'node:path';

import BaseClass from './base-class';
import { log, fsUtil } from '../../utils';
import { TaxonomiesConfig, ModuleClassParams } from '../../types';

export default class ExportTaxonomies extends BaseClass {
  private taxonomies: Record<string, Record<string, string>>;
  private taxonomiesConfig: TaxonomiesConfig;
  private qs: {
    include_count: boolean;
    skip: number;
    asc: string;
  };
  public taxonomiesFolderPath: string;

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.taxonomies = {};
    this.taxonomiesConfig = exportConfig.modules.taxonomies;
  }

  async start(): Promise<void> {
    log(this.exportConfig, 'Starting taxonomies export', 'info');

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
      log(this.exportConfig, 'No taxonomies found!', 'info');
      return;
    } else {
      fsUtil.writeFile(pResolve(this.taxonomiesFolderPath, 'taxonomies.json'), this.taxonomies);
      await this.exportTaxonomies();
    }

    log(this.exportConfig, `All taxonomies exported successfully!`, 'success');
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
      log(this.exportConfig, `'${uid}' taxonomy exported successfully!`, 'success');
    };

    const onReject = ({ error, uid }: any) => {
      if (error?.errorMessage) {
        log(this.exportConfig, `Failed to export taxonomy - '${uid}'! ${error.errorMessage}`, 'error');
      } else if (error?.message) {
        const errorMsg = error?.errors?.taxonomy || error?.errors?.term || error?.message;
        log(this.exportConfig, `Failed to export taxonomy - '${uid}'! ${errorMsg}`, 'error');
      } else {
        log(this.exportConfig, `Failed to export taxonomy - '${uid}'! ${error}`, 'error');
      }
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

  handleErrorMsg(err: any) {
    if (err?.errorMessage) {
      log(this.exportConfig, `Failed to export! ${err.errorMessage}`, 'error');
    } else if (err?.message) {
      const errorMsg = err?.errors?.taxonomy || err?.errors?.term || err?.message;
      log(this.exportConfig, `Failed to export! ${errorMsg}`, 'error');
    } else {
      log(this.exportConfig, `Failed to export! ${err}`, 'error');
    }
  }
}
