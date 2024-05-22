import omit from 'lodash/omit';
import chunk from 'lodash/chunk';
import entries from 'lodash/entries';
import isEmpty from 'lodash/isEmpty';
import forEach from 'lodash/forEach';
import indexOf from 'lodash/indexOf';
import { join, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import { FsUtility, HttpResponse } from '@contentstack/cli-utilities';

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
  public personalizationConfig: ImportConfig['modules']['personalization'];

  public taxonomies!: Record<string, unknown>;
  public assetUrlMapper!: Record<string, any>;
  public assetUidMapper!: Record<string, any>;
  public entriesUidMapper!: Record<string, any>;
  private installedExtensions!: Record<string, any>[];
  private variantUidMapper: Record<string, string>;
  private variantUidMapperPath!: string;
  private environments!: Record<string, any>;

  constructor(
    readonly config: ImportConfig & { helpers?: ImportHelperMethodsConfig },
    private readonly log: LogType = console.log,
  ) {
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
    this.entriesMapperPath = resolve(config.backupDir, config.branchName || '', 'mapper', 'entries');
    this.personalizationConfig = this.config.modules.personalization;
    this.entriesDirPath = resolve(config.backupDir, config.branchName || '', config.modules.entries.dirName);
    this.variantUidMapperPath = resolve(this.entriesMapperPath, 'variant-uid-mapping.json');
    this.variantUidMapper = {};
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
    const filePath = resolve(this.entriesMapperPath, 'data-for-variant-entry.json');
    const variantIdPath = resolve(
      this.config.backupDir,
      'mapper',
      this.personalizationConfig.dirName,
      this.personalizationConfig.experiences.dirName,
      'variants-uid-mapping.json',
    );

    if (!existsSync(filePath)) {
      this.log(this.config, this.messages.IMPORT_ENTRY_NOT_FOUND, 'info');
      return;
    }

    if (!existsSync(variantIdPath)) {
      this.log(this.config, this.messages.EMPTY_VARIANT_UID_DATA, 'error');
      return;
    }

    const entriesForVariants = fsUtil.readFile(filePath, true) as EntryDataForVariantEntries[];

    if (isEmpty(entriesForVariants)) {
      this.log(this.config, this.messages.IMPORT_ENTRY_NOT_FOUND, 'info');
      return;
    }

    const entriesUidMapperPath = join(this.entriesMapperPath, 'uid-mapping.json');
    const assetUidMapperPath = resolve(this.config.backupDir, 'mapper', 'assets', 'uid-mapping.json');
    const assetUrlMapperPath = resolve(this.config.backupDir, 'mapper', 'assets', 'url-mapping.json');
    const taxonomiesPath = resolve(
      this.config.backupDir,
      'mapper',
      this.config.modules.taxonomies.dirName,
      'terms',
      'success.json',
    );
    const marketplaceAppMapperPath = resolve(this.config.backupDir, 'mapper', 'marketplace_apps', 'uid-mapping.json');
    const envPath = resolve(this.config.backupDir, 'environments', 'environments.json');
    // NOTE Read and store list of variant IDs
    this.variantIdList = (fsUtil.readFile(variantIdPath, true) || {}) as Record<string, unknown>;
    if (isEmpty(this.variantIdList)) {
      this.log(this.config, this.messages.EMPTY_VARIANT_UID_DATA, 'info');
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
      readFileSync(resolve(this.config.backupDir, ctConfig.dirName, `${content_type}.json`), 'utf8'),
    );
    const variantEntryBasePath = join(this.entriesDirPath, content_type, locale, variantEntry.dirName, entry_uid);
    const fs = new FsUtility({ basePath: variantEntryBasePath });

    for (const _ in fs.indexFileContent) {
      try {
        const variantEntries = (await fs.readChunkFiles.next()) as VariantEntryStruct[];

        await this.handleCuncurrency(contentType, variantEntries, entriesForVariant);
      } catch (error) {
        this.log(this.config, error, 'error');
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
  async handleCuncurrency(
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
          log(this.config, `Created variant entry: '${variantUid}' of entry uid ${entryUid}`, 'info');
          this.variantUidMapper[variantUid] = response?.entry?.variant_id || '';
        };
        const onReject = ({ error, apiData: { entryUid, variantUid }, log }: any) => {
          log(this.config, `Failed to create variant entry: '${variantUid}' of entry uid ${entryUid}`, 'error');
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
              variantUid: variantEntry.variant_id,
              log: this.log,
            },
          );

          allPromise.push(promise);
        } else {
          this.log(this.config, this.messages.VARIANT_ID_NOT_FOUND, 'error');
        }
      }

      // NOTE Handle the API response here
      await Promise.allSettled(allPromise);
      fsUtil.writeFile(this.variantUidMapperPath, this.variantUidMapper);

      // NOTE publish all the entries
      await this.publishVariantEntries(batch, entryUid, content_type);
      this.log(
        this.config,
        `Entry variant import & publish completed for Batch No. (${batchNo}/${batches.length}).`,
        'success',
      );
      const end = Date.now();
      const exeTime = end - start;
      this.variantInstance.delay(1000 - exeTime);
    }
  }

  serializeChangeSet(variantEntry: VariantEntryStruct) {
    let changeSet: Record<string, any> = {};
    if (variantEntry?._variant?._change_set?.length) {
      variantEntry._variant._change_set.forEach((data: string) => {
        if (variantEntry[data]) {
          changeSet[data] = variantEntry[data];
        }
      });
    }
    return changeSet;
  }

  /**
   * The function `handleVariantEntryRelationalData` processes relational data for a variant entry
   * based on the provided content type and configuration helpers.
   * @param {ContentTypeStruct} contentType - The `contentType` parameter in the
   * `handleVariantEntryRelationalData` function is of type `ContentTypeStruct`. It is used to define
   * the structure of the content type being processed within the function. This parameter likely
   * contains information about the schema and configuration of the content type.
   * @param {VariantEntryStruct} variantEntry - The `variantEntry` parameter in the
   * `handleVariantEntryRelationalData` function is a data structure that represents a variant entry.
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
        resolve(this.entriesMapperPath, contentType.uid, variantEntry.locale),
      );

      // NOTE: will remove term if term doesn't exists in taxonomy
      // FIXME: Validate if taxonomy support available for variant entries,
      // if not, feel free to remove this lookup flow.
      lookUpTerms(contentType.schema, variantEntry, this.taxonomies, this.config);

      // NOTE Find and replace asset's UID
      variantEntry = lookupAssets(
        {
          entry: variantEntry,
          content_type: contentType,
        },
        this.assetUidMapper,
        this.assetUrlMapper,
        join(this.entriesDirPath, contentType.uid),
        this.installedExtensions,
      );
    }

    return variantEntry;
  }

  async publishVariantEntries(batch: VariantEntryStruct[], entryUid: string, content_type: string) {
    const allPromise = [];
    for (let [, variantEntry] of entries(batch)) {
      const oldVariantUid = variantEntry.variant_id || '';
      const newVariantUid = this.variantUidMapper[oldVariantUid];
      if (!newVariantUid) {
        this.log(this.config, `Variant UID not found for entry '${variantEntry?.uid}'`, 'error');
        continue;
      }
      if (this.environments?.length) {
        this.log(this.config, 'No environment found! Skipping variant entry publishing...', 'info');
        return;
      }

      const onSuccess = ({ response, apiData: { entryUid, variantUid }, log }: any) => {
        log(this.config, `Variant entry: '${variantUid}' of entry uid ${entryUid} published successfully!`, 'info');
      };
      const onReject = ({ error, apiData: { entryUid, variantUid }, log }: any) => {
        log(this.config, `Failed to publish variant entry: '${variantUid}' of entry uid ${entryUid}`, 'error');
        log(this.config, error, 'error');
      };

      const { environments, locales } = this.serializePublishEntries(variantEntry);
      if (environments?.length === 0 || locales?.length === 0) {
        continue;
      }
      const publishReq: PublishVariantEntryDto = {
        entry: { environments, locales, publish_with_base_entry: false, variants: [{ uid: newVariantUid }] },
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
          log: this.log,
        },
      );

      allPromise.push(promise);
    }
    await Promise.allSettled(allPromise);
  }

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
