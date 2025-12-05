/* eslint-disable no-prototype-builtins */
/*!
 * Contentstack Import
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */
import * as path from 'path';
import { writeFileSync } from 'fs';
import { isEmpty, values, cloneDeep, find, indexOf, forEach, remove } from 'lodash';
import { FsUtility, sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';
import {
  fsUtil,
  formatError,
  lookupExtension,
  suppressSchemaReference,
  removeUidsFromJsonRteFields,
  removeEntryRefsFromJSONRTE,
  restoreJsonRteEntryRefs,
  lookupEntries,
  lookupAssets,
  fileHelper,
  lookUpTerms,
} from '../../utils';
import { ModuleClassParams } from '../../types';
import BaseClass, { ApiOptions } from './base-class';
export default class EntriesImport extends BaseClass {
  private assetUidMapperPath: string;
  private assetUidMapper: Record<string, any>;
  private assetUrlMapper: Record<string, any>;
  private assetUrlMapperPath: string;
  private entriesMapperPath: string;
  private envPath: string;
  private entriesUIDMapperPath: string;
  private uniqueUidMapperPath: string;
  private modifiedCTsPath: string;
  private marketplaceAppMapperPath: string;
  private entriesConfig: Record<string, any>;
  private cTsPath: string;
  private localesPath: string;
  private importConcurrency: number;
  private entriesPath: string;
  private cTs: Record<string, any>[];
  private modifiedCTs: Record<string, any>[];
  private refCTs: string[];
  private jsonRteCTs: Record<string, any>;
  private jsonRteCTsWithRef: Record<string, any>;
  private jsonRteEntries: Record<string, any>;
  private installedExtensions: Record<string, any>[];
  private createdEntries: Record<string, any>[];
  private failedEntries: Record<string, any>[];
  private locales: Record<string, any>[];
  private entriesUidMapper: Record<string, any>;
  private envs: Record<string, any>;
  private autoCreatedEntries: Record<string, any>[];
  private taxonomiesPath: string;
  public taxonomies: Record<string, unknown>;
  public rteCTs: any;
  public rteCTsWithRef: any;
  public entriesForVariant: Array<{ content_type: string; locale: string; entry_uid: string }> = [];

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.importConfig.context.module = 'entries';
    this.assetUidMapperPath = path.resolve(sanitizePath(importConfig.data), 'mapper', 'assets', 'uid-mapping.json');
    this.assetUrlMapperPath = path.resolve(sanitizePath(importConfig.data), 'mapper', 'assets', 'url-mapping.json');
    this.entriesMapperPath = path.resolve(sanitizePath(importConfig.data), 'mapper', 'entries');
    this.envPath = path.resolve(sanitizePath(importConfig.data), 'environments', 'environments.json');
    this.entriesUIDMapperPath = path.join(sanitizePath(this.entriesMapperPath), 'uid-mapping.json');
    this.uniqueUidMapperPath = path.join(sanitizePath(this.entriesMapperPath), 'unique-mapping.json');
    this.modifiedCTsPath = path.join(sanitizePath(this.entriesMapperPath), 'modified-schemas.json');
    this.marketplaceAppMapperPath = path.join(
      sanitizePath(this.importConfig.data),
      'mapper',
      'marketplace_apps',
      'uid-mapping.json',
    );
    this.taxonomiesPath = path.join(
      sanitizePath(this.importConfig.data),
      'mapper',
      'taxonomies',
      'terms',
      'success.json',
    );
    this.entriesConfig = importConfig.modules.entries;
    this.entriesPath = path.resolve(sanitizePath(importConfig.data), sanitizePath(this.entriesConfig.dirName));
    this.cTsPath = path.resolve(
      sanitizePath(importConfig.data),
      sanitizePath(importConfig.modules['content-types'].dirName),
    );
    this.localesPath = path.resolve(
      sanitizePath(importConfig.data),
      sanitizePath(importConfig.modules.locales.dirName),
      sanitizePath(importConfig.modules.locales.fileName),
    );
    this.importConcurrency = this.entriesConfig.importConcurrency || importConfig.importConcurrency;
    this.entriesUidMapper = {};
    this.modifiedCTs = [];
    this.refCTs = [];
    this.jsonRteCTs = [];
    this.jsonRteCTsWithRef = [];
    this.envs = {};
    this.autoCreatedEntries = [];
    this.failedEntries = [];
    this.rteCTs = [];
    this.rteCTsWithRef = [];
  }

  async start(): Promise<any> {
    try {
      this.cTs = (fsUtil.readFile(path.join(this.cTsPath, 'schema.json')) || []) as Record<string, unknown>[];
      if (!this.cTs || isEmpty(this.cTs)) {
        log.warn(
          `No content types file found at ${path.join(this.cTsPath, 'schema.json')}. Skipping entries import.`,
          this.importConfig.context,
        );
        return;
      }
      log.debug(`Found ${this.cTs.length} content types for entry import`, this.importConfig.context);

      this.installedExtensions = (
        (fsUtil.readFile(this.marketplaceAppMapperPath) as any) || { extension_uid: {} }
      ).extension_uid;
      log.debug('Loaded installed extensions for entry processing.', this.importConfig.context);

      this.assetUidMapper = (fsUtil.readFile(this.assetUidMapperPath) as Record<string, any>) || {};
      this.assetUrlMapper = (fsUtil.readFile(this.assetUrlMapperPath) as Record<string, any>) || {};
      log.debug(
        `Loaded asset mappings – UIDs: ${Object.keys(this.assetUidMapper).length}`,
        this.importConfig.context,
      );

      this.taxonomies = (fsUtil.readFile(this.taxonomiesPath) || {}) as Record<string, any>;
      log.debug('Loaded taxonomy data for entry processing.', this.importConfig.context);

      fsUtil.makeDirectory(this.entriesMapperPath);
      log.debug('Created entries mapper directory.', this.importConfig.context);

      log.info('Preparing content types for entry import...', this.importConfig.context);
      await this.disableMandatoryCTReferences();

      this.locales = values((fsUtil.readFile(this.localesPath) || []) as Record<string, unknown>[]);
      this.locales.unshift(this.importConfig.master_locale); // adds master locale to the list
      log.debug(`Processing entries for ${values(this.locales).length} locales`, this.importConfig.context);

      //Create Entries
      log.info('Starting entry creation process...', this.importConfig.context);
      const entryRequestOptions = this.populateEntryCreatePayload();
      log.debug(`Generated ${entryRequestOptions.length} entry creation tasks`, this.importConfig.context);

      for (let entryRequestOption of entryRequestOptions) {
        await this.createEntries(entryRequestOption);
      }
      log.success('Entry creation process completed', this.importConfig.context);

      if (this.importConfig.replaceExisting) {
        // Note: Instead of using entryRequestOptions, we can prepare request options for replace, to avoid unnecessary operations
        log.info('Starting entry replacement process...', this.importConfig.context);
        for (let entryRequestOption of entryRequestOptions) {
          await this.replaceEntries(entryRequestOption).catch((error) => {
            handleAndLogError(
              error,
              { ...this.importConfig.context, cTUid: entryRequestOption.cTUid, locale: entryRequestOption.locale },
              'Error while replacing existing entries',
            );
          });
        }
        log.success('Entry replacement process completed', this.importConfig.context);
      }

      log.debug('Writing entry UID mappings to file...', this.importConfig.context);
      await fileHelper.writeLargeFile(path.join(this.entriesMapperPath, 'uid-mapping.json'), this.entriesUidMapper); // TBD: manages mapper in one file, should find an alternative
      fsUtil.writeFile(path.join(this.entriesMapperPath, 'failed-entries.json'), this.failedEntries);

      if (this.autoCreatedEntries?.length > 0) {
        log.info(
          `Removing ${this.autoCreatedEntries.length} auto-created entries from the master language...`,
          this.importConfig.context,
        );
        await this.removeAutoCreatedEntries().catch((error) => {
          handleAndLogError(
            error,
            { ...this.importConfig.context },
            'Error while removing auto created entries in master locale',
          );
        });
        log.success('Auto-created entries cleanup completed', this.importConfig.context);
      }

      // Update entries with references
      log.info('Starting entry references update process...', this.importConfig.context);
      const entryUpdateRequestOptions = this.populateEntryUpdatePayload();
      log.debug(`Generated ${entryUpdateRequestOptions.length} entry update tasks`, this.importConfig.context);

      for (let entryUpdateRequestOption of entryUpdateRequestOptions) {
        await this.updateEntriesWithReferences(entryUpdateRequestOption).catch((error) => {
          handleAndLogError(
            error,
            {
              ...this.importConfig.context,
              cTUid: entryUpdateRequestOption.cTUid,
              locale: entryUpdateRequestOption.locale,
            },
            `Error while updating entries references of ${entryUpdateRequestOption.cTUid} in locale ${entryUpdateRequestOption.locale}`,
          );
        });
      }
      fsUtil.writeFile(path.join(this.entriesMapperPath, 'failed-entries.json'), this.failedEntries);
      log.success('Entry references update process completed', this.importConfig.context);

      log.info('Restoring content type changes...', this.importConfig.context);
      await this.enableMandatoryCTReferences().catch((error) => {
        handleAndLogError(error, { ...this.importConfig.context }, 'Error while updating content type references');
      });
      log.success('Content type references restored successfully', this.importConfig.context);

      // Update field rule of content types which are got removed earlier
      log.info('Updating field rules of content type...', this.importConfig.context);
      await this.updateFieldRules().catch((error) => {
        handleAndLogError(error, { ...this.importConfig.context }, 'Error while updating field rules of content type');
      });
      log.success('Entries imported successfully', this.importConfig.context);

      // Publishing entries
      if (!this.importConfig.skipEntriesPublish) {
        log.info('Starting entry publishing process...', this.importConfig.context);
        this.envs = fileHelper.readFileSync(this.envPath) || {};
        if (Object.keys(this.envs).length === 0) {
          log.warn(
            `No environments file found at ${this.envPath}. Entries will not be published.`,
            this.importConfig.context,
          );
          return;
        } else {
          log.debug(`Loaded ${Object.keys(this.envs).length} environments.`, this.importConfig.context);
        }

        for (let entryRequestOption of entryRequestOptions) {
          await this.publishEntries(entryRequestOption).catch((error) => {
            handleAndLogError(
              error,
              { ...this.importConfig.context, cTUid: entryRequestOption.cTUid, locale: entryRequestOption.locale },
              `Error in publishing entries of ${entryRequestOption.cTUid} in locale ${entryRequestOption.locale}`,
            );
          });
        }
        log.success('All the entries have been published successfully', this.importConfig.context);
      } else {
        log.info('Skipping entry publishing as per configuration...', this.importConfig.context);
      }

      log.debug('Creating entry data for variant entries...', this.importConfig.context);
      this.createEntryDataForVariantEntry();
    } catch (error) {
      this.createEntryDataForVariantEntry();
      handleAndLogError(error, { ...this.importConfig.context });
    }
  }

  /**
   * The function `createEntryDataForVariantEntry` writes the `entriesForVariant` data to a JSON file
   * named `data-for-variant-entry.json`.
   */
  createEntryDataForVariantEntry() {
    const filePath = path.join(this.entriesMapperPath, 'data-for-variant-entry.json');

    if (!isEmpty(this.entriesForVariant)) {
      writeFileSync(filePath, JSON.stringify(this.entriesForVariant), { encoding: 'utf8' });
    }
  }

  async disableMandatoryCTReferences() {
    log.debug(
      `Starting to disable mandatory CT references for ${this.cTs.length} content types`,
      this.importConfig.context,
    );

    const onSuccess = ({ response: contentType, apiData: { uid } }: any) => {
      log.success(`'${uid}' content type references removed temporarily`, this.importConfig.context);
      log.debug(`Successfully processed content type: '${uid}'`, this.importConfig.context);
    };
    const onReject = ({ error, apiData: { uid } }: any) => {
      handleAndLogError(
        error,
        { ...this.importConfig.context, uid },
        `'${uid}' content type references removal failed`,
      );
    };
    return await this.makeConcurrentCall({
      processName: 'Update content types (removing mandatory references temporarily)',
      apiContent: this.cTs,
      apiParams: {
        serializeData: this.serializeUpdateCTs.bind(this),
        reject: onReject.bind(this),
        resolve: onSuccess.bind(this),
        entity: 'update-cts',
        includeParamOnCompletion: true,
      },
      concurrencyLimit: this.importConcurrency,
    }).then(() => {
      log.debug(`Writing ${this.modifiedCTs.length} modified content types to file`, this.importConfig.context);
      fsUtil.writeFile(this.modifiedCTsPath, this.modifiedCTs);
      log.success('Content type reference removal completed', this.importConfig.context);
    });
  }

  /**
   * @method serializeUpdateCTs
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeUpdateCTs(apiOptions: ApiOptions): ApiOptions {
    const { apiData } = apiOptions;
    const contentType = cloneDeep(apiData);
    if (contentType.field_rules) {
      delete contentType.field_rules;
    }
    const flag = {
      suppressed: false,
      references: false,
      jsonRte: false,
      jsonRteEmbeddedEntries: false,
      rte: false,
      rteEmbeddedEntries: false,
    };
    suppressSchemaReference(contentType.schema, flag);

    if (flag.references) {
      this.refCTs.push(contentType.uid);
    }

    if (flag.jsonRte) {
      this.jsonRteCTs.push(contentType.uid);
      if (flag.jsonRteEmbeddedEntries) {
        this.jsonRteCTsWithRef.push(contentType.uid);
        if (this.refCTs.indexOf(contentType.uid) === -1) {
          this.refCTs.push(contentType.uid);
        }
      }
    }

    if (flag.rte) {
      this.rteCTs.push(contentType.uid);
      if (flag.rteEmbeddedEntries) {
        this.rteCTsWithRef.push(contentType.uid);
        if (this.refCTs.indexOf(contentType.uid) === -1) {
          this.refCTs.push(contentType.uid);
        }
      }
    }

    // Check if suppress modified flag
    if (flag.suppressed) {
      this.modifiedCTs.push(find(this.cTs, { uid: contentType.uid }));
    } else {
      // Note: Skips the content type from update if no reference found
      apiOptions.apiData = null;
      return apiOptions;
    }

    lookupExtension(
      this.importConfig,
      contentType.schema,
      this.importConfig.preserveStackVersion,
      this.installedExtensions,
    );
    const contentTypePayload = this.stack.contentType(contentType.uid);
    Object.assign(contentTypePayload, cloneDeep(contentType));
    apiOptions.apiData = contentTypePayload;
    return apiOptions;
  }

  populateEntryCreatePayload(): { cTUid: string; locale: string }[] {
    const requestOptions: { cTUid: string; locale: string }[] = [];
    for (let locale of this.locales) {
      for (let contentType of this.cTs) {
        requestOptions.push({
          cTUid: contentType.uid,
          locale: locale.code,
        });
      }
    }
    return requestOptions;
  }

  async createEntries({ cTUid, locale }: { cTUid: string; locale: string }): Promise<void> {
    const processName = 'Create Entries';
    const indexFileName = 'index.json';
    const basePath = path.join(this.entriesPath, cTUid, locale);
    const fs = new FsUtility({ basePath, indexFileName });
    const indexer = fs.indexFileContent;
    const indexerCount = values(indexer).length;
    if (indexerCount === 0) {
      log.debug(`No entries found for content type ${cTUid} in locale ${locale}`, this.importConfig.context);
      return Promise.resolve();
    }
    log.debug(
      `Starting to create entries for ${cTUid} in locale ${locale} - ${indexerCount} chunks to process`,
      this.importConfig.context,
    );

    const isMasterLocale = locale === this.importConfig?.master_locale?.code;
    log.debug(`Processing ${isMasterLocale ? 'master' : 'non-master'} locale: ${locale}`, this.importConfig.context);

    // Write created entries
    const entriesCreateFileHelper = new FsUtility({
      moduleName: 'entries',
      indexFileName: 'index.json',
      basePath: path.join(this.entriesMapperPath, cTUid, locale),
      chunkFileSize: this.entriesConfig.chunkFileSize,
      keepMetadata: false,
      omitKeys: this.entriesConfig.invalidKeys,
    });

    // create file instance for existing entries
    const existingEntriesFileHelper = new FsUtility({
      moduleName: 'entries',
      indexFileName: 'index.json',
      basePath: path.join(this.entriesMapperPath, cTUid, locale, 'existing'),
      chunkFileSize: this.entriesConfig.chunkFileSize,
      keepMetadata: false,
      omitKeys: this.entriesConfig.invalidKeys,
    });

    const contentType = find(this.cTs, { uid: cTUid });
    log.debug(`Found content type schema for ${cTUid}`, this.importConfig.context);

    const onSuccess = ({ response, apiData: entry, additionalInfo }: any) => {
      if (additionalInfo[entry.uid]?.isLocalized) {
        let oldUid = additionalInfo[entry.uid].entryOldUid;
        this.entriesForVariant.push({ content_type: cTUid, entry_uid: oldUid, locale });
        log.info(
          `Localized entry: '${entry.title}' of content type ${cTUid} in locale ${locale}`,
          this.importConfig.context,
        );
        log.debug(`Mapped localized entry UID: ${entry.uid} → ${oldUid}`, this.importConfig.context);
        entry.uid = oldUid;
        entry.entryOldUid = oldUid;
        entry.sourceEntryFilePath = path.join(sanitizePath(basePath), sanitizePath(additionalInfo.entryFileName)); // stores source file path temporarily
        entriesCreateFileHelper.writeIntoFile({ [oldUid]: entry } as any, { mapKeyVal: true });
      } else {
        log.info(
          `Created entry: '${entry.title}' of content type ${cTUid} in locale ${locale}`,
          this.importConfig.context,
        );
        log.debug(`Created entry UID mapping: ${entry.uid} → ${response.uid}`, this.importConfig.context);
        this.entriesForVariant.push({ content_type: cTUid, entry_uid: entry.uid, locale });
        // This is for creating localized entries that do not have a counterpart in master locale.
        // For example : To create entry1 in fr-fr, where en-us is the master locale
        // entry1 will get created in en-us first, then fr-fr version will be created
        // thus entry1 has to be removed from en-us at the end.
        if (!isMasterLocale && !additionalInfo[entry.uid]?.isLocalized) {
          this.autoCreatedEntries.push({ cTUid, locale, entryUid: response.uid });
          log.debug(`Marked entry for auto-cleanup: ${response.uid} in master locale`, this.importConfig.context);
        }
        this.entriesUidMapper[entry.uid] = response.uid;
        entry.sourceEntryFilePath = path.join(sanitizePath(basePath), sanitizePath(additionalInfo.entryFileName)); // stores source file path temporarily
        entry.entryOldUid = entry.uid; // stores old uid temporarily
        entriesCreateFileHelper.writeIntoFile({ [entry.uid]: entry } as any, { mapKeyVal: true });
      }
    };
    const onReject = ({ error, apiData: entry, additionalInfo }: any) => {
      const { title, uid } = entry;
      // NOTE Remove from list if any entry import failed
      this.entriesForVariant = this.entriesForVariant.filter(
        (item) => !(item.locale === locale && item.entry_uid === uid),
      );
      log.debug(`Removed failed entry from variant list: ${uid}`, this.importConfig.context);

      // NOTE: write existing entries into files to handler later
      if (error.errorCode === 119) {
        if (error?.errors?.title || error?.errors?.uid) {
          if (this.importConfig.replaceExisting) {
            entry.entryOldUid = uid;
            entry.sourceEntryFilePath = path.join(sanitizePath(basePath), sanitizePath(additionalInfo.entryFileName)); // stores source file path temporarily
            existingEntriesFileHelper.writeIntoFile({ [uid]: entry } as any, { mapKeyVal: true });
            log.debug(`Queued existing entry for replacement: ${title} (${uid})`, this.importConfig.context);
          }
          if (!this.importConfig.skipExisting) {
            log.info(`Entry '${title}' already exists`, this.importConfig.context);
          }
        } else {
          handleAndLogError(error, { ...this.importConfig.context, cTUid: cTUid, locale });
          this.failedEntries.push({ content_type: cTUid, locale, entry: { uid, title } });
        }
      } else {
        handleAndLogError(error, { ...this.importConfig.context, cTUid: cTUid, locale });
        this.failedEntries.push({ content_type: cTUid, locale, entry: { uid, title } });
      }
    };

    for (const index in indexer) {
      log.debug(`Processing chunk ${index} of ${indexerCount} for ${cTUid} in ${locale}`, this.importConfig.context);

      const chunk = await fs.readChunkFiles.next().catch((error) => {
        handleAndLogError(error, { ...this.importConfig.context, cTUid: cTUid, locale });
      });

      if (chunk) {
        let apiContent = values(chunk as Record<string, any>[]);
        log.debug(`Processing ${apiContent.length} entries in chunk ${index}`, this.importConfig.context);

        await this.makeConcurrentCall({
          apiContent,
          processName,
          indexerCount,
          currentIndexer: +index,
          apiParams: {
            reject: onReject,
            resolve: onSuccess,
            entity: 'create-entries',
            includeParamOnCompletion: true,
            serializeData: this.serializeEntries.bind(this),
            additionalInfo: { contentType, locale, cTUid, entryFileName: indexer[index], isMasterLocale },
          },
          concurrencyLimit: this.importConcurrency,
        }).then(() => {
          entriesCreateFileHelper?.completeFile(true);
          existingEntriesFileHelper?.completeFile(true);
          log.success(`Created entries for content type ${cTUid} in locale ${locale}`, this.importConfig.context);
        });
      }
    }

    /**
     * Why Delay Here ?
     * ==================
     * When the file is written to the disk, the file is not yet available to be read by the next operation.
     * existing entries file is written here and used in the replace entries operation. Sometimes it happens that the file is not completed writing to the disk, so replace operation fails.
     * Solution:
     * =========
     * Add a delay to ensure that the file is completed writing to the disk.
     * This is a temporary workaround, TODO: find a better way to do this.
     * When replaceEntries tries to read the file immediately after, the file might still be incomplete because:
     * completeFile() calls write('}') (line 294) - buffered, not yet on disk
     * closeFile() calls end() (line 318) - closes stream but doesn't wait for flush
     * replaceEntries immediately tries to read - file is incomplete!
     * The completeFile() method in FsUtility needs to wait for the stream to finish flushing before returning. Here's what needs to be changed in the FsUtility
     * */
    await new Promise((resolve) => setTimeout(resolve, 200));
    log.success(`Completed creating entries for content type ${cTUid} in locale ${locale}`, this.importConfig.context);
  }

  /**
   * @method serializeEntries
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeEntries(apiOptions: ApiOptions): ApiOptions {
    let {
      apiData: entry,
      additionalInfo: { cTUid, locale, contentType, isMasterLocale },
    } = apiOptions;

    try {
      log.debug(
        `Serializing entry: ${entry.title} (${entry.uid}) for ${cTUid} in ${locale}`,
        this.importConfig.context,
      );

      if (this.jsonRteCTs.indexOf(cTUid) > -1) {
        entry = removeUidsFromJsonRteFields(entry, contentType.schema);
        log.debug(`Removed UIDs from JSON RTE fields for entry: ${entry.uid}`, this.importConfig.context);
      }
      // remove entry references from json-rte fields
      if (this.jsonRteCTsWithRef.indexOf(cTUid) > -1) {
        entry = removeEntryRefsFromJSONRTE(entry, contentType.schema);
        log.debug(`Removed entry references from JSON RTE fields for entry: ${entry.uid}`, this.importConfig.context);
      }
      if (this.rteCTsWithRef.indexOf(cTUid) > -1) {
        entry = removeEntryRefsFromJSONRTE(entry, contentType.schema);
        log.debug(`Removed entry references from RTE fields for entry: ${entry.uid}`, this.importConfig.context);
      }
      //will remove term if term doesn't exists in taxonomy
      lookUpTerms(contentType?.schema, entry, this.taxonomies, this.importConfig);
      log.debug(`Processed taxonomy terms for entry: ${entry.uid}`, this.importConfig.context);

      // will replace all old asset uid/urls with new ones
      entry = lookupAssets(
        {
          content_type: contentType,
          entry: entry,
        },
        this.assetUidMapper,
        this.assetUrlMapper,
        path.join(this.entriesPath, cTUid),
        this.installedExtensions,
      );
      log.debug(`Processed asset lookups for entry: ${entry.uid}`, this.importConfig.context);

      delete entry.publish_details;
      // checking the entry is a localized one or not
      if (!isMasterLocale && this.entriesUidMapper.hasOwnProperty(entry.uid)) {
        const entryResponse = this.stack.contentType(contentType.uid).entry(this.entriesUidMapper[entry.uid]);
        Object.assign(entryResponse, cloneDeep(entry), { uid: this.entriesUidMapper[entry.uid] });
        apiOptions.apiData = entryResponse;
        apiOptions.additionalInfo[entryResponse.uid] = {
          isLocalized: true,
          entryOldUid: entry.uid,
        };
        log.debug(
          `Prepared localized entry: ${entry.uid} → ${this.entriesUidMapper[entry.uid]}`,
          this.importConfig.context,
        );
        return apiOptions;
      }
      apiOptions.apiData = entry;
      log.debug(`Entry serialization completed for: ${entry.uid}`, this.importConfig.context);
    } catch (error) {
      handleAndLogError(error, { ...this.importConfig.context, cTUid, locale });
      this.failedEntries.push({ content_type: cTUid, locale, entry: { uid: entry.uid, title: entry.title } });
      apiOptions.apiData = null;
    }
    return apiOptions;
  }

  async replaceEntries({ cTUid, locale }: { cTUid: string; locale: string }): Promise<void> {
    const processName = 'Replace existing Entries';
    const indexFileName = 'index.json';
    const basePath = path.join(this.entriesMapperPath, cTUid, locale, 'existing');
    const fs = new FsUtility({ basePath, indexFileName });
    const indexer = fs.indexFileContent;
    const indexerCount = values(indexer).length;
    if (indexerCount === 0) {
      log.debug(`No existing entries found for replacement in ${cTUid} - ${locale}`, this.importConfig.context);
      return Promise.resolve();
    }
    log.debug(
      `Starting to replace entries for ${cTUid} in locale ${locale} - ${indexerCount} chunks to process`,
      this.importConfig.context,
    );

    // Write updated entries
    const entriesReplaceFileHelper = new FsUtility({
      moduleName: 'entries',
      indexFileName: 'index.json',
      basePath: path.join(this.entriesMapperPath, cTUid, locale),
      chunkFileSize: this.entriesConfig.chunkFileSize,
      keepMetadata: false,
      useIndexer: true,
      omitKeys: this.entriesConfig.invalidKeys,
    });

    const contentType = find(this.cTs, { uid: cTUid });
    log.debug(`Found content type schema for replacement: ${cTUid}`, this.importConfig.context);

    const onSuccess = ({ response, apiData: entry, additionalInfo }: any) => {
      log.info(
        `Replaced entry: '${entry.title}' of content type ${cTUid} in locale ${locale}`,
        this.importConfig.context,
      );
      log.debug(`Replaced entry UID mapping: ${entry.uid} → ${response.uid}`, this.importConfig.context);
      this.entriesUidMapper[entry.uid] = response.uid;
      entriesReplaceFileHelper.writeIntoFile({ [entry.uid]: entry } as any, { mapKeyVal: true });
    };
    const onReject = ({ error, apiData: { uid, title } }: any) => {
      // NOTE Remove from list if any entry import failed
      this.entriesForVariant = this.entriesForVariant.filter(
        (item) => !(item.locale === locale && item.entry_uid === uid),
      );
      log.debug(`Removed failed replacement entry from variant list: ${uid}`, this.importConfig.context);

      handleAndLogError(error, { ...this.importConfig.context, cTUid, locale });
      this.failedEntries.push({
        content_type: cTUid,
        locale,
        entry: { uid: this.entriesUidMapper[uid], title },
        entryId: uid,
      });
    };

    for (const index in indexer) {
      log.debug(
        `Processing replacement chunk ${index} of ${indexerCount} for ${cTUid} in ${locale}`,
        this.importConfig.context,
      );

      const chunk = await fs.readChunkFiles.next().catch((error) => {
        handleAndLogError(error, { ...this.importConfig.context, cTUid, locale });
      });

      if (chunk) {
        let apiContent = values(chunk as Record<string, any>[]);
        log.debug(
          `Processing ${apiContent.length} entries for replacement in chunk ${index}`,
          this.importConfig.context,
        );

        await this.makeConcurrentCall(
          {
            apiContent,
            processName,
            indexerCount,
            currentIndexer: +index,
            apiParams: {
              reject: onReject,
              resolve: onSuccess,
              entity: 'update-entries',
              includeParamOnCompletion: true,
              additionalInfo: { contentType, locale, cTUid },
            },
            concurrencyLimit: this.importConcurrency,
          },
          this.replaceEntriesHandler.bind(this),
        ).then(() => {
          entriesReplaceFileHelper?.completeFile(true);
          log.success(`Replaced entries for content type ${cTUid} in locale ${locale}`, this.importConfig.context);
        });
      }
    }
  }

  async replaceEntriesHandler({
    apiParams,
    element: entry,
  }: {
    apiParams: ApiOptions;
    element: Record<string, string>;
    isLastRequest: boolean;
  }) {
    const { additionalInfo: { cTUid, locale } = {} } = apiParams;
    return new Promise(async (resolve, reject) => {
      const { items: [entryInStack] = [] }: any =
        (await this.stack
          .contentType(cTUid)
          .entry()
          .query({ query: { title: entry.title, locale } })
          .findOne()
          .catch((error: Error) => {
            apiParams.reject({
              error,
              apiData: entry,
            });
            reject(true);
          })) || {};
      if (entryInStack) {
        const entryPayload = this.stack.contentType(cTUid).entry(entryInStack.uid);
        Object.assign(entryPayload, entryInStack, cloneDeep(entry), {
          uid: entryInStack.uid,
          urlPath: entryInStack.urlPath,
          stackHeaders: entryInStack.stackHeaders,
          _version: entryInStack._version,
        });
        return entryPayload
          .update({ locale })
          .then((response: any) => {
            apiParams.resolve({
              response,
              apiData: entry,
            });
            resolve(true);
          })
          .catch((error: Error) => {
            apiParams.reject({
              error,
              apiData: entry,
            });
            reject(true);
          });
      } else {
        apiParams.reject({
          error: new Error(`Entry with title ${entry.title} not found in the stack`),
          apiData: entry,
        });
        reject(true);
      }
    });
  }
  populateEntryUpdatePayload(): { cTUid: string; locale: string }[] {
    const requestOptions: { cTUid: string; locale: string }[] = [];
    for (let locale of this.locales) {
      for (let cTUid of this.refCTs) {
        requestOptions.push({
          cTUid,
          locale: locale.code,
        });
      }
    }
    return requestOptions;
  }

  async updateEntriesWithReferences({ cTUid, locale }: { cTUid: string; locale: string }): Promise<void> {
    const processName = 'Update Entries';
    const indexFileName = 'index.json';
    const basePath = path.join(this.entriesMapperPath, cTUid, locale);
    const fs = new FsUtility({ basePath, indexFileName });
    const indexer = fs.indexFileContent;
    const indexerCount = values(indexer).length;
    if (indexerCount === 0) {
      log.debug(`No entries found for reference updates in ${cTUid} - ${locale}`, this.importConfig.context);
      return Promise.resolve();
    }
    log.debug(
      `Starting to update entries with references for ${cTUid} in locale ${locale} - ${indexerCount} chunks to process`,
      this.importConfig.context,
    );

    const contentType = find(this.cTs, { uid: cTUid });
    log.debug(`Found content type schema for reference updates: ${cTUid}`, this.importConfig.context);

    const onSuccess = ({ response, apiData: { uid, url, title } }: any) => {
      log.info(`Updated entry: '${title}' of content type ${cTUid} in locale ${locale}`, this.importConfig.context);
      log.debug(`Updated entry references for: ${uid}`, this.importConfig.context);
    };
    const onReject = ({ error, apiData: { uid, title } }: any) => {
      // NOTE Remove from list if any entry import failed
      this.entriesForVariant = this.entriesForVariant.filter(
        (item) => !(item.locale === locale && item.entry_uid === uid),
      );
      log.debug(`Removed failed reference update entry from variant list: ${uid}`, this.importConfig.context);

      handleAndLogError(error, { ...this.importConfig.context, cTUid, locale });
      this.failedEntries.push({
        content_type: cTUid,
        locale,
        entry: { uid: this.entriesUidMapper[uid], title },
        entryId: uid,
      });
    };

    for (const index in indexer) {
      log.debug(
        `Processing reference update chunk ${index} of ${indexerCount} for ${cTUid} in ${locale}`,
        this.importConfig.context,
      );

      const chunk = await fs.readChunkFiles.next().catch((error) => {
        handleAndLogError(
          error,
          { ...this.importConfig.context, cTUid, locale },
          'Failed to load data chunks due to a read error. Ensure the files are accessible and not corrupted.',
        );
      });

      if (chunk) {
        let apiContent = values(chunk as Record<string, any>[]);
        log.debug(
          `Processing ${apiContent.length} entries for reference updates in chunk ${index}`,
          this.importConfig.context,
        );

        await this.makeConcurrentCall({
          apiContent,
          processName,
          indexerCount,
          currentIndexer: +index,
          apiParams: {
            reject: onReject,
            resolve: onSuccess,
            entity: 'update-entries',
            includeParamOnCompletion: true,
            serializeData: this.serializeUpdateEntries.bind(this),
            additionalInfo: { contentType, locale, cTUid },
          },
          concurrencyLimit: this.importConcurrency,
        }).then(() => {
          log.success(`Updated entries for content type ${cTUid} in locale ${locale}`, this.importConfig.context);
        });
      }
    }
  }

  /**
   * @method serializeUpdateEntries
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeUpdateEntries(apiOptions: ApiOptions): ApiOptions {
    let {
      apiData: entry,
      additionalInfo: { cTUid, locale, contentType },
    } = apiOptions;
    try {
      log.debug(
        `Serializing entry update: ${entry.title} (${entry.uid}) for ${cTUid} in ${locale}`,
        this.importConfig.context,
      );

      const sourceEntryFilePath = entry.sourceEntryFilePath;
      const sourceEntry = ((fsUtil.readFile(sourceEntryFilePath) || {}) as Record<any, any>)[entry.entryOldUid];
      const newUid = this.entriesUidMapper[entry.entryOldUid];

      log.debug(`Updating entry references: ${entry.entryOldUid} → ${newUid}`, this.importConfig.context);

      // Removing temp values
      delete entry.sourceEntryFilePath;
      delete entry.entryOldUid;

      if (this.jsonRteCTs.indexOf(cTUid) > -1 || this.rteCTs.indexOf(cTUid) > -1) {
        // the entries stored in eSuccessFilePath, have the same uids as the entries from source data
        entry = restoreJsonRteEntryRefs(entry, sourceEntry, contentType.schema, {
          uidMapper: this.entriesUidMapper,
          mappedAssetUids: this.assetUidMapper,
          mappedAssetUrls: this.assetUrlMapper,
        });
        log.debug(`Restored JSON RTE entry references for: ${newUid}`, this.importConfig.context);
      }

      entry = lookupAssets(
        {
          content_type: contentType,
          entry: entry,
        },
        this.assetUidMapper,
        this.assetUrlMapper,
        path.join(this.entriesPath, cTUid),
        this.installedExtensions,
      );
      log.debug(`Processed asset lookups for entry update: ${newUid}`, this.importConfig.context);

      entry = lookupEntries(
        {
          content_type: contentType,
          entry,
        },
        this.entriesUidMapper,
        path.join(this.entriesMapperPath, cTUid, locale),
      );
      log.debug(`Processed entry lookups for entry update: ${newUid}`, this.importConfig.context);

      const entryResponse = this.stack.contentType(contentType.uid).entry(newUid);
      Object.assign(entryResponse, cloneDeep(entry), { uid: newUid });
      delete entryResponse.publish_details;
      apiOptions.apiData = entryResponse;
      log.debug(`Entry update serialization completed for: ${newUid}`, this.importConfig.context);
    } catch (error) {
      handleAndLogError(error, { ...this.importConfig.context, cTUid, locale });
      apiOptions.apiData = null;
    }
    return apiOptions;
  }

  async enableMandatoryCTReferences(): Promise<void> {
    const onSuccess = ({ response: contentType, apiData: { uid } }: any) => {
      log.success(`${uid} content type references updated`, this.importConfig.context);
    };
    const onReject = ({ error, apiData: { uid } }: any) => {
      handleAndLogError(
        error,
        { ...this.importConfig.context, uid },
        `Failed to update references of content type '${uid}'`,
      );
      throw new Error(`Failed to update references of content type ${uid}`);
    };
    return await this.makeConcurrentCall({
      processName: 'Update content type references',
      apiContent: this.modifiedCTs,
      apiParams: {
        serializeData: this.serializeUpdateCTsWithRef.bind(this),
        reject: onReject.bind(this),
        resolve: onSuccess.bind(this),
        entity: 'update-cts',
        includeParamOnCompletion: true,
      },
      concurrencyLimit: this.importConcurrency,
    });
  }

  /**
   * @method serializeUpdateCTsWithRef
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeUpdateCTsWithRef(apiOptions: ApiOptions): ApiOptions {
    const { apiData } = apiOptions;
    const contentType = cloneDeep(apiData);
    if (contentType.field_rules) {
      delete contentType.field_rules;
    }
    lookupExtension(
      this.importConfig,
      contentType.schema,
      this.importConfig.preserveStackVersion,
      this.installedExtensions,
    );
    const contentTypePayload = this.stack.contentType(contentType.uid);
    Object.assign(contentTypePayload, cloneDeep(contentType));
    apiOptions.apiData = contentTypePayload;
    return apiOptions;
  }

  async removeAutoCreatedEntries(): Promise<void> {
    const onSuccess = ({ response, apiData: { entryUid } }: any) => {
      // NOTE Remove entry from list
      this.entriesForVariant = this.entriesForVariant.filter(
        (item) => !(item.entry_uid === entryUid && item.locale === this.importConfig?.master_locale?.code),
      );

      log.success(`Auto created entry in master locale removed - entry uid ${entryUid} `, this.importConfig.context);
    };
    const onReject = ({ error, apiData: { entryUid } }: any) => {
      // NOTE Remove entry from list
      this.entriesForVariant = this.entriesForVariant.filter(
        (item) => !(item.entry_uid === entryUid && item.locale === this.importConfig?.master_locale?.code),
      );

      handleAndLogError(
        error,
        { ...this.importConfig.context },
        `Failed to remove auto created entry in master locale - entry uid ${entryUid}`,
      );
    };
    return await this.makeConcurrentCall({
      processName: 'Remove auto created entry in master locale',
      apiContent: this.autoCreatedEntries,
      apiParams: {
        reject: onReject.bind(this),
        resolve: onSuccess.bind(this),
        entity: 'delete-entries',
        includeParamOnCompletion: true,
        additionalInfo: { locale: this.importConfig?.master_locale?.code },
      },
      concurrencyLimit: this.importConcurrency,
    });
  }

  async updateFieldRules(): Promise<void> {
    let cTsWithFieldRules = (fsUtil.readFile(path.join(this.cTsPath + '/field_rules_uid.json')) || []) as Record<
      string,
      any
    >[];
    if (!cTsWithFieldRules || cTsWithFieldRules?.length === 0) {
      log.debug('No content types with field rules found to update.', this.importConfig.context);
      return;
    }
    log.debug(`Found ${cTsWithFieldRules.length} content types with field rules to update`, this.importConfig.context);

    for (let cTUid of cTsWithFieldRules) {
      log.debug(`Processing field rules for content type: ${cTUid}`, this.importConfig.context);

      const cTs: Record<string, any>[] = (fsUtil.readFile(path.join(this.cTsPath, 'schema.json')) || []) as Record<
        string,
        unknown
      >[];
      const contentType: any = find(cTs, { uid: cTUid });

      if (contentType.field_rules) {
        log.debug(
          `Found ${contentType.field_rules.length} field rules for content type: ${cTUid}`,
          this.importConfig.context,
        );

        const fieldDatatypeMap: { [key: string]: string } = {};
        for (let i = 0; i < contentType.schema?.length; i++) {
          const field = contentType.schema[i].uid;
          fieldDatatypeMap[field] = contentType.schema[i].data_type;
        }
        log.debug(
          `Built field datatype map for ${Object.keys(fieldDatatypeMap).length} fields.`,
          this.importConfig.context,
        );

        let fieldRuleLength = contentType.field_rules?.length;
        let updatedRulesCount = 0;

        for (let k = 0; k < fieldRuleLength; k++) {
          let fieldRuleConditionLength = contentType.field_rules[k].conditions?.length;
          for (let i = 0; i < fieldRuleConditionLength; i++) {
            if (fieldDatatypeMap[contentType.field_rules[k].conditions[i].operand_field] === 'reference') {
              let fieldRulesValue = contentType.field_rules[k].conditions[i].value;
              let fieldRulesArray = fieldRulesValue.split('.');
              let updatedValue = [];

              for (const element of fieldRulesArray) {
                let splittedFieldRulesValue = element;
                if (this.entriesUidMapper.hasOwnProperty(splittedFieldRulesValue)) {
                  updatedValue.push(this.entriesUidMapper[splittedFieldRulesValue]);
                  log.debug(
                    `Updated field rule reference: ${splittedFieldRulesValue} → ${this.entriesUidMapper[splittedFieldRulesValue]}`,
                    this.importConfig.context,
                  );
                } else {
                  updatedValue.push(element);
                }
              }
              contentType.field_rules[k].conditions[i].value = updatedValue.join('.');
              updatedRulesCount++;
            }
          }
        }

        log.debug(
          `Updated ${updatedRulesCount} field rule references for content type: ${cTUid}`,
          this.importConfig.context,
        );

        const contentTypeResponse: any = await this.stack
          .contentType(contentType.uid)
          .fetch()
          .catch((error) => {
            handleAndLogError(error, { ...this.importConfig.context, cTUid });
          });
        if (!contentTypeResponse) {
          log.debug(`Skipping field rules update for ${cTUid} - content type not found`, this.importConfig.context);
          continue;
        }

        contentTypeResponse.field_rules = contentType.field_rules;
        await contentTypeResponse.update().catch((error: Error) => {
          handleAndLogError(error, { ...this.importConfig.context, cTUid });
        });
        log.success(`Updated the field rules of ${cTUid}`, this.importConfig.context);
      } else {
        log.info(`No field rules found in content type ${cTUid} to update`, this.importConfig.context);
      }
    }
  }

  async publishEntries({ cTUid, locale }: { cTUid: string; locale: string }): Promise<void> {
    const processName = 'Publish Entries';
    const indexFileName = 'index.json';
    const basePath = path.join(this.entriesPath, cTUid, locale);
    const fs = new FsUtility({ basePath, indexFileName });
    const indexer = fs.indexFileContent;
    const indexerCount = values(indexer).length;
    const contentType = find(this.cTs, { uid: cTUid });

    if (indexerCount === 0) {
      log.debug(`No entries found for publishing in ${cTUid} - ${locale}`, this.importConfig.context);
      return Promise.resolve();
    }
    log.debug(
      `Starting to publish entries for ${cTUid} in locale ${locale} - ${indexerCount} chunks to process`,
      this.importConfig.context,
    );

    const onSuccess = ({ response, apiData: { environments, entryUid, locales }, additionalInfo }: any) => {
      log.success(
        `Published the entry: '${entryUid}' of Content Type '${cTUid}' and Locale '${locale}' in Environments '${environments?.join(
          ',',
        )}' and Locales '${locales?.join(',')}'`,
        this.importConfig.context,
      );
      log.debug(
        `Published entry ${entryUid} to ${environments?.length || 0} environments and ${locales?.length || 0} locales`,
        this.importConfig.context,
      );
    };
    const onReject = ({ error, apiData: { environments, entryUid, locales }, additionalInfo }: any) => {
      handleAndLogError(
        error,
        { ...this.importConfig.context, cTUid, locale },
        `Failed to publish: '${entryUid}' entry of Content Type '${cTUid}' and Locale '${locale}' in Environments '${environments?.join(
          ',',
        )}' and Locales '${locales?.join(',')}'`,
      );
    };

    for (const index in indexer) {
      log.debug(
        `Processing publish chunk ${index} of ${indexerCount} for ${cTUid} in ${locale}`,
        this.importConfig.context,
      );

      const chunk = await fs.readChunkFiles.next().catch((error) => {
        handleAndLogError(error, { ...this.importConfig.context, cTUid, locale });
      });

      if (chunk) {
        let apiContent = values(chunk as Record<string, any>[]);
        let apiContentDuplicate: any = [];
        apiContentDuplicate = apiContent.flatMap((content: Record<string, any>) => {
          if (content?.publish_details?.length > 0) {
            return content.publish_details.map((publish: Record<string, any>) => ({
              ...content,
              locale: publish.locale,
              publish_details: [publish],
            }));
          }
          return []; // Return an empty array if publish_details is empty
        });
        apiContent = apiContentDuplicate;

        log.debug(`Processing ${apiContent.length} publishable entries in chunk ${index}`, this.importConfig.context);

        if (apiContent?.length === 0) {
          log.debug(`No publishable entries found in chunk ${index}`, this.importConfig.context);
          continue;
        } else {
          await this.makeConcurrentCall({
            apiContent,
            processName,
            indexerCount,
            currentIndexer: +index,
            apiParams: {
              reject: onReject,
              resolve: onSuccess,
              entity: 'publish-entries',
              includeParamOnCompletion: true,
              serializeData: this.serializePublishEntries.bind(this),
              additionalInfo: { contentType, locale, cTUid },
            },
            concurrencyLimit: this.importConcurrency,
          }).then(() => {
            log.success(`Published entries for content type ${cTUid} in locale ${locale}`, this.importConfig.context);
          });
        }
      }
    }
  }

  /**
   * @method serializeEntries
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializePublishEntries(apiOptions: ApiOptions): ApiOptions {
    let { apiData: entry, additionalInfo } = apiOptions;
    const requestObject: {
      environments: Array<string>;
      locales: Array<string>;
      entryUid: string;
    } = {
      environments: [],
      locales: [],
      entryUid: this.entriesUidMapper[entry.uid],
    };
    if (entry.publish_details && entry.publish_details?.length > 0) {
      forEach(entry.publish_details, (pubObject) => {
        if (
          this.envs.hasOwnProperty(pubObject.environment) &&
          indexOf(requestObject.environments, this.envs[pubObject.environment].name) === -1
        ) {
          requestObject.environments.push(this.envs[pubObject.environment].name);
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
    return apiOptions;
  }
}
