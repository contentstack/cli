import * as path from 'path';
import { logger } from '@contentstack/cli-utilities';
import { fileHelper } from '../../utils';
export default class LocaleExport {
  private stackAPIClient: any;
  private exportConfig: any;
  private qs: any;
  private localeConfig: any;
  private localesPath: string;

  constructor({ exportConfig, stackAPIClient }) {
    this.stackAPIClient = stackAPIClient;
    this.exportConfig = exportConfig;
    this.localeConfig = exportConfig.modules.locales;
    this.qs = {
      include_count: true,
      asc: 'updated_at',
      query: {
        code: {
          $nin: [exportConfig.masterLocale],
        },
      },
      only: {
        BASE: this.localeConfig.requiredKeys,
      },
    };
    this.localesPath = path.resolve(exportConfig.branchDir || exportConfig.exportDir, this.localeConfig.dirName);
  }

  async start() {
    try {
      await fileHelper.makeDirectory(this.localesPath);
      const locales = await this.getLocales();
      await fileHelper.writeFile(path.join(this.localesPath, this.localeConfig.fileName), locales);
      console.log('completed locale export');
    } catch (error) {
      logger.error('error in locale export', error);
    }
  }

  async getLocales() {
    let locales = await this.stackAPIClient.locale().query(this.qs).find();
    if (Array.isArray(locales.items) && locales.items.length > 0) {
      let updatedLocales = this.sanitizeAttribs(locales.items);
      return updatedLocales;
    }
    logger.info('No locales found');
  }

  sanitizeAttribs(locales) {
    let updatedLocales = {};
    locales.forEach((locale) => {
      for (let key in locale) {
        if (this.localeConfig.requiredKeys.indexOf(key) === -1) {
          delete locale[key];
        }
      }
      updatedLocales[locale.uid] = locale;
    });
    return updatedLocales;
  }
}
