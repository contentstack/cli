import * as path from 'path';
import { find, cloneDeep, map } from 'lodash';
import { sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';

import { ModuleClassParams } from '../../types';
import BaseClass, { ApiOptions } from './base-class';
import { updateFieldRules } from '../../utils/content-type-helper';
import {
  fsUtil,
  schemaTemplate,
  lookupExtension,
  lookUpTaxonomy,
  PROCESS_NAMES,
  MODULE_CONTEXTS,
  PROCESS_STATUS,
  MODULE_NAMES,
} from '../../utils';

export default class ContentTypesImport extends BaseClass {
  private cTsMapperPath: string;
  private cTsFolderPath: string;
  private cTsSuccessPath: string;
  private gFsPendingPath: string;
  private pendingGFs: string[];
  private createdGFs: Record<string, unknown>[];
  private gFsFolderPath: string;
  private gFsMapperFolderPath: string;
  private gFs: Record<string, unknown>[];
  private createdCTs: string[];
  private cTs: Record<string, unknown>[];
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
  private pendingExts: string[];

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.importConfig.context.module = MODULE_CONTEXTS.CONTENT_TYPES;
    this.currentModuleName = MODULE_NAMES[MODULE_CONTEXTS.CONTENT_TYPES];
    this.cTsConfig = importConfig.modules['content-types'];
    this.gFsConfig = importConfig.modules['global-fields'];
    this.reqConcurrency = this.cTsConfig.writeConcurrency || this.importConfig.writeConcurrency;
    this.cTsFolderPath = path.join(sanitizePath(this.importConfig.data), sanitizePath(this.cTsConfig.dirName));
    this.cTsMapperPath = path.join(sanitizePath(this.importConfig.data), 'mapper', 'content_types');
    this.cTsSuccessPath = path.join(sanitizePath(this.importConfig.data), 'mapper', 'content_types', 'success.json');
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
    this.pendingExts = [];
    this.taxonomiesPath = path.join(sanitizePath(importConfig.data), 'mapper', 'taxonomies', 'success.json');
    this.extPendingPath = path.join(sanitizePath(importConfig.data), 'mapper', 'extensions', 'pending_extensions.js');
  }

  async start(): Promise<any> {
    try {
      log.debug('Starting content types import process...', this.importConfig.context);
      await this.analyzeImportData();

      if (!this.cTs?.length) {
        log.info('No content type found to import', this.importConfig.context);
        return;
      }

      await fsUtil.makeDirectory(this.cTsMapperPath);
      log.debug('Created content types mapper directory', this.importConfig.context);
      const progress = this.initializeProgress();

      if (this.cTs.length > 0) {
        await this.handleContentTypesCreation(progress);
        await this.handleContentTypesUpdate(progress);
      }

      if (this.fieldRules.length > 0) {
        fsUtil.writeFile(path.join(this.cTsFolderPath, 'field_rules_uid.json'), this.fieldRules);
        log.debug(`Written ${this.fieldRules.length} field rules to file`, this.importConfig.context);
      }

      if (this.pendingExts.length > 0) {
        await this.handlePendingExtensions(progress);
      }

      if (this.pendingGFs.length > 0) {
        await this.handlePendingGlobalFields(progress);
      }

      this.completeProgress(true);
      log.success('Content types have been imported successfully!', this.importConfig.context);
    } catch (error) {
      this.completeProgress(false, error?.message || 'Content types import failed');
      handleAndLogError(error, { ...this.importConfig.context });
    }
  }

  async seedCTs(): Promise<any> {
    const onSuccess = ({ response: globalField, apiData: { content_type: { uid = null } = {} } = {} }: any) => {
      this.createdCTs.push(uid);
      this.progressManager?.tick(true, `content type: ${uid}`, null, PROCESS_NAMES.CONTENT_TYPES_CREATE);
      log.success(`Content type '${uid}' created successfully`, this.importConfig.context);
      log.debug(`Successfully seeded content type: ${uid}`, this.importConfig.context);
    };
    const onReject = ({ error, apiData: { content_type: { uid = null } = {} } = {} }: any) => {
      this.progressManager?.tick(
        false,
        `content type: ${uid}`,
        error?.message || `Failed to create content type '${uid}'`,
        PROCESS_NAMES.CONTENT_TYPES_CREATE,
      );
      if (error.errorCode === 115 && (error.errors.uid || error.errors.title)) {
        log.info(`${uid} content type already exists.`, this.importConfig.context);
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
      this.progressManager?.tick(true, `content type: ${uid}`, null, PROCESS_NAMES.CONTENT_TYPES_UPDATE);
      log.success(`'${uid}' updated with references`, this.importConfig.context);
      log.debug(`Content type update completed for: ${uid}`, this.importConfig.context);
    };

    const onReject = ({ error, apiData: { uid } }: any) => {
      this.progressManager?.tick(
        false,
        `content type: ${uid}`,
        error?.message || `Content type '${uid}' update failed`,
        PROCESS_NAMES.CONTENT_TYPES_UPDATE,
      );
      handleAndLogError(error, { ...this.importConfig.context, uid }, `Content type '${uid}' update failed`);
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
    if (!this.pendingGFs || this.pendingGFs.length === 0) {
      log.info('No pending global fields found to update', this.importConfig.context);
      return;
    }

    log.debug(`Found ${this.pendingGFs?.length || 0} pending global fields to update`, this.importConfig.context);
    log.debug(`Loaded ${this.gFs?.length || 0} global fields from file`, this.importConfig.context);

    const onSuccess = ({ response: globalField, apiData: { uid } = undefined }: any) => {
      this.progressManager?.tick(true, `global field: ${uid}`, null, PROCESS_NAMES.CONTENT_TYPES_GF_UPDATE);
      log.success(`Updated the global field ${uid} with content type references`, this.importConfig.context);
      log.debug(`Global field update completed for: ${uid}`, this.importConfig.context);
    };
    const onReject = ({ error, apiData: { uid } = undefined }: any) => {
      this.progressManager?.tick(
        false,
        `global field: ${uid}`,
        error?.message || `Failed to update the global field '${uid}'`,
        PROCESS_NAMES.CONTENT_TYPES_GF_UPDATE,
      );
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
      log.debug('Skipping extensions update – no pending extensions.', this.importConfig.context);
      return;
    }

    log.debug(`Found ${apiContent.length} extensions to update`, this.importConfig.context);
    this.isExtensionsUpdate = true;

    const onSuccess = ({ response, apiData: { uid, title } = { uid: null, title: '' } }: any) => {
      this.progressManager?.tick(
        true,
        `extension: ${response.title || title || uid}`,
        null,
        PROCESS_NAMES.CONTENT_TYPES_EXT_UPDATE,
      );
      log.success(`Successfully updated the '${response.title}' extension.`, this.importConfig.context);
      log.debug(`Extension update completed for: ${uid}`, this.importConfig.context);
    };

    const onReject = ({ error, apiData }: any) => {
      const { uid, title } = apiData;
      this.progressManager?.tick(
        false,
        `extension: ${title || uid}`,
        error?.message || `Failed to update '${uid}' extension`,
        PROCESS_NAMES.CONTENT_TYPES_EXT_UPDATE,
      );
      if (error?.errors?.title) {
        if (!this.importConfig.skipExisting) {
          log.info(`Extension '${uid}' already exists.`, this.importConfig.context);
        }
        log.debug(`Skipping existing extension: ${uid}`, this.importConfig.context);
      } else {
        handleAndLogError(error, { ...this.importConfig.context, uid }, `Failed to update '${uid}' extension`);
      }
    };

    log.debug('Starting extensions update process...', this.importConfig.context);
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

  async analyzeImportData(): Promise<void> {
    const [cts, gfs, pendingGfs, pendingExt] = await this.withLoadingSpinner(
      'CONTENT TYPES: Analyzing import data...',
      async () => {
        const cts = fsUtil.readFile(path.join(this.cTsFolderPath, 'schema.json'));
        const gfs = fsUtil.readFile(path.resolve(this.gFsFolderPath, this.gFsConfig.fileName));
        const pendingGfs = fsUtil.readFile(this.gFsPendingPath);
        const pendingExt = fsUtil.readFile(this.extPendingPath);
        return [cts, gfs, pendingGfs, pendingExt];
      },
    );

    this.cTs = (Array.isArray(cts) ? cts : []) as Record<string, unknown>[];
    this.gFs = (Array.isArray(gfs) ? gfs : []) as Record<string, unknown>[];
    this.pendingGFs = (Array.isArray(pendingGfs) ? pendingGfs : []) as unknown as string[];
    this.pendingExts = (Array.isArray(pendingExt) ? pendingExt : []) as unknown as string[];

    const marketplaceAppData = fsUtil.readFile(this.marketplaceAppMapperPath) as any;
    this.installedExtensions = marketplaceAppData?.extension_uid || { extension_uid: {} };
    this.taxonomies = fsUtil.readFile(this.taxonomiesPath) as Record<string, unknown>;

    log.debug(
      `Analysis complete: ${this.cTs?.length} content types, ${this.gFs?.length} global fields, ${
        this.pendingGFs?.length
      } pending GFs, ${Object.keys(this.installedExtensions || {})?.length} extensions, ${
        Object.keys(this.taxonomies || {})?.length
      } taxonomies`,
      this.importConfig.context,
    );
  }

  initializeProgress() {
    const progress = this.createNestedProgress(this.currentModuleName);
    if (this.cTs.length) {
      progress.addProcess(PROCESS_NAMES.CONTENT_TYPES_CREATE, this.cTs.length);
      progress.addProcess(PROCESS_NAMES.CONTENT_TYPES_UPDATE, this.cTs.length);
    }
    if (this.pendingGFs.length) {
      progress.addProcess(PROCESS_NAMES.CONTENT_TYPES_GF_UPDATE, this.pendingGFs.length);
    }
    if (this.pendingExts.length) {
      progress.addProcess(PROCESS_NAMES.CONTENT_TYPES_EXT_UPDATE, this.pendingExts.length);
    }
    return progress;
  }

  async handlePendingGlobalFields(progress: any) {
    progress
      .startProcess(PROCESS_NAMES.CONTENT_TYPES_GF_UPDATE)
      .updateStatus(
        PROCESS_STATUS[PROCESS_NAMES.CONTENT_TYPES_GF_UPDATE].UPDATING,
        PROCESS_NAMES.CONTENT_TYPES_GF_UPDATE,
      );

    log.info('Starting pending global fields update process', this.importConfig.context);
    await this.updatePendingGFs();
    progress.completeProcess(PROCESS_NAMES.CONTENT_TYPES_GF_UPDATE, true);
  }

  async handleContentTypesCreation(progress: any) {
    progress
      .startProcess(PROCESS_NAMES.CONTENT_TYPES_CREATE)
      .updateStatus(PROCESS_STATUS[PROCESS_NAMES.CONTENT_TYPES_CREATE].CREATING, PROCESS_NAMES.CONTENT_TYPES_CREATE);

    log.info('Starting content types seeding process', this.importConfig.context);
    await this.seedCTs();

    if (this.createdCTs?.length) {
      fsUtil.writeFile(this.cTsSuccessPath, this.createdCTs);
      log.debug(`Written ${this.createdCTs.length} successful content types to file`, this.importConfig.context);
    }

    progress.completeProcess(PROCESS_NAMES.CONTENT_TYPES_CREATE, true);
  }

  async handleContentTypesUpdate(progress: any) {
    progress
      .startProcess(PROCESS_NAMES.CONTENT_TYPES_UPDATE)
      .updateStatus(PROCESS_STATUS[PROCESS_NAMES.CONTENT_TYPES_UPDATE].UPDATING, PROCESS_NAMES.CONTENT_TYPES_UPDATE);

    log.info('Starting Update process', this.importConfig.context);
    await this.updateCTs();

    progress.completeProcess(PROCESS_NAMES.CONTENT_TYPES_UPDATE, true);
  }

  async handlePendingExtensions(progress: any) {
    progress
      .startProcess(PROCESS_NAMES.CONTENT_TYPES_EXT_UPDATE)
      .updateStatus(
        PROCESS_STATUS[PROCESS_NAMES.CONTENT_TYPES_EXT_UPDATE].UPDATING,
        PROCESS_NAMES.CONTENT_TYPES_EXT_UPDATE,
      );

    log.info('Starting pending extensions update process', this.importConfig.context);
    await this.updatePendingExtensions();
    progress.completeProcess(PROCESS_NAMES.CONTENT_TYPES_EXT_UPDATE, true);

    if (this.isExtensionsUpdate) {
      log.success('Successfully updated the extensions.', this.importConfig.context);
    }
  }
}
