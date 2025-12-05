import * as path from 'path';
import {
  ContentstackClient,
  handleAndLogError,
  messageHandler,
  log,
  sanitizePath,
} from '@contentstack/cli-utilities';

import { fsUtil } from '../../utils';
import BaseClass from './base-class';
import { ExportConfig, ModuleClassParams } from '../../types';

export default class LocaleExport extends BaseClass {
  private stackAPIClient: ReturnType<ContentstackClient['stack']>;
  public exportConfig: ExportConfig;
  private masterLocaleConfig: { dirName: string; fileName: string; requiredKeys: string[] };
  private qs: {
    include_count: boolean;
    asc: string;
    only: {
      BASE: string[];
    };
    skip?: number;
  };
  private localeConfig: {
    dirName?: string;
    fileName?: string;
    requiredKeys?: string[];
    fetchConcurrency?: number;
    writeConcurrency?: number;
    limit?: number;
  };
  private localesPath: string;
  private masterLocale: Record<string, Record<string, string>>;
  private locales: Record<string, Record<string, string>>;

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.stackAPIClient = stackAPIClient;
    this.localeConfig = exportConfig.modules.locales;
    this.masterLocaleConfig = exportConfig.modules.masterLocale;
    this.qs = {
      include_count: true,
      asc: 'updated_at',
      only: {
        BASE: this.localeConfig.requiredKeys,
      },
    };
    this.localesPath = path.resolve(
      sanitizePath(exportConfig.data),
      sanitizePath(exportConfig.branchName || ''),
      sanitizePath(this.localeConfig.dirName),
    );
    this.locales = {};
    this.masterLocale = {};
    this.exportConfig.context.module = 'locales';
  }

  async start() {
    try {
      log.debug('Starting export process for locales...', this.exportConfig.context);
      log.debug(`Locales path: '${this.localesPath}'`, this.exportConfig.context);
      
      await fsUtil.makeDirectory(this.localesPath);
      log.debug('Created locales directory.', this.exportConfig.context);
      
      await this.getLocales();
      log.debug(`Retrieved ${Object.keys(this.locales).length} locales and ${Object.keys(this.masterLocale).length} master locales.`, this.exportConfig.context);
      
      const localesFilePath = path.join(this.localesPath, this.localeConfig.fileName);
      const masterLocaleFilePath = path.join(this.localesPath, this.masterLocaleConfig.fileName);
      
      log.debug(`Writing locales to: '${localesFilePath}'`, this.exportConfig.context);
      fsUtil.writeFile(localesFilePath, this.locales);
      
      log.debug(`Writing master locale to: '${masterLocaleFilePath}'`, this.exportConfig.context);
      fsUtil.writeFile(masterLocaleFilePath, this.masterLocale);
      
      log.success(
        messageHandler.parse(
          'LOCALES_EXPORT_COMPLETE',
          Object.keys(this.locales).length,
          Object.keys(this.masterLocale).length,
        ),
        this.exportConfig.context,
      );
    } catch (error) {
      handleAndLogError(error, { ...this.exportConfig.context });
      throw error;
    }
  }

  async getLocales(skip: number = 0): Promise<any> {
    if (skip) {
      this.qs.skip = skip;
      log.debug(`Fetching locales with skip: ${skip}.`, this.exportConfig.context);
    }
    log.debug(`Query parameters: ${JSON.stringify(this.qs)}.`, this.exportConfig.context);
    
    let localesFetchResponse = await this.stackAPIClient.locale().query(this.qs).find();
    
    log.debug(`Fetched ${localesFetchResponse.items?.length || 0} locales out of ${localesFetchResponse.count}.`, this.exportConfig.context);
    
    if (Array.isArray(localesFetchResponse.items) && localesFetchResponse.items.length > 0) {
      log.debug(`Processing ${localesFetchResponse.items.length} locales...`, this.exportConfig.context);
      this.sanitizeAttribs(localesFetchResponse.items);
      
      skip += this.localeConfig.limit || 100;
      if (skip > localesFetchResponse.count) {
        log.debug('Completed fetching all locales.', this.exportConfig.context);
        return;
      }
      log.debug(`Continuing to fetch locales with skip: ${skip}.`, this.exportConfig.context);
      return await this.getLocales(skip);
    } else {
      log.debug('No locales found to process.', this.exportConfig.context);
    }
  }

  sanitizeAttribs(locales: Record<string, string>[]) {
    log.debug(`Sanitizing ${locales.length} locales...`, this.exportConfig.context);
    
    locales.forEach((locale: Record<string, string>) => {
      for (let key in locale) {
        if (this.localeConfig.requiredKeys.indexOf(key) === -1) {
          delete locale[key];
        }
      }

      if (locale?.code === this.exportConfig?.master_locale?.code) {
        log.debug(`Adding locale UID '${locale.uid}' to master locale.`, this.exportConfig.context);
        this.masterLocale[locale.uid] = locale;
      } else {
        log.debug(`Adding locale UID '${locale.uid}' to regular locales.`, this.exportConfig.context);
        this.locales[locale.uid] = locale;
      }
    });
    
    log.debug(`Sanitization complete. Master locales: ${Object.keys(this.masterLocale).length}, Regular locales: ${Object.keys(this.locales).length}.`, this.exportConfig.context);
  }
}
