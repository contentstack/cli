/* eslint-disable no-prototype-builtins */
/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

import * as path from 'path';
import { isEmpty, find, cloneDeep, map } from 'lodash';
import { fsUtil, log, formatError, schemaTemplate, lookupExtension, lookUpTaxonomy } from '../../utils';
import { ImportConfig, ModuleClassParams } from '../../types';
import BaseClass, { ApiOptions } from './base-class';
import { updateFieldRules } from '../../utils/content-type-helper';

export default class ContentTypesImport extends BaseClass {
  private cTsMapperPath: string;
  private cTsFolderPath: string;
  private cTsFailsPath: string;
  private cTsSuccessPath: string;
  private gFsPendingPath: string;
  private pendingGFs: string[];
  private createdGFs: Record<string, unknown>[];
  private gFsFolderPath: string;
  private gFsMapperFolderPath: string;
  private gFs: Record<string, unknown>[];
  private failedCTs: Record<string, unknown>[];
  private createdCTs: Record<string, unknown>[];
  private cTs: Record<string, unknown>[];
  private cTsUidMapper: Record<string, string>;
  private config: ImportConfig;
  private stackAPIClient: any;
  private marketplaceAppMapperPath: string;
  private reqConcurrency: number;
  private ignoredFilesInContentTypesFolder: Map<string, string>;
  private titleToUIdMap: Map<string, string>;
  private fieldRules: Array<Record<string, unknown>>;
  private installedExtensions: Record<string, unknown>;
  private cTsConfig: {
    dirName: string;
    fileName: string;
    validKeys: string[];
    limit: number;
    writeConcurrency?: number;
  };
  private gFsConfig: {
    dirName: string;
    fileName: string;
    validKeys: string[];
    limit: number;
    writeConcurrency?: number;
  };
  private taxonomiesPath: string;
  public taxonomies: Record<string, unknown>;

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.cTsConfig = importConfig.modules['content-types'];
    this.gFsConfig = importConfig.modules['global-fields'];
    this.reqConcurrency = this.cTsConfig.writeConcurrency || this.importConfig.writeConcurrency;
    this.cTsFolderPath = path.join(this.importConfig.data, this.cTsConfig.dirName);
    this.cTsMapperPath = path.join(this.importConfig.data, 'mapper', 'content_types');
    this.cTsSuccessPath = path.join(this.cTsMapperPath, 'success.json');
    this.gFsFolderPath = path.resolve(this.importConfig.data, this.gFsConfig.dirName);
    this.gFsMapperFolderPath = path.join(importConfig.data, 'mapper', 'global_fields', 'success.json');
    this.gFsPendingPath = path.join(importConfig.data, 'mapper', 'global_fields', 'pending_global_fields.js');
    this.marketplaceAppMapperPath = path.join(this.importConfig.data, 'mapper', 'marketplace_apps', 'uid-mapping.json');
    this.ignoredFilesInContentTypesFolder = new Map([
      ['__master.json', 'true'],
      ['__priority.json', 'true'],
      ['schema.json', 'true'],
      ['.DS_Store', 'true'],
    ]);
    this.cTs = [];
    this.createdCTs = [];
    this.titleToUIdMap = new Map();
    this.fieldRules = [];
    this.gFs = [];
    this.createdGFs = [];
    this.pendingGFs = [];
    this.taxonomiesPath = path.join(importConfig.data, 'mapper/taxonomies', 'success.json');
  }

  async start(): Promise<any> {
    /**
     * read content type, check if it is necessary to read the entire dir
     * Seed content types
     * Update content types, lookup extension.
     * Update pending global fields
     * write field rules
     */
    this.cTs = fsUtil.readFile(path.join(this.cTsFolderPath, 'schema.json')) as Record<string, unknown>[];
    if (!this.cTs || isEmpty(this.cTs)) {
      log(this.importConfig, 'No content type found to import', 'info');
      return;
    }
    await fsUtil.makeDirectory(this.cTsMapperPath);
    this.installedExtensions = (
      ((await fsUtil.readFile(this.marketplaceAppMapperPath)) as any) || { extension_uid: {} }
    ).extension_uid;
    this.taxonomies = fsUtil.readFile(this.taxonomiesPath) as Record<string, unknown>;

    await this.seedCTs();
    log(this.importConfig, 'Created content types', 'success');
    await this.updateCTs();
    log(this.importConfig, 'Updated content types with references', 'success');
    if (this.fieldRules.length > 0) {
      await fsUtil.writeFile(path.join(this.cTsFolderPath, 'field_rules_uid.json'), this.fieldRules);
    }
    await this.updatePendingGFs().catch((error) => {
      log(this.importConfig, `Error while updating pending global field ${formatError(error)}`, 'error');
    });
    log(this.importConfig, 'Updated pending global fields with content type with references', 'success');
    log(this.importConfig, 'Content types have been imported successfully!', 'success');
  }

  async seedCTs(): Promise<any> {
    const onSuccess = ({ response: globalField, apiData: { content_type: { uid = null } = {} } = {} }: any) => {
      log(this.importConfig, `${uid} content type seeded`, 'info');
    };
    const onReject = ({ error, apiData: { content_type: { uid = null } = {} } = {} }: any) => {
      if (error.errorCode === 115 && (error.errors.uid || error.errors.title)) {
        log(this.importConfig, `${uid} content type already exist`, 'info');
      } else {
        log(this.importConfig, formatError(error), 'error');
        process.exit(1);
      }
    };
    return await this.makeConcurrentCall({
      processName: 'Import content types',
      apiContent: this.cTs,
      apiParams: {
        serializeData: this.serializeCTs.bind(this),
        reject: onReject.bind(this),
        resolve: onSuccess.bind(this),
        entity: 'create-cts',
        includeParamOnCompletion: true,
      },
      concurrencyLimit: this.reqConcurrency,
    });
  }

  /**
   * @method serializeCTs
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeCTs(apiOptions: ApiOptions): ApiOptions {
    const { apiData: contentType } = apiOptions;
    const updatedCT = cloneDeep(schemaTemplate);
    updatedCT.content_type.uid = contentType.uid;
    updatedCT.content_type.title = contentType.title;
    apiOptions.apiData = updatedCT;
    return apiOptions;
  }

  async updateCTs(): Promise<any> {
    const onSuccess = ({ response: contentType, apiData: { uid } }: any) => {
      log(this.importConfig, `'${uid}' updated with references`, 'success');
    };
    const onReject = ({ error, apiData: { uid } }: any) => {
      log(this.importConfig, formatError(error), 'error');
      throw new Error(`Content type '${uid}' update error`);
    };
    return await this.makeConcurrentCall({
      processName: 'Update content types',
      apiContent: this.cTs,
      apiParams: {
        serializeData: this.serializeUpdateCTs.bind(this),
        reject: onReject.bind(this),
        resolve: onSuccess.bind(this),
        entity: 'update-cts',
        includeParamOnCompletion: true,
      },
      concurrencyLimit: this.reqConcurrency,
    });
  }

  /**
   * @method serializeUpdateCTs
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeUpdateCTs(apiOptions: ApiOptions): ApiOptions {
    const { apiData: contentType } = apiOptions;
    if (contentType.field_rules) {
      contentType.field_rules = updateFieldRules(contentType);
      if (!contentType.field_rules.length) {
        delete contentType.field_rules;
      }
      this.fieldRules.push(contentType.uid);
    }
    //will remove taxonomy if taxonomy doesn't exists in stack
    lookUpTaxonomy(this.importConfig, contentType.schema, this.taxonomies);
    lookupExtension(
      this.importConfig,
      contentType.schema,
      this.importConfig.preserveStackVersion,
      this.installedExtensions,
    );
    const contentTypePayload = this.stack.contentType(contentType.uid);
    Object.assign(contentTypePayload, cloneDeep(contentType));
    apiOptions.apiData = contentTypePayload;
    return apiOptions;
  }

  async updatePendingGFs(): Promise<any> {
    this.pendingGFs = fsUtil.readFile(this.gFsPendingPath) as any;
    this.gFs = fsUtil.readFile(path.resolve(this.gFsFolderPath, this.gFsConfig.fileName)) as Record<string, unknown>[];
    const onSuccess = ({ response: globalField, apiData: { uid } = undefined }: any) => {
      log(this.importConfig, `Updated the global field ${uid} with content type references`, 'info');
    };
    const onReject = ({ error, apiData: { uid } = undefined }: any) => {
      log(this.importConfig, `failed to update the global field '${uid}' ${formatError(error)}`, 'error');
    };
    return await this.makeConcurrentCall({
      processName: 'Update pending global fields',
      apiContent: map(this.pendingGFs, (uid: string) => {
        return { uid };
      }),
      apiParams: {
        serializeData: this.serializeUpdateGFs.bind(this),
        reject: onReject.bind(this),
        resolve: onSuccess.bind(this),
        entity: 'update-gfs',
        includeParamOnCompletion: true,
      },
      concurrencyLimit: this.reqConcurrency,
    });
  }

  /**
   * @method serializeUpdateGFs
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeUpdateGFs(apiOptions: ApiOptions): ApiOptions {
    const {
      apiData: { uid },
    } = apiOptions;
    const globalField = find(this.gFs, { uid });
    lookupExtension(
      this.importConfig,
      globalField.schema,
      this.importConfig.preserveStackVersion,
      this.installedExtensions,
    );
    apiOptions.apiData = globalField;
    const globalFieldPayload = this.stack.globalField(uid);
    Object.assign(globalFieldPayload, cloneDeep(globalField));
    apiOptions.apiData = globalFieldPayload;
    return apiOptions;
  }
}
