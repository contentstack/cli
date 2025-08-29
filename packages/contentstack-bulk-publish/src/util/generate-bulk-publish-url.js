const { regions } = require('@contentstack/cli-config/lib/utils/region-handler');
const { configHandler } = require('@contentstack/cli-utilities');

/**
 * Get the appropriate app URL based on the host
 * Uses the configured region from configHandler to get the uiHost
 * @param {string} host - The host URL
 * @returns {string} The app URL
 */
function getAppUrlFromHost(host) {
  // Get the current region from configHandler
  const currentRegion = configHandler.get('region');
  if (currentRegion && currentRegion.uiHost) {
    return currentRegion.uiHost;
  }
  // Default to NA region if no region is configured
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
  const branch = config?.branch;
  const host = stack?.host || config?.host || 'app.contentstack.com';
  const appUrl = getAppUrlFromHost(host);
  
  // Only include branch parameter if branch is not empty
  const branchParam = branch ? `?branch=${branch}` : '';
  return `${appUrl}/#!/stack/${apiKey}/publish-queue${branchParam}`;
}

module.exports = {
  generateBulkPublishStatusUrl,
};