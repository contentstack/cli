"use strict";

/**
 * Plugin helps to merge the content types from one branch to another
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
  const contentTypeUID = "product_teaser";
  const mergeContentTypes = {
    title: "Merge content types",
    successMessage: "Merged content types successfully",
    failedMessage: "Failed to merge content types.",
    task: async () => {
      // initiating source stack client based on the authentication method provided managementToken/apiKey
      let stackSDKInstanceSource;
      if (managementToken) {
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

      let sourceContentType = await stackSDKInstanceSource
        .contentType(contentTypeUID)
        .fetch();
      const targetContentType = await stackSDKInstance
        .contentType(contentTypeUID)
        .fetch();
      targetContentType.schema = sourceContentType.schema;
      await targetContentType.update();
    },
  };
  migration.addTask(mergeContentTypes);
};
