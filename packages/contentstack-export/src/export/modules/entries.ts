import * as path from 'path';
import { ContentstackClient, FsUtility } from '@contentstack/cli-utilities';
import { log, formatError, fsUtil } from '../../utils';
import { ExportConfig, ModuleClassParams } from '../../types';
import BaseClass, { ApiOptions } from './base-class';
import { sanitizePath } from '@contentstack/cli-utilities';

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
  private entriesDirPath: string;
  private localesFilePath: string;
  private schemaFilePath: string;
  private entriesFileHelper: FsUtility;

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.stackAPIClient = stackAPIClient;
    this.exportConfig = exportConfig;
    this.entriesConfig = exportConfig.modules.entries;
    this.entriesDirPath = path.resolve(sanitizePath(exportConfig.data), sanitizePath(exportConfig.branchName || ''), sanitizePath(this.entriesConfig.dirName));
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
  }

  async start() {
    try {
      log(this.exportConfig, 'Starting entries export', 'info');
      const locales = fsUtil.readFile(this.localesFilePath) as Array<Record<string, unknown>>;
      const contentTypes = fsUtil.readFile(this.schemaFilePath) as Array<Record<string, unknown>>;
      if (contentTypes.length === 0) {
        log(this.exportConfig, 'No content types found to export entries', 'info');
        return;
      }
      const entryRequestOptions = this.createRequestObjects(locales, contentTypes);
      for (let entryRequestOption of entryRequestOptions) {
        // log(
        //   this.exportConfig,
        //   `Starting export of entries of content type - ${entryRequestOption.contentType} locale - ${entryRequestOption.locale}`,
        //   'info',
        // );
        await this.getEntries(entryRequestOption);
        this.entriesFileHelper?.completeFile(true);
        log(
          this.exportConfig,
          `Exported entries of type '${entryRequestOption.contentType}' locale '${entryRequestOption.locale}'`,
          'success',
        );
      }
      log(this.exportConfig, 'Entries exported successfully', 'success');
    } catch (error) {
      log(this.exportConfig, `Failed to export entries ${formatError(error)}`, 'error');
      throw new Error('Failed to export entries');
    }
  }

  createRequestObjects(
    locales: Array<Record<string, unknown>>,
    contentTypes: Array<Record<string, unknown>>,
  ): Array<Record<string, any>> {
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

    const entriesSearchResponse = await this.stackAPIClient
      .contentType(options.contentType)
      .entry()
      .query(requestObject)
      .find();

    if (Array.isArray(entriesSearchResponse.items) && entriesSearchResponse.items.length > 0) {
      if (options.skip === 0) {
        const entryBasePath = path.join(sanitizePath(this.entriesDirPath), sanitizePath(options.contentType), sanitizePath(options.locale));
        await fsUtil.makeDirectory(entryBasePath);
        this.entriesFileHelper = new FsUtility({
          moduleName: 'entries',
          indexFileName: 'index.json',
          basePath: entryBasePath,
          chunkFileSize: this.entriesConfig.chunkFileSize,
          keepMetadata: false,
          omitKeys: this.entriesConfig.invalidKeys,
        });
      }
      this.entriesFileHelper.writeIntoFile(entriesSearchResponse.items, { mapKeyVal: true });
      if (this.entriesConfig.exportVersions) {
        let versionedEntryPath = path.join(sanitizePath(this.entriesDirPath), sanitizePath(options.contentType),sanitizePath(options.locale), 'versions');
        fsUtil.makeDirectory(versionedEntryPath);
        await this.fetchEntriesVersions(entriesSearchResponse.items, {
          locale: options.locale,
          contentType: options.contentType,
          versionedEntryPath,
        });
      }
      options.skip += this.entriesConfig.limit || 100;
      if (options.skip >= entriesSearchResponse.count) {
        return Promise.resolve(true);
      }
      return await this.getEntries(options);
    }
  }

  async fetchEntriesVersions(
    entries: any,
    options: { locale: string; contentType: string; versionedEntryPath: string },
  ): Promise<void> {
    const onSuccess = ({ response, apiData: entry }: any) => {
      fsUtil.writeFile(path.join(sanitizePath(options.versionedEntryPath), sanitizePath(`${entry.uid}.json`)), response);
      log(
        this.exportConfig,
        `Exported versioned entries of type '${options.contentType}' locale '${options.locale}'`,
        'success',
      );
    };
    const onReject = ({ error, apiData: { uid } = undefined }: any) => {
      log(this.exportConfig, `failed to export versions of entry ${uid}`, 'error');
      log(this.exportConfig, formatError(error), 'error');
    };

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
    return new Promise(async (resolve, reject) => {
      return await this.getEntryByVersion(apiParams.queryParam, entry)
        .then((response) => {
          apiParams.resolve({
            response,
            apiData: entry,
          });
          resolve(true);
        })
        .catch((error) => {
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
    const entryResponse = await this.stackAPIClient
      .contentType(options.contentType)
      .entry(entry.uid)
      .fetch(queryRequestObject);
    entries.push(entryResponse);
    if (--entry._version > 0) {
      return await this.getEntryByVersion(options, entry, entries);
    }
    return entries;
  }
}
