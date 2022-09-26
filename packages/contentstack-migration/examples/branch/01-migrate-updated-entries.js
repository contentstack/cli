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
  // Migrate modified entries
  const res = await migrateUpdatedEntries(
    { source: stackSDKInstanceSource, target: stackSDKInstance },
    contentTypes,
    sourceBranchInfo,
  );
  cliux.success('Migrated updated entries successfully');
};

function migrateUpdatedEntries(stackClients, contentTypes, branchInfo) {
  return new Promise(async (resolve, reject) => {
    try {
      for (let contentType of contentTypes) {
        let entryCountQuery = {
          include_count: true,
          include_publish_details: true,
          query: {
            updated_at: { $gt: branchInfo.created_at },
          },
        };
        const entriesCount = await getEntriesCount(stackClients.source, {
          contentType: contentType.uid,
          query: entryCountQuery,
        });
        // getting entries by pagination
        for (let index = 0; index < entriesCount / 100; index++) {
          let entries = await getEntries(stackClients.source, {
            contentType: contentType.uid,
            query: {
              include_publish_details: true,
              skip: index * 100,
              query: { updated_at: { $gt: branchInfo.created_at } },
            },
          });

          // remove new entries
          entries = entries.filter((entry) => entry.updated_at !== entry.created_at);
          if (entries.length < 1) return;
          console.log(`${entries.length} entries modified of type ${contentType.uid}`);
          // migrate entries
          for (let entry of entries) {
            const targetEntry = await stackClients.target.contentType(contentType.uid).entry(entry.uid).fetch();
            if (targetEntry) {
              replaceAssetPayloadWithUids(entry);
              Object.assign(targetEntry, entry);
              await targetEntry.update();
            }
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
