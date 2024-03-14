'use strict';

// Utils
const { safePromise, constants, map: _map } = require('../utils');
const { MANAGEMENT_SDK } = constants;
const { get, getMapInstance } = _map;
const mapInstance = getMapInstance();

class LocaleService {
  constructor() {
    this.stackSDKInstance = get(MANAGEMENT_SDK, mapInstance);
  }

  async getLocale() {
    const [err, result] = await safePromise(this.stackSDKInstance.locale().query().find());
    if (err) throw err;
    let orderedResult = this.getOrderedResult(result);
    return orderedResult;
  }

  getOrderedResult(result) {
    if (result && result.items) {
      const locales = result.items;

      let i = 0;
      let noEventTookPlace = 0; // counter which tracks if the list is sorted by fallback language
      let len = locales.length;

      // Circular loop (Time complexity => Order of n^2, complexity of splice op is ignored)
      do {
        i = (i % len) + 1;
        noEventTookPlace++;

        let correctedI = i - 1;

        let a = locales[correctedI];

        if (a.fallback_locale) {
          let fallbackLangIndex = 0;
          let currentLangIndex = 0;

          for (let x = 0; x < len; x++) {
            if (locales[x].code === a.code) {
              currentLangIndex = x;
            }
            if (locales[x].code === a.fallback_locale) {
              fallbackLangIndex = x;
            }
          }

          // if index of fallback langauge is smaller no operation is required, it might be sorted
          if (currentLangIndex > fallbackLangIndex) {
            continue;
          }
          let temp = a;
          // remove the object
          locales.splice(correctedI, 1);
          // add the object at fallbackLangIndex cus size of locales is decremented
          locales.splice(fallbackLangIndex, 0, temp);
          i--;
          noEventTookPlace--;
        }
      } while (noEventTookPlace < len);

      return locales;
    }
    throw { message: 'Something went wrong.' };
  }
}

module.exports = LocaleService;
