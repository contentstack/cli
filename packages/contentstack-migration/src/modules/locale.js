'use strict';

// Service
const { LocaleService } = require('../services');

// Config
const { masterLocale } = require('../config');

// Utils
const { safePromise } = require('../utils');

class Locale {
  constructor() {
    this.localeService = new LocaleService();
  }

  async fetchLocales(callback) {
    let { master_locale } = masterLocale;

    let { localeService } = this;
    let [err, result] = await safePromise(localeService.getLocale());

    if (err) throw new Error(err);

    // Use default code, if no result is found
    result = result.length ? result : [master_locale];

    if (callback) return callback(null, result);
    return result;
  }
}

module.exports = Locale;
