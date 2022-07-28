"use strict";

/**
 * Plugin helps to merge the entries from one branch to another, creates newly created entries to the target
 *
 * @param {Object} migration helps to add the tasks to migration
 * @param {Object} stackSDKInstance Target stack sdk
 * @param {Object} managementAPIClient
 * @param {Object} managementToken
 * @param {Object} apiKey
 * @param {Object} config  external config provided by the user for the plugin
 */
module.exports = async ({
  migration,
  stackSDKInstance,
  managementAPIClient,
  managementToken,
  apiKey,
  config,
}) => {
  const { contentTypeUID } = config;
  const mergeNewEntries = {
    title: "Merge new entries",
    successMessage: "Merged new entries successfully",
    failedMessage: "Failed to merge new entries.",
    task: async () => {
      // initiating source stack client based on the authentication method provided managementToken/apiKey
      let stackSDKInstanceSource;
      if (typeof managementToken === "object") {
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
      /**
       * step 1 Get all the entries from source and target branch
       * step 2 filter out the newly created entries from the source
       * step 3 create the entries
       */
      const { items: entriesSource = [] } = await stackSDKInstanceSource
        .contentType(contentTypeUID)
        .entry()
        .query()
        .find();
      const { items: entriesTarget = [] } = await stackSDKInstance
        .contentType(contentTypeUID)
        .entry()
        .query()
        .find();
      const newEntries = entriesSource.filter(
        ({ title }) => !entriesTarget.some((x) => x.title == title)
      );
      if (Array.isArray(newEntries) && newEntries.length > 0) {
        for (const entry of newEntries) {
          const entryObj = await stackSDKInstance
            .contentType(contentTypeUID)
            .entry()
            .create({ entry });
        }
      } else {
        throw new Error("No new entries found to merge");
      }
    },
  };
  migration.addTask(mergeNewEntries);
};
