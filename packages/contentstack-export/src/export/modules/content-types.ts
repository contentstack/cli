import * as path from 'path';
import { ContentstackClient } from '@contentstack/cli-utilities';
import { log, formatError, fsUtil, executeTask } from '../../utils';
import { ExportConfig, ModuleClassParams } from '../../types';
import BaseClass from './base-class';
import { sanitizePath } from '@contentstack/cli-utilities';

export default class ContentTypesExport extends BaseClass {
  private stackAPIClient: ReturnType<ContentstackClient['stack']>;
  public exportConfig: ExportConfig;
  private qs: {
    include_count: boolean;
    asc: string;
    skip?: number;
    limit?: number;
    include_global_field_schema: boolean;
    uid?: Record<string, string[]>
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
    
    this.contentTypesDirPath = path.resolve(
      sanitizePath(exportConfig.data),
      sanitizePath(exportConfig.branchName || ''),
      sanitizePath(this.contentTypesConfig.dirName),
    );
    this.contentTypes = [];
  }

  async start() {
    try {
      log(this.exportConfig, 'Starting content type export', 'success');
      await fsUtil.makeDirectory(this.contentTypesDirPath);
      await this.getContentTypes();
      await this.writeContentTypes(this.contentTypes);
      log(this.exportConfig, 'Content type(s) exported successfully', 'success');
    } catch (error) {
      log(this.exportConfig, `Failed to export content types ${formatError(error)}`, 'error');
      throw new Error('Failed to export content types');
    }
  }

  async getContentTypes(skip = 0): Promise<any> {
    if (skip) {
      this.qs.skip = skip;
    }
    const contentTypeSearchResponse = await this.stackAPIClient.contentType().query(this.qs).find();
    if (Array.isArray(contentTypeSearchResponse.items) && contentTypeSearchResponse.items.length > 0) {
      let updatedContentTypes = this.sanitizeAttribs(contentTypeSearchResponse.items);
      this.contentTypes.push(...updatedContentTypes);

      skip += this.contentTypesConfig.limit || 100;
      if (skip >= contentTypeSearchResponse.count) {
        return;
      }
      return await this.getContentTypes(skip);
    } else {
      log(this.exportConfig, 'No content types returned for the given query', 'info');
    }
  }

  sanitizeAttribs(contentTypes: Record<string, unknown>[]): Record<string, unknown>[] {
    let updatedContentTypes: Record<string, unknown>[] = [];
    contentTypes.forEach((contentType) => {
      for (let key in contentType) {
        if (this.contentTypesConfig.validKeys.indexOf(key) === -1) {
          delete contentType[key];
        }
      }
      updatedContentTypes.push(contentType);
    });
    return updatedContentTypes;
  }

  async writeContentTypes(contentTypes: Record<string, unknown>[]) {
    function write(contentType: Record<string, unknown>) {
      return fsUtil.writeFile(
        path.join(sanitizePath(this.contentTypesDirPath), sanitizePath(`${contentType.uid === 'schema' ? 'schema|1' : contentType.uid}.json`)),
        contentType,
      );
    }
    await executeTask(contentTypes, write.bind(this), { concurrency: this.exportConfig.writeConcurrency });
    return fsUtil.writeFile(path.join(this.contentTypesDirPath, 'schema.json'), contentTypes);
  }
}
