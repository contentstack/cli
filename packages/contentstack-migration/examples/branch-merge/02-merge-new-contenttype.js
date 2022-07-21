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
 * Note: This could be splitted into multiple tasks as well one for create and one for update
 */
module.exports = async ({
  migration,
  stackSDKInstance,
  managementAPIClient,
  managementToken,
  apiKey,
  config,
}) => {
  const mergeContentTypes = {
    title: "Merge content types",
    successMessage: "Merged content types successfully",
    failedMessage: "Failed to merge content types.",
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

      const targetContentType =
        (await stackSDKInstance.contentType().query().find()).items || [];
      let sourceContentType =
        (await stackSDKInstanceSource.contentType().query().find()).items || [];

      // Creating new content types
      const newContentTypes = sourceContentType.filter(
        ({ title }) => !targetContentType.some((x) => x.title == title)
      );
      if (Array.isArray(newContentTypes) && newContentTypes.length > 0) {
        for (const contentType of newContentTypes) {
          const entryObj = await stackSDKInstance
            .contentType()
            .create({ content_type: contentType });
        }
      } else {
        throw new Error("No new content types found to create");
      }
    },
  };
  migration.addTask(mergeContentTypes);
};
