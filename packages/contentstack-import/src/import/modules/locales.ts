/* eslint-disable no-prototype-builtins */
/*!
 * Contentstack Import
 * Copyright (c) 2026 Contentstack LLC
 * MIT Licensed
 */

import * as path from 'path';
import { values, isEmpty, filter, pick } from 'lodash';
import { cliux, sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';
import { fsUtil, formatError, fileHelper } from '../../utils';
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
    this.config.context.module = 'locales';
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
    log.debug('Loading locales from file...', this.config.context);

    this.languages = fsUtil.readFile(path.join(this.langFolderPath, this.localeConfig.fileName)) as Record<
      string,
      unknown
    >[];
    if (!this.languages || isEmpty(this.languages)) {
      log.info('No languages found to import.', this.config.context);
      return;
    }
    log.debug(`Found ${values(this.languages).length} languages to import`, this.config.context);

    log.debug('Loading source master language configuration...', this.config.context);
    this.sourceMasterLanguage = fsUtil.readFile(
      path.join(this.langFolderPath, this.masterLanguageConfig.fileName),
    ) as Record<string, any>;
    log.debug('Loaded source master language configuration.', this.config.context);

    log.debug('Creating languages mapper directory...', this.config.context);
    await fileHelper.makeDirectory(this.langMapperPath);
    log.debug('Created languages mapper directory.', this.config.context);

    log.debug('Loading existing language UID mappings...', this.config.context);
    if (fileHelper.fileExistsSync(this.langUidMapperPath)) {
      this.langUidMapper = fsUtil.readFile(this.langUidMapperPath) || {};
      const langUidCount = Object.keys(this.langUidMapper || {}).length;
      log.debug(`Loaded existing language UID data: ${langUidCount} items`, this.config.context);
    } else {
      log.debug('No existing language UID mappings found.', this.config.context);
    }

    log.debug('Checking and updating master locale', this.config.context);
    await this.checkAndUpdateMasterLocale().catch((error) => {
      handleAndLogError(error, { ...this.config.context });
    });

    log.debug('Creating locales...', this.config.context);
    await this.createLocales().catch((error) => {
      handleAndLogError(error, { ...this.config.context });
      Promise.reject('Failed to import locales');
    });

    log.debug('Writing failed locales to file...', this.config.context);
    fsUtil.writeFile(this.langFailsPath, this.failedLocales);
    log.debug(`Written ${this.failedLocales.length} failed locales to file`, this.config.context);

    log.debug('Updating locales...', this.config.context);
    await this.updateLocales().catch((error) => {
      handleAndLogError(error, { ...this.config.context });
      Promise.reject('Failed to update locales');
    });

    log.success('Languages have been imported successfully!', this.config.context);
  }

  async checkAndUpdateMasterLocale(): Promise<any> {
    log.debug('Checking and updating master locale', this.config.context);

    let sourceMasterLangDetails = (this.sourceMasterLanguage && Object.values(this.sourceMasterLanguage)) || [];
    log.debug(`Source master language details count: ${sourceMasterLangDetails.length}`, this.config.context);

    if (sourceMasterLangDetails?.[0]?.code === this.masterLanguage?.code) {
      log.debug(`Master locale code matches: ${this.masterLanguage?.code}`, this.config.context);

      log.debug('Fetching current master language details from stack...', this.config.context);
      let masterLangDetails = await this.stackAPIClient
        .locale(this.masterLanguage['code'])
        .fetch()
        .catch((error: Error) => {
          log.debug('Error fetching master language details!', this.config.context);
          handleAndLogError(error, { ...this.config.context });
        });

      if (
        masterLangDetails?.name?.toString().toUpperCase() !==
        sourceMasterLangDetails[0]['name']?.toString().toUpperCase()
      ) {
        log.debug('Master language name differs between source and destination.', this.config.context);
        log.debug(`Current master language name: ${masterLangDetails['name']}`, this.config.context);
        log.debug(`Source master language name: ${sourceMasterLangDetails[0]['name']}`, this.config.context);

        cliux.print('WARNING!!! The master language name for the source and destination is different.', {
          color: 'yellow',
        });
        cliux.print(`Old master language name: ${masterLangDetails['name']}`, { color: 'red' });
        cliux.print(`New master language name: ${sourceMasterLangDetails[0]['name']}`, { color: 'green' });

        const langUpdateConfirmation: boolean = await cliux.inquire({
          type: 'confirm',
          message: 'Are you sure you want to update name of master language?',
          name: 'confirmation',
        });

        if (langUpdateConfirmation) {
          log.debug('User confirmed master language name update.', this.config.context);
          let langUid = sourceMasterLangDetails[0] && sourceMasterLangDetails[0]['uid'];
          let sourceMasterLanguage = this.sourceMasterLanguage[langUid];
          if (!sourceMasterLanguage) {
            log.info(`Master language details not found with id ${langUid} to update`, this.config.context);
          }

          log.debug(`Updating master language name: ${sourceMasterLanguage.name}`, this.config.context);

          const langUpdateRequest = this.stackAPIClient.locale(sourceMasterLanguage.code);
          langUpdateRequest.name = sourceMasterLanguage.name;
          await langUpdateRequest.update().catch((error: Error) => {
            log.debug('Error updating master language name!', this.config.context);
            handleAndLogError(error, { ...this.config.context });
          });
          log.success('Master Languages name have been updated successfully!', this.config.context);
        } else {
          log.debug('User declined master language name update.', this.config.context);
        }
      } else {
        log.debug('Master language names match, no update needed', this.config.context);
      }
    } else {
      log.debug('Master language codes do not match.', this.config.context);
    }
  }

  async createLocales(): Promise<any> {
    const languagesToCreate = filter(
      values(this.languages),
      (lang) => lang.code !== this.masterLanguage.code,
    ) as Record<string, any>[];

    log.debug(`Creating ${languagesToCreate.length} locales (excluding master locale)`, this.config.context);

    const onSuccess = ({ response = {}, apiData: { uid, code } = undefined }: any) => {
      this.langUidMapper[uid] = response.uid;
      this.createdLocales.push(pick(response, [...this.localeConfig.requiredKeys]));
      log.info(`Created locale: '${code}'`, this.config.context);
      log.debug(`Locale UID mapping: ${uid} → ${response.uid}`, this.config.context);
      fsUtil.writeFile(this.langUidMapperPath, this.langUidMapper);
    };

    const onReject = ({ error, apiData: { uid, code } = undefined }: any) => {
      if (error?.errorCode === 247) {
        log.info(formatError(error), this.config.context);
      } else {
        log.error(`Language '${code}' failed to import`, this.config.context);
        handleAndLogError(error, { ...this.config.context, code });
      }
      this.failedLocales.push({ uid, code });
    };

    return await this.makeConcurrentCall({
      processName: 'Import locales',
      apiContent: languagesToCreate,
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
    log.debug(`Updating ${Object.values(this.languages).length} locales`, this.config.context);

    const onSuccess = ({ response = {}, apiData: { uid, code } = undefined }: any) => {
      log.info(`Updated locale: '${code}'`, this.config.context);
      log.debug(`Locale update completed for: ${code}`, this.config.context);
      fsUtil.writeFile(this.langSuccessPath, this.createdLocales);
    };

    const onReject = ({ error, apiData: { uid, code } = undefined }: any) => {
      log.error(`Language '${code}' failed to update`, this.config.context);
      handleAndLogError(error, { ...this.config.context, code });
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
