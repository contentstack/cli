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
      await fsUtil.makeDirectory(this.localesPath);
      await this.getLocales();
      fsUtil.writeFile(path.join(this.localesPath, this.localeConfig.fileName), this.locales);
      fsUtil.writeFile(path.join(this.localesPath, this.masterLocaleConfig.fileName), this.masterLocale);
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
    }
  }

  async getLocales(skip: number = 0): Promise<any> {
    if (skip) {
      this.qs.skip = skip;
    }
    let localesFetchResponse = await this.stackAPIClient.locale().query(this.qs).find();
    if (Array.isArray(localesFetchResponse.items) && localesFetchResponse.items.length > 0) {
      this.sanitizeAttribs(localesFetchResponse.items);
      skip += this.localeConfig.limit || 100;
      if (skip > localesFetchResponse.count) {
        return;
      }
      return await this.getLocales(skip);
    }
  }

  sanitizeAttribs(locales: Record<string, string>[]) {
    locales.forEach((locale: Record<string, string>) => {
      for (let key in locale) {
        if (this.localeConfig.requiredKeys.indexOf(key) === -1) {
          delete locale[key];
        }
      }

      if (locale?.code === this.exportConfig?.master_locale?.code) {
        this.masterLocale[locale.uid] = locale;
      } else {
        this.locales[locale.uid] = locale;
      }
    });
  }
}
