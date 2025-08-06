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
    this.currentModuleName = 'Taxonomies';
  }

  async start(): Promise<void> {
    try {
      log.debug('Starting taxonomies export process...', this.exportConfig.context);

      // Setup with loading spinner
      const [totalCount] = await this.withLoadingSpinner('TAXONOMIES: Analyzing taxonomy structure...', async () => {
        this.taxonomiesFolderPath = pResolve(
          this.exportConfig.data,
          this.exportConfig.branchName || '',
          this.taxonomiesConfig.dirName,
        );

        await fsUtil.makeDirectory(this.taxonomiesFolderPath);

        // Get count first for progress tracking
        const countResponse = await this.stack
          .taxonomy()
          .query({ ...this.qs, include_count: true, limit: 1 })
          .find();
        return [countResponse.count || 0];
      });

      if (totalCount === 0) {
        log.info(messageHandler.parse('TAXONOMY_NOT_FOUND'), this.exportConfig.context);
        return;
      }

      // Create nested progress manager
      const progress = this.createNestedProgress(this.currentModuleName);

      // Add sub-processes
      progress.addProcess('Fetch Taxonomies', totalCount);
      progress.addProcess('Export Taxonomies & Terms', totalCount);

      // Fetch taxonomies
      progress.startProcess('Fetch Taxonomies').updateStatus('Fetching taxonomy metadata...', 'Fetch Taxonomies');
      await this.getAllTaxonomies();
      progress.completeProcess('Fetch Taxonomies', true);

      const actualTaxonomyCount = Object.keys(this.taxonomies)?.length;
      log.debug(`Found ${actualTaxonomyCount} taxonomies to export (API reported ${totalCount})`, this.exportConfig.context);

      // Update progress for export step if counts differ
      if (actualTaxonomyCount !== totalCount && actualTaxonomyCount > 0) {
        // Remove the old process and add with correct count
        progress.addProcess('Export Taxonomies & Terms', actualTaxonomyCount);
      }

      // Export detailed taxonomies
      if (actualTaxonomyCount > 0) {
        progress
          .startProcess('Export Taxonomies & Terms')
          .updateStatus('Exporting taxonomy details...', 'Export Taxonomies & Terms');
        await this.exportTaxonomies();
        progress.completeProcess('Export Taxonomies & Terms', true);
      } else {
        log.info('No taxonomies found to export detailed information', this.exportConfig.context);
      }

      const taxonomyCount = Object.keys(this.taxonomies).length;
      log.success(messageHandler.parse('TAXONOMY_EXPORT_COMPLETE', taxonomyCount), this.exportConfig.context);
      this.completeProgress(true);
    } catch (error) {
      handleAndLogError(error, { ...this.exportConfig.context });
      this.completeProgress(false, error?.message || 'Taxonomies export failed');
    }
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

    let taxonomyResult = await this.stack.taxonomy().query(this.qs).find();

    log.debug(
      `Fetched ${taxonomyResult.items?.length || 0} taxonomies out of total ${taxonomyResult.count}`,
      this.exportConfig.context,
    );

    if (taxonomyResult?.items && taxonomyResult?.items?.length > 0) {
      log.debug(`Processing ${taxonomyResult.items.length} taxonomies`, this.exportConfig.context);
      this.sanitizeTaxonomiesAttribs(taxonomyResult.items);

      skip += this.taxonomiesConfig.limit;
      if (skip >= taxonomyResult.count) {
        log.debug('Completed fetching all taxonomies', this.exportConfig.context);
        return;
      }

      log.debug(`Continuing to fetch taxonomies with skip: ${skip}`, this.exportConfig.context);
      return await this.getAllTaxonomies(skip);
    } else {
      log.info(messageHandler.parse('TAXONOMY_NOT_FOUND'), this.exportConfig.context);
    }
  }

  sanitizeTaxonomiesAttribs(taxonomies: Record<string, any>[]) {
    log.debug(`Sanitizing ${taxonomies.length} taxonomies`, this.exportConfig.context);

    for (let index = 0; index < taxonomies?.length; index++) {
      const taxonomy = taxonomies[index];
      const taxonomyUid = taxonomy.uid;
      const taxonomyName = taxonomy?.name;
      log.debug(`Processing taxonomy: ${taxonomyName} (${taxonomyUid})`, this.exportConfig.context);

      if (this.taxonomiesConfig.invalidKeys && this.taxonomiesConfig.invalidKeys.length > 0) {
        this.taxonomies[taxonomyUid] = omit(taxonomy, this.taxonomiesConfig.invalidKeys);
      } else {
        this.taxonomies[taxonomyUid] = taxonomy;
      }

      // Track progress for each taxonomy
      this.progressManager?.tick(true, `taxonomy: ${taxonomyName || taxonomyUid}`, null, 'Fetch Taxonomies');
    }

    log.debug(
      `Sanitization complete. Total taxonomies processed: ${Object.keys(this.taxonomies).length}`,
      this.exportConfig.context,
    );
  }

  /**
   * Export all taxonomies details using metadata(this.taxonomies) and write it into respective <taxonomy-uid>.json file
   * @returns {Promise<any>}
   */
  async exportTaxonomies(): Promise<any> {
    log.debug(
      `Exporting ${Object.keys(this.taxonomies)?.length} taxonomies with detailed information`,
      this.exportConfig.context,
    );

    if (isEmpty(this.taxonomies)) {
      log.info(messageHandler.parse('TAXONOMY_NOT_FOUND'), this.exportConfig.context);
      return;
    }

    const onSuccess = ({ response, uid }: any) => {
      const taxonomyName = this.taxonomies[uid]?.name;
      const filePath = pResolve(this.taxonomiesFolderPath, `${uid}.json`);

      log.debug(`Writing detailed taxonomy to: ${filePath}`, this.exportConfig.context);
      fsUtil.writeFile(filePath, response);

      // Track progress for each exported taxonomy
      this.progressManager?.tick(true, `taxonomy: ${taxonomyName || uid}`, null, 'Export Taxonomies & Terms');

      log.success(messageHandler.parse('TAXONOMY_EXPORT_SUCCESS', taxonomyName || uid), this.exportConfig.context);
    };

    const onReject = ({ error, uid }: any) => {
      const taxonomyName = this.taxonomies[uid]?.name;

      // Track failure
      this.progressManager?.tick(
        false,
        `taxonomy: ${taxonomyName || uid}`,
        error?.message || 'Export failed',
        'Export Taxonomies & Terms',
      );

      handleAndLogError(
        error,
        { ...this.exportConfig.context, uid },
        messageHandler.parse('TAXONOMY_EXPORT_FAILED', taxonomyName || uid),
      );
    };

    const taxonomyUids = keys(this.taxonomies);
    log.debug(`Starting detailed export for ${taxonomyUids.length} taxonomies`, this.exportConfig.context);
    
    // Export each taxonomy individually
    for (const uid of taxonomyUids) {
      try {
        log.debug(`Exporting detailed taxonomy: ${uid}`, this.exportConfig.context);
        await this.makeAPICall({
          module: 'export-taxonomy',
          uid,
          resolve: onSuccess,
          reject: onReject,
        });
      } catch (error) {
        onReject({ error, uid });
      }
    }
    
    // Write the taxonomies index file
    const taxonomiesFilePath = pResolve(this.taxonomiesFolderPath, this.taxonomiesConfig.fileName);
    log.debug(`Writing taxonomies index to: ${taxonomiesFilePath}`, this.exportConfig.context);
    fsUtil.writeFile(taxonomiesFilePath, this.taxonomies);
  }
}
