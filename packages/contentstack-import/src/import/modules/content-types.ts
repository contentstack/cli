/* eslint-disable no-prototype-builtins */
/*!
 * Contentstack Import
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */

import * as path from 'path';
import { isEmpty, find, cloneDeep, map } from 'lodash';
import { sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';
import { fsUtil, schemaTemplate, lookupExtension, lookUpTaxonomy } from '../../utils';
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
  private createdCTs: string[];
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
  private extPendingPath: string;
  private isExtensionsUpdate = false;

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.importConfig.context.module = 'content-types';
    this.cTsConfig = importConfig.modules['content-types'];
    this.gFsConfig = importConfig.modules['global-fields'];
    this.reqConcurrency = this.cTsConfig.writeConcurrency || this.importConfig.writeConcurrency;
    this.cTsFolderPath = path.join(sanitizePath(this.importConfig.data), sanitizePath(this.cTsConfig.dirName));
    this.cTsMapperPath = path.join(sanitizePath(this.importConfig.data), 'mapper', 'content_types');
    this.cTsSuccessPath = path.join(sanitizePath(this.cTsMapperPath), 'success.json');
    this.gFsFolderPath = path.resolve(sanitizePath(this.importConfig.data), sanitizePath(this.gFsConfig.dirName));
    this.gFsMapperFolderPath = path.join(sanitizePath(importConfig.data), 'mapper', 'global_fields', 'success.json');
    this.gFsPendingPath = path.join(
      sanitizePath(importConfig.data),
      'mapper',
      'global_fields',
      'pending_global_fields.js',
    );
    this.marketplaceAppMapperPath = path.join(
      sanitizePath(this.importConfig.data),
      'mapper',
      'marketplace_apps',
      'uid-mapping.json',
    );
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
    this.taxonomiesPath = path.join(sanitizePath(importConfig.data), 'mapper/taxonomies', 'success.json');
    this.extPendingPath = path.join(sanitizePath(importConfig.data), 'mapper', 'extensions', 'pending_extensions.js');
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
      log.info('No content type found to import', this.importConfig.context);
      return;
    }
    log.debug(`Found ${this.cTs.length} content types to import`, this.importConfig.context);

    await fsUtil.makeDirectory(this.cTsMapperPath);
    log.debug('Created content types mapper directory', this.importConfig.context);

    this.installedExtensions = (
      ((await fsUtil.readFile(this.marketplaceAppMapperPath)) as any) || { extension_uid: {} }
    ).extension_uid;
    log.debug(
      `Loaded ${Object.keys(this.installedExtensions)?.length} installed extensions`,
      this.importConfig.context,
    );

    this.taxonomies = fsUtil.readFile(this.taxonomiesPath) as Record<string, unknown>;
    const taxonomyCount = Object.keys(this.taxonomies || {}).length;
    log.debug(`Loaded ${taxonomyCount} taxonomy definitions`, this.importConfig.context);

    log.info('Starting content types seeding process', this.importConfig.context);
    await this.seedCTs();
    if (this.createdCTs?.length) {
      fsUtil.writeFile(this.cTsSuccessPath, this.createdCTs);
      log.debug(`Written ${this.createdCTs.length} successful content types to file`, this.importConfig.context);
    }
    log.success('Created content types', this.importConfig.context);

    log.info('Starting content types update process', this.importConfig.context);
    await this.updateCTs();
    log.success('Updated content types with references', this.importConfig.context);

    if (this.fieldRules.length > 0) {
      fsUtil.writeFile(path.join(this.cTsFolderPath, 'field_rules_uid.json'), this.fieldRules);
      log.debug(`Written ${this.fieldRules.length} field rules to file`, this.importConfig.context);
    }

    log.info('Updating the extensions...', this.importConfig.context);
    await this.updatePendingExtensions();
    if (this.isExtensionsUpdate) {
      log.success('Successfully updated the extensions.', this.importConfig.context);
    }

    log.info('Starting pending global fields update', this.importConfig.context);
    this.pendingGFs = fsUtil.readFile(this.gFsPendingPath) as any;
    if (!this.pendingGFs || isEmpty(this.pendingGFs)) {
      log.info('No pending global fields found to update', this.importConfig.context);
      return;
    }
    await this.updatePendingGFs().catch((error) => {
      handleAndLogError(error, { ...this.importConfig.context });
    });
    log.success('Updated pending global fields with content type with references', this.importConfig.context);
    log.success('Content types have been imported successfully!', this.importConfig.context);
  }

  async seedCTs(): Promise<any> {
    const onSuccess = ({ response: globalField, apiData: { content_type: { uid = null } = {} } = {} }: any) => {
      this.createdCTs.push(uid);
      log.info(`${uid} content type seeded`, this.importConfig.context);
      log.debug(`Successfully seeded content type: ${uid}`, this.importConfig.context);
    };
    const onReject = ({ error, apiData: { content_type: { uid = null } = {} } = {} }: any) => {
      if (error.errorCode === 115 && (error.errors.uid || error.errors.title)) {
        log.info(`${uid} content type already exist`, this.importConfig.context);
        log.debug(`Skipping existing content type: ${uid}`, this.importConfig.context);
      } else {
        handleAndLogError(error, { ...this.importConfig.context, uid }, `Failed to seed content type ${uid}`);
      }
    };
    log.debug(`Starting to seed ${this.cTs.length} content types`, this.importConfig.context);

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
    log.debug(`Serializing content type: ${contentType.uid} (${contentType.title})`, this.importConfig.context);
    const updatedCT = cloneDeep(schemaTemplate);
    updatedCT.content_type.uid = contentType.uid;
    updatedCT.content_type.title = contentType.title;
    apiOptions.apiData = updatedCT;
    return apiOptions;
  }

  async updateCTs(): Promise<any> {
    const onSuccess = ({ response: contentType, apiData: { uid } }: any) => {
      log.success(`'${uid}' updated with references`, this.importConfig.context);
      log.debug(`Content type update completed for: ${uid}`, this.importConfig.context);
    };
    const onReject = ({ error, apiData: { uid } }: any) => {
      handleAndLogError(error, { ...this.importConfig.context, uid }, `Content type '${uid}' update failed`);
      throw new Error(`Content type '${uid}' update error`);
    };
    log.debug(`Starting to update ${this.cTs.length} content types with references`, this.importConfig.context);
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
    log.debug(
      `Serializing update for content type: ${contentType.uid} (${contentType.title})`,
      this.importConfig.context,
    );

    if (contentType.field_rules) {
      contentType.field_rules = updateFieldRules(contentType);
      if (!contentType.field_rules.length) {
        delete contentType.field_rules;
        log.debug(`Removed empty field rules for content type: ${contentType.uid}`, this.importConfig.context);
      } else {
        log.debug(
          `Updated ${contentType.field_rules.length} field rules for content type: ${contentType.uid}`,
          this.importConfig.context,
        );
      }
      this.fieldRules.push(contentType.uid);
    }

    //will remove taxonomy if taxonomy doesn't exists in stack
    lookUpTaxonomy(this.importConfig, contentType.schema, this.taxonomies);
    log.debug(`Processed taxonomy lookups for content type: ${contentType.uid}`, this.importConfig.context);

    lookupExtension(
      this.importConfig,
      contentType.schema,
      this.importConfig.preserveStackVersion,
      this.installedExtensions,
    );
    log.debug(`Processed extension lookups for content type: ${contentType.uid}`, this.importConfig.context);

    const contentTypePayload = this.stack.contentType(contentType.uid);
    Object.assign(contentTypePayload, cloneDeep(contentType));
    log.debug(`Content type update serialization completed for: ${contentType.uid}`, this.importConfig.context);
    apiOptions.apiData = contentTypePayload;
    return apiOptions;
  }

  async updatePendingGFs(): Promise<any> {
    this.pendingGFs = fsUtil.readFile(this.gFsPendingPath) as any;
    log.info(`Found ${this.pendingGFs.length} pending global fields to update`, this.importConfig.context);
    this.gFs = fsUtil.readFile(path.resolve(this.gFsFolderPath, this.gFsConfig.fileName)) as Record<string, unknown>[];

    log.debug(`Found ${this.pendingGFs?.length || 0} pending global fields to update`, this.importConfig.context);
    log.debug(`Loaded ${this.gFs?.length || 0} global fields from file`, this.importConfig.context);

    const onSuccess = ({ response: globalField, apiData: { uid } = undefined }: any) => {
      log.info(`Updated the global field ${uid} with content type references`, this.importConfig.context);
      log.debug(`Global field update completed for: ${uid}`, this.importConfig.context);
    };
    const onReject = ({ error, apiData: { uid } = undefined }: any) => {
      handleAndLogError(error, { ...this.importConfig.context, uid }, `Failed to update the global field '${uid}'`);
    };

    const apiContent = map(this.pendingGFs, (uid: string) => {
      return { uid };
    });
    log.debug(`Prepared ${apiContent.length} global field update tasks`, this.importConfig.context);

    return await this.makeConcurrentCall({
      processName: 'Update pending global fields',
      apiContent: apiContent,
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

    log.debug(`Serializing global field update for: ${uid}`, this.importConfig.context);

    const globalField = find(this.gFs, { uid });
    if (!globalField) {
      log.debug(`Global field not found: ${uid}`, this.importConfig.context);
      apiOptions.apiData = null;
      return apiOptions;
    }

    log.debug(`Found global field: ${uid}`, this.importConfig.context);

    lookupExtension(
      this.importConfig,
      globalField.schema,
      this.importConfig.preserveStackVersion,
      this.installedExtensions,
    );
    log.debug(`Processed extension lookups for global field: ${uid}`, this.importConfig.context);

    const globalFieldPayload = this.stack.globalField(uid, { api_version: '3.2' });
    Object.assign(globalFieldPayload, cloneDeep(globalField));
    log.debug(`Global field update serialization completed for: ${uid}`, this.importConfig.context);
    apiOptions.apiData = globalFieldPayload;
    return apiOptions;
  }

  async updatePendingExtensions(): Promise<any> {
    let apiContent = fsUtil.readFile(this.extPendingPath) as Record<string, any>[];
    log.debug(`Reading pending extensions from: ${this.extPendingPath}`, this.importConfig.context);

    if (!apiContent || apiContent?.length === 0) {
      log.info(`No extensions found to be updated.`, this.importConfig.context);
      log.debug('Skipping extensions update - no pending extensions', this.importConfig.context);
      return;
    }

    log.debug(`Found ${apiContent.length} extensions to update`, this.importConfig.context);
    this.isExtensionsUpdate = true;

    const onSuccess = ({ response, apiData: { uid, title } = { uid: null, title: '' } }: any) => {
      log.success(`Successfully updated the '${response.title}' extension.`, this.importConfig.context);
      log.debug(`Extension update completed for: ${uid}`, this.importConfig.context);
    };

    const onReject = ({ error, apiData }: any) => {
      const { uid } = apiData;
      if (error?.errors?.title) {
        if (!this.importConfig.skipExisting) {
          log.info(`Extension '${uid}' already exists.`, this.importConfig.context);
        }
        log.debug(`Skipping existing extension: ${uid}`, this.importConfig.context);
      } else {
        handleAndLogError(error, { ...this.importConfig.context, uid }, `Failed to update '${uid}' extension`);
      }
    };

    log.debug('Starting extensions update process', this.importConfig.context);
    return await this.makeConcurrentCall(
      {
        apiContent,
        processName: 'update extensions',
        apiParams: {
          reject: onReject.bind(this),
          resolve: onSuccess.bind(this),
          entity: 'update-extensions',
          includeParamOnCompletion: true,
        },
        concurrencyLimit: this.importConfig.concurrency || this.importConfig.fetchConcurrency || 1,
      },
      undefined,
      false,
    );
  }
}
