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

module.exports = { fetchBulkPublishLimit };
