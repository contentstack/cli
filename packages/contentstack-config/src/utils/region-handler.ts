import { configHandler } from '@contentstack/cli-utilities';
import { getContentstackEndpoint } from '@contentstack/utils';
import { Region } from '../interfaces';
interface RegionsMap {
  [key: string]: Region;
}

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

/**
 * Helper function to get composable studio URL from CMA endpoint
 * Since composableStudio endpoint is not yet in @contentstack/utils, we construct it manually
 * by extracting the region prefix from the CMA URL
 * @param {string} cmaUrl - Content Management API URL (e.g., 'https://eu-api.contentstack.com')
 * @returns {string} Composable Studio URL for the region
 */
function getComposableStudioUrl(cmaUrl: string): string {
  // Extract hostname from URL (e.g., "eu-api.contentstack.com")
  const match = cmaUrl.match(/https?:\/\/([^/]+)/);
  if (!match) {
    return 'https://composable-studio-api.contentstack.com';
  }
  
  const hostname = match[1];
  
  // For default NA region: api.contentstack.io or api.contentstack.com
  if (hostname === 'api.contentstack.io' || hostname === 'api.contentstack.com') {
    return 'https://composable-studio-api.contentstack.com';
  }
  
  // For other regions: {region}-api.contentstack.com
  // Extract the region prefix before "-api"
  const prefixMatch = hostname.match(/^(.+?)-api\.contentstack\.(com|io)$/);
  const regionPrefix = prefixMatch ? prefixMatch[1] : '';
  
  if (!regionPrefix) {
    return 'https://composable-studio-api.contentstack.com';
  }
  
  return `https://${regionPrefix}-composable-studio-api.contentstack.com`;
}

/**
 * Helper function to build region object from @contentstack/utils
 * @param {string} regionKey - Region identifier
 * @returns {object} Region object with all necessary URLs
 */
function getRegionObject(regionKey: string): Region {
  try {
    // getContentstackEndpoint handles all aliases defined in regions.json
    const endpoints = getContentstackEndpoint(regionKey) as any;
    
    if (typeof endpoints === 'string') {
      throw new Error('Invalid endpoint response');
    }

    return {
      name: regionKey,
      cma: endpoints.contentManagement,
      cda: endpoints.contentDelivery,
      uiHost: endpoints.application,
      developerHubUrl: endpoints.developerHub,
      launchHubUrl: endpoints.launch,
      personalizeUrl: endpoints.personalizeManagement,
      composableStudioUrl: getComposableStudioUrl(endpoints.contentManagement),
    };
  } catch (error) {
    return null;
  }
}

/**
 * Get all available regions dynamically
 * This creates a regions object similar to the old hardcoded one but using @contentstack/utils
 */
function getAvailableRegions() {
  const regionKeys = [
    'NA',
    'AWS-NA',
    'EU',
    'AWS-EU',
    'AU',
    'AWS-AU',
    'AZURE-NA',
    'AZURE-EU',
    'GCP-NA',
    'GCP-EU',
  ];

  const regions: RegionsMap = {};
  
  for (const key of regionKeys) {
    const regionObj = getRegionObject(key);
    if (regionObj) {
      regions[key] = regionObj;
    }
  }

  return regions;
}

// Available region list - now dynamically generated
const regions = getAvailableRegions();

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
