const { regions } = require('@contentstack/cli-config/lib/utils/region-handler');
const { configHandler } = require('@contentstack/cli-utilities');

/**
 * Get the appropriate app URL based on the host
 * @param {string} host - The host URL
 * @returns {string} The app URL
 */
function getAppUrlFromHost(host) {
  // Get the current region from configHandler
  const currentRegion = configHandler.get('region');
  
  // If we have a configured region, use its uiHost
  if (currentRegion && currentRegion.uiHost) {
    return currentRegion.uiHost;
  }
  
  // Handle development and staging environments (fallback for when region is not configured)
  if (host.includes('stag')) {
    return 'https://stag-app.csnonprod.com';
  }
  
  if (host.includes('dev')) {
    const devMatch = host.match(/dev(\d+)/);
    if (devMatch) {
      const devNumber = devMatch[1];
      return `https://dev${devNumber}-app.csnonprod.com`;
    }
    return 'https://dev-app.csnonprod.com';
  }
  
  // Find matching region based on host (fallback)
  for (const regionConfig of Object.values(regions)) {
    if (host.includes(regionConfig.cma.replace('https://', ''))) {
      return regionConfig.uiHost;
    }
  }
  // Default to NA region
  return regions['AWS-NA'].uiHost;
}

/**
 * Generate the bulk publish status URL based on stack configuration
 * @param {Object} stack - Stack object containing api_key and host
 * @param {Object} config - Config object containing stackApiKey, branch, and host
 * @returns {string|null} The status URL or null if apiKey is not available
 */
function generateBulkPublishStatusUrl(stack, config) {
  const apiKey = stack?.api_key || config?.stackApiKey;
  if (!apiKey) {
    return null;
  }
  const branch = config?.branch || 'main';
  const host = stack?.host || config?.host || 'app.contentstack.com';
  const appUrl = getAppUrlFromHost(host);
  return `${appUrl}/#!/stack/${apiKey}/publish-queue?branch=${branch}`;
}

module.exports = {
  generateBulkPublishStatusUrl,
};