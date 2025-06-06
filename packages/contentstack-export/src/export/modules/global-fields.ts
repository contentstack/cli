import * as path from 'path';
import {
  ContentstackClient,
  handleAndLogError,
  messageHandler,
  log,
  sanitizePath,
} from '@contentstack/cli-utilities';

import { fsUtil } from '../../utils';
import { ExportConfig, ModuleClassParams } from '../../types';
import BaseClass from './base-class';

export default class GlobalFieldsExport extends BaseClass {
  private stackAPIClient: ReturnType<ContentstackClient['stack']>;
  public exportConfig: ExportConfig;
  private qs: {
    include_count: boolean;
    asc: string;
    skip?: number;
    limit?: number;
    include_global_field_schema?: boolean;
  };
  private globalFieldsConfig: {
    dirName?: string;
    fileName?: string;
    validKeys?: string[];
    fetchConcurrency?: number;
    writeConcurrency?: number;
    limit?: number;
  };
  private globalFieldsDirPath: string;
  private globalFields: Record<string, unknown>[];

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.stackAPIClient = stackAPIClient;
    this.globalFieldsConfig = exportConfig.modules['global-fields'];
    this.qs = {
      skip: 0,
      asc: 'updated_at',
      include_count: true,
      limit: this.globalFieldsConfig.limit,
      include_global_field_schema: true,
    };
    this.globalFieldsDirPath = path.resolve(
      sanitizePath(exportConfig.data),
      sanitizePath(exportConfig.branchName || ''),
      sanitizePath(this.globalFieldsConfig.dirName),
    );
    this.globalFields = [];
    this.exportConfig.context.module = 'global-fields';
  }

  async start() {
    try {
      await fsUtil.makeDirectory(this.globalFieldsDirPath);
      await this.getGlobalFields();
      fsUtil.writeFile(path.join(this.globalFieldsDirPath, this.globalFieldsConfig.fileName), this.globalFields);
      log.success(
        messageHandler.parse('GLOBAL_FIELDS_EXPORT_COMPLETE', this.globalFields.length),
        this.exportConfig.context,
      );
    } catch (error) {
      handleAndLogError(error, { ...this.exportConfig.context });
    }
  }

  async getGlobalFields(skip: number = 0): Promise<any> {
    if (skip) {
      this.qs.skip = skip;
    }
    let globalFieldsFetchResponse = await this.stackAPIClient.globalField({ api_version: '3.2' }).query(this.qs).find();
    if (Array.isArray(globalFieldsFetchResponse.items) && globalFieldsFetchResponse.items.length > 0) {
      this.sanitizeAttribs(globalFieldsFetchResponse.items);
      skip += this.globalFieldsConfig.limit || 100;
      if (skip >= globalFieldsFetchResponse.count) {
        return;
      }
      return await this.getGlobalFields(skip);
    }
  }

  sanitizeAttribs(globalFields: Record<string, string>[]) {
    globalFields.forEach((globalField: Record<string, string>) => {
      for (let key in globalField) {
        if (this.globalFieldsConfig.validKeys.indexOf(key) === -1) {
          delete globalField[key];
        }
      }
      this.globalFields.push(globalField);
    });
  }
}
