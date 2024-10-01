import { existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { FsUtility, sanitizePath } from '@contentstack/cli-utilities';

import { APIConfig, AdapterType, ExportConfig, LogType } from '../types';
import VariantAdapter, { VariantHttpClient } from '../utils/variant-api-adapter';
import { fsUtil, log } from '../utils';

export default class VariantEntries extends VariantAdapter<VariantHttpClient<ExportConfig>> {
  public entriesDirPath: string;
  public variantEntryBasePath!: string;

  constructor(readonly config: ExportConfig) {
    const conf: APIConfig & AdapterType<VariantHttpClient<ExportConfig>, APIConfig> = {
      config,
      httpClient: true,
      baseURL: config.host,
      Adapter: VariantHttpClient<ExportConfig>,
      headers: {
        api_key: config.apiKey,
        branch: config.branchName,
        organization_uid: config.org_uid,
        'X-Project-Uid': config.project_id,
      },
    };
    super(Object.assign(config, conf));
    this.entriesDirPath = resolve(sanitizePath(config.data), sanitizePath(config.branchName || ''), sanitizePath(config.modules.entries.dirName));
  }

  /**
   * This function exports variant entries for a specific content type and locale.
   * @param options - The `exportVariantEntry` function takes in an `options` object with the following
   * properties:
   */
  async exportVariantEntry(options: { locale: string; contentTypeUid: string; entries: Record<string, any>[] }) {
    const variantEntry = this.config.modules.variantEntry;
    const { entries, locale, contentTypeUid: content_type_uid } = options;
    await this.variantInstance.init();
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      const variantEntryBasePath = join(sanitizePath(this.entriesDirPath), sanitizePath(content_type_uid), sanitizePath(locale), sanitizePath(variantEntry.dirName), sanitizePath(entry.uid));
      const variantEntriesFs = new FsUtility({
        isArray: true,
        keepMetadata: false,
        moduleName: 'variant-entry',
        basePath: variantEntryBasePath,
        indexFileName: variantEntry.fileName,
        chunkFileSize: variantEntry.chunkFileSize || 1,
        createDirIfNotExist: false,
      });

      const callback = (variantEntries: Record<string, any>[]) => {
        if (variantEntries?.length) {
          if (!existsSync(variantEntryBasePath)) {
            mkdirSync(variantEntryBasePath, { recursive: true });
          }
          variantEntriesFs.writeIntoFile(variantEntries);
        }
      };

      try {
        await this.variantInstance.variantEntries({
          callback,
          getAllData: true,
          content_type_uid,
          entry_uid: entry.uid,
          locale,
        });
        if (existsSync(variantEntryBasePath)) {
          variantEntriesFs.completeFile(true);
          log(
            this.config,
            `Exported variant entries of type '${entry.title} (${entry.uid})' locale '${locale}'`,
            'info',
          );
        }
      } catch (error) {
        log(
          this.config,
          `Error exporting variant entries of type '${entry.title} (${entry.uid})' locale '${locale}'`,
          'error',
        );
        log(this.config, error, 'error');
      }
    }
  }
}
