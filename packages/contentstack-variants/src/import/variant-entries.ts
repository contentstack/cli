import omit from 'lodash/omit';
import chunk from 'lodash/chunk';
import entries from 'lodash/entries';
import isEmpty from 'lodash/isEmpty';
import forEach from 'lodash/forEach';
import indexOf from 'lodash/indexOf';
import { join, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import { FsUtility, HttpResponse, sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';

import VariantAdapter, { VariantHttpClient } from '../utils/variant-api-adapter';
import {
  LogType,
  APIConfig,
  AdapterType,
  AnyProperty,
  ImportConfig,
  ContentTypeStruct,
  VariantEntryStruct,
  ImportHelperMethodsConfig,
  EntryDataForVariantEntries,
  CreateVariantEntryDto,
  PublishVariantEntryDto,
} from '../types';
import { fsUtil } from '../utils';

export default class VariantEntries extends VariantAdapter<VariantHttpClient<ImportConfig>> {
  public entriesDirPath: string;
  public entriesMapperPath: string;
  public variantEntryBasePath!: string;
  public variantIdList!: Record<string, unknown>;
  public personalizeConfig: ImportConfig['modules']['personalize'];

  public taxonomies!: Record<string, unknown>;
  public assetUrlMapper!: Record<string, any>;
  public assetUidMapper!: Record<string, any>;
  public entriesUidMapper!: Record<string, any>;
  private installedExtensions!: Record<string, any>[];
  private failedVariantPath!: string;
  private failedVariantEntries!: Record<string, any>;
  private environments!: Record<string, any>;

  constructor(readonly config: ImportConfig & { helpers?: ImportHelperMethodsConfig }) {
    const conf: APIConfig & AdapterType<VariantHttpClient<ImportConfig>, APIConfig> = {
      config,
      httpClient: true,
      baseURL: config.host,
      Adapter: VariantHttpClient<ImportConfig>,
      headers: {
        api_key: config.apiKey,
        branch: config.branchName,
        organization_uid: config.org_uid,
        'X-Project-Uid': config.modules.personalize.project_id,
      },
    };
    super(Object.assign(omit(config, ['helpers']), conf));

    this.entriesMapperPath = resolve(sanitizePath(config.backupDir), 'mapper', 'entries');
    this.personalizeConfig = this.config.modules.personalize;
    this.entriesDirPath = resolve(sanitizePath(config.backupDir), sanitizePath(config.modules.entries.dirName));
    this.failedVariantPath = resolve(sanitizePath(this.entriesMapperPath), 'failed-entry-variants.json');
    this.failedVariantEntries = new Map();
    if (this.config && this.config.context) {
      this.config.context.module = 'variant-entries';
    }
  }

  /**
   * This TypeScript function asynchronously imports backupDir from a JSON file and processes the entries
   * for variant entries.
   * @returns If the file at the specified file path exists and contains backupDir, the function will parse
   * the JSON backupDir and iterate over each entry to import variant entries using the
   * `importVariantEntries` method. If the `entriesForVariants` array is empty, the function will log a
   * message indicating that no entries were found and return.
   */
  async import() {
    try {
      const filePath = resolve(sanitizePath(this.entriesMapperPath), 'data-for-variant-entry.json');
      const variantIdPath = resolve(
        sanitizePath(this.config.backupDir),
        'mapper',
        sanitizePath(this.personalizeConfig.dirName),
        sanitizePath(this.personalizeConfig.experiences.dirName),
        'variants-uid-mapping.json',
      );

      log.debug(`Checking for variant entry data file: ${filePath}`, this.config.context);
      if (!existsSync(filePath)) {
        log.warn(`Variant entry data file not found at path: ${filePath}, skipping import`, this.config.context);
        return;
      }

      log.debug(`Checking for variant ID mapping file: ${variantIdPath}`, this.config.context);
      if (!existsSync(variantIdPath)) {
        log.error('Variant UID mapping file not found', this.config.context);
        return;
      }

      const entriesForVariants = fsUtil.readFile(filePath, true) as EntryDataForVariantEntries[];
      log.debug(`Loaded ${entriesForVariants?.length || 0} entries for variant processing`, this.config.context);

      if (isEmpty(entriesForVariants)) {
        log.warn('No entries found for variant import', this.config.context);
        return;
      }

    const entriesUidMapperPath = join(sanitizePath(this.entriesMapperPath), 'uid-mapping.json');
    const assetUidMapperPath = resolve(sanitizePath(this.config.backupDir), 'mapper', 'assets', 'uid-mapping.json');
    const assetUrlMapperPath = resolve(sanitizePath(this.config.backupDir), 'mapper', 'assets', 'url-mapping.json');
    const taxonomiesPath = resolve(
      sanitizePath(this.config.backupDir),
      'mapper',
      sanitizePath(this.config.modules.taxonomies.dirName),
      'terms',
      'success.json',
    );
    const marketplaceAppMapperPath = resolve(
      sanitizePath(this.config.backupDir),
      'mapper',
      'marketplace_apps',
      'uid-mapping.json',
    );
    const envPath = resolve(sanitizePath(this.config.backupDir), 'environments', 'environments.json');

    log.debug('Loading variant ID mapping and dependency data', this.config.context);

    // NOTE Read and store list of variant IDs
    this.variantIdList = (fsUtil.readFile(variantIdPath, true) || {}) as Record<string, unknown>;
    if (isEmpty(this.variantIdList)) {
      log.warn('Empty variant UID data found', this.config.context);
      return;
    }

    // NOTE entry relational data lookup dependencies.
    this.entriesUidMapper = (fsUtil.readFile(entriesUidMapperPath, true) || {}) as Record<string, any>;
    this.installedExtensions = ((fsUtil.readFile(marketplaceAppMapperPath) as any) || { extension_uid: {} })
      .extension_uid as Record<string, any>[];
    this.taxonomies = (fsUtil.readFile(taxonomiesPath, true) || {}) as Record<string, unknown>;
    this.assetUidMapper = (fsUtil.readFile(assetUidMapperPath, true) || {}) as Record<string, any>;
    this.assetUrlMapper = (fsUtil.readFile(assetUrlMapperPath, true) || {}) as Record<string, any>;
    this.environments = (fsUtil.readFile(envPath, true) || {}) as Record<string, any>;

    log.debug(
      `Loaded dependency data - Entries: ${Object.keys(this.entriesUidMapper).length}, Assets: ${
        Object.keys(this.assetUidMapper).length
      }, Taxonomies: ${Object.keys(this.taxonomies).length}`,
      this.config.context,
    );

    // If we have a parent progress manager, use it as a sub-module
    // Otherwise create our own simple progress manager
    let progress;
    if (this.parentProgressManager) {
      progress = this.parentProgressManager;
      log.debug('Using parent progress manager for variant entries import', this.config.context);
    } else {
      progress = this.createSimpleProgress('Variant Entries', entriesForVariants.length);
      log.debug('Created standalone progress manager for variant entries import', this.config.context);
    }

    // set the token
    await this.variantInstance.init();

    log.info(`Processing ${entriesForVariants.length} entries for variant import`, this.config.context);
    for (const entriesForVariant of entriesForVariants) {
      try {
        await this.importVariantEntries(entriesForVariant);
        this.updateProgress(true, `variant entry: ${entriesForVariant.content_type}/${entriesForVariant.locale}/${entriesForVariant.entry_uid}`, undefined, 'Variant Entries');
        log.debug(`Successfully processed variant entry: ${entriesForVariant.content_type}/${entriesForVariant.locale}/${entriesForVariant.entry_uid}`, this.config.context);
      } catch (error) {
        this.updateProgress(false, `variant entry: ${entriesForVariant.content_type}/${entriesForVariant.locale}/${entriesForVariant.entry_uid}`, (error as any)?.message, 'Variant Entries');
        handleAndLogError(error, this.config.context, `Failed to import variant entry: ${entriesForVariant.content_type}/${entriesForVariant.locale}/${entriesForVariant.entry_uid}`);
      }
    }

    // Only complete progress if we own the progress manager (no parent)
    if (!this.parentProgressManager) {
      this.completeProgress(true);
    }

    log.success(`Variant entries imported successfully! Total entries: ${entriesForVariants.length} - processing completed`, this.config.context);
    } catch (error) {
      if (!this.parentProgressManager) {
        this.completeProgress(false, (error as any)?.message || 'Variant entries import failed');
      }
      handleAndLogError(error, this.config.context, 'Variant entries import failed');
      throw error;
    }
  }

  /**
   * The function `importVariantEntries` asynchronously imports variant entries using file system
   * utility in TypeScript.
   * @param {EntryDataForVariantEntries} entriesForVariant - EntryDataForVariantEntries {
   */
  async importVariantEntries(entriesForVariant: EntryDataForVariantEntries) {
    const variantEntry = this.config.modules.variantEntry;
    const { content_type, locale, entry_uid } = entriesForVariant;

    log.debug(`Importing variant entries for: ${content_type}/${locale}/${entry_uid}`, this.config.context);

    const ctConfig = this.config.modules['content-types'];
    const contentType: ContentTypeStruct = JSON.parse(
      readFileSync(
        resolve(
          sanitizePath(this.config.backupDir),
          sanitizePath(ctConfig.dirName),
          `${sanitizePath(content_type)}.json`,
        ),
        'utf8',
      ),
    );

    const variantEntryBasePath = join(
      sanitizePath(this.entriesDirPath),
      sanitizePath(content_type),
      sanitizePath(locale),
      sanitizePath(variantEntry.dirName),
      sanitizePath(entry_uid),
    );

    log.debug(`Processing variant entries from: ${variantEntryBasePath}`, this.config.context);
    const fs = new FsUtility({ basePath: variantEntryBasePath, createDirIfNotExist: false });

    for (const _ in fs.indexFileContent) {
      try {
        const variantEntries = (await fs.readChunkFiles.next()) as VariantEntryStruct[];
        if (variantEntries?.length) {
          log.debug(`Processing batch of ${variantEntries.length} variant entries`, this.config.context);
          await this.handleConcurrency(contentType, variantEntries, entriesForVariant);
        }
      } catch (error) {
        handleAndLogError(
          error,
          this.config.context,
          `Failed to process variant entries for ${content_type}/${locale}/${entry_uid}`,
        );
      }
    }
  }

  /**
   * The function `handleConcurrency` processes variant entries in batches with a specified concurrency
   * level and handles API calls for creating variant entries.
   * @param {VariantEntryStruct[]} variantEntries - The `variantEntries` parameter is an array of
   * `VariantEntryStruct` objects. It seems like this function is handling concurrency for processing
   * these entries in batches. The function chunks the `variantEntries` array into smaller batches and
   * then processes each batch asynchronously using `Promise.allSettled`. It also
   * @param {EntryDataForVariantEntries} entriesForVariant - The `entriesForVariant` parameter seems to
   * be an object containing the following properties:
   * @returns The `handleConcurrency` function processes variant entries in batches, creating variant
   * entries using the `createVariantEntry` method and handling the API response using
   * `Promise.allSettled`. The function also includes logic to handle variant IDs and delays between
   * batch processing.
   */
  async handleConcurrency(
    contentType: ContentTypeStruct,
    variantEntries: VariantEntryStruct[],
    entriesForVariant: EntryDataForVariantEntries,
  ) {
    let batchNo = 0;
    const variantEntryConfig = this.config.modules.variantEntry;
    const { content_type, locale, entry_uid } = entriesForVariant;
    const entryUid = this.entriesUidMapper[entry_uid];
    const batches = chunk(variantEntries, variantEntryConfig.apiConcurrency || 5);
    if (isEmpty(batches)) return;

    log.debug(`Starting concurrent processing for ${variantEntries.length} variant entries`, this.config.context);

    for (const [, batch] of entries(batches)) {
      batchNo += 1;
      const allPromise = [];
      const start = Date.now();

      log.debug(
        `Processing batch ${batchNo}/${batches.length} with ${batch.length} variant entries`,
        this.config.context,
      );

      for (let [, variantEntry] of entries(batch)) {
        const onSuccess = ({ response, apiData: { entryUid, variantUid } }: any) => {
          log.info(
            `Created entry variant: '${variantUid}' of entry uid ${entryUid} locale '${locale}'`,
            this.config.context,
          );
        };

        const onReject = ({ error, apiData }: any) => {
          const { entryUid, variantUid } = apiData;
          this.failedVariantEntries.set(variantUid, apiData);
          handleAndLogError(
            error,
            this.config.context,
            `Failed to create entry variant: '${variantUid}' of entry uid ${entryUid} locale '${locale}'`,
          );
        };
        // NOTE Find new variant Id by old Id
        const variantId = this.variantIdList[variantEntry._variant._uid] as string;
        log.debug(
          `Looking up variant ID for ${variantEntry._variant._uid}: ${variantId ? 'found' : 'not found'}`,
          this.config.context,
        );

        // NOTE Replace all the relation data UID's
        variantEntry = this.handleVariantEntryRelationalData(contentType, variantEntry);
        const changeSet = this.serializeChangeSet(variantEntry);
        const createVariantReq: CreateVariantEntryDto = {
          _variant: variantEntry._variant,
          ...changeSet,
        };

        if (variantId) {
          log.debug(`Creating variant entry for variant ID: ${variantId}`, this.config.context);
          const promise = this.variantInstance.createVariantEntry(
            createVariantReq,
            {
              locale,
              entry_uid: entryUid,
              variant_id: variantId,
              content_type_uid: content_type,
            },
            {
              reject: onReject.bind(this),
              resolve: onSuccess.bind(this),
              variantUid: variantId,
            },
          );

          allPromise.push(promise);
        } else {
          log.error(`Variant ID not found for ${variantEntry._variant._uid}`, this.config.context);
        }
      }

      // NOTE Handle the API response here
      log.debug(`Waiting for ${allPromise.length} variant entry creation promises to complete`, this.config.context);
      await Promise.allSettled(allPromise);
      log.debug(`Batch ${batchNo} creation completed`, this.config.context);

      // NOTE publish all the entries
      await this.publishVariantEntries(batch, entryUid, content_type);
      const end = Date.now();
      const exeTime = end - start;
      log.debug(`Batch ${batchNo} completed in ${exeTime}ms`, this.config.context);
      this.variantInstance.delay(1000 - exeTime);
    }

    log.debug(`Writing failed variant entries to: ${this.failedVariantPath}`, this.config.context);
    fsUtil.writeFile(this.failedVariantPath, this.failedVariantEntries);
  }

  /**
   * Serializes the change set of a entry variant.
   * @param variantEntry - The entry variant to serialize.
   * @returns The serialized change set as a record.
   */
  serializeChangeSet(variantEntry: VariantEntryStruct) {
    let changeSet: Record<string, any> = {};
    if (variantEntry?._variant?._change_set?.length) {
      variantEntry._variant._change_set.forEach((key: string) => {
        key = key.split('.')[0];
        if (variantEntry[key]) {
          changeSet[key] = variantEntry[key];
        }
      });
    }
    return changeSet;
  }

  /**
   * The function `handleVariantEntryRelationalData` processes relational data for a entry variant
   * based on the provided content type and configuration helpers.
   * @param {ContentTypeStruct} contentType - The `contentType` parameter in the
   * `handleVariantEntryRelationalData` function is of type `ContentTypeStruct`. It is used to define
   * the structure of the content type being processed within the function. This parameter likely
   * contains information about the schema and configuration of the content type.
   * @param {VariantEntryStruct} variantEntry - The `variantEntry` parameter in the
   * `handleVariantEntryRelationalData` function is a data structure that represents a entry variant.
   * It is of type `VariantEntryStruct` and contains information related to a specific entry variant.
   * This function is responsible for performing various operations on the `variantEntry`
   * @returns The function `handleVariantEntryRelationalData` returns the `variantEntry` after
   * performing various lookups and replacements on it based on the provided `contentType` and
   * `config.helpers`.
   */
  handleVariantEntryRelationalData(
    contentType: ContentTypeStruct,
    variantEntry: VariantEntryStruct,
  ): VariantEntryStruct {
    log.debug(`Processing relational data for variant entry: ${variantEntry.uid}`, this.config.context);

    if (this.config.helpers) {
      const { lookUpTerms, lookupAssets, lookupExtension, lookupEntries, restoreJsonRteEntryRefs } =
        this.config.helpers;

      // FIXME Not sure why do we even need lookupExtension in entries [Ref taken from entries import]
      // Feel free to remove this flow if it's not valid
      // NOTE Find and replace extension's UID
      if (lookupExtension) {
        log.debug('Processing extension lookups for variant entry', this.config.context);
        lookupExtension(this.config, contentType.schema, this.config.preserveStackVersion, this.installedExtensions);
      }

      // NOTE Find and replace RTE Ref UIDs
      log.debug('Processing RTE reference lookups for variant entry', this.config.context);
      variantEntry = restoreJsonRteEntryRefs(variantEntry, variantEntry, contentType.schema, {
        uidMapper: this.entriesUidMapper,
        mappedAssetUids: this.assetUidMapper,
        mappedAssetUrls: this.assetUrlMapper,
      }) as VariantEntryStruct;

      // NOTE Find and replace Entry Ref UIDs
      log.debug('Processing entry reference lookups for variant entry', this.config.context);
      variantEntry = lookupEntries(
        {
          entry: variantEntry,
          content_type: contentType,
        },
        this.entriesUidMapper,
        resolve(sanitizePath(this.entriesMapperPath), sanitizePath(contentType.uid), sanitizePath(variantEntry.locale)),
      );

      // NOTE: will remove term if term doesn't exists in taxonomy
      // FIXME: Validate if taxonomy support available for variant entries,
      // if not, feel free to remove this lookup flow.
      log.debug('Processing taxonomy term lookups for variant entry', this.config.context);
      lookUpTerms(contentType.schema, variantEntry, this.taxonomies, this.config);

      // update file fields of entry variants to support lookup asset logic
      log.debug('Updating file fields for variant entry', this.config.context);
      this.updateFileFields(variantEntry);

      // NOTE Find and replace asset's UID
      log.debug('Processing asset lookups for variant entry', this.config.context);
      variantEntry = lookupAssets(
        {
          entry: variantEntry,
          content_type: contentType,
        },
        this.assetUidMapper,
        this.assetUrlMapper,
        join(sanitizePath(this.entriesDirPath), sanitizePath(contentType.uid)),
        this.installedExtensions,
      );
    }

    return variantEntry;
  }

  /**
   * Updates the file fields of a entry variant to support lookup asset logic.
   * Lookup asset expects file fields to be an object instead of a string. So here we are updating the file fields to be an object. Object has two keys: `uid` and `filename`. `uid` is the asset UID and `filename` is the name of the file. Used a dummy value for the filename. This is a temporary fix and will be updated in the future.
   * @param variantEntry - The entry variant to update.
   */
  updateFileFields(variantEntry: VariantEntryStruct) {
    log.debug(`Updating file fields for variant entry: ${variantEntry.uid}`, this.config.context);

    const setValue = (currentObj: VariantEntryStruct, keys: string[]) => {
      if (!currentObj || keys.length === 0) return;

      const [firstKey, ...restKeys] = keys;

      if (Array.isArray(currentObj)) {
        for (const item of currentObj) {
          setValue(item, [firstKey, ...restKeys]);
        }
      } else if (currentObj && typeof currentObj === 'object') {
        if (firstKey in currentObj) {
          if (keys.length === 1) {
            // Check if the current property is already an object with uid and filename
            const existingValue = currentObj[firstKey];

            if (existingValue && typeof existingValue === 'object' && existingValue.uid) {
              currentObj[firstKey] = { uid: existingValue.uid, filename: 'dummy.jpeg' };
            } else {
              currentObj[firstKey] = { uid: currentObj[firstKey], filename: 'dummy.jpeg' };
            }
          } else {
            setValue(currentObj[firstKey], restKeys);
          }
        }
      }
    };

    const pathsToUpdate =
      variantEntry?._metadata?.references
        ?.filter((ref: any) => ref._content_type_uid === 'sys_assets')
        .map((ref: any) => ref.path) || [];

    log.debug(`Found ${pathsToUpdate.length} file field paths to update`, this.config.context);
    pathsToUpdate.forEach((path: string) => setValue(variantEntry, path.split('.')));
  }

  /**
   * Publishes variant entries in batch for a given entry UID and content type.
   * @param batch - An array of VariantEntryStruct objects representing the variant entries to be published.
   * @param entryUid - The UID of the entry for which the variant entries are being published.
   * @param content_type - The UID of the content type of the entry.
   * @returns A Promise that resolves when all variant entries have been published.
   */
  async publishVariantEntries(batch: VariantEntryStruct[], entryUid: string, content_type: string) {
    const allPromise = [];
    log.info(
      `Publishing variant entries for entry uid '${entryUid}' of Content Type '${content_type}'`,
      this.config.context,
    );
    log.debug(`Processing ${batch.length} variant entries for publishing`, this.config.context);

    for (let [, variantEntry] of entries(batch)) {
      const variantEntryUID = variantEntry.uid;
      const oldVariantUid = variantEntry._variant._uid || '';
      const newVariantUid = this.variantIdList[oldVariantUid] as string;

      if (!newVariantUid) {
        log.debug('Variant ID not found', this.config.context);
        continue;
      }

      if (this.failedVariantEntries.has(variantEntryUID)) {
        log.debug(`Variant UID not found. Skipping entry variant publish for ${variantEntryUID}`, this.config.context);
        continue;
      }

      if (this.environments?.length) {
        log.debug('No environment found! Skipping entry variant publishing...', this.config.context);
        return;
      }

      const onSuccess = ({ response, apiData: { entryUid, variantUid } }: any) => {
        log.info(
          `Entry variant: '${variantUid}' of entry '${entryUid}' published on locales '${locales.join(',')}'`,
          this.config.context,
        );
      };
      const onReject = ({ error, apiData: { entryUid, variantUid } }: any) => {
        handleAndLogError(
          error,
          this.config.context,
          `Failed to publish entry variant: '${variantUid}' of entry uid ${entryUid} on locales '${locales.join(',')}'`,
        );
      };

      const { environments, locales } = this.serializePublishEntries(variantEntry);
      if (environments?.length === 0 || locales?.length === 0) {
        log.debug(`Skipping publish for variant ${newVariantUid} - no environments or locales`, this.config.context);
        continue;
      }

      log.debug(
        `Publishing variant ${newVariantUid} to environments: ${environments.join(', ')}, locales: ${locales.join(
          ', ',
        )}`,
        this.config.context,
      );
      const publishReq: PublishVariantEntryDto = {
        entry: {
          environments,
          locales,
          variants: [{ uid: newVariantUid, version: 1 }],
        },
        locale: variantEntry.locale,
      };

      const promise = this.variantInstance.publishVariantEntry(
        publishReq,
        {
          entry_uid: entryUid,
          content_type_uid: content_type,
        },
        {
          reject: onReject.bind(this),
          resolve: onSuccess.bind(this),
          log: log,
          variantUid: newVariantUid,
        },
      );

      allPromise.push(promise);
    }
    await Promise.allSettled(allPromise);
    log.info(
      `Published variant entries for entry uid '${entryUid}' of Content Type '${content_type}'`,
      this.config.context,
    );
  }

  /**
   * Serializes the publish entries of a variant.
   * @param variantEntry - The entry variant to serialize.
   * @returns An object containing the serialized publish entries.
   */
  serializePublishEntries(variantEntry: VariantEntryStruct): {
    environments: Array<string>;
    locales: Array<string>;
  } {
    log.debug(`Serializing publish entries for variant: ${variantEntry.uid}`, this.config.context);

    const requestObject: {
      environments: Array<string>;
      locales: Array<string>;
    } = {
      environments: [],
      locales: [],
    };
    if (variantEntry.publish_details && variantEntry.publish_details?.length > 0) {
      log.debug(`Processing ${variantEntry.publish_details.length} publish details`, this.config.context);
    } else {
      log.debug('No publish details found for variant entry', this.config.context);
    }

    if (variantEntry.publish_details && variantEntry.publish_details?.length > 0) {
      forEach(variantEntry.publish_details, (pubObject) => {
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
    }

    log.debug(
      `Serialized publish data - environments: ${requestObject.environments.length}, locales: ${requestObject.locales.length}`,
      this.config.context,
    );
    return requestObject;
  }
}
