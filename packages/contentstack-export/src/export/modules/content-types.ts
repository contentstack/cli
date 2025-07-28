import * as path from 'path';
import {
  ContentstackClient,
  handleAndLogError,
  messageHandler,
  log,
  sanitizePath,
} from '@contentstack/cli-utilities';

import BaseClass from './base-class';
import { fsUtil, executeTask } from '../../utils';
import { ExportConfig, ModuleClassParams } from '../../types';

export default class ContentTypesExport extends BaseClass {
  private stackAPIClient: ReturnType<ContentstackClient['stack']>;
  public exportConfig: ExportConfig;
  private qs: {
    include_count: boolean;
    asc: string;
    skip?: number;
    limit?: number;
    include_global_field_schema: boolean;
    uid?: Record<string, string[]>;
  };
  private contentTypesConfig: {
    dirName?: string;
    fileName?: string;
    validKeys?: string[];
    fetchConcurrency?: number;
    writeConcurrency?: number;
    limit?: number;
  };
  private contentTypesDirPath: string;
  private contentTypes: Record<string, unknown>[];

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.stackAPIClient = stackAPIClient;
    this.contentTypesConfig = exportConfig.modules['content-types'];
    this.qs = {
      include_count: true,
      asc: 'updated_at',
      limit: this.contentTypesConfig.limit,
      include_global_field_schema: true,
    };

    // If content type id is provided then use it as part of query
    if (Array.isArray(this.exportConfig.contentTypes) && this.exportConfig.contentTypes.length > 0) {
      this.qs.uid = { $in: this.exportConfig.contentTypes };
    }

    // Add after existing qs setup and before contentTypesDirPath
    this.applyQueryFilters(this.qs, 'content-types');

    this.contentTypesDirPath = path.resolve(
      sanitizePath(exportConfig.data),
      sanitizePath(exportConfig.branchName || ''),
      sanitizePath(this.contentTypesConfig.dirName),
    );
    this.contentTypes = [];
    this.exportConfig.context.module = 'content-types';
  }

  async start() {
    try {
      log.debug('Starting content types export process...', this.exportConfig.context);
      await fsUtil.makeDirectory(this.contentTypesDirPath);
      log.debug(`Created directory at path: ${this.contentTypesDirPath}`, this.exportConfig.context);

      await this.getContentTypes();
      await this.writeContentTypes(this.contentTypes);

      log.success(messageHandler.parse('CONTENT_TYPE_EXPORT_COMPLETE'), this.exportConfig.context);
    } catch (error) {
      handleAndLogError(error, { ...this.exportConfig.context });
    }
  }

  async getContentTypes(skip = 0): Promise<any> {
    if (skip) {
      this.qs.skip = skip;
      log.debug(`Fetching content types with skip: ${skip}`, this.exportConfig.context);
    }

    log.debug(`Querying content types with parameters: ${JSON.stringify(this.qs, null, 2)}`, this.exportConfig.context);
    const contentTypeSearchResponse = await this.stackAPIClient.contentType().query(this.qs).find();

    log.debug(
      `Fetched ${contentTypeSearchResponse.items?.length || 0} content types out of total ${contentTypeSearchResponse.count}`,
      this.exportConfig.context,
    );

    if (Array.isArray(contentTypeSearchResponse.items) && contentTypeSearchResponse.items.length > 0) {
      const updatedContentTypes = this.sanitizeAttribs(contentTypeSearchResponse.items);
      this.contentTypes.push(...updatedContentTypes);

      skip += this.contentTypesConfig.limit || 100;
      if (skip >= contentTypeSearchResponse.count) {
        return;
      }
      return await this.getContentTypes(skip);
    } else {
      log.info(messageHandler.parse('CONTENT_TYPE_NO_TYPES'), this.exportConfig.context);
    }
  }

  sanitizeAttribs(contentTypes: Record<string, unknown>[]): Record<string, unknown>[] {
    log.debug(`Sanitizing ${contentTypes?.length} content types`, this.exportConfig.context);

    const updatedContentTypes: Record<string, unknown>[] = [];

    contentTypes.forEach((contentType) => {
      for (const key in contentType) {
        if (this.contentTypesConfig.validKeys.indexOf(key) === -1) {
          delete contentType[key];
        }
      }
      updatedContentTypes.push(contentType);
    });
    return updatedContentTypes;
  }

  async writeContentTypes(contentTypes: Record<string, unknown>[]) {
    log.debug(`Writing ${contentTypes?.length} content types to disk`, this.exportConfig.context);

    function write(contentType: Record<string, unknown>) {
      return fsUtil.writeFile(
        path.join(
          sanitizePath(this.contentTypesDirPath),
          sanitizePath(`${contentType.uid === 'schema' ? 'schema|1' : contentType.uid}.json`),
        ),
        contentType,
      );
    }

    await executeTask(contentTypes, write.bind(this), {
      concurrency: this.exportConfig.writeConcurrency,
    });

    const schemaFilePath = path.join(this.contentTypesDirPath, 'schema.json');
    log.debug(`Writing aggregate schema to: ${schemaFilePath}`, this.exportConfig.context);

    return fsUtil.writeFile(schemaFilePath, contentTypes);
  }
}
