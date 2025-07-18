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
      log.debug('Starting global fields export process...', this.exportConfig.context);
      log.debug(`Global fields directory path: ${this.globalFieldsDirPath}`, this.exportConfig.context); 
      await fsUtil.makeDirectory(this.globalFieldsDirPath);
      log.debug('Created global fields directory', this.exportConfig.context);
      
      await this.getGlobalFields();
      log.debug(`Retrieved ${this.globalFields.length} global fields`, this.exportConfig.context);
      
      const globalFieldsFilePath = path.join(this.globalFieldsDirPath, this.globalFieldsConfig.fileName);
      log.debug(`Writing global fields to: ${globalFieldsFilePath}`, this.exportConfig.context);
      fsUtil.writeFile(globalFieldsFilePath, this.globalFields);
      
      log.success(
        messageHandler.parse('GLOBAL_FIELDS_EXPORT_COMPLETE', this.globalFields.length),
        this.exportConfig.context,
      );
    } catch (error) {
      log.debug('Error occurred during global fields export', this.exportConfig.context);
      handleAndLogError(error, { ...this.exportConfig.context });
    }
  }

  async getGlobalFields(skip: number = 0): Promise<any> {
    if (skip) {
      this.qs.skip = skip;
      log.debug(`Fetching global fields with skip: ${skip}`, this.exportConfig.context);
    }
    log.debug(`Query parameters: ${JSON.stringify(this.qs)}`, this.exportConfig.context);
    
    let globalFieldsFetchResponse = await this.stackAPIClient.globalField({ api_version: '3.2' }).query(this.qs).find();
    
    log.debug(`Fetched ${globalFieldsFetchResponse.items?.length || 0} global fields out of total ${globalFieldsFetchResponse.count}`, this.exportConfig.context);
    
    if (Array.isArray(globalFieldsFetchResponse.items) && globalFieldsFetchResponse.items.length > 0) {
      log.debug(`Processing ${globalFieldsFetchResponse.items.length} global fields`, this.exportConfig.context);
      this.sanitizeAttribs(globalFieldsFetchResponse.items);
      skip += this.globalFieldsConfig.limit || 100;
      if (skip >= globalFieldsFetchResponse.count) {
        log.debug('Completed fetching all global fields', this.exportConfig.context);
        return;
      }
      log.debug(`Continuing to fetch global fields with skip: ${skip}`, this.exportConfig.context);
      return await this.getGlobalFields(skip);
    } else {
      log.debug('No global fields found to process', this.exportConfig.context);
    }
  }

  sanitizeAttribs(globalFields: Record<string, string>[]) {
    log.debug(`Sanitizing ${globalFields.length} global fields`, this.exportConfig.context);
    
    globalFields.forEach((globalField: Record<string, string>) => {
      log.debug(`Processing global field: ${globalField.uid || 'unknown'}`, this.exportConfig.context);
      
      for (let key in globalField) {
        if (this.globalFieldsConfig.validKeys.indexOf(key) === -1) {
          delete globalField[key];
        }
      }
      this.globalFields.push(globalField);
    });
    
    log.debug(`Sanitization complete. Total global fields processed: ${this.globalFields.length}`, this.exportConfig.context);
  }
}
