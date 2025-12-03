import { configHandler } from '@contentstack/cli-utilities';

function validURL(str) {
  const pattern = new RegExp(
    '^(https?:\\/\\/)?' + // protocol (http or https)
      '([a-zA-Z0-9.-]+|' + // domain name
      '((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))' + // IP address
      '(:\\d+)?' + // port
      '(/[-a-zA-Z0-9_.~+-]*)*' + // path
      '(\\?[;&a-zA-Z0-9_.~+=-]*)?' + // query string
      '(\\#[-a-zA-Z0-9_]*)?$', // fragment
    'i',
  );

  return pattern.test(str);
}

// Available region list
const regions = {
  NA: {
    name: 'NA',
    cma: 'https://api.contentstack.io',
    cda: 'https://cdn.contentstack.io',
    uiHost: 'https://app.contentstack.com',
    developerHubUrl: 'https://developerhub-api.contentstack.com',
    launchHubUrl: 'https://launch-api.contentstack.com',
    personalizeUrl: 'https://personalize-api.contentstack.com',
    composableStudioUrl: 'https://composable-studio-api.contentstack.com/v1',
  },
  'AWS-NA': {
    name: 'AWS-NA',
    cma: 'https://api.contentstack.io',
    cda: 'https://cdn.contentstack.io',
    uiHost: 'https://app.contentstack.com',
    developerHubUrl: 'https://developerhub-api.contentstack.com',
    launchHubUrl: 'https://launch-api.contentstack.com',
    personalizeUrl: 'https://personalize-api.contentstack.com',
    composableStudioUrl: 'https://composable-studio-api.contentstack.com/v1',
  },
  EU: {
    name: 'EU',
    cma: 'https://eu-api.contentstack.com',
    cda: 'https://eu-cdn.contentstack.com',
    uiHost: 'https://eu-app.contentstack.com',
    developerHubUrl: 'https://eu-developerhub-api.contentstack.com',
    launchHubUrl: 'https://eu-launch-api.contentstack.com',
    personalizeUrl: 'https://eu-personalize-api.contentstack.com',
    composableStudioUrl: 'https://eu-composable-studio-api.contentstack.com/v1',
  },
  'AWS-EU': {
    name: 'AWS-EU',
    cma: 'https://eu-api.contentstack.com',
    cda: 'https://eu-cdn.contentstack.com',
    uiHost: 'https://eu-app.contentstack.com',
    developerHubUrl: 'https://eu-developerhub-api.contentstack.com',
    launchHubUrl: 'https://eu-launch-api.contentstack.com',
    personalizeUrl: 'https://eu-personalize-api.contentstack.com',
    composableStudioUrl: 'https://eu-composable-studio-api.contentstack.com/v1',
  },
  AU: {
    name: 'AU',
    cma: 'https://au-api.contentstack.com',
    cda: 'https://au-cdn.contentstack.com',
    uiHost: 'https://au-app.contentstack.com',
    developerHubUrl: 'https://au-developerhub-api.contentstack.com',
    launchHubUrl: 'https://au-launch-api.contentstack.com',
    personalizeUrl: 'https://au-personalize-api.contentstack.com',
    composableStudioUrl: 'https://au-composable-studio-api.contentstack.com/v1',
  },
  'AWS-AU': {
    name: 'AWS-AU',
    cma: 'https://au-api.contentstack.com',
    cda: 'https://au-cdn.contentstack.com',
    uiHost: 'https://au-app.contentstack.com',
    developerHubUrl: 'https://au-developerhub-api.contentstack.com',
    launchHubUrl: 'https://au-launch-api.contentstack.com',
    personalizeUrl: 'https://au-personalize-api.contentstack.com',
    composableStudioUrl: 'https://au-composable-studio-api.contentstack.com/v1',
  },
  'AZURE-NA': {
    name: 'AZURE-NA',
    cma: 'https://azure-na-api.contentstack.com',
    cda: 'https://azure-na-cdn.contentstack.com',
    uiHost: 'https://azure-na-app.contentstack.com',
    developerHubUrl: 'https://azure-na-developerhub-api.contentstack.com',
    launchHubUrl: 'https://azure-na-launch-api.contentstack.com',
    personalizeUrl: 'https://azure-na-personalize-api.contentstack.com',
    composableStudioUrl: 'https://azure-na-composable-studio-api.contentstack.com/v1',
  },
  'AZURE-EU': {
    name: 'AZURE-EU',
    cma: 'https://azure-eu-api.contentstack.com',
    cda: 'https://azure-eu-cdn.contentstack.com',
    uiHost: 'https://azure-eu-app.contentstack.com',
    developerHubUrl: 'https://azure-eu-developerhub-api.contentstack.com',
    launchHubUrl: 'https://azure-eu-launch-api.contentstack.com',
    personalizeUrl: 'https://azure-eu-personalize-api.contentstack.com',
    composableStudioUrl: 'https://azure-eu-composable-studio-api.contentstack.com/v1',
  },
  'GCP-NA': {
    name: 'GCP-NA',
    cma: 'https://gcp-na-api.contentstack.com',
    cda: 'https://gcp-na-cdn.contentstack.com',
    uiHost: 'https://gcp-na-app.contentstack.com',
    developerHubUrl: 'https://gcp-na-developerhub-api.contentstack.com',
    launchHubUrl: 'https://gcp-na-launch-api.contentstack.com',
    personalizeUrl: 'https://gcp-na-personalize-api.contentstack.com',
    composableStudioUrl: 'https://gcp-na-composable-studio-api.contentstack.com/v1',
  },
  'GCP-EU': {
    name: 'GCP-EU',
    cma: 'https://gcp-eu-api.contentstack.com',
    cda: 'https://gcp-eu-cdn.contentstack.com',
    uiHost: 'https://gcp-eu-app.contentstack.com',
    developerHubUrl: 'https://gcp-eu-developerhub-api.contentstack.com',
    launchHubUrl: 'https://gcp-eu-launch-api.contentstack.com',
    personalizeUrl: 'https://gcp-eu-personalize-api.contentstack.com',
    composableStudioUrl: 'https://gcp-eu-composable-studio-api.contentstack.com/v1',
  },
};

class UserConfig {
  /**
   *
   * Set region to config store
   * @param {string} region It Can be AWS-NA, AWS-EU, AWS-AU, AZURE-NA, AZURE-EU, GCP-NA, GCP-EU
   * @returns {object} region object with cma, cda, region property
   */
  setRegion(region) {
    const selectedRegion = regions[region];
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

    // returns AWS-NA region if not found in config
    return regions['AWS-NA'];
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
    const sanitizedRegion = {
      cma: regionObject.cma,
      cda: regionObject.cda,
      uiHost: regionObject.uiHost,
      name: regionObject.name,
      developerHubUrl: regionObject['developerHubUrl'],
      personalizeUrl: regionObject['personalizeUrl'],
      launchHubUrl: regionObject['launchHubUrl'],
      composableStudioUrl: regionObject['composableStudioUrl'],
    };

    return sanitizedRegion;
  }
}

// Export the regions object for use in other packages
export { regions };

export default new UserConfig();
