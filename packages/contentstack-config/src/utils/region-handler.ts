import { configHandler } from '@contentstack/cli-utilities';

function validURL(str) {
  const pattern = new RegExp(
    '^(https:\\/\\/)?' + // protocol
      '((([a-z0-9A-Z]*)[\\. |-]([a-z0-9A-Z]*))[\\.|-]([a-z0-9]{2,})+(\\.[a-z]{2,}\\.([a-z]{2,})|\\.([a-z]{2,}))|' + // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
      '(\\#[-a-z\\d_]*)?$',
    'i',
  );
  return Boolean(pattern.test(str));
}

// Available region list
const regions = {
  NA: {
    cma: 'https://api.contentstack.io',
    cda: 'https://cdn.contentstack.io',
    uiHost: 'https://app.contentstack.com',
    name: 'NA',
  },
  EU: {
    cma: 'https://eu-api.contentstack.com',
    cda: 'https://eu-cdn.contentstack.com',
    uiHost: 'https://eu-app.contentstack.com',
    name: 'EU',
  },
  'AZURE-NA': {
    cma: 'https://azure-na-api.contentstack.com',
    cda: 'https://azure-na-cdn.contentstack.com',
    uiHost: 'https://azure-na-app.contentstack.com',
    name: 'AZURE-NA',
  },
  'AZURE-EU': {
    cma: 'https://azure-eu-api.contentstack.com',
    cda: 'https://azure-eu-cdn.contentstack.com',
    uiHost: 'https://azure-eu-app.contentstack.com',
    name: 'AZURE-EU',
  },
};

class UserConfig {
  /**
   *
   * Set region to config store
   * @param {string} region It Can be NA, EU
   * @returns {object} region object with cma, cda, region property
   */
  setRegion(region) {
    let selectedRegion = regions[region];
    if (selectedRegion) {
      configHandler.set('region', selectedRegion);
      return selectedRegion;
    }
  }

  /**
   *
   * Get current host set for CLI
   * @returns { object } Object contains url for cma and cda, and region to which it is pointing to
   */
  getRegion() {
    const regionDetails = configHandler.get('region');
    if (regionDetails) return regionDetails;

    // returns NA region if not found in config
    return regions.NA;
  }

  /**
   *
   * Set region to config store
   * @param {object} regionObject should contain cma, cda, region property
   * @returns {object} region object with cma, cda, region(name of region) property
   */
  setCustomRegion(regionObject) {
    if (this.validateRegion(regionObject)) {
      regionObject = this.sanitizeRegionObject(regionObject);
      configHandler.set('region', regionObject);
      return regionObject;
    }
    throw new TypeError(
      'Custom region should include valid cma(URL), cda(URL), name(String) (Name for the Region) property.',
    );
  }

  /**
   *
   * Set rateLimit to config store
   * @param {object} rateLimitObject should contain rate limit property
   * @returns {object} ratelimit object with limit property
   */
  // setCustomRateLimit(rateLimitObject) {
  //   if(rateLimitObject !== undefined && isNaN(rateLimitObject)) {
  //     throw new TypeError(rateLimitObject + " is not a number, Please provide number as a rate limit")
  //  } else {
  //   config.set('rate-limit', rateLimitObject)
  //   return rateLimitObject
  //  }
  // }

  /**
   * Validate given region JSON object
   * @param {*} regionObject JSON object needs to be validated
   * @returns {boolean} True if contains cma, cda and region property otherwise false
   */
  validateRegion(regionObject) {
    if (regionObject.cma && regionObject.cda && regionObject.uiHost && regionObject.name) {
      if (validURL(regionObject.cma) && validURL(regionObject.cda)) return true;
    }
    return false;
  }

  /**
   * Sanitize given region JSON object by removing any other properties than cma, cda and region
   * @param { object } regionObject JSON object needs to be sanitized
   * @returns { object } JSON object with only valid keys for region
   */
  sanitizeRegionObject(regionObject) {
    let sanitizedRegion;
    sanitizedRegion = {
      cma: regionObject.cma,
      cda: regionObject.cda,
      uiHost: regionObject.uiHost,
      name: regionObject.name,
    };

    return sanitizedRegion;
  }
}

export default new UserConfig();
