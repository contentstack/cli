import isEmpty from 'lodash/isEmpty';
import { join, resolve } from 'path';
import { FsUtility } from '@contentstack/cli-utilities';

import { APIConfig, AdapterType, ExportConfig, LogType } from '../types';
import VariantAdapter, { VariantHttpClient } from '../utils/variant-api-adapter';

export default class VariantEntries extends VariantAdapter<VariantHttpClient<ExportConfig>> {
  public entriesDirPath: string;
  public variantEntryBasePath!: string;

  constructor(readonly config: ExportConfig, private readonly log: LogType = console.log) {
    const conf: APIConfig & AdapterType<VariantHttpClient<ExportConfig>, APIConfig> = {
      config,
      httpClient: true,
      baseURL: config.host,
      Adapter: VariantHttpClient<ExportConfig>,
      headers: {
        api_key: config.apiKey,
        branch: config.branchName,
        authtoken: config.auth_token,
        organization_uid: config.org_uid,
        'X-Project-Uid': config.project_id,
      },
    };
    super(Object.assign(config, conf));
    this.entriesDirPath = resolve(config.data, config.branchName || '', config.modules.entries.dirName);
  }

  /**
   * This function exports variant entries for a specific content type and locale.
   * @param options - The `exportVariantEntry` function takes in an `options` object with the following
   * properties:
   */
  async exportVariantEntry(options: { locale: string; contentTypeUid: string; entries: Record<string, any>[] }) {
    const variantEntry = this.config.modules.variantEntry;
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
        if (!isEmpty(variantEntries)) {
          variantEntriesFs.writeIntoFile(variantEntries);
        }
      };

      await this.variantInstance
        .variantEntries({
          callback,
          getAllData: true,
          content_type_uid,
          entry_uid: entry.uid,
        })
      variantEntriesFs.completeFile(true);
      this.log(
        this.config,
        `Exported variant entries of type '${entry.title} (${entry.uid})' locale '${locale}'`,
        'info',
      );
    }
  }
}
