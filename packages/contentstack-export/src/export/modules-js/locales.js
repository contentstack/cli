const path = require('path');
const chalk = require('chalk');
const { formatError, log, fileHelper } = require('../../utils');
class LocaleExport {
  constructor(exportConfig, stackAPIClient) {
    this.stackAPIClient = stackAPIClient;
    this.exportConfig = exportConfig;
    this.localeConfig = exportConfig.modules.locales;
    this.qs = {
      include_count: true,
      asc: 'updated_at',
      query: {
        code: {
          $nin: [exportConfig.master_locale.code],
        },
      },
      only: {
        BASE: this.localeConfig.requiredKeys,
      },
    };

    this.localesPath = path.resolve(exportConfig.data, exportConfig.branchName || '', this.localeConfig.dirName);
    this.locales = {};
    this.fetchConcurrency = this.localeConfig.fetchConcurrency || this.exportConfig.fetchConcurrency;
    this.writeConcurrency = this.localeConfig.writeConcurrency || this.exportConfig.writeConcurrency;
  }

  async start() {
    try {
      log(this.exportConfig, 'Starting locale export', 'success');
      fileHelper.makeDirectory(this.localesPath);
      await this.getLocales();
      await fileHelper.writeFile(path.join(this.localesPath, this.localeConfig.fileName), this.locales);
      log(this.exportConfig, 'Completed locale export', 'success');
    } catch (error) {
      log(this.exportConfig, chalk.red(`Failed to export locales ${formatError(error)}`), 'error');
      throw new Error('Failed to export locales');
    }
  }

  async getLocales(skip = 0) {
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

  sanitizeAttribs(locales) {
    locales.forEach((locale) => {
      for (let key in locale) {
        if (this.localeConfig.requiredKeys.indexOf(key) === -1) {
          delete locale[key];
        }
      }
      this.locales[locale.uid] = locale;
    });
  }
}

module.exports = LocaleExport;
