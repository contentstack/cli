/* eslint-disable no-prototype-builtins */
/*!
 * Contentstack Import
 * Copyright (c) 2026 Contentstack LLC
 * MIT Licensed
 */

import * as path from 'path';
import { values, isEmpty, filter, pick, keys } from 'lodash';
import { cliux, sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';

import BaseClass from './base-class';
import {
  fsUtil,
  formatError,
  fileHelper,
  PROCESS_NAMES,
  MODULE_CONTEXTS,
  PROCESS_STATUS,
  MODULE_NAMES,
} from '../../utils';
import { ImportConfig, ModuleClassParams } from '../../types';

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
    this.config.context.module = MODULE_CONTEXTS.LOCALES;
    this.currentModuleName = MODULE_NAMES[MODULE_CONTEXTS.LOCALES];
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

  async start(): Promise<void> {
    try {
      log.debug('Starting locales import process...', this.config.context);
      const [localesCount] = await this.analyzeLocales();
      if (localesCount === 0) {
        log.info('No languages found to import', this.config.context);
        return;
      }

      const progress = this.setupLocalesProgress(localesCount);
      this.prepareLocalesMapper();

      await this.processMasterLocale(progress);
      await this.processLocaleCreation(progress);
      await this.processLocaleUpdate(progress);

      log.debug('Writing failed locales to file', this.config.context);
      fsUtil.writeFile(this.langFailsPath, this.failedLocales);
      log.debug(`Written ${this.failedLocales.length} failed locales to file`, this.config.context);

      this.completeProgress(true);
      log.success('Languages have been imported successfully!', this.config.context);
    } catch (error) {
      this.completeProgress(false, error?.message || 'Locales import failed');
      handleAndLogError(error, { ...this.config.context });
    }
  }

  async checkAndUpdateMasterLocale(): Promise<void> {
    log.debug('Checking and updating master locale', this.config.context);

    const sourceMasterLangDetails = this.getSourceMasterLangDetails();
    if (!sourceMasterLangDetails) return;

    if (this.masterLanguage?.code !== sourceMasterLangDetails?.code) {
      this.logCodeMismatch(sourceMasterLangDetails.code);
      return;
    }

    log.debug(`Master locale code matches: ${this.masterLanguage.code}`, this.config.context);
    const masterLangDetails = await this.fetchTargetMasterLocale();
    if (!masterLangDetails) return;

    if (
      masterLangDetails?.name?.toString().toUpperCase() === sourceMasterLangDetails['name']?.toString().toUpperCase()
    ) {
      this.tickProgress(true, `${masterLangDetails.name} (no update needed)`);
      log.debug('Master language names match, no update required', this.config.context);
      return;
    }

    await this.handleNameMismatch(sourceMasterLangDetails, masterLangDetails);
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
      this.progressManager?.tick(true, `locale: ${code}`, null, PROCESS_NAMES.LOCALES_CREATE);
      log.info(`Created locale: '${code}'`, this.config.context);
      log.debug(`Locale UID mapping: ${uid} → ${response.uid}`, this.config.context);
      fsUtil.writeFile(this.langUidMapperPath, this.langUidMapper);
    };

    const onReject = ({ error, apiData: { uid, code } = undefined }: any) => {
      this.progressManager?.tick(
        false,
        `locale: ${code}`,
        error?.message || `Language '${code}' failed to import`,
        PROCESS_NAMES.LOCALES_CREATE,
      );
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

  async updateLocales(): Promise<any> {
    log.debug(`Updating ${values(this.languages).length} locales`, this.config.context);

    const onSuccess = ({ response = {}, apiData: { uid, code } = undefined }: any) => {
      log.info(`Updated locale: '${code}'`, this.config.context);
      log.debug(`Locale update completed for: ${code}`, this.config.context);
      this.progressManager?.tick(true, `locale: ${code}`, null, PROCESS_NAMES.LOCALES_UPDATE);
      fsUtil.writeFile(this.langSuccessPath, this.createdLocales);
    };

    const onReject = ({ error, apiData: { uid, code } = undefined }: any) => {
      this.progressManager?.tick(
        false,
        `locale: ${code}`,
        `Failed to update locale ${code}`,
        PROCESS_NAMES.LOCALES_UPDATE,
      );
      log.error(`Language '${code}' failed to update`, this.config.context);
      handleAndLogError(error, { ...this.config.context, code });
      fsUtil.writeFile(this.langFailsPath, this.failedLocales);
    };

    return await this.makeConcurrentCall({
      processName: 'Locale Update locales',
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

  private async analyzeLocales(): Promise<[number]> {
    return this.withLoadingSpinner('LOCALES: Analyzing import data...', async () => {
      log.debug('Loading locales from file', this.config.context);

      this.languages = fsUtil.readFile(path.join(this.langFolderPath, this.localeConfig.fileName)) as Record<
        string,
        unknown
      >[];

      if (!this.languages || isEmpty(this.languages)) {
        log.info('No languages found to import', this.config.context);
        return [0];
      }

      this.sourceMasterLanguage = fsUtil.readFile(
        path.join(this.langFolderPath, this.masterLanguageConfig.fileName),
      ) as Record<string, any>;

      log.debug('Loaded source master language configuration', this.config.context);

      const localesCount = keys(this.languages || {})?.length;
      log.debug(`Found ${localesCount} languages to import`, this.config.context);
      return [localesCount];
    });
  }

  private setupLocalesProgress(localesCount: number) {
    const progress = this.createNestedProgress(this.currentModuleName);
    progress.addProcess(PROCESS_NAMES.MASTER_LOCALE, 1);
    if (localesCount > 0) {
      progress.addProcess(PROCESS_NAMES.LOCALES_CREATE, localesCount);
      progress.addProcess(PROCESS_NAMES.LOCALES_UPDATE, localesCount);
    }
    return progress;
  }

  private async prepareLocalesMapper(): Promise<void> {
    log.debug('Creating languages mapper directory', this.config.context);
    fileHelper.makeDirectory(this.langMapperPath);
    log.debug('Created languages mapper directory', this.config.context);

    if (fileHelper.fileExistsSync(this.langUidMapperPath)) {
      this.langUidMapper = fsUtil.readFile(this.langUidMapperPath) || {};
      const langUidCount = Object.keys(this.langUidMapper || {}).length;
      log.debug(`Loaded existing language UID data: ${langUidCount} items`, this.config.context);
    } else {
      log.debug('No existing language UID mappings found', this.config.context);
    }
  }

  private async processMasterLocale(progress: any): Promise<void> {
    progress
      .startProcess(PROCESS_NAMES.MASTER_LOCALE)
      .updateStatus(PROCESS_STATUS[PROCESS_NAMES.MASTER_LOCALE].PROCESSING, PROCESS_NAMES.MASTER_LOCALE);
    log.debug('Checking and updating master locale', this.config.context);

    try {
      await this.checkAndUpdateMasterLocale();
      progress.completeProcess(PROCESS_NAMES.MASTER_LOCALE, true);
    } catch (error) {
      progress.completeProcess(PROCESS_NAMES.MASTER_LOCALE, false);
      handleAndLogError(error, { ...this.config.context });
    }
  }

  private async processLocaleCreation(progress: any): Promise<void> {
    progress
      .startProcess(PROCESS_NAMES.LOCALES_CREATE)
      .updateStatus(PROCESS_STATUS[PROCESS_NAMES.LOCALES_CREATE].CREATING, PROCESS_NAMES.LOCALES_CREATE);
    log.debug('Creating locales', this.config.context);

    try {
      await this.createLocales();
      progress.completeProcess(PROCESS_NAMES.LOCALES_CREATE, true);
    } catch (error) {
      progress.completeProcess(PROCESS_NAMES.LOCALES_CREATE, false);
      throw error;
    }
  }

  private async processLocaleUpdate(progress: any): Promise<void> {
    progress
      .startProcess(PROCESS_NAMES.LOCALES_UPDATE)
      .updateStatus(PROCESS_STATUS[PROCESS_NAMES.LOCALES_UPDATE].UPDATING, PROCESS_NAMES.LOCALES_UPDATE);
    log.debug('Updating locales', this.config.context);

    try {
      await this.updateLocales();
      progress.completeProcess(PROCESS_NAMES.LOCALES_UPDATE, true);
    } catch (error) {
      progress.completeProcess(PROCESS_NAMES.LOCALES_UPDATE, false);
      throw error;
    }
  }

  private getSourceMasterLangDetails(): Record<string, any> | null {
    const details = this.sourceMasterLanguage && Object.values(this.sourceMasterLanguage);
    const lang = details?.[0];

    if (!lang) {
      log.info('No source master language details found', this.config.context);
      return null;
    }

    return lang as Record<string, any>;
  }

  private async fetchTargetMasterLocale(): Promise<Record<string, any> | null> {
    try {
      log.debug('Fetching current master language details from stack', this.config.context);
      return await this.stackAPIClient.locale(this.masterLanguage.code).fetch();
    } catch (error) {
      log.debug('Error fetching master language details', this.config.context);
      handleAndLogError(error, { ...this.config.context });
      return null;
    }
  }

  private logCodeMismatch(sourceCode: string): void {
    const targetCode = this.masterLanguage?.code;
    const message = `master locale: codes differ (${sourceCode} vs ${targetCode})`;

    this.tickProgress(true, message);
    log.debug(
      `Master Locale language codes do not match. Source: ${sourceCode}, Target: ${targetCode}`,
      this.config.context,
    );
  }

  private async handleNameMismatch(source: Record<string, any>, target: Record<string, any>): Promise<void> {
    log.debug('Master Locale language name differs between source and destination', this.config.context);
    log.debug(`Current: ${target.name}, Source: ${source.name}`, this.config.context);

    cliux.print('WARNING!!! The master language name for the source and destination is different.', {
      color: 'yellow',
    });
    cliux.print('WARNING!!! The master language name for the source and destination is different.', {
      color: 'yellow',
    });
    cliux.print(`Old Master Locale language name: ${target.name}`, { color: 'red' });
    cliux.print(`New Master Locale language name: ${source.name}`, { color: 'green' });

    const langUpdateConfirmation: boolean = await cliux.inquire({
      type: 'confirm',
      message: 'Are you sure you want to update name of master language?',
      name: 'confirmation',
    });

    if (!langUpdateConfirmation) {
      this.tickProgress(true, `${target.name} (skipped update)`);
      log.info('Master Locale language update cancelled by user', this.config.context);
      return;
    }

    log.debug('User confirmed master language update', this.config.context);
    try {
      const updatePayload = { ...source, uid: target.uid };
      const langUpdateRequest = this.stackAPIClient.locale(source.code);
      langUpdateRequest.name = source.name;
      await langUpdateRequest.update(updatePayload);
      this.tickProgress(true, `${source.name} (updated)`);
      log.success(
        `Successfully updated master language name from '${target.name}' to '${source.name}'`,
        this.config.context,
      );
    } catch (error) {
      this.tickProgress(false, source?.name, error?.message || 'Failed to update master locale');
      throw error;
    }
  }

  private tickProgress(success: boolean, message: string, error?: string): void {
    this.progressManager?.tick(success, `master locale: ${message}`, error || null, PROCESS_NAMES.MASTER_LOCALE);
  }
}
