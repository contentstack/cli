/* eslint-disable no-prototype-builtins */
/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

import * as path from 'path';
import { isEmpty, values, cloneDeep } from 'lodash';
import { FsUtility } from '@contentstack/cli-utilities';
import {
  fsUtil,
  log,
  formatError,
  lookupExtension,
  suppressSchemaReference,
  removeUidsFromJsonRteFields,
  removeEntryRefsFromJSONRTE,
  lookupAssets,
} from '../../utils';
import { ModuleClassParams } from '../../types';
import BaseClass, { ApiOptions } from './base-class';

export default class EntriesImport extends BaseClass {
  private assetUidMapperPath: string;
  private assetUidMapper: Record<string, any>;
  private assetUrlMapper: Record<string, any>;
  private assetUrlMapperPath: string;
  private entriesMapperPath: string;
  private envPath: string;
  private entriesUIDMapperPath: string;
  private uniqueUidMapperPath: string;
  private modifiedCTsPath: string;
  private marketplaceAppMapperPath: string;
  private entriesConfig: Record<string, any>;
  private cTsPath: string;
  private localesPath: string;
  private importConcurrency: number;
  private entriesPath: string;
  private cTs: Record<string, any>[];
  private modifiedCTs: Record<string, any>[];
  private refCTs: Record<string, any>;
  private jsonRteCTs: Record<string, any>;
  private jsonRteCTsWithRef: Record<string, any>;
  private jsonRteEntries: Record<string, any>;
  private installedExtensions: Record<string, any>[];
  private createdEntries: Record<string, any>[];
  private failedEntries: Record<string, any>[];
  private locales: Record<string, any>[];
  private entriesUidMapper: Record<string, any>;

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.assetUidMapperPath = path.resolve(importConfig.data, 'mapper', 'assets', 'uid-mapping.json');
    this.assetUrlMapperPath = path.resolve(importConfig.data, 'mapper', 'assets', 'url-mapping.json');
    this.entriesMapperPath = path.resolve(importConfig.data, 'mapper', 'entries');
    this.envPath = path.resolve(importConfig.data, 'environments', 'environments.json');
    this.entriesUIDMapperPath = path.join(this.entriesMapperPath, 'uid-mapping.json');
    this.uniqueUidMapperPath = path.join(this.entriesMapperPath, 'unique-mapping.json');
    this.modifiedCTsPath = path.join(this.entriesMapperPath, 'modified-schemas.json');
    this.marketplaceAppMapperPath = path.join(this.importConfig.data, 'mapper', 'marketplace_apps', 'uid-mapping.json');
    // this.createdEntriesWOUidPath = path.join(this.entryMapperPath, 'created-entries-wo-uid.json');
    // this.failedWOPath = path.join(this.entryMapperPath, 'failedWO.json');
    this.entriesConfig = importConfig.modules.entries;
    this.entriesPath = path.resolve(importConfig.data, this.entriesConfig.dirName);
    this.cTsPath = path.resolve(importConfig.data, importConfig.modules['content-types'].dirName);
    this.localesPath = path.resolve(
      importConfig.data,
      importConfig.modules.locales.dirName,
      importConfig.modules.locales.fileName,
    );
    this.importConcurrency = this.entriesConfig.importConcurrency || importConfig.importConcurrency;
    this.entriesUidMapper = {};
  }

  async start(): Promise<any> {
    try {
      /**
       * Read CTS
       * Suppress CTS
       * Read locales
       * Create request objs
       * create entries
       * update entries
       */

      this.cTs = fsUtil.readFile(path.join(this.cTsPath, 'schema.json')) as Record<string, unknown>[];
      if (!this.cTs || isEmpty(this.cTs)) {
        log(this.importConfig, 'No content type found', 'info');
        return;
      }
      this.installedExtensions = (
        ((await fsUtil.readFile(this.marketplaceAppMapperPath)) as any) || { extension_uid: {} }
      ).extension_uid;

      this.assetUidMapper = (fsUtil.readFile(this.assetUidMapperPath) as Record<string, any>) || {};
      this.assetUrlMapper = (fsUtil.readFile(this.assetUrlMapperPath) as Record<string, any>) || {};

      await this.disableMandatoryCTReferences();
      fsUtil.makeDirectory(this.entriesMapperPath);
      this.locales = fsUtil.readFile(this.localesPath) as Record<string, unknown>[];
      const entryRequestOptions = this.populateEntryCreatePayload();
      for (let entryRequestOption of entryRequestOptions) {
        log(
          this.importConfig,
          `Starting to create entries for ${entryRequestOption.cTUid} in locale ${entryRequestOption.locale}`,
          'info',
        );
        await this.createEntries(entryRequestOption);
      }
      log(this.importConfig, 'Entries created successfully', 'info');
    } catch (error) {
      log(this.importConfig, formatError(error), 'error');
      throw new Error('Error while importing entries');
    }
  }

  async disableMandatoryCTReferences() {
    const onSuccess = ({ response: contentType, apiData: { uid } }: any) => {
      log(this.importConfig, `${uid} content type references removed temporarily`, 'success');
    };
    const onReject = ({ error, apiData: { uid } }: any) => {
      log(this.importConfig, formatError(error), 'error');
      throw new Error(`${uid} content type references removal failed`);
    };
    return await this.makeConcurrentCall({
      processName: 'Update content types (removing mandatory references temporarily)',
      apiContent: this.cTs,
      apiParams: {
        serializeData: this.serializeUpdateCTs.bind(this),
        reject: onReject.bind(this),
        resolve: onSuccess.bind(this),
        entity: 'update-cts',
        includeParamOnCompletion: true,
      },
      concurrencyLimit: this.importConcurrency,
    }).then(() => {
      fsUtil.writeFile(this.modifiedCTsPath, this.modifiedCTs);
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
      delete contentType.field_rules;
    }
    const flag = {
      suppressed: false,
      references: false,
      jsonRte: false,
      jsonRteEmbeddedEntries: false,
    };
    suppressSchemaReference(contentType.schema, flag);
    // Check if suppress modified flag
    if (flag.suppressed) {
      this.modifiedCTs.push(this.cTs[contentType.uid]);
    } else {
      // Note: Skips the content type from update if no reference found
      apiOptions.additionalInfo = { skip: true };
      return apiOptions;
    }

    if (flag.references) {
      this.refCTs.push(contentType.uid);
    }

    if (flag.jsonRte) {
      this.jsonRteCTs.push(contentType.uid);
      if (flag.jsonRteEmbeddedEntries) {
        this.jsonRteCTsWithRef.push(contentType.uid);
        if (this.refCTs.indexOf(contentType.uid) === -1) {
          this.refCTs.push(contentType.uid);
        }
      }
    }
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

  populateEntryCreatePayload(): { cTUid: string; locale: string }[] {
    const requestObjects: { cTUid: string; locale: string }[] = [];
    this.cTs.forEach((contentType) => {
      for (let locale in this.locales) {
        requestObjects.push({
          cTUid: contentType.uid,
          locale: this.locales[locale].code,
        });
      }
      requestObjects.push({
        cTUid: contentType.uid,
        locale: this.importConfig.master_locale.code,
      });
    });

    return requestObjects;
  }

  async createEntries({ cTUid, locale }: { cTUid: string; locale: string }): Promise<void> {
    const processName = 'Create Entries';
    const indexFileName = 'index.json';
    const basePath = path.join(this.entriesPath, cTUid, locale);
    const fs = new FsUtility({ basePath, indexFileName });
    const indexer = fs.indexFileContent;
    const indexerCount = values(indexer).length;
    // Write created entries
    const entriesCreateFileHelper = new FsUtility({
      moduleName: 'created-entries',
      indexFileName: 'index.json',
      basePath: path.join(this.entriesMapperPath, cTUid, locale),
      chunkFileSize: this.entriesConfig.chunkFileSize,
      keepMetadata: false,
      omitKeys: this.entriesConfig.invalidKeys,
    });

    const onSuccess = ({ response, apiData: { uid, url, title } }: any) => {
      log(this.importConfig, `Created entry: '${title}' of content type ${cTUid} in locale ${locale}`, 'info');
      this.entriesUidMapper[uid] = response.uid;
      entriesCreateFileHelper.writeIntoFile({ [uid]: response } as any, { mapKeyVal: true });
    };
    const onReject = ({ error, apiData: { uid, title } }: any) => {
      log(this.importConfig, `${title} entry of content type ${cTUid} in locale ${locale} failed to create`, 'error');
      log(this.importConfig, formatError(error), 'error');
      this.failedEntries.push({ content_type: cTUid, locale, entry: { uid, title } });
    };

    for (const index in indexer) {
      const chunk = await fs.readChunkFiles.next().catch((error) => {
        log(this.importConfig, formatError(error), 'error');
      });

      if (chunk) {
        let apiContent = values(chunk as Record<string, any>[]);
        await this.makeConcurrentCall({
          apiContent,
          processName,
          indexerCount,
          currentIndexer: +index,
          apiParams: {
            reject: onReject,
            resolve: onSuccess,
            entity: 'create-entries',
            includeParamOnCompletion: true,
            serializeData: this.serializeEntries.bind(this),
            additionalInfo: { cTUid, locale },
          },
          concurrencyLimit: this.importConcurrency,
        }).then(() => {
          fs?.completeFile(true);
          log(this.importConfig, `Created entries for content type ${cTUid} in locale ${locale}`, 'success');
        });
      }
    }
  }

  /**
   * @method serializeEntries
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeEntries(apiOptions: ApiOptions): ApiOptions {
    let {
      apiData: entry,
      additionalInfo: { cTUid, locale },
    } = apiOptions;

    if (this.jsonRteCTs.indexOf(cTUid) > -1) {
      entry = removeUidsFromJsonRteFields(entry, this.cTs[cTUid].schema);
    }
    // remove entry references from json-rte fields
    if (this.jsonRteCTsWithRef.indexOf(cTUid) > -1) {
      entry = removeEntryRefsFromJSONRTE(entry, this.cTs[cTUid].schema);
    }
    // will replace all old asset uid/urls with new ones
    entry = lookupAssets(
      {
        content_type: this.cTs[cTUid],
        entry: entry,
      },
      this.assetUidMapper,
      this.assetUrlMapper,
      path.join(this.entriesPath, cTUid, locale),
      this.installedExtensions,
    );
    delete entry.publish_details;
    apiOptions.apiData = entry;
    return apiOptions;
  }

  async updateEntriesWithReferences(): Promise<void> {}

  async enableMandatoryCTReferences(): Promise<void> {}

  async removeAutoCreatedEntries(): Promise<void> {}

  async updateFieldRules(): Promise<void> {}

  async publishEntries(): Promise<void> {}
}
