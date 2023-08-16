/* eslint-disable no-prototype-builtins */
/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

import * as path from 'path';
import { isEmpty, values, cloneDeep, find, indexOf, forEach } from 'lodash';
import { ContentType, FsUtility } from '@contentstack/cli-utilities';
import {
  fsUtil,
  log,
  formatError,
  lookupExtension,
  suppressSchemaReference,
  removeUidsFromJsonRteFields,
  removeEntryRefsFromJSONRTE,
  restoreJsonRteEntryRefs,
  lookupEntries,
  lookupAssets,
  fileHelper,
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
  private refCTs: string[];
  private jsonRteCTs: Record<string, any>;
  private jsonRteCTsWithRef: Record<string, any>;
  private jsonRteEntries: Record<string, any>;
  private installedExtensions: Record<string, any>[];
  private createdEntries: Record<string, any>[];
  private failedEntries: Record<string, any>[];
  private locales: Record<string, any>[];
  private entriesUidMapper: Record<string, any>;
  private envs: Record<string, any>;
  private autoCreatedEntries: Record<string, any>[];

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
    this.modifiedCTs = [];
    this.refCTs = [];
    this.jsonRteCTs = [];
    this.jsonRteCTsWithRef = [];
    this.envs = {};
    this.autoCreatedEntries = [];
  }

  async start(): Promise<any> {
    try {
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

      fsUtil.makeDirectory(this.entriesMapperPath);
      await this.disableMandatoryCTReferences();
      this.locales = values(fsUtil.readFile(this.localesPath) as Record<string, unknown>[]);
      this.locales.unshift(this.importConfig.master_locale); // adds master locale to the list

      //Create Entries
      const entryRequestOptions = this.populateEntryCreatePayload();
      for (let entryRequestOption of entryRequestOptions) {
        await this.createEntries(entryRequestOption);
      }
      await fileHelper.writeLargeFile(path.join(this.entriesMapperPath, 'uid-mapping.json'), this.entriesUidMapper); // TBD: manages mapper in one file, should find an alternative
      fsUtil.writeFile(path.join(this.entriesMapperPath, 'failed-entries.json'), this.failedEntries);

      // Update entries with references
      const entryUpdateRequestOptions = this.populateEntryUpdatePayload();
      for (let entryUpdateRequestOption of entryUpdateRequestOptions) {
        await this.updateEntriesWithReferences(entryUpdateRequestOption).catch((error) => {
          log(
            this.importConfig,
            `Error while updating entries references of ${entryUpdateRequestOption.cTUid} in locale ${entryUpdateRequestOption.locale}`,
            'error',
          );
          log(this.importConfig, formatError(error), 'error');
        });
      }
      fsUtil.writeFile(path.join(this.entriesMapperPath, 'failed-entries.json'), this.failedEntries);

      log(this.importConfig, 'Restoring content type changes', 'info');
      await this.enableMandatoryCTReferences().catch((error) => {
        log(this.importConfig, `Error while updating content type references ${formatError(error)}`, 'error');
      });

      if (this.autoCreatedEntries.length > 0) {
        log(this.importConfig, 'Removing entries from master language which got created by default', 'info');
        await this.removeAutoCreatedEntries().catch((error) => {
          log(
            this.importConfig,
            `Error while removing auto created entries in master locale ${formatError(error)}`,
            'error',
          );
        });
      }
      // Update field rule of content types which are got removed earlier
      log(this.importConfig, 'Updating the field rules of content type', 'info');
      await this.updateFieldRules().catch((error) => {
        log(this.importConfig, `Error while updating field rules of content type ${formatError(error)}`, 'error');
      });
      log(this.importConfig, 'Entries imported successfully', 'success');

      // Publishing entries
      if (this.importConfig.entriesPublish) {
        log(this.importConfig, 'Publishing entries', 'info');
        this.envs = fileHelper.readFileSync(this.envPath);
        for (let entryRequestOption of entryRequestOptions) {
          await this.publishEntries(entryRequestOption).catch((error) => {
            log(
              this.importConfig,
              `Error in publishing entries of ${entryRequestOption.cTUid} in locale ${
                entryRequestOption.locale
              } ${formatError(error)}`,
              'error',
            );
          });
        }
        log(this.importConfig, 'All the entries have been published successfully', 'success');
      }
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
      this.modifiedCTs.push(find(this.cTs, { uid: contentType.uid }));
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
    const requestOptions: { cTUid: string; locale: string }[] = [];
    for (let locale of this.locales) {
      for (let contentType of this.cTs) {
        requestOptions.push({
          cTUid: contentType.uid,
          locale: locale.code,
        });
      }
    }
    return requestOptions;
  }

  async createEntries({ cTUid, locale }: { cTUid: string; locale: string }): Promise<void> {
    const processName = 'Create Entries';
    const indexFileName = 'index.json';
    const basePath = path.join(this.entriesPath, cTUid, locale);
    const fs = new FsUtility({ basePath, indexFileName });
    const indexer = fs.indexFileContent;
    const indexerCount = values(indexer).length;
    if (indexerCount === 0) {
      return Promise.resolve();
    }
    log(this.importConfig, `Starting to create entries for ${cTUid} in locale ${locale}`, 'info');
    const isMasterLocale = locale === this.importConfig?.master_locale?.code;
    // Write created entries
    const entriesCreateFileHelper = new FsUtility({
      moduleName: 'created-entries',
      indexFileName: 'index.json',
      basePath: path.join(this.entriesMapperPath, cTUid, locale),
      chunkFileSize: this.entriesConfig.chunkFileSize,
      keepMetadata: false,
      omitKeys: this.entriesConfig.invalidKeys,
    });
    const contentType = find(this.cTs, { uid: cTUid });

    const onSuccess = ({ response, apiData: entry, additionalInfo: { entryFileName } }: any) => {
      log(this.importConfig, `Created entry: '${entry.title}' of content type ${cTUid} in locale ${locale}`, 'info');
      this.entriesUidMapper[entry.uid] = response.uid;
      entry.sourceEntryFilePath = path.join(basePath, entryFileName); // stores source file path temporarily
      entry.entryOldUid = entry.uid; // stores old uid temporarily
      if (!isMasterLocale) {
        this.autoCreatedEntries.push({ cTUid, locale, entryUid: response.uid });
      }
      entriesCreateFileHelper.writeIntoFile({ [response.uid]: entry } as any, { mapKeyVal: true });
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
            additionalInfo: { contentType, locale, cTUid, entryFileName: indexer[index] },
          },
          concurrencyLimit: this.importConcurrency,
        }).then(() => {
          entriesCreateFileHelper?.completeFile(true);
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
      additionalInfo: { cTUid, locale, contentType },
    } = apiOptions;

    if (this.jsonRteCTs.indexOf(cTUid) > -1) {
      entry = removeUidsFromJsonRteFields(entry, contentType.schema);
    }
    // remove entry references from json-rte fields
    if (this.jsonRteCTsWithRef.indexOf(cTUid) > -1) {
      entry = removeEntryRefsFromJSONRTE(entry, contentType.schema);
    }
    // will replace all old asset uid/urls with new ones
    entry = lookupAssets(
      {
        content_type: contentType,
        entry: entry,
      },
      this.assetUidMapper,
      this.assetUrlMapper,
      path.join(this.entriesPath, cTUid),
      this.installedExtensions,
    );
    delete entry.publish_details;
    apiOptions.apiData = entry;
    return apiOptions;
  }

  populateEntryUpdatePayload(): { cTUid: string; locale: string }[] {
    const requestOptions: { cTUid: string; locale: string }[] = [];
    for (let locale of this.locales) {
      for (let cTUid of this.refCTs) {
        requestOptions.push({
          cTUid,
          locale: locale.code,
        });
      }
    }
    return requestOptions;
  }

  async updateEntriesWithReferences({ cTUid, locale }: { cTUid: string; locale: string }): Promise<void> {
    const processName = 'Update Entries';
    const indexFileName = 'index.json';
    const basePath = path.join(this.entriesMapperPath, cTUid, locale);
    const fs = new FsUtility({ basePath, indexFileName });
    const indexer = fs.indexFileContent;
    const indexerCount = values(indexer).length;
    if (indexerCount === 0) {
      return Promise.resolve();
    }
    log(this.importConfig, `Starting to update entries with references for ${cTUid} in locale ${locale}`, 'info');

    const contentType = find(this.cTs, { uid: cTUid });

    const onSuccess = ({ response, apiData: { uid, url, title } }: any) => {
      log(this.importConfig, `Updated entry: '${title}' of content type ${cTUid} in locale ${locale}`, 'info');
    };
    const onReject = ({ error, apiData: { uid, title } }: any) => {
      log(this.importConfig, `${title} entry of content type ${cTUid} in locale ${locale} failed to update`, 'error');
      log(this.importConfig, formatError(error), 'error');
      this.failedEntries.push({ content_type: cTUid, locale, entry: { uid: this.entriesUidMapper[uid], title } });
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
            entity: 'update-entries',
            includeParamOnCompletion: true,
            serializeData: this.serializeUpdateEntries.bind(this),
            additionalInfo: { contentType, locale, cTUid },
          },
          concurrencyLimit: this.importConcurrency,
        }).then(() => {
          log(this.importConfig, `Updated entries for content type ${cTUid} in locale ${locale}`, 'success');
        });
      }
    }
  }

  /**
   * @method serializeUpdateEntries
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeUpdateEntries(apiOptions: ApiOptions): ApiOptions {
    let {
      apiData: entry,
      additionalInfo: { cTUid, locale, contentType },
    } = apiOptions;

    const sourceEntryFilePath = entry.sourceEntryFilePath;
    const sourceEntry = ((fsUtil.readFile(sourceEntryFilePath) || {}) as Record<any, any>)[entry.entryOldUid];
    // Removing temp values
    delete entry.sourceEntryFilePath;
    delete entry.entryOldUid;
    if (this.jsonRteCTs.indexOf(cTUid) > -1) {
      // the entries stored in eSuccessFilePath, have the same uids as the entries from source data
      entry = restoreJsonRteEntryRefs(entry, sourceEntry, contentType.schema, {
        mappedAssetUids: this.assetUidMapper,
        mappedAssetUrls: this.assetUrlMapper,
      });
    }

    entry = lookupEntries(
      {
        content_type: contentType,
        entry,
      },
      this.entriesUidMapper,
      path.join(this.entriesMapperPath, cTUid, locale),
    );

    const entryResponse = this.stack.contentType(contentType.uid).entry(this.entriesUidMapper[entry.uid]);
    Object.assign(entryResponse, cloneDeep(entry));
    delete entryResponse.publish_details;
    apiOptions.apiData = entryResponse;
    return apiOptions;
  }

  async enableMandatoryCTReferences(): Promise<void> {
    const onSuccess = ({ response: contentType, apiData: { uid } }: any) => {
      log(this.importConfig, `${uid} content type references updated`, 'success');
    };
    const onReject = ({ error, apiData: { uid } }: any) => {
      log(this.importConfig, formatError(error), 'error');
      throw new Error(`Failed to update references of content type ${uid}`);
    };
    return await this.makeConcurrentCall({
      processName: 'Update content type references',
      apiContent: this.modifiedCTs,
      apiParams: {
        serializeData: this.serializeUpdateCTsWithRef.bind(this),
        reject: onReject.bind(this),
        resolve: onSuccess.bind(this),
        entity: 'update-cts',
        includeParamOnCompletion: true,
      },
      concurrencyLimit: this.importConcurrency,
    });
  }

  /**
   * @method serializeUpdateCTsWithRef
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeUpdateCTsWithRef(apiOptions: ApiOptions): ApiOptions {
    const { apiData: contentType } = apiOptions;
    if (contentType.field_rules) {
      delete contentType.field_rules;
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

  async removeAutoCreatedEntries(): Promise<void> {
    const onSuccess = ({ response, apiData: { entryUid } }: any) => {
      log(this.importConfig, `Auto created entry in master locale removed - entry uid ${entryUid} `, 'success');
    };
    const onReject = ({ error, apiData: { entryUid } }: any) => {
      log(
        this.importConfig,
        `Failed to remove auto created entry in master locale - entry uid ${entryUid} \n ${formatError(error)}`,
        'error',
      );
    };
    return await this.makeConcurrentCall({
      processName: 'Remove auto created entry in master locale',
      apiContent: this.autoCreatedEntries,
      apiParams: {
        reject: onReject.bind(this),
        resolve: onSuccess.bind(this),
        entity: 'delete-entries',
        includeParamOnCompletion: true,
      },
      concurrencyLimit: this.importConcurrency,
    });
  }

  async updateFieldRules(): Promise<void> {
    let cTsWithFieldRules = fsUtil.readFile(path.join(this.cTsPath + '/field_rules_uid.json')) as Record<string, any>[];
    if (!cTsWithFieldRules || cTsWithFieldRules?.length === 0) {
      return;
    }
    for (let cTUid of cTsWithFieldRules) {
      const contentType = find(this.cTs, { uid: cTUid });
      if (contentType.field_rules) {
        let fieldRuleLength = contentType.field_rules.length;
        for (let k = 0; k < fieldRuleLength; k++) {
          let fieldRuleConditionLength = contentType.field_rules[k].conditions.length;
          for (let i = 0; i < fieldRuleConditionLength; i++) {
            if (contentType.field_rules[k].conditions[i].operand_field === 'reference') {
              let fieldRulesValue = contentType.field_rules[k].conditions[i].value;
              let fieldRulesArray = fieldRulesValue.split('.');
              let updatedValue = [];
              for (const element of fieldRulesArray) {
                let splittedFieldRulesValue = element;
                if (this.entriesUidMapper.hasOwnProperty(splittedFieldRulesValue)) {
                  updatedValue.push(this.entriesUidMapper[splittedFieldRulesValue]);
                } else {
                  updatedValue.push(element);
                }
              }
              contentType.field_rules[k].conditions[i].value = updatedValue.join('.');
            }
          }
        }
        const contentTypeResponse: any = await this.stack
          .contentType(contentType.uid)
          .fetch()
          .catch((error) => {
            log(this.importConfig, `failed to update the field rules of ${cTUid} ${formatError(error)}`, 'error');
          });
        if (!contentTypeResponse) {
          continue;
        }
        contentTypeResponse.field_rules = contentType.field_rules;
        await contentTypeResponse.update().catch((error: Error) => {
          log(this.importConfig, `failed to update the field rules of ${cTUid} ${formatError(error)}`, 'error');
        });
        log(this.importConfig, `Updated the field rules of ${cTUid}`, 'info');
      } else {
        log(this.importConfig, `No field rules found in content type ${cTUid} to update`, 'error');
      }
    }
  }

  async publishEntries({ cTUid, locale }: { cTUid: string; locale: string }): Promise<void> {
    const processName = 'Publish Entries';
    const indexFileName = 'index.json';
    const basePath = path.join(this.entriesPath, cTUid, locale);
    const fs = new FsUtility({ basePath, indexFileName });
    const indexer = fs.indexFileContent;
    const indexerCount = values(indexer).length;
    const contentType = find(this.cTs, { uid: cTUid });

    if (indexerCount === 0) {
      return Promise.resolve();
    }
    log(this.importConfig, `Starting publish entries for ${cTUid} in locale ${locale}`, 'info');

    const onSuccess = ({ response, apiData: { environments }, additionalInfo: { entryUid } }: any) => {
      log(
        this.importConfig,
        `Published entry: '${entryUid}' of content type ${cTUid} and locale ${locale} in ${environments?.join(
          ',',
        )} environments`,
        'info',
      );
    };
    const onReject = ({ error, apiData, additionalInfo: { entryUid } }: any) => {
      log(
        this.importConfig,
        `${entryUid} entry of content type ${cTUid} in locale ${locale} failed to publish`,
        'error',
      );
      log(this.importConfig, formatError(error), 'error');
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
            entity: 'publish-entries',
            includeParamOnCompletion: true,
            serializeData: this.serializePublishEntries.bind(this),
            additionalInfo: { contentType, locale, cTUid },
          },
          concurrencyLimit: this.importConcurrency,
        }).then(() => {
          log(this.importConfig, `Published entries for content type ${cTUid} in locale ${locale}`, 'success');
        });
      }
    }
  }

  /**
   * @method serializeEntries
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializePublishEntries(apiOptions: ApiOptions): ApiOptions {
    let { apiData: entry, additionalInfo } = apiOptions;
    additionalInfo.entryUid = this.entriesUidMapper[entry.uid];
    const requestObject: {
      environments: Array<string>;
      locales: Array<string>;
    } = {
      environments: [],
      locales: [],
    };
    if (entry.publish_details && entry.publish_details.length > 0) {
      forEach(entry.publish_details, (pubObject) => {
        if (
          this.envs.hasOwnProperty(pubObject.environment) &&
          indexOf(requestObject.environments, this.envs[pubObject.environment].name) === -1
        ) {
          requestObject.environments.push(this.envs[pubObject.environment].name);
        }
        if (pubObject.locale && indexOf(requestObject.locales, pubObject.locale) === -1) {
          requestObject.locales.push(pubObject.locale);
        }
      });
    } else {
      additionalInfo.skip = true;
    }
    apiOptions.apiData = requestObject;
    return apiOptions;
  }
}
