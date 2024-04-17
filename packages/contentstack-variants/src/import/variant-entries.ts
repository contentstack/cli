import omit from 'lodash/omit';
import chunk from 'lodash/chunk';
import values from 'lodash/values';
import entries from 'lodash/entries';
import orderBy from 'lodash/orderBy';
import isEmpty from 'lodash/isEmpty';
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
} from '../types';

export default class VariantEntries extends VariantAdapter<VariantHttpClient<ImportConfig>> {
  public entriesDirPath: string;
  public entriesMapperPath: string;
  public variantEntryBasePath!: string;
  public variantIdList!: { [key: string]: string };
  public personalizationconfig: ImportConfig['modules']['personalization'];

  public taxonomies!: AnyProperty;
  public assetUrlMapper!: AnyProperty;
  public assetUidMapper!: AnyProperty;
  public entriesUidMapper!: AnyProperty;
  private installedExtensions!: AnyProperty[];

  constructor(
    readonly config: ImportConfig & { helpers?: ImportHelperMethodsConfig },
    private readonly log: LogType = console.log,
  ) {
    const conf: APIConfig & AdapterType<VariantHttpClient<ImportConfig>, APIConfig> = {
      config,
      httpClient: true,
      baseURL: config.host,
      Adapter: VariantHttpClient<ImportConfig>,
    };
    super(Object.assign(omit(config, ['helpers']), conf));
    this.entriesMapperPath = resolve(config.backupDir, 'mapper', 'entries');
    this.personalizationconfig = this.config.modules.personalization;
    this.entriesDirPath = resolve(config.backupDir, config.branchName || '', config.modules.entries.dirName);
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
    const variantIdPath = join(
      this.config.backupDir,
      'mapper',
      this.personalizationconfig.dirName,
      this.personalizationconfig.experiences.dirName,
      'variants-uid-mapping.json',
    );

    if (!existsSync(filePath)) {
      this.log(this.config, this.messages.IMPORT_ENTRY_NOT_FOUND, 'info');
      return;
    }

    if (!existsSync(variantIdPath)) {
      this.log(this.config, this.messages.EMPTY_VARIANT_UID_DATA, 'info');
      return;
    }

    const entriesForVariants = JSON.parse(readFileSync(filePath, 'utf8')) as EntryDataForVariantEntries[];

    if (isEmpty(entriesForVariants)) {
      this.log(this.config, this.messages.IMPORT_ENTRY_NOT_FOUND, 'info');
      return;
    }

    const entriesUidMapperPath = join(this.entriesMapperPath, 'uid-mapping.json');
    const assetUidMapperPath = resolve(this.config.backupDir, 'mapper', 'assets', 'uid-mapping.json');
    const assetUrlMapperPath = resolve(this.config.backupDir, 'mapper', 'assets', 'url-mapping.json');
    const taxonomiesPath = join(this.config.backupDir, 'mapper', 'taxonomies', 'terms', 'success.json');
    const marketplaceAppMapperPath = join(this.config.backupDir, 'mapper', 'marketplace_apps', 'uid-mapping.json');

    // NOTE Read and store list of variant IDs
    this.variantIdList = JSON.parse(readFileSync(variantIdPath, 'utf8'));

    // NOTE entry relational data lookup dependencies.
    this.entriesUidMapper = JSON.parse(await readFileSync(entriesUidMapperPath, 'utf8'));
    this.installedExtensions = (
      JSON.parse(await readFileSync(marketplaceAppMapperPath, 'utf8')) || { extension_uid: {} }
    ).extension_uid;
    this.taxonomies = existsSync(taxonomiesPath) ? JSON.parse(readFileSync(taxonomiesPath, 'utf8')) : {};
    this.assetUidMapper = JSON.parse(readFileSync(assetUidMapperPath, 'utf8')) || {};
    this.assetUrlMapper = JSON.parse(readFileSync(assetUrlMapperPath, 'utf8')) || {};

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
        const variantEntries = (await fs.readChunkFiles.next()) as VariantEntryStruct;
        if (variantEntries) {
          const apiContent = orderBy(values(variantEntries), '_version');
          await this.handleCuncurrency(contentType, apiContent, entriesForVariant);
        }
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
    const batches = chunk(variantEntries, variantEntryConfig.apiConcurrency | 5);

    if (isEmpty(batches)) return;

    for (const [, batch] of entries(batches)) {
      batchNo += 1;
      const allPromise = [];
      const start = Date.now();

      for (let [, variantEntry] of entries(batch)) {
        // NOTE Find new variant Id by old Id
        const variant_id = this.variantIdList[variantEntry.variant_id];
        // NOTE Replace all the relation data UID's
        variantEntry = this.handleVariantEntryRelationalData(contentType, variantEntry);

        if (variant_id) {
          const promise = this.variantInstance.createVariantEntry(variantEntry, {
            locale,
            entry_uid,
            variant_id,
            content_type_uid: content_type,
          });

          allPromise.push(promise);
        } else {
          this.log(this.config, this.messages.VARIANT_ID_NOT_FOUND, 'error');
        }
      }

      // NOTE Handle the API response here
      const resultSet = await Promise.allSettled(allPromise);

      // NOTE publish all the entries
      this.publishVariantEntries(resultSet);

      const end = Date.now();
      const exeTime = end - start;
      this.variantInstance.delay(1000 - exeTime);
    }
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
        join(this.entriesMapperPath, contentType.uid, variantEntry.locale),
      );

      // NOTE: will remove term if term doesn't exists in taxonomy
      // FIXME: Validate if taxonomy support available for variant entries,
      // if not, feel free to remove this lookup flow.
      lookUpTerms(contentType?.schema, variantEntry, this.taxonomies, this.config);

      // NOTE Find and replace asset's UID
      variantEntry = lookupAssets(
        {
          entry: variantEntry,
          content_type: contentType,
        },
        this.assetUidMapper,
        this.assetUrlMapper,
        this.entriesDirPath,
        this.installedExtensions,
      );
    }

    return variantEntry;
  }

  publishVariantEntries(resultSet: PromiseSettledResult<HttpResponse<VariantEntryStruct>>[]) {
    // FIXME: Handle variant entry publish
    console.log('Variant entry publish');
    return resultSet;
  }
}
