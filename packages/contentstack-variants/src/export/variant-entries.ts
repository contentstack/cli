import { existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { FsUtility, sanitizePath, log, handleAndLogError, CLIProgressManager } from '@contentstack/cli-utilities';
import { PROCESS_NAMES, EXPORT_PROCESS_STATUS } from '../utils/constants';

import { APIConfig, AdapterType, ExportConfig } from '../types';
import VariantAdapter, { VariantHttpClient } from '../utils/variant-api-adapter';

export default class VariantEntries extends VariantAdapter<VariantHttpClient<ExportConfig>> {
  public entriesDirPath: string;
  public variantEntryBasePath!: string;
  protected progressManager: CLIProgressManager | null = null;
  protected parentProgressManager: CLIProgressManager | null = null;
  public progress: any;
  private processInitialized: boolean = false;
  private totalVariantCount: number = 0;
  private processedVariantCount: number = 0;

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
    this.entriesDirPath = resolve(
      sanitizePath(config.exportDir),
      sanitizePath(config.branchName || ''),
      sanitizePath(config.modules.entries.dirName),
    );
    if (this.config && this.config.context) {
      this.config.context.module = 'variant-entries';
    }
  }

  /**
   * Set parent progress manager for integration with entries module
   */
  public setParentProgressManager(parentProgress: CLIProgressManager): void {
    this.parentProgressManager = parentProgress;
    this.progressManager = parentProgress;
    this.progress = parentProgress;
  }

  /**
   * Update progress for a specific item
   */
  protected updateProgress(success: boolean, itemName: string, error?: string, processName?: string): void {
    if (this.progress) {
      this.progress.tick(success, itemName, error, processName);
    }
  }

  /**
   * Complete the variant entries export process
   */
  public completeExport(): void {
    if (this.processInitialized && this.progress) {
      this.progress.completeProcess(PROCESS_NAMES.VARIANT_ENTRIES, true);
      log.success(
        `Completed export of ${this.totalVariantCount} variant entries across all content types and locales`,
        this.config.context,
      );
    } else if (this.totalVariantCount === 0) {
      log.info(`No variant entries found for export`, this.config.context);
    }
  }

  /**
   * This function exports variant entries for a specific content type and locale.
   * @param options - The `exportVariantEntry` function takes in an `options` object with the following
   * properties:
   */
  async exportVariantEntry(options: { locale: string; contentTypeUid: string; entries: Record<string, any>[] }) {
    const variantEntry = this.config.modules.variantEntry;
    const { entries, locale, contentTypeUid: content_type_uid } = options;

    log.debug(
      `Starting variant entries export for content type: ${content_type_uid}, locale: ${locale}`,
      this.config.context,
    );
    log.debug(`Processing ${entries.length} entries for variant export`, this.config.context);

    log.debug('Initializing variant instance...', this.config.context);
    await this.variantInstance.init();
    log.debug('Variant instance initialized successfully', this.config.context);

    let localVariantCount = 0; // Track variants found in this specific call
    let processedEntries = 0;

    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      log.debug(
        `Processing variant entries for entry: ${entry.title} (${entry.uid}) - ${index + 1}/${entries.length}`,
        this.config.context,
      );

      const variantEntryBasePath = join(
        sanitizePath(this.entriesDirPath),
        sanitizePath(content_type_uid),
        sanitizePath(locale),
        sanitizePath(variantEntry.dirName),
        sanitizePath(entry.uid),
      );
      log.debug(`Variant entry base path: ${variantEntryBasePath}`, this.config.context);

      const variantEntriesFs = new FsUtility({
        isArray: true,
        keepMetadata: false,
        moduleName: 'variant-entry',
        basePath: variantEntryBasePath,
        indexFileName: variantEntry.fileName,
        chunkFileSize: variantEntry.chunkFileSize || 1,
        createDirIfNotExist: false,
      });
      log.debug('Initialized FsUtility for variant entries', this.config.context);

      let entryHasVariants = false;
      let variantCount = 0;

      const callback = (variantEntries: Record<string, any>[]) => {
        log.debug(
          `Callback received ${variantEntries?.length || 0} variant entries for entry: ${entry.uid}`,
          this.config.context,
        );
        if (variantEntries?.length) {
          log.info(`Fetched ${variantEntries.length} variant entries for entry: ${entry.uid}`, this.config.context);
          entryHasVariants = true;
          variantCount = variantEntries.length;
          localVariantCount += variantCount;
          this.totalVariantCount += variantCount;

          // Initialize progress ONLY when we find the first variants globally (lazy initialization)
          if (!this.processInitialized && this.progress) {
            this.progress.addProcess(PROCESS_NAMES.VARIANT_ENTRIES, variantCount);
            this.progress.startProcess(PROCESS_NAMES.VARIANT_ENTRIES);
            this.processInitialized = true;
            log.debug(
              `Initialized variant entries progress with first batch of ${variantCount} variants`,
              this.config.context,
            );
          }

          // Update total as we discover more variants globally
          if (this.processInitialized && this.progress) {
            this.progress.updateProcessTotal(PROCESS_NAMES.VARIANT_ENTRIES, this.totalVariantCount);
            log.debug(`Updated progress total to: ${this.totalVariantCount}`, this.config.context);
          }

          if (!existsSync(variantEntryBasePath)) {
            log.debug(`Creating directory: ${variantEntryBasePath}`, this.config.context);
            mkdirSync(variantEntryBasePath, { recursive: true });
          }
          log.debug(`Writing ${variantEntries.length} variant entries to file`, this.config.context);
          variantEntriesFs.writeIntoFile(variantEntries);
        } else {
          log.debug(`No variant entries found for entry: ${entry.uid}`, this.config.context);
        }
      };

      try {
        log.debug(`Fetching variant entries for entry: ${entry.uid}`, this.config.context);
        await this.variantInstance.variantEntries({
          callback,
          getAllData: true,
          content_type_uid,
          entry_uid: entry.uid,
          locale,
        });

        if (existsSync(variantEntryBasePath)) {
          log.debug(`Completing file for entry: ${entry.uid}`, this.config.context);
          variantEntriesFs.completeFile(true);
          log.info(
            `Exported variant entries of type '${entry.title} (${entry.uid})' locale '${locale}'`,
            this.config.context,
          );
        } else {
          log.debug(`No variant entries directory created for entry: ${entry.uid}`, this.config.context);
        }

        // After processing this entry, update progress for variants found
        if (entryHasVariants && this.processInitialized) {
          // Tick progress for each variant found in this entry
          for (let i = 0; i < variantCount; i++) {
            this.processedVariantCount++;
            this.updateProgress(
              true,
              `Exported variant ${this.processedVariantCount}/${this.totalVariantCount} from ${entry.title || entry.uid}`,
              undefined,
              PROCESS_NAMES.VARIANT_ENTRIES,
            );
          }
          log.debug(
            `Processed ${variantCount} variants for entry: ${entry.uid}, total processed: ${this.processedVariantCount}/${this.totalVariantCount}`,
            this.config.context,
          );
        }

        processedEntries++;
      } catch (error) {
        log.debug(`Error occurred while exporting variant entries for entry: ${entry.uid}`, this.config.context);

        // Track progress for failed entry
        if (this.processInitialized) {
          this.updateProgress(
            false,
            `Failed to export variants for entry: ${entry.title || entry.uid}`,
            (error as any)?.message || 'Unknown error',
            PROCESS_NAMES.VARIANT_ENTRIES,
          );
        }

        handleAndLogError(
          error,
          { ...this.config.context },
          `Error exporting variant entries of type '${entry.title} (${entry.uid})' locale '${locale}'`,
        );
      }
    }

    if (localVariantCount > 0) {
      log.success(
        `Exported ${localVariantCount} variant entries across ${processedEntries} entries for ${content_type_uid}/${locale}`,
        this.config.context,
      );
    } else {
      log.info(
        `No variant entries found for content type: ${content_type_uid}, locale: ${locale}`,
        this.config.context,
      );
    }

    log.debug(
      `Completed variant entries export for content type: ${content_type_uid}, locale: ${locale}. Local variants: ${localVariantCount}, Total variants so far: ${this.totalVariantCount}, Processed entries: ${processedEntries}`,
      this.config.context,
    );
  }
}
