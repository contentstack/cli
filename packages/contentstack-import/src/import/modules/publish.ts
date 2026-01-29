import map from 'lodash/map';
import uniq from 'lodash/uniq';
import values from 'lodash/values';
import filter from 'lodash/filter';
import isEmpty from 'lodash/isEmpty';
import forEach from 'lodash/forEach';
import indexOf from 'lodash/indexOf';
import { join } from 'node:path';
import { FsUtility, log, handleAndLogError, sanitizePath } from '@contentstack/cli-utilities';

import { ModuleClassParams, PublishConfig } from '../../types';
import { fsUtil, fileHelper } from '../../utils';
import BaseClass, { ApiOptions } from './base-class';
import { VariantHttpClient } from '@contentstack/cli-variants';

export default class ImportPublish extends BaseClass {
  private publishDirPath: string;
  private assetsPath: string;
  private entriesPath: string;
  private pendingAssetsPath: string;
  private pendingEntriesPath: string;
  private successAssetsPath: string;
  private failedAssetsPath: string;
  private successEntriesPath: string;
  private failedEntriesPath: string;
  private pendingVariantEntriesPath: string;
  private successVariantEntriesPath: string;
  private failedVariantEntriesPath: string;
  private environments: Record<string, any> = {};
  private successAssets: Array<{ oldUid: string; newUid: string }> = [];
  private failedAssets: Array<{ oldUid: string; newUid: string; error?: string }> = [];
  private successEntries: Record<string, Array<{ locale: string; oldUid: string; newUid: string }>> = {};
  private failedEntries: Record<string, Array<{ locale: string; oldUid: string; newUid: string; error?: string }>> = {};
  private successVariantEntries: Array<{
    content_type: string;
    old_entry_uid: string;
    entry_uid: string;
    locale: string;
    old_variant_uid: string;
    variant_uid: string;
  }> = [];
  private failedVariantEntries: Array<{
    content_type: string;
    old_entry_uid: string;
    entry_uid: string;
    locale: string;
    old_variant_uid: string;
    variant_uid: string;
    error?: string;
  }> = [];
  public publishConfig: PublishConfig;

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.importConfig.context.module = 'publish';
    this.publishConfig = importConfig.modules.publish;

    const backupDir = sanitizePath(this.importConfig.backupDir);
    this.publishDirPath = join(backupDir, 'mapper', this.publishConfig.dirName);
    this.assetsPath = join(backupDir, 'assets');
    this.entriesPath = join(backupDir, this.importConfig.modules.entries.dirName);

    // Pending files (UID mappings only)
    this.pendingAssetsPath = join(this.publishDirPath, this.publishConfig.pendingAssetsFileName);
    this.pendingEntriesPath = join(this.publishDirPath, this.publishConfig.pendingEntriesFileName);

    // Success/Failed tracking files
    this.successAssetsPath = join(this.publishDirPath, this.publishConfig.successAssetsFileName);
    this.failedAssetsPath = join(this.publishDirPath, this.publishConfig.failedAssetsFileName);
    this.successEntriesPath = join(this.publishDirPath, this.publishConfig.successEntriesFileName);
    this.failedEntriesPath = join(this.publishDirPath, this.publishConfig.failedEntriesFileName);
    this.pendingVariantEntriesPath = join(this.publishDirPath, this.publishConfig.pendingVariantEntriesFileName);
    this.successVariantEntriesPath = join(this.publishDirPath, this.publishConfig.successVariantEntriesFileName);
    this.failedVariantEntriesPath = join(this.publishDirPath, this.publishConfig.failedVariantEntriesFileName);

