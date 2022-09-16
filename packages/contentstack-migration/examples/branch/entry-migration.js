'use strict';

/**
 * Plugin helps to merge the content types from one branch to another
 *
 * @param {Object} migration helps to add the tasks to migration
 * @param {Object} stackSDKInstance Target stack sdk
 * @param {Object} managementAPIClient
 * @param {Object} managementToken
 * @param {Object} apiKey
 * @param {Object} config  external config provided by the user for the plugin
 * Note: This could be splitted into multiple tasks as well one for create and one for update
 */
module.exports = async ({ migration, stackSDKInstance, managementAPIClient, managementToken, apiKey, config }) => {
  // initiating source stack client based on the authentication method provided managementToken/apiKey
  let stackSDKInstanceSource;
  if (typeof managementToken === 'object') {
    stackSDKInstanceSource = managementAPIClient.stack({
      management_token: managementToken.token,
      api_key: managementToken.apiKey,
      branch_uid: config.sourceBranch,
    });
  } else {
    stackSDKInstanceSource = managementAPIClient.stack({
      api_key: apiKey,
      branch_uid: config.sourceBranch,
    });
  }

  // fetch source branch info
  let sourceBranchInfo;
  const fetchSourceBranchInfo = {
    title: 'Fetching source branch info',
    failedMessage: 'Failed to fetch Fetching source branch info',
    task: async () => {
      sourceBranchInfo = await stackSDKInstanceSource.branch(config.sourceBranch).fetch();
    },
  };
  migration.addTask(fetchSourceBranchInfo);

  // Fetch content types
  let contentTypes;
  const fetchContentTypes = {
    title: 'Fetching content types',
    failedMessage: 'Failed to fetch content types.',
    task: async () => {
      contentTypes = (await stackSDKInstance.contentType().query().find()).items || [];
    },
  };
  migration.addTask(fetchContentTypes);

  // Migrate modified entries
  const migrateModifiedEntries = {
    title: 'Migrating modified entries',
    successMessage: 'Migrated modified entries succefully',
    failedMessage: 'Failed to migrate modified entries',
    task: async () => {
      contentTypes = (await stackSDKInstance.contentType().query().find()).items || [];
    },
  };
  migration.addTask(migrateModifiedEntries);
};

// fetch all the content types if no content type has given
// fetch each and every entry in that conent type using pagination, fetch entry which has created/updated date > branch creation date and mark it new or update
// update the entry based on the marking to the target branch
// create based on the marking to the target branch

// limitations
// all other module changes needs to be made before running this script
// only supports entry migration
// Only additions and updation, no removal of an entry
