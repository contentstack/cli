/* eslint-disable no-prototype-builtins */
/*!
 * Contentstack Import
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */

import * as path from 'path';
import { values, isEmpty, filter, pick } from 'lodash';
import { cliux, sanitizePath } from '@contentstack/cli-utilities';
import { fsUtil, log, formatError, fileHelper } from '../../utils';
import { ImportConfig, ModuleClassParams } from '../../types';
import BaseClass from './base-class';

export default class ImportLocales extends BaseClass {
  private langMapperPath: string;
  private langFolderPath: string;
  private langFailsPath: string;
  private langSuccessPath: string;
  private langUidMapperPath: string;
  private languages: Record<string, unknown>[];
  private config: ImportConfig;
  private stackAPIClient: any;
  private failedLocales: Record<string, unknown>[];
  private createdLocales: Record<string, unknown>[];
  private langUidMapper: any;
  private localeConfig: any;
  public client: any;
  private reqConcurrency: number;
  private masterLanguage: {
    code: string;
  };
  private masterLanguageConfig: {
    dirName: string;
    fileName: string;
    requiredKeys: string[];
  };
  private sourceMasterLanguage: Record<string, any>;

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.config = importConfig;
    this.localeConfig = importConfig.modules.locales;
    this.masterLanguage = importConfig.masterLocale;
    this.masterLanguageConfig = importConfig.modules.masterLocale;
    this.stackAPIClient = stackAPIClient;
    this.languages = [];
    this.langUidMapper = {};
    this.createdLocales = [];
    this.failedLocales = [];
    this.reqConcurrency = this.localeConfig.writeConcurrency || this.config.writeConcurrency;
    this.langMapperPath = path.resolve(sanitizePath(this.config.data), 'mapper', 'languages');
    this.langFolderPath = path.resolve(sanitizePath(this.config.data), sanitizePath(this.localeConfig.dirName));
    this.langFailsPath = path.resolve(sanitizePath(this.config.data), 'mapper', 'languages', 'fails.json');
    this.langSuccessPath = path.resolve(sanitizePath(this.config.data), 'mapper', 'languages', 'success.json');
    this.langUidMapperPath = path.resolve(sanitizePath(this.config.data), 'mapper', 'languages', 'uid-mapper.json');
  }

  async start(): Promise<any> {
    this.languages = fsUtil.readFile(path.join(this.langFolderPath, this.localeConfig.fileName)) as Record<
      string,
      unknown
    >[];
    if (!this.languages || isEmpty(this.languages)) {
      log(this.config, 'No languages found to import', 'info');
      return;
    }
    this.sourceMasterLanguage = fsUtil.readFile(
      path.join(this.langFolderPath, this.masterLanguageConfig.fileName),
    ) as Record<string, any>;
    await fileHelper.makeDirectory(this.langMapperPath);
    if (fileHelper.fileExistsSync(this.langUidMapperPath)) {
      this.langUidMapper = fsUtil.readFile(this.langUidMapperPath) || {};
    }
    await this.checkAndUpdateMasterLocale().catch((error) => {
      log(this.config, formatError(error), 'error');
    });
    await this.createLocales().catch((error) => {
      log(this.config, formatError(error), 'error');
      Promise.reject('Failed to import locales');
    });
    fsUtil.writeFile(this.langFailsPath, this.failedLocales);
    await this.updateLocales().catch((error) => {
      log(this.config, formatError(error), 'error');
      Promise.reject('Failed to update locales');
    });

    log(this.config, 'Languages have been imported successfully!', 'success');
  }

  async checkAndUpdateMasterLocale(): Promise<any> {
    let sourceMasterLangDetails = (this.sourceMasterLanguage && Object.values(this.sourceMasterLanguage)) || [];
    if (sourceMasterLangDetails?.[0]?.code === this.masterLanguage?.code) {
      let masterLangDetails = await this.stackAPIClient
        .locale(this.masterLanguage['code'])
        .fetch()
        .catch((error: Error) => {
          log(this.config, formatError(error), 'error');
        });
      if (
        masterLangDetails?.name?.toString().toUpperCase() !==
        sourceMasterLangDetails[0]['name']?.toString().toUpperCase()
      ) {
        cliux.print('WARNING!!! The master language name for the source and destination is different.', {
          color: 'yellow',
        });
        cliux.print(`Old Master language name: ${masterLangDetails['name']}`, { color: 'red' });
        cliux.print(`New Master language name: ${sourceMasterLangDetails[0]['name']}`, { color: 'green' });
        const langUpdateConfirmation: boolean = await cliux.inquire({
          type: 'confirm',
          message: 'Are you sure you want to update name of master language?',
          name: 'confirmation',
        });

        if (langUpdateConfirmation) {
          let langUid = sourceMasterLangDetails[0] && sourceMasterLangDetails[0]['uid'];
          let sourceMasterLanguage = this.sourceMasterLanguage[langUid];
          if (!sourceMasterLanguage) {
            log(this.config, `Master language details not found with id ${langUid} to update`, 'warn');
          }
          const langUpdateRequest = this.stackAPIClient.locale(sourceMasterLanguage.code);
          langUpdateRequest.name = sourceMasterLanguage.name;
          await langUpdateRequest.update().catch(function (error: Error) {
            log(this.config, formatError(error), 'error');
          });
          log(this.config, 'Master Languages name have been updated successfully!', 'success');
        }
      }
    }
  }

  async createLocales(): Promise<any> {
    const onSuccess = ({ response = {}, apiData: { uid, code } = undefined }: any) => {
      this.langUidMapper[uid] = response.uid;
      this.createdLocales.push(pick(response, [...this.localeConfig.requiredKeys]));
      log(this.importConfig, `Created locale: '${code}'`, 'info');
      fsUtil.writeFile(this.langUidMapperPath, this.langUidMapper);
    };
    const onReject = ({ error, apiData: { uid, code } = undefined }: any) => {
      if (error?.errorCode === 247) {
        log(this.importConfig, formatError(error), 'info');
      } else {
        log(this.importConfig, `Language '${code}' failed to import`, 'error');
        log(this.importConfig, formatError(error), 'error');
      }
      this.failedLocales.push({ uid, code });
    };
    return await this.makeConcurrentCall({
      processName: 'Import locales',
      apiContent: filter(values(this.languages), (lang) => lang.code !== this.masterLanguage.code) as Record<
        string,
        any
      >[],
      apiParams: {
        reject: onReject.bind(this),
        resolve: onSuccess.bind(this),
        entity: 'create-locale',
        includeParamOnCompletion: true,
      },
      concurrencyLimit: this.reqConcurrency,
    });
  }

  async updateLocales(): Promise<unknown> {
    const onSuccess = ({ response = {}, apiData: { uid, code } = undefined }: any) => {
      log(this.importConfig, `Updated locale: '${code}'`, 'info');
      fsUtil.writeFile(this.langSuccessPath, this.createdLocales);
    };
    const onReject = ({ error, apiData: { uid, code } = undefined }: any) => {
      log(this.importConfig, `Language '${code}' failed to update`, 'error');
      log(this.importConfig, formatError(error), 'error');
      fsUtil.writeFile(this.langFailsPath, this.failedLocales);
    };
    return await this.makeConcurrentCall({
      processName: 'Update locales',
      apiContent: values(this.languages),
      apiParams: {
        reject: onReject.bind(this),
        resolve: onSuccess.bind(this),
        entity: 'update-locale',
        includeParamOnCompletion: true,
      },
      concurrencyLimit: this.reqConcurrency,
    });
  }
}