    // Load environments
    this.environments =
      (fsUtil.readFile(join(backupDir, 'environments', 'environments.json')) as Record<string, unknown>) || {};
  }

  /**
   * @method start
   * @description Main entry point for the publish module
   * @returns {Promise<void>} Promise<void>
   */
  async start(): Promise<void> {
    try {
      log.debug('Checking for publish data directory', this.importConfig.context);

      // Check if publish directory exists
      if (!fileHelper.fileExistsSync(this.publishDirPath)) {
        log.info('No publish data found, skipping publish process', this.importConfig.context);
        return;
      }

      // Step 1: Publish assets first (if not skipped)
      if (this.importConfig.skipAssetsPublish) {
        log.info('Skipping asset publishing as per configuration', this.importConfig.context);
      } else {
        log.debug('Starting asset publishing', this.importConfig.context);
        await this.publishAssets();
      }

      // Step 2: Publish entries after assets (if not skipped)
      if (this.importConfig.skipEntriesPublish) {
        log.info('Skipping entry publishing as per configuration', this.importConfig.context);
      } else {
        log.debug('Starting entry publishing', this.importConfig.context);
        await this.publishEntries();
      }

      // Step 3: Publish variant entries after base entries
      if (this.importConfig.skipEntriesPublish) {
        log.info('Skipping variant entry publishing as per configuration', this.importConfig.context);
      } else {
        log.debug('Starting variant entry publishing', this.importConfig.context);
        await this.publishVariantEntries();
      }

      log.success('Deferred publish process completed successfully', this.importConfig.context);
    } catch (error) {
      handleAndLogError(error, { ...this.importConfig.context });
    }
  }

  /**
   * @method publishAssets
   * @description Publishes all assets from the pending assets metadata file
   * @returns {Promise<void>} Promise<void>
   */
  async publishAssets(): Promise<void> {
    log.debug('Checking for pending assets file', this.importConfig.context);

    if (!fileHelper.fileExistsSync(this.pendingAssetsPath)) {
      log.info('No pending assets found', this.importConfig.context);
      return;
    }

    // Load pending assets (array of { oldUid, newUid })
    const pendingAssets = fsUtil.readFile(this.pendingAssetsPath) as Array<{ oldUid: string; newUid: string }>;
    if (!Array.isArray(pendingAssets) || pendingAssets.length === 0) {
      log.info('Pending assets file is empty', this.importConfig.context);
      return;
    }

    const assetCount = pendingAssets.length;
    log.debug(`Found ${assetCount} assets to publish`, this.importConfig.context);

    // Build asset data by reading publish_details from source
    const apiContent = await this.buildAssetPublishData(pendingAssets);
    if (apiContent.length === 0) {
      log.info('No assets with valid publish details found', this.importConfig.context);
      return;
    }

    log.debug(`Prepared ${apiContent.length} assets with valid publish details`, this.importConfig.context);

    const onSuccess = ({ apiData: { oldUid, newUid, environments, locales } }: any) => {
      this.successAssets.push({ oldUid, newUid });
      log.success(
        `Published asset '${newUid}' to environments '${environments?.join(',')}' and locales '${locales?.join(',')}'`,
        this.importConfig.context,
      );
    };

    const onReject = ({ error, apiData: { oldUid, newUid, environments, locales } }: any) => {
      this.failedAssets.push({ oldUid, newUid, error: error?.message || String(error) });
      handleAndLogError(
        error,
        { ...this.importConfig.context, oldUid, newUid },
        `Failed to publish asset '${newUid}' to environments '${environments?.join(',')}' and locales '${locales?.join(',')}'`,
      );
    };

    const serializeData = (apiOptions: ApiOptions) => {
      const { apiData: asset } = apiOptions;

      if (!asset.publish_details || asset.publish_details.length === 0) {
        apiOptions.entity = undefined;
        return apiOptions;
      }

      const publishDetails = filter(asset.publish_details, ({ environment }: any) =>
        this.environments?.hasOwnProperty(environment),
      );

      if (publishDetails.length === 0) {
        log.debug(`Skipping asset '${asset.newUid}': no valid environments`, this.importConfig.context);
        apiOptions.entity = undefined;
        return apiOptions;
      }

      const environments = uniq(map(publishDetails, ({ environment }: any) => this.environments[environment].name));
      const locales = uniq(map(publishDetails, 'locale'));

      if (environments.length === 0 || locales.length === 0) {
        log.debug(`Skipping asset '${asset.newUid}': no valid environments or locales`, this.importConfig.context);
        apiOptions.entity = undefined;
        return apiOptions;
      }

      asset.locales = locales;
      asset.environments = environments;
      apiOptions.apiData.publishDetails = { locales, environments };
      apiOptions.uid = asset.newUid;

      return apiOptions;
    };

    await this.makeConcurrentCall({
      apiContent,
      processName: 'publish assets',
      apiParams: {
        serializeData,
        reject: onReject,
        resolve: onSuccess,
        entity: 'publish-assets',
        includeParamOnCompletion: true,
      },
      concurrencyLimit: this.modulesConfig.assets.uploadAssetsConcurrency,
    });

    // Write success/fail tracking files
    this.writeTrackingFiles('assets');

    log.success(`Completed publishing ${this.successAssets.length} of ${assetCount} assets`, this.importConfig.context);
  }

  /**
   * @method buildAssetPublishData
   * @description Builds asset publish data by reading publish_details from source files
   * @param {Array<{ oldUid: string; newUid: string }>} pendingAssets - Pending assets (array of UID mappings)
   * @returns {Promise<Array<any>>} Array of asset data with publish_details
   */
  async buildAssetPublishData(pendingAssets: Array<{ oldUid: string; newUid: string }>): Promise<Array<any>> {
    const pendingMap = new Map(pendingAssets.map((a) => [a.oldUid, a.newUid]));
    const fs = new FsUtility({ basePath: this.assetsPath, indexFileName: 'assets.json' });
    const indexer = fs.indexFileContent;
    const apiContent: Array<any> = [];

    const indexKeys = Object.keys(indexer);
    for (let i = 0; i < indexKeys.length; i++) {
      const chunk = await fs.readChunkFiles.next().catch((error) => {
        handleAndLogError(error, { ...this.importConfig.context });
      });

      if (chunk) {
        const assets = values(chunk as Record<string, any>[]);
        for (const asset of assets) {
          const newUid = pendingMap.get(asset.uid);
          if (newUid && !isEmpty(asset.publish_details)) {
            apiContent.push({
              oldUid: asset.uid,
              newUid,
              title: asset.title,
              publish_details: asset.publish_details,
            });
          }
        }
      }
    }

    return apiContent;
  }

  /**
   * @method publishEntries
   * @description Publishes all entries from the pending entries metadata file
   * @returns {Promise<void>} Promise<void>
   */
  async publishEntries(): Promise<void> {
    log.debug('Checking for pending entries file', this.importConfig.context);

    if (!fileHelper.fileExistsSync(this.pendingEntriesPath)) {
      log.info('No pending entries found', this.importConfig.context);
      return;
    }

    // Load pending entries (Record<cTUid, Array<{ locale, oldUid, newUid }>>)
    const pendingEntries = fsUtil.readFile(this.pendingEntriesPath) as Record<
      string,
      Array<{ locale: string; oldUid: string; newUid: string }>
    >;
    if (!pendingEntries || typeof pendingEntries !== 'object' || Object.keys(pendingEntries).length === 0) {
      log.info('Pending entries file is empty', this.importConfig.context);
      return;
    }

    const contentTypeCount = Object.keys(pendingEntries).length;
    log.debug(`Found entries to publish across ${contentTypeCount} content types`, this.importConfig.context);

    // Process each content type and locale
    for (const [cTUid, entriesList] of Object.entries(pendingEntries)) {
      const byLocale = this.groupEntriesByLocale(entriesList);
      for (const [locale, localeEntries] of byLocale) {
        const uidMappings = Object.fromEntries(localeEntries.map((e) => [e.oldUid, e.newUid]));
        const entryCount = localeEntries.length;

        if (entryCount === 0) {
          log.debug(`No entries found for '${cTUid}' in locale '${locale}'`, this.importConfig.context);
          continue;
        }

        log.debug(`Publishing ${entryCount} entries for '${cTUid}' in locale '${locale}'`, this.importConfig.context);

        // Build entry data by reading publish_details from source
        const apiContent = await this.buildEntryPublishData(cTUid, locale, uidMappings);
        if (apiContent.length === 0) {
          log.debug(
            `No entries with valid publish details for '${cTUid}' in locale '${locale}'`,
            this.importConfig.context,
          );
          continue;
        }

        const onSuccess = ({ apiData: { oldUid, entryUid, environments, locales } }: any) => {
          if (!this.successEntries[cTUid]) this.successEntries[cTUid] = [];
          this.successEntries[cTUid].push({ locale, oldUid, newUid: entryUid });
          log.success(
            `Published entry '${entryUid}' of '${cTUid}' to environments '${environments?.join(',')}' and locales '${locales?.join(',')}'`,
            this.importConfig.context,
          );
        };

        const onReject = ({ error, apiData: { oldUid, entryUid, environments, locales } }: any) => {
          if (!this.failedEntries[cTUid]) this.failedEntries[cTUid] = [];
          this.failedEntries[cTUid].push({
            locale,
            oldUid,
            newUid: entryUid,
            error: error?.message || String(error),
          });
          handleAndLogError(
            error,
            { ...this.importConfig.context, cTUid, locale },
            `Failed to publish entry '${entryUid}' of '${cTUid}' to environments '${environments?.join(',')}' and locales '${locales?.join(',')}'`,
          );
        };

        const serializeData = (apiOptions: ApiOptions) => {
          const { apiData: entry } = apiOptions;
          const requestObject: {
            environments: Array<string>;
            locales: Array<string>;
            entryUid: string;
            oldUid: string;
          } = {
            environments: [],
            locales: [],
            entryUid: entry.newUid,
            oldUid: entry.oldUid,
          };

          if (entry.publish_details && entry.publish_details.length > 0) {
            forEach(entry.publish_details, (pubObject: any) => {
              if (
                this.environments.hasOwnProperty(pubObject.environment) &&
                indexOf(requestObject.environments, this.environments[pubObject.environment].name) === -1
              ) {
                requestObject.environments.push(this.environments[pubObject.environment].name);
              }
              if (pubObject.locale && indexOf(requestObject.locales, pubObject.locale) === -1) {
                requestObject.locales.push(pubObject.locale);
              }
            });
          } else {
            apiOptions.apiData = null;
            return apiOptions;
          }

          if (requestObject.environments.length === 0 || requestObject.locales.length === 0) {
            apiOptions.apiData = null;
            return apiOptions;
          }

          apiOptions.apiData = requestObject;
          apiOptions.additionalInfo = { cTUid };
          return apiOptions;
        };

        await this.makeConcurrentCall({
          apiContent,
          processName: 'publish entries',
          apiParams: {
            serializeData,
            reject: onReject,
            resolve: onSuccess,
            entity: 'publish-entries',
            includeParamOnCompletion: true,
            additionalInfo: { cTUid },
          },
          concurrencyLimit: this.modulesConfig.entries.importConcurrency || this.importConfig.importConcurrency,
        });

        log.success(`Completed publishing entries for '${cTUid}' in locale '${locale}'`, this.importConfig.context);
      }
    }

    // Write success/fail tracking files
    this.writeTrackingFiles('entries');

    const totalSuccessCount = Object.values(this.successEntries).reduce((sum, list) => sum + list.length, 0);
    log.success(
      `Completed publishing ${totalSuccessCount} entries across ${contentTypeCount} content types`,
      this.importConfig.context,
    );
  }

  /**
   * @method groupEntriesByLocale
   * @description Groups entry details by locale for processing
   * @param {Array<{ locale: string; oldUid: string; newUid: string }>} entries - Entry details for one content type
   * @returns {Map<string, Array<...>>} Map of locale → entries list
   */
  groupEntriesByLocale(
    entries: Array<{ locale: string; oldUid: string; newUid: string }>,
  ): Map<string, Array<{ locale: string; oldUid: string; newUid: string }>> {
    const byLocale = new Map<string, Array<{ locale: string; oldUid: string; newUid: string }>>();
    for (const entry of entries) {
      if (!byLocale.has(entry.locale)) {
        byLocale.set(entry.locale, []);
      }
      byLocale.get(entry.locale)!.push(entry);
    }
    return byLocale;
  }

  /**
   * @method buildEntryPublishData
   * @description Builds entry publish data by reading publish_details from source files
   * @param {string} cTUid - Content type UID
   * @param {string} locale - Locale code
   * @param {Record<string, string>} uidMappings - Entry UID mappings (oldUid → newUid)
   * @returns {Promise<Array<any>>} Array of entry data with publish_details
   */
  async buildEntryPublishData(cTUid: string, locale: string, uidMappings: Record<string, string>): Promise<Array<any>> {
    const basePath = join(this.entriesPath, cTUid, locale);
    const fs = new FsUtility({ basePath, indexFileName: 'index.json' });
    const indexer = fs.indexFileContent;
    const apiContent: Array<any> = [];

    const indexKeys = Object.keys(indexer);
    for (let i = 0; i < indexKeys.length; i++) {
      const chunk = await fs.readChunkFiles.next().catch((error) => {
        handleAndLogError(error, { ...this.importConfig.context, cTUid, locale });
      });

      if (chunk) {
        const entries = values(chunk as Record<string, any>[]);
        for (const entry of entries) {
          const newUid = uidMappings[entry.uid];
          if (newUid && !isEmpty(entry.publish_details)) {
            apiContent.push({
              oldUid: entry.uid,
              newUid,
              title: entry.title,
              publish_details: entry.publish_details,
            });
          }
        }
      }
    }

    return apiContent;
  }

  /**
   * @method publishVariantEntries
   * @description Publishes all variant entries from the pending file
   * @returns {Promise<void>} Promise<void>
   */
  async publishVariantEntries(): Promise<void> {
    log.debug('Checking for pending variant entries file', this.importConfig.context);

    if (!fileHelper.fileExistsSync(this.pendingVariantEntriesPath)) {
      log.info('No pending variant entries found', this.importConfig.context);
      return;
    }

    const pendingVariantEntries = fsUtil.readFile(this.pendingVariantEntriesPath) as Array<{
      content_type: string;
      old_entry_uid: string;
      entry_uid: string;
      locale: string;
      old_variant_uid: string;
      variant_uid: string;
    }>;

    if (!Array.isArray(pendingVariantEntries) || pendingVariantEntries.length === 0) {
      log.info('Pending variant entries file is empty', this.importConfig.context);
      return;
    }

    const variantCount = pendingVariantEntries.length;
    log.debug(`Found ${variantCount} variant entries to publish`, this.importConfig.context);

    const apiContent = await this.buildVariantEntryPublishData(pendingVariantEntries);
    if (apiContent.length === 0) {
      log.info('No variant entries with valid publish details found', this.importConfig.context);
      return;
    }

    const onSuccess = ({ apiData }: any) => {
      const { content_type, entry_uid, locale, variant_uid, old_entry_uid, old_variant_uid } = apiData;
      this.successVariantEntries.push({
        content_type,
        old_entry_uid,
        entry_uid,
        locale,
        old_variant_uid,
        variant_uid,
      });
      log.success(
        `Published variant '${variant_uid}' of entry '${entry_uid}' to environments '${apiData.environments?.join(',')}' and locales '${apiData.locales?.join(',')}'`,
        this.importConfig.context,
      );
    };

    const onReject = ({ error, apiData }: any) => {
      const { content_type, entry_uid, locale, variant_uid, old_entry_uid, old_variant_uid } = apiData;
      this.failedVariantEntries.push({
        content_type,
        old_entry_uid,
        entry_uid,
        locale,
        old_variant_uid,
        variant_uid,
        error: error?.message || String(error),
      });
      handleAndLogError(
        error,
        { ...this.importConfig.context, content_type, entry_uid, variant_uid },
        `Failed to publish variant '${variant_uid}' of entry '${entry_uid}'`,
      );
    };

    const backupDir = sanitizePath(this.importConfig.backupDir);
    const projectMapperPath = join(
      backupDir,
      'mapper',
      this.importConfig.modules.personalize.dirName,
      'projects',
      'projects.json',
    );
    let projectId = this.importConfig.modules.personalize.project_id;
    if (!projectId && fileHelper.fileExistsSync(projectMapperPath)) {
      const project = fsUtil.readFile(projectMapperPath) as { uid?: string };
      projectId = project?.uid;
    }
    if (!projectId) {
      log.warn('Personalize project ID not found, skipping variant entry publishing', this.importConfig.context);
      return;
    }

    const variantClient = new VariantHttpClient({
      config: this.importConfig,
      baseURL: this.importConfig.host,
      headers: {
        api_key: this.importConfig.apiKey,
        branch: this.importConfig.branchName,
        organization_uid: this.importConfig.org_uid,
        'X-Project-Uid': projectId,
      },
    } as any);
    await variantClient.init();

    const publishVariantEntryHandler = async ({ element, apiParams }: { element: any; apiParams: ApiOptions }) => {
      const { resolve, reject } = apiParams;
      const publishReq = {
        entry: {
          environments: element.environments,
          locales: element.locales,
          variants: [{ uid: element.variant_uid, version: 1 }],
        },
        locale: element.locale,
      };
      const options = {
        entry_uid: element.entry_uid,
        content_type_uid: element.content_type,
      };
      try {
        await variantClient.publishVariantEntry(publishReq, options, {
          resolve: (val: any) => resolve({ ...val, apiData: element }),
          reject: (val: any) => reject({ ...val, apiData: element }),
          variantUid: element.variant_uid,
          log,
        });
      } catch (error: any) {
        reject({ error, apiData: element });
      }
    };

    await this.makeConcurrentCall(
      {
        apiContent,
        processName: 'publish variant entries',
        apiParams: {
          reject: onReject,
          resolve: onSuccess,
          entity: 'publish-variant-entries',
          includeParamOnCompletion: true,
        },
        concurrencyLimit: this.modulesConfig.entries?.importConcurrency || this.importConfig.importConcurrency,
      },
      publishVariantEntryHandler as any,
    );

    this.writeTrackingFiles('variant-entries');

    log.success(
      `Completed publishing ${this.successVariantEntries.length} of ${variantCount} variant entries`,
      this.importConfig.context,
    );
  }

  /**
   * @method buildVariantEntryPublishData
   * @description Builds variant entry publish data by reading publish_details from source files
   * @param {Array} pendingVariantEntries - Pending variant entries
   * @returns {Promise<Array<any>>} Array of variant data with publish_details
   */
  async buildVariantEntryPublishData(
    pendingVariantEntries: Array<{
      content_type: string;
      old_entry_uid: string;
      entry_uid: string;
      locale: string;
      old_variant_uid: string;
      variant_uid: string;
    }>,
  ): Promise<Array<any>> {
    const variantEntryConfig = this.importConfig.modules.variantEntry;
    const apiContent: Array<any> = [];

    for (const pending of pendingVariantEntries) {
      const { content_type, entry_uid, locale, variant_uid, old_entry_uid, old_variant_uid } = pending;

      const variantBasePath = join(this.entriesPath, content_type, locale, variantEntryConfig.dirName, old_entry_uid);

      if (!fileHelper.fileExistsSync(join(variantBasePath, 'index.json'))) {
        log.debug(`No variant data found for ${content_type}/${locale}/${old_entry_uid}`, this.importConfig.context);
        continue;
      }

      const fs = new FsUtility({ basePath: variantBasePath, createDirIfNotExist: false });
      let found = false;

      for (const _ in fs.indexFileContent) {
        if (found) break;
        try {
          const chunk = await fs.readChunkFiles.next();
          if (chunk) {
            const variants = values(chunk as Record<string, any>[]);
            for (const variant of variants) {
              if (variant._variant?._uid === old_variant_uid && !isEmpty(variant.publish_details)) {
                const publishDetails = filter(variant.publish_details, (pd: any) =>
                  this.environments?.hasOwnProperty(pd.environment),
                );
                if (publishDetails.length > 0) {
                  const environments = uniq(map(publishDetails, (pd: any) => this.environments[pd.environment].name));
                  const locales = uniq(map(publishDetails, 'locale'));
                  if (environments.length > 0 && locales.length > 0) {
                    apiContent.push({
                      content_type,
                      old_entry_uid,
                      entry_uid,
                      locale,
                      old_variant_uid,
                      variant_uid,
                      environments,
                      locales,
                    });
                    found = true;
                    break;
                  }
                }
              }
            }
          }
        } catch (error) {
          log.debug(
            `Error reading variant data for ${content_type}/${locale}/${old_entry_uid}`,
            this.importConfig.context,
          );
        }
      }
    }

    return apiContent;
  }

  /**
   * @method writeTrackingFiles
   * @description Writes success and failed tracking files for assets or entries
   * @param {string} type - 'assets' or 'entries' or 'variant-entries'
   */
  writeTrackingFiles(type: 'assets' | 'entries' | 'variant-entries'): void {
    if (type === 'assets') {
      if (this.successAssets.length > 0) {
        fsUtil.writeFile(this.successAssetsPath, this.successAssets);
        log.debug(`Written ${this.successAssets.length} successful asset publish records`, this.importConfig.context);
      }
      if (this.failedAssets.length > 0) {
        fsUtil.writeFile(this.failedAssetsPath, this.failedAssets);
        log.debug(`Written ${this.failedAssets.length} failed asset publish records`, this.importConfig.context);
      }
    } else if (type === 'entries') {
      const successCount = Object.values(this.successEntries).reduce((sum, list) => sum + list.length, 0);
      const failedCount = Object.values(this.failedEntries).reduce((sum, list) => sum + list.length, 0);
      if (successCount > 0) {
        fsUtil.writeFile(this.successEntriesPath, this.successEntries);
        log.debug(`Written ${successCount} successful entry publish records`, this.importConfig.context);
      }
      if (failedCount > 0) {
        fsUtil.writeFile(this.failedEntriesPath, this.failedEntries);
        log.debug(`Written ${failedCount} failed entry publish records`, this.importConfig.context);
      }
    } else if (type === 'variant-entries') {
      if (this.successVariantEntries.length > 0) {
        fsUtil.writeFile(this.successVariantEntriesPath, this.successVariantEntries);
        log.debug(
          `Written ${this.successVariantEntries.length} successful variant entry publish records`,
          this.importConfig.context,
        );
      }
      if (this.failedVariantEntries.length > 0) {
        fsUtil.writeFile(this.failedVariantEntriesPath, this.failedVariantEntries);
        log.debug(
          `Written ${this.failedVariantEntries.length} failed variant entry publish records`,
          this.importConfig.context,
        );
      }
    }
  }
}
