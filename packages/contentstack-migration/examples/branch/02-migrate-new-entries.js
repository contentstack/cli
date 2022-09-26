'use strict';
const { cliux } = require('@contentstack/cli-utilities');
const { replaceAssetPayloadWithUids, getEntries, getEntriesCount } = require('./utils');

/**
 * Plugin helps to migrate updated entries from source branch to destination
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
  if (typeof managementToken === 'object' && !Array.isArray(managementToken)) {
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
  let sourceBranchInfo = await managementAPIClient.stack({ api_key: apiKey }).branch(config.sourceBranch).fetch();

  // Fetch content types
  let contentTypes = (await stackSDKInstance.contentType().query().find()).items || [];
  // Migrate new entries
  const res = await migrateNewEntries(
    { source: stackSDKInstanceSource, target: stackSDKInstance },
    contentTypes,
    sourceBranchInfo,
  );
  cliux.success('Migrated new entries successfully');
};

function migrateNewEntries(stackClients, contentTypes, branchInfo) {
  return new Promise(async (resolve, reject) => {
    try {
      for (let contentType of contentTypes) {
        let entryCountQuery = {
          include_count: true,
          include_publish_details: true,
          query: {
            created_at: { $gt: branchInfo.created_at },
          },
        };
        const entriesCount = await getEntriesCount(stackClients.source, {
          contentType: contentType.uid,
          query: entryCountQuery,
        });
        // getting entries by pagination
        for (let index = 0; index < entriesCount / 100; index++) {
          const entries = await getEntries(stackClients.source, {
            contentType: contentType.uid,
            query: {
              include_publish_details: true,
              skip: index * 100,
              query: { created_at: { $gt: branchInfo.created_at } },
            },
          });
          console.log(`${entries.length} entries created of type ${contentType.uid}`);
          // migrate entries
          for (let entry of entries) {
            replaceAssetPayloadWithUids(entry);
            const targetEntry = stackClients.target.contentType(contentType.uid).entry();
            await targetEntry.create({ entry });
          }
        }
      }
      resolve('done');
    } catch (error) {
      console.error('error', error);
      reject(error);
    }
  });
}
