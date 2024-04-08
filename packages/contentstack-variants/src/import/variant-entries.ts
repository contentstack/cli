import chunk from 'lodash/chunk';
import values from 'lodash/values';
import entries from 'lodash/entries';
import orderBy from 'lodash/orderBy';
import isEmpty from 'lodash/isEmpty';
import { join, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import { FsUtility } from '@contentstack/cli-utilities';

import VariantAdapter, { VariantHttpClient } from '../utils/variant-api-adapter';
import {
  APIConfig,
  AdapterType,
  EntryDataForVariantEntries,
  ImportConfig,
  LogType,
  VariantEntryStruct,
} from '../types';

export default class VariantEntries extends VariantAdapter<VariantHttpClient<ImportConfig>> {
  public entriesDirPath: string;
  public variantEntryBasePath!: string;
  public variantIdList!: { [key: string]: string };
  public personalizationconfig: ImportConfig['modules']['personalization'];

  constructor(readonly config: ImportConfig, private readonly log: LogType = console.log) {
    const conf: APIConfig & AdapterType<VariantHttpClient<ImportConfig>, APIConfig> = {
      config,
      httpClient: true,
      baseURL: config.host,
      Adapter: VariantHttpClient<ImportConfig>,
    };
    super(Object.assign(config, conf));
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
    const filePath = resolve(this.config.backupDir, 'mapper', 'entries', 'data-for-variant-entry.json');
    const variantIdPath = join(
      this.config.backupDir,
      'mapper',
      'personalization',
      'experiences',
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

    // NOTE Read and store list of variant IDs
    this.variantIdList = JSON.parse(readFileSync(variantIdPath, 'utf8'));

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
    const variantEntryBasePath = join(this.entriesDirPath, content_type, locale, variantEntry.dirName, entry_uid);
    const fs = new FsUtility({ basePath: variantEntryBasePath });

    for (const _ in fs.indexFileContent) {
      try {
        const variantEntries = (await fs.readChunkFiles.next()) as VariantEntryStruct;
        if (variantEntries) {
          let apiContent = orderBy(values(variantEntries), '_version');
          await this.handleCuncurrency(apiContent, entriesForVariant);
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
  async handleCuncurrency(variantEntries: VariantEntryStruct[], entriesForVariant: EntryDataForVariantEntries) {
    let batchNo = 0;
    const variantEntry = this.config.modules.variantEntry;
    const { content_type, locale, entry_uid } = entriesForVariant;
    const batches = chunk(variantEntries, variantEntry.apiConcurrency | 5);

    if (isEmpty(batches)) return;

    for (const [, batch] of entries(batches)) {
      batchNo += 1;
      const allPromise = [];
      const start = Date.now();

      for (let [, variantEntry] of entries(batch)) {
        // NOTE Find new variant Id by old Id
        const variant_id = this.variantIdList[variantEntry.variant_id];
        // NOTE Replace all the relation data UID's
        variantEntry = this.handleVariantEntryRelationalData(variantEntry);

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

      // FIXME Handle the API response here
      await Promise.allSettled(allPromise);

      // FIXME publish all the entries
      this.publishVariantEntries();

      const end = Date.now();
      const exeTime = end - start;
      this.variantInstance.delay(1000 - exeTime);
    }
  }

  handleVariantEntryRelationalData(variantEntry: VariantEntryStruct) {
    console.log('Handle/Replace variant entry relational data');
    // FIXME: Handle relational data
    return variantEntry;
  }

  publishVariantEntries() {
    console.log('Variant entry publish');
  }
}
