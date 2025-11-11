import { configHandler } from '@contentstack/cli-utilities';
import * as Utils from '@contentstack/utils';

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

class UserConfig {
  /**
   *
   * Set region to config store
   * @param {string} region It Can be AWS-NA, AWS-EU, AWS-AU, AZURE-NA, AZURE-EU, GCP-NA, GCP-EU
   * @returns {object} region object with cma, cda, region property
   */
  setRegion(region) {
    try {
      const endpointsObj = Utils.getContentstackEndpoint(region);
      if (endpointsObj) {
        const regionObj = {
          name: region.toUpperCase(),
          cma: endpointsObj.contentManagement,
          cda: endpointsObj.contentDelivery,
          uiHost: endpointsObj.application,
          developerHubUrl: endpointsObj.developerHub,
          launchHubUrl: endpointsObj.launch,
          personalizeUrl: endpointsObj.personalizeManagement,
        }
        configHandler.set('region', regionObj);
        return regionObj;
      }
    } catch (error) {
      // Return undefined for invalid regions
      return undefined;
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
    const defaultEndpoints = Utils.getContentstackEndpoint('AWS-NA');
    if (defaultEndpoints) {
      return {
        name: 'AWS-NA',
        cma: defaultEndpoints.contentManagement,
        cda: defaultEndpoints.contentDelivery,
        uiHost: defaultEndpoints.application,
        developerHubUrl: defaultEndpoints.developerHub,
        launchHubUrl: defaultEndpoints.launch,
        personalizeUrl: defaultEndpoints.personalizeManagement,
      };
    }
    throw new TypeError('Region is not set yet, Please set the region first');
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
    };

    return sanitizedRegion;
  }
}

export default new UserConfig();
