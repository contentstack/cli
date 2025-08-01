import * as path from 'path';
import { ContentstackClient, FsUtility, handleAndLogError, messageHandler, log } from '@contentstack/cli-utilities';
import { Export, ExportProjects } from '@contentstack/cli-variants';
import { sanitizePath } from '@contentstack/cli-utilities';

import { fsUtil } from '../../utils';
import BaseClass, { ApiOptions } from './base-class';
import { ExportConfig, ModuleClassParams } from '../../types';

export default class EntriesExport extends BaseClass {
  private stackAPIClient: ReturnType<ContentstackClient['stack']>;
  public exportConfig: ExportConfig;
  private entriesConfig: {
    dirName?: string;
    fileName?: string;
    invalidKeys?: string[];
    fetchConcurrency?: number;
    writeConcurrency?: number;
    limit?: number;
    chunkFileSize?: number;
    batchLimit?: number;
    exportVersions: boolean;
  };
  private variantEntries!: any;
  private entriesDirPath: string;
  private localesFilePath: string;
  private schemaFilePath: string;
  private entriesFileHelper: FsUtility;
  private projectInstance: ExportProjects;
  public exportVariantEntry: boolean = false;

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.stackAPIClient = stackAPIClient;
    this.exportConfig = exportConfig;
    this.entriesConfig = exportConfig.modules.entries;
    this.entriesDirPath = path.resolve(
      sanitizePath(exportConfig.data),
      sanitizePath(exportConfig.branchName || ''),
      sanitizePath(this.entriesConfig.dirName),
    );
    this.localesFilePath = path.resolve(
      sanitizePath(exportConfig.data),
      sanitizePath(exportConfig.branchName || ''),
      sanitizePath(exportConfig.modules.locales.dirName),
      sanitizePath(exportConfig.modules.locales.fileName),
    );
    this.schemaFilePath = path.resolve(
      sanitizePath(exportConfig.data),
      sanitizePath(exportConfig.branchName || ''),
      sanitizePath(exportConfig.modules.content_types.dirName),
      'schema.json',
    );
    this.projectInstance = new ExportProjects(this.exportConfig);
    this.exportConfig.context.module = 'entries';
    this.currentModuleName = 'Entries';
  }

  async start() {
    try {
      log.debug('Starting entries export process...', this.exportConfig.context);
      
      // Initial analysis with loading spinner
      const [locales, contentTypes, entryRequestOptions, totalEntriesCount, variantInfo] = await this.withLoadingSpinner(
        'ENTRIES: Analyzing content structure and entries...',
        async () => {
          const locales = fsUtil.readFile(this.localesFilePath) as Array<Record<string, unknown>>;
          const contentTypes = fsUtil.readFile(this.schemaFilePath) as Array<Record<string, unknown>>;
          
          if (!Array.isArray(locales) || locales?.length === 0) {
            log.debug(`No locales found in ${this.localesFilePath}`, this.exportConfig.context);
          } else {
            log.debug(`Loaded ${locales?.length} locales from ${this.localesFilePath}`, this.exportConfig.context);
          }

          if (contentTypes?.length === 0) {
            log.info(messageHandler.parse('CONTENT_TYPE_NO_TYPES'), this.exportConfig.context);
            return [locales, contentTypes, [], 0, null];
          }
          log.debug(`Loaded ${contentTypes?.length} content types from ${this.schemaFilePath}`, this.exportConfig.context);

          // Create entry request objects
          const entryRequestOptions = this.createRequestObjects(locales, contentTypes);
          log.debug(
            `Created ${entryRequestOptions.length} entry request objects for processing`,
            this.exportConfig.context,
          );

          // Get total entries count for better progress tracking
          const totalEntriesCount = await this.getTotalEntriesCount(entryRequestOptions);    
          const variantInfo = await this.setupVariantExport();
          return [locales, contentTypes, entryRequestOptions, totalEntriesCount, variantInfo];
        }
      );

      if (contentTypes?.length === 0) {
        return;
      }

      // Create nested progress manager
      const progress = this.createNestedProgress(this.currentModuleName);

      // Add sub-processes 
      if (totalEntriesCount > 0) {
        progress.addProcess('Entries', totalEntriesCount);
        
        if (this.entriesConfig.exportVersions) {
          progress.addProcess('Entry Versions', totalEntriesCount); 
        }
        
        if (this.exportVariantEntry) {
          progress.addProcess('Variant Entries', totalEntriesCount);
        }
      }

      // Process entry collections
      if (totalEntriesCount > 0) {
        progress.startProcess('Entries').updateStatus('Processing entry collections...', 'Entries');

        for (let entryRequestOption of entryRequestOptions) {
          try {
            log.debug(
              `Processing entries for content type: ${entryRequestOption.contentType}, locale: ${entryRequestOption.locale}`,
              this.exportConfig.context,
            );
            await this.getEntries(entryRequestOption);
            this.entriesFileHelper?.completeFile(true);

            log.success(
              messageHandler.parse('ENTRIES_EXPORT_COMPLETE', entryRequestOption.contentType, entryRequestOption.locale),
              this.exportConfig.context,
            );
          } catch (error) {
            this.progressManager?.tick(
              false,
              `${entryRequestOption.contentType}:${entryRequestOption.locale}`,
              error?.message || 'Failed to export entries',
              'Entries',
            );
            throw error;
          }
        }
        progress.completeProcess('Entries', true);

        if (this.entriesConfig.exportVersions) {
          progress.completeProcess('Entry Versions', true);
        }
        
        if (this.exportVariantEntry) {
          progress.completeProcess('Variant Entries', true);
        }
      }

      this.completeProgress(true);
      log.success(messageHandler.parse('ENTRIES_EXPORT_SUCCESS'), this.exportConfig.context);
      
    } catch (error) {
      handleAndLogError(error, { ...this.exportConfig.context });
      this.completeProgress(false, error?.message || 'Entries export failed');
    }
  }

  async getTotalEntriesCount(entryRequestOptions: Array<Record<string, any>>): Promise<number> {
    log.debug('Calculating total entries count for progress tracking...', this.exportConfig.context);
    
    let totalCount = 0;
    
    try {
      for (const option of entryRequestOptions) {
        const countQuery = {
          locale: option.locale,
          limit: 1,
          include_count: true,
          query: { locale: option.locale },
        };
        
        this.applyQueryFilters(countQuery, 'entries');
        
        try {
          const response = await this.stackAPIClient
            .contentType(option.contentType)
            .entry()
            .query(countQuery)
            .find();
            
          const count = response.count || 0;
          totalCount += count;
          log.debug(
            `Content type ${option.contentType} (${option.locale}): ${count} entries`,
            this.exportConfig.context
          );
        } catch (error) {
          log.debug(
            `Failed to get count for ${option.contentType}:${option.locale}`,
            this.exportConfig.context
          );
        }
      }
    } catch (error) {
      log.debug('Error calculating total entries count, using collection count as fallback', this.exportConfig.context);
      return entryRequestOptions.length;
    }
    
    log.debug(`Total entries count: ${totalCount}`, this.exportConfig.context);
    return totalCount;
  }

  async setupVariantExport(): Promise<any> {
    if (!this.exportConfig.personalizationEnabled) {
      return null;
    }
    
    log.debug('Personalization is enabled, checking for variant entries...', this.exportConfig.context);
    
    try {
      const project = await this.projectInstance.projects({ connectedStackApiKey: this.exportConfig.apiKey });

      if (project && project[0]?.uid) {
        const project_id = project[0].uid;
        this.exportVariantEntry = true;
        log.debug(`Found project with ID: ${project_id}, enabling variant entry export`, this.exportConfig.context);
        
        this.variantEntries = new Export.VariantEntries(Object.assign(this.exportConfig, { project_id }));
        return { project_id };
      }
    } catch (error) {
      log.debug('Failed to setup variant export', this.exportConfig.context);
      handleAndLogError(error, { ...this.exportConfig.context });
    }
    
    return null;
  }

  createRequestObjects(
    locales: Array<Record<string, unknown>>,
    contentTypes: Array<Record<string, unknown>>,
  ): Array<Record<string, any>> {
    if (!Array.isArray(locales) || locales?.length === 0) {
      log.debug('No locales found, using master locale only', this.exportConfig.context);
    } else {
      log.debug(`Found ${locales.length} locales for export`, this.exportConfig.context);
    }
    if (!Array.isArray(contentTypes) || contentTypes.length === 0) {
      log.debug('No content types found, skipping entries export', this.exportConfig.context);
      return [];
    } else {
      log.debug(`Found ${contentTypes.length} content types for export`, this.exportConfig.context);
    }

    let requestObjects: Array<Record<string, any>> = [];
    contentTypes.forEach((contentType) => {
      if (Object.keys(locales).length !== 0) {
        for (let locale in locales) {
          requestObjects.push({
            contentType: contentType.uid,
            locale: locales[locale].code,
          });
        }
      }
      requestObjects.push({
        contentType: contentType.uid,
        locale: this.exportConfig.master_locale.code,
      });
    });

    log.debug(`Created ${requestObjects.length} total request objects`, this.exportConfig.context);
    return requestObjects;
  }

  async getEntries(options: Record<string, any>): Promise<any> {
    options.skip = options.skip || 0;
    let requestObject = {
      locale: options.locale,
      skip: options.skip,
      limit: this.entriesConfig.limit,
      include_count: true,
      include_publish_details: true,
      query: {
        locale: options.locale,
      },
    };
    this.applyQueryFilters(requestObject, 'entries');

    log.debug(`Fetching entries with request: ${JSON.stringify(requestObject)}`, this.exportConfig.context);

    let entriesSearchResponse;
    try {
      entriesSearchResponse = await this.stackAPIClient
        .contentType(options.contentType)
        .entry()
        .query(requestObject)
        .find();

      log.debug(
        `Fetched ${entriesSearchResponse.items?.length || 0} entries out of total ${entriesSearchResponse.count}`,
        this.exportConfig.context,
      );
    } catch (error) {
      handleAndLogError(error, {
        ...this.exportConfig.context,
        contentType: options.contentType,
        locale: options.locale,
      });
      throw error;
    }

    if (Array.isArray(entriesSearchResponse?.items) && entriesSearchResponse?.items?.length > 0) {
      if (options.skip === 0) {
        const entryBasePath = path.join(
          sanitizePath(this.entriesDirPath),
          sanitizePath(options.contentType),
          sanitizePath(options.locale),
        );
        log.debug(`Creating directory for entries at: ${entryBasePath}`, this.exportConfig.context);
        await fsUtil.makeDirectory(entryBasePath);
        this.entriesFileHelper = new FsUtility({
          moduleName: 'entries',
          indexFileName: 'index.json',
          basePath: entryBasePath,
          chunkFileSize: this.entriesConfig.chunkFileSize,
          keepMetadata: false,
          omitKeys: this.entriesConfig.invalidKeys,
        });
        log.debug('Initialized FsUtility for writing entries', this.exportConfig.context);
      }

      log.debug(`Writing ${entriesSearchResponse.items.length} entries to file`, this.exportConfig.context);
      this.entriesFileHelper.writeIntoFile(entriesSearchResponse.items, { mapKeyVal: true });

      // Track progress for individual entries
      entriesSearchResponse.items.forEach((entry: any) => {
        this.progressManager?.tick(true, `entry: ${entry.uid}`, null, 'Entries');
      });

      if (this.entriesConfig.exportVersions) {
        log.debug('Exporting entry versions is enabled', this.exportConfig.context);
        let versionedEntryPath = path.join(
          sanitizePath(this.entriesDirPath),
          sanitizePath(options.contentType),
          sanitizePath(options.locale),
          'versions',
        );
        log.debug(`Creating versioned entries directory at: ${versionedEntryPath}`, this.exportConfig.context);
        fsUtil.makeDirectory(versionedEntryPath);
        await this.fetchEntriesVersions(entriesSearchResponse.items, {
          locale: options.locale,
          contentType: options.contentType,
          versionedEntryPath,
        });
      }

      // NOTE Export all base entry specific 'variant entries'
      if (this.exportVariantEntry) {
        log.debug('Exporting variant entries for base entries', this.exportConfig.context);
        try {
          await this.variantEntries.exportVariantEntry({
            locale: options.locale,
            contentTypeUid: options.contentType,
            entries: entriesSearchResponse.items,
          });
          
          // Track progress for variant entries
          entriesSearchResponse.items.forEach((entry: any) => {
            this.progressManager?.tick(true, `variant: ${entry.uid}`, null, 'Variant Entries');
          });
          
          log.debug(`Successfully exported variant entries for ${entriesSearchResponse.items.length} entries`, this.exportConfig.context);
        } catch (error) {
          log.debug('Failed to export variant entries', this.exportConfig.context);
          entriesSearchResponse.items.forEach((entry: any) => {
            this.progressManager?.tick(false, `variant: ${entry.uid}`, error?.message || 'Failed to export variant', 'Variant Entries');
          });
        }
      }

      options.skip += this.entriesConfig.limit || 100;
      if (options.skip >= entriesSearchResponse.count) {
        log.debug(
          `Completed fetching all entries for content type: ${options.contentType}, locale: ${options.locale}`,
          this.exportConfig.context,
        );
        return Promise.resolve(true);
      }
      log.debug(`Continuing to fetch entries with skip: ${options.skip}`, this.exportConfig.context);
      return await this.getEntries(options);
    } else {
      log.debug(
        `No entries found for content type: ${options.contentType}, locale: ${options.locale}`,
        this.exportConfig.context,
      );
    }
  }

  async fetchEntriesVersions(
    entries: any,
    options: { locale: string; contentType: string; versionedEntryPath: string },
  ): Promise<void> {
    log.debug(`Fetching versions for ${entries.length} entries`, this.exportConfig.context);

    const onSuccess = ({ response, apiData: entry }: any) => {
      const versionFilePath = path.join(sanitizePath(options.versionedEntryPath), sanitizePath(`${entry.uid}.json`));
      log.debug(`Writing versioned entry to: ${versionFilePath}`, this.exportConfig.context);
      fsUtil.writeFile(versionFilePath, response);
      // Track version progress if the process exists
      this.progressManager?.tick(true, `version: ${entry.uid}`, null, 'Entry Versions');
      log.success(
        messageHandler.parse('ENTRIES_VERSIONED_EXPORT_SUCCESS', options.contentType, entry.uid, options.locale),
        this.exportConfig.context,
      );
    };
    const onReject = ({ error, apiData: { uid } = undefined }: any) => {
      log.debug(`Failed to fetch versioned entry for uid: ${uid}`, this.exportConfig.context);
      // Track version failure if the process exists
      this.progressManager?.tick(
        false,
        `version: ${uid}`,
        error?.message || 'Failed to fetch versions',
        'Entry Versions',
      );
      handleAndLogError(
        error,
        {
          ...this.exportConfig.context,
          uid,
        },
        messageHandler.parse('ENTRIES_EXPORT_VERSIONS_FAILED', uid),
      );
    };

    log.debug(
      `Starting concurrent calls for versioned entries with batch limit: ${this.entriesConfig.batchLimit}`,
      this.exportConfig.context,
    );
    return await this.makeConcurrentCall(
      {
        apiBatches: [entries],
        module: 'versioned-entries',
        totalCount: entries.length,
        concurrencyLimit: this.entriesConfig.batchLimit,
        apiParams: {
          module: 'versioned-entries',
          queryParam: options,
          resolve: onSuccess,
          reject: onReject,
        },
      },
      this.entryVersionHandler.bind(this),
    );
  }

  async entryVersionHandler({
    apiParams,
    element: entry,
  }: {
    apiParams: ApiOptions;
    element: Record<string, string>;
    isLastRequest: boolean;
  }) {
    log.debug(`Processing versioned entry: ${entry.uid}`, this.exportConfig.context);

    return new Promise(async (resolve, reject) => {
      return await this.getEntryByVersion(apiParams.queryParam, entry)
        .then((response) => {
          log.debug(`Successfully fetched versions for entry: ${entry.uid}`, this.exportConfig.context);
          apiParams.resolve({
            response,
            apiData: entry,
          });
          resolve(true);
        })
        .catch((error) => {
          log.debug(`Failed to fetch versions for entry: ${entry.uid}`, this.exportConfig.context);
          apiParams.reject({
            error,
            apiData: entry,
          });
          reject(true);
        });
    });
  }

  async getEntryByVersion(
    options: any,
    entry: Record<string, any>,
    entries: Array<Record<string, any>> = [],
  ): Promise<any[]> {
    const queryRequestObject = {
      locale: options.locale,
      except: {
        BASE: this.entriesConfig.invalidKeys,
      },
      version: entry._version,
    };

    log.debug(`Fetching entry version ${entry._version} for uid: ${entry.uid}`, this.exportConfig.context);

    const entryResponse = await this.stackAPIClient
      .contentType(options.contentType)
      .entry(entry.uid)
      .fetch(queryRequestObject);
    entries.push(entryResponse);

    if (--entry._version > 0) {
      log.debug(
        `Continuing to fetch previous version ${entry._version} for entry: ${entry.uid}`,
        this.exportConfig.context,
      );
      return await this.getEntryByVersion(options, entry, entries);
    }

    log.debug(
      `Completed fetching all versions for entry: ${entry.uid}, total versions: ${entries.length}`,
      this.exportConfig.context,
    );
    return entries;
  }
}
