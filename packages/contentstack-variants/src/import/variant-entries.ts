import omit from 'lodash/omit';
import chunk from 'lodash/chunk';
import entries from 'lodash/entries';
import isEmpty from 'lodash/isEmpty';
import forEach from 'lodash/forEach';
import indexOf from 'lodash/indexOf';
import { join, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import { FsUtility, HttpResponse, sanitizePath } from '@contentstack/cli-utilities';

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
import { formatError, fsUtil, log } from '../utils';

export default class VariantEntries extends VariantAdapter<VariantHttpClient<ImportConfig>> {
  public entriesDirPath: string;
  public entriesMapperPath: string;
  public variantEntryBasePath!: string;
  public variantIdList!: Record<string, unknown>;
  public personalizationConfig: ImportConfig['modules']['personalization'];

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
        authtoken: config.auth_token,
        organization_uid: config.org_uid,
        'X-Project-Uid': config.modules.personalization.project_id,
      },
    }; 
    super(Object.assign(omit(config, ['helpers']), conf));
    this.entriesMapperPath = resolve(sanitizePath(config.backupDir), sanitizePath(config.branchName || ''), 'mapper', 'entries');
    this.personalizationConfig = this.config.modules.personalization;
    this.entriesDirPath = resolve(sanitizePath(config.backupDir), sanitizePath(config.branchName || ''), sanitizePath(config.modules.entries.dirName));
    this.failedVariantPath = resolve(sanitizePath(this.entriesMapperPath), 'failed-entry-variants.json');
    this.failedVariantEntries = new Map();
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
    const filePath = resolve(sanitizePath(this.entriesMapperPath), 'data-for-variant-entry.json');
    const variantIdPath = resolve(
      sanitizePath(this.config.backupDir),
      'mapper',
      sanitizePath(this.personalizationConfig.dirName),
      sanitizePath(this.personalizationConfig.experiences.dirName),
      'variants-uid-mapping.json',
    );

    if (!existsSync(filePath)) {
      log(this.config, this.messages.IMPORT_ENTRY_NOT_FOUND, 'info');
      return;
    }

    if (!existsSync(variantIdPath)) {
      log(this.config, this.messages.EMPTY_VARIANT_UID_DATA, 'error');
      return;
    }

    const entriesForVariants = fsUtil.readFile(filePath, true) as EntryDataForVariantEntries[];

    if (isEmpty(entriesForVariants)) {
      log(this.config, this.messages.IMPORT_ENTRY_NOT_FOUND, 'info');
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
    const marketplaceAppMapperPath = resolve(sanitizePath(this.config.backupDir), 'mapper', 'marketplace_apps', 'uid-mapping.json');
    const envPath = resolve(sanitizePath(this.config.backupDir), 'environments', 'environments.json');
    // NOTE Read and store list of variant IDs
    this.variantIdList = (fsUtil.readFile(variantIdPath, true) || {}) as Record<string, unknown>;
    if (isEmpty(this.variantIdList)) {
      log(this.config, this.messages.EMPTY_VARIANT_UID_DATA, 'info');
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

    for (const entriesForVariant of entriesForVariants) {
      await this.importVariantEntries(entriesForVariant);
    }
    log(this.config, 'All the entries variants have been imported & published successfully', 'success');
  }

  /**
   * The function `importVariantEntries` asynchronously imports variant entries using file system
   * utility in TypeScript.
   * @param {EntryDataForVariantEntries} entriesForVariant - EntryDataForVariantEntries {
   */
  async importVariantEntries(entriesForVariant: EntryDataForVariantEntries) {
    const variantEntry = this.config.modules.variantEntry;
    const { content_type, locale, entry_uid } = entriesForVariant;
    const ctConfig = this.config.modules['content-types'];
    const contentType: ContentTypeStruct = JSON.parse(
      readFileSync(resolve(sanitizePath(this.config.backupDir), sanitizePath(ctConfig.dirName), `${sanitizePath(content_type)}.json`), 'utf8'),
    );
    const variantEntryBasePath = join(sanitizePath(this.entriesDirPath), sanitizePath(content_type), sanitizePath(locale), sanitizePath(variantEntry.dirName), sanitizePath(entry_uid));
    const fs = new FsUtility({ basePath: variantEntryBasePath });

    for (const _ in fs.indexFileContent) {
      try {
        const variantEntries = (await fs.readChunkFiles.next()) as VariantEntryStruct[];
        if (variantEntries?.length) {
          await this.handleConcurrency(contentType, variantEntries, entriesForVariant);
        }
      } catch (error) {
        log(this.config, error, 'error');
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

    for (const [, batch] of entries(batches)) {
      batchNo += 1;
      const allPromise = [];
      const start = Date.now();

      for (let [, variantEntry] of entries(batch)) {
        const onSuccess = ({ response, apiData: { entryUid, variantUid }, log }: any) => {
          log(this.config, `Created entry variant: '${variantUid}' of entry uid ${entryUid}`, 'info');
        };

        const onReject = ({ error, apiData, log }: any) => {
          const { entryUid, variantUid } = apiData;
          this.failedVariantEntries.set(variantUid, apiData);
          log(this.config, `Failed to create entry variant: '${variantUid}' of entry uid ${entryUid}`, 'error');
          log(this.config, error, 'error');
        };
        // NOTE Find new variant Id by old Id
        const variant_id = this.variantIdList[variantEntry.variant_id] as string;
        // NOTE Replace all the relation data UID's
        variantEntry = this.handleVariantEntryRelationalData(contentType, variantEntry);
        const changeSet = this.serializeChangeSet(variantEntry);
        const createVariantReq: CreateVariantEntryDto = {
          _variant: variantEntry._variant,
          ...changeSet,
        };

        if (variant_id) {
          const promise = this.variantInstance.createVariantEntry(
            createVariantReq,
            {
              locale,
              entry_uid: entryUid,
              variant_id,
              content_type_uid: content_type,
            },
            {
              reject: onReject.bind(this),
              resolve: onSuccess.bind(this),
              variantUid: variantEntry.uid,
              log: log,
            },
          );

          allPromise.push(promise);
        } else {
          log(this.config, this.messages.VARIANT_ID_NOT_FOUND, 'error');
        }
      }

      // NOTE Handle the API response here
      await Promise.allSettled(allPromise);
      // NOTE publish all the entries
      await this.publishVariantEntries(batch, entryUid, content_type);
      const end = Date.now();
      const exeTime = end - start;
      this.variantInstance.delay(1000 - exeTime);
    }

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
    if (this.config.helpers) {
      const { lookUpTerms, lookupAssets, lookupExtension, lookupEntries, restoreJsonRteEntryRefs } =
        this.config.helpers;

      // FIXME Not sure why do we even need lookupExtension in entries [Ref taken from entries import]
      // Feel free to remove this flow if it's not valid
      // NOTE Find and replace extension's UID
      if (lookupExtension) {
        lookupExtension(this.config, contentType.schema, this.config.preserveStackVersion, this.installedExtensions);
      }

      // NOTE Find and replace RTE Ref UIDs
      variantEntry = restoreJsonRteEntryRefs(variantEntry, variantEntry, contentType.schema, {
        uidMapper: this.entriesUidMapper,
        mappedAssetUids: this.assetUidMapper,
        mappedAssetUrls: this.assetUrlMapper,
      }) as VariantEntryStruct;

      // NOTE Find and replace Entry Ref UIDs
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
      lookUpTerms(contentType.schema, variantEntry, this.taxonomies, this.config);

      // update file fields of entry variants to support lookup asset logic
      this.updateFileFields(variantEntry);

      // NOTE Find and replace asset's UID
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
    const setValue = (currentObj: VariantEntryStruct, keys: Array<string>) => {
      if (!currentObj || keys.length === 0) return;

      const [firstKey, ...restKeys] = keys;

      if (Array.isArray(currentObj)) {
        for (const item of currentObj) {
          setValue(item, [firstKey, ...restKeys]);
        }
      } else if (currentObj && typeof currentObj === 'object') {
        if (firstKey in currentObj) {
          if (keys.length === 1) {
            currentObj[firstKey] = { uid: currentObj[firstKey], filename: 'dummy.jpeg' };
          } else {
            setValue(currentObj[firstKey], restKeys);
          }
        }
      }
    };

    const pathsToUpdate = variantEntry?._metadata?.references
      .filter((ref: any) => ref._content_type_uid === 'sys_assets')
      .map((ref: any) => ref.path);

    if (pathsToUpdate) {
      pathsToUpdate.forEach((path: string) => setValue(variantEntry, path.split('.')));
    }
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
    for (let [, variantEntry] of entries(batch)) {
      const variantUid = variantEntry.uid;
      const oldVariantUid = variantEntry.variant_id || '';
      const newVariantUid = this.variantIdList[oldVariantUid] as string;

      if (!newVariantUid) {
        log(
          this.config,
          `${this.messages.VARIANT_ID_NOT_FOUND}. Skipping entry variant publish for ${variantUid}`,
          'info',
        );
        continue;
      }

      if (this.failedVariantEntries.has(variantUid)) {
        log(
          this.config,
          `${this.messages.VARIANT_UID_NOT_FOUND}. Skipping entry variant publish for ${variantUid}`,
          'info',
        );
        continue;
      }

      if (this.environments?.length) {
        log(this.config, 'No environment found! Skipping entry variant publishing...', 'info');
        return;
      }

      const onSuccess = ({ response, apiData: { entryUid, variantUid }, log }: any) => {
        log(this.config, `Entry variant: '${variantUid}' of entry uid ${entryUid} published successfully!`, 'info');
      };
      const onReject = ({ error, apiData: { entryUid, variantUid }, log }: any) => {
        log(this.config, `Failed to publish entry variant: '${variantUid}' of entry uid ${entryUid}`, 'error');
        log(this.config, formatError(error), 'error');
      };

      const { environments, locales } = this.serializePublishEntries(variantEntry);
      if (environments?.length === 0 || locales?.length === 0) {
        continue;
      }
      const publishReq: PublishVariantEntryDto = {
        entry: {
          environments,
          locales,
          publish_with_base_entry: false,
          variants: [{ uid: newVariantUid, version: 1 }],
        },
        locale: variantEntry.locale,
        version: 1,
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
          variantUid,
        },
      );

      allPromise.push(promise);
    }
    await Promise.allSettled(allPromise);
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
    const requestObject: {
      environments: Array<string>;
      locales: Array<string>;
    } = {
      environments: [],
      locales: [],
    };
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
    return requestObject;
  }
}
