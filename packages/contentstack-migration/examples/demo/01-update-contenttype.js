"use strict";

module.exports = async ({ migration, stackSDKInstance, managementAPIClient, branch, sourceBranch, managementToken, authToken, apiKey }) => {
  const contentTypeUID = "product_teaser";

  // source stack client
  let stackSDKInstanceSource;
  if (managementToken) {
    stackSDKInstanceSource = managementAPIClient.stack({management_token: managementToken.token, api_key: managementToken.apiKey, branch_uid: sourceBranch})
  } else {
    stackSDKInstanceSource = managementAPIClient.stack({api_key: apiKey, branch_uid: sourceBranch})
  }

  try {
    let sourceContentType = await stackSDKInstanceSource.contentType(contentTypeUID).fetch();
    const targetContentType = await stackSDKInstance.contentType(contentTypeUID).fetch();
    targetContentType.schema = sourceContentType.schema;
    await targetContentType.update();
    console.log('updated successfully')
  } catch (error) {
    console.log('Failed to fetch the content type from source', error)
  }
};
