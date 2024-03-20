import { join, resolve } from 'path';
import { FsUtility } from '@contentstack/cli-utilities';
import ExportConfig from '@contentstack/cli-cm-export/lib/types/export-config';

import { APIConfig, AdapterType } from '../types';
import VariantAPIInstance, { VariantHttpClient } from '../utils/variant-api-adapter';

export default class VariantEntries extends VariantAPIInstance<VariantHttpClient> {
  public entriesDirPath: string;
  public variantEntryBasePath!: string;

  constructor(public readonly exportConfig: ExportConfig, private readonly log: (value: any) => void = console.log) {
    const config: APIConfig & AdapterType<VariantHttpClient, APIConfig> = {
      httpClient: true,
      baseURL: exportConfig.host,
      sharedConfig: exportConfig,
      Adapter: VariantHttpClient,
    };
    super(Object.assign(exportConfig, config));
    this.entriesDirPath = resolve(
      exportConfig.data,
      exportConfig.branchName || '',
      exportConfig.modules.entries.dirName,
    );
  }

  /**
   * This function exports variant entries for a specific content type and locale.
   * @param options - The `exportVariantEntry` function takes in an `options` object with the following
   * properties:
   */
  async exportVariantEntry(options: { locale: string; contentTypeUid: string; entries: Record<string, any>[] }) {
    const variantEntry = this.exportConfig.modules.variantEntry;
    const { entries, locale, contentTypeUid: content_type_uid } = options;

    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      const variantEntryBasePath = join(this.entriesDirPath, content_type_uid, locale, variantEntry.dirName, entry.uid);
      const variantEntriesFs = new FsUtility({
        isArray: true,
        keepMetadata: false,
        moduleName: 'variant-entry',
        basePath: variantEntryBasePath,
        indexFileName: variantEntry.fileName,
        chunkFileSize: variantEntry.chunkFileSize || 1,
      });

      const callback = (variantEntries: Record<string, any>[]) => {
        variantEntriesFs.writeIntoFile(variantEntries);
      };

      await this.variantInstance.variantEntries({
        callback,
        getAllData: true,
        content_type_uid,
        entry_uid: entry.uid,
      });
      variantEntriesFs.completeFile(true);
      // FIXME: On final integration with export module the logger should be modified
      this.log(`Exported variant entries of type '${entry.title} (${entry.uid})' locale '${locale}'`);
    }
  }
}
