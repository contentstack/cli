const { configHandler, cliux } = require('@contentstack/cli-utilities');

function fetchBulkPublishLimit(orgUid) {
  const plan = configHandler.get('rateLimit');
  let bulkPublishLimit = 1; // Default limit according to the default plan

  if (plan) {
    const orgPlan = plan[orgUid]?.bulkLimit;
    const defaultPlan = plan['default']?.bulkLimit;

    if (orgPlan?.value && orgPlan?.utilize) {
      bulkPublishLimit = Math.ceil((orgPlan.value * orgPlan.utilize) / 100);
    } else if (defaultPlan?.value && defaultPlan?.utilize) {
      bulkPublishLimit = Math.ceil((defaultPlan.value * defaultPlan.utilize) / 100);
    }
  } else {
    cliux.print(
      'Bulk publish limit not found in config. Using default limit. Please set the limit using $csdx config:set:rate-limit',
      { color: 'yellow' },
    );
    // TODO: Update the link once the rate-limit documentation is ready
    cliux.print(
      'Suggestions: To set the rate limit, visit https://www.contentstack.com/docs/developers/cli#get-started-with-contentstack-command-line-interface-cli',
      { color: 'blue' },
    );
  }
  return bulkPublishLimit;
}

/**
 * Handles the rate limit checking and adds delay if necessary.
 * @param {Object} error - The error object containing the response headers.
 * @param {Object} data - The data being processed, including the batch size.
 * @param {Function} delay - The delay function to use for waiting.
 * @param {number} xRateLimitRemaining - The xRateLimitRemaining containing the remaining balance.
 * @returns {boolean} - Returns `true` if delay was applied, `false` otherwise.
 */
async function handleRateLimit(error, data, delay, xRateLimitRemaining) {
  // Check if rate limit is exhausted or batch size exceeds remaining limit
  if (xRateLimitRemaining === 0 || data.length > xRateLimitRemaining) {
    cliux.print(
      'Bulk rate limit reached or batch size exceeds remaining limit. Retrying in 1 second...',
      { color: 'yellow' },
    );
    await delay(1000); // Wait for 1 second before retrying
    return true; 
  } else {
    return false;
  }
}


module.exports = { fetchBulkPublishLimit, handleRateLimit };
