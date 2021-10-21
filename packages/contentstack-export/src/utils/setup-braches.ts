import { logger } from '@contentstack/cli-utilities';

export default async function setupBranches(context, managementAPIClient, exportConfig): Promise<any> {
  if (typeof exportConfig !== 'object') {
    throw new Error('Invalid config to setup the branch');
  }

  try {
    let branches = [];
    if (typeof exportConfig.branchName === 'string') {
      //check branch exists
      const result = await managementAPIClient.axiosInstance.get({
        url: `${context.region.cma}/${context.version || 'v3'}/stacks/branches/${exportConfig.branchName}`,
        headers: {
          api_key: exportConfig.apiKey,
          authtoken: context.user.authtoken,
        },
      });
      if (result && typeof result.body === 'object' && typeof result.body.branch === 'object') {
        branches.push(result.body.branch);
      }
      return Promise.reject('No branch found with the name ' + exportConfig.branchName);
    } else {
      const result = await managementAPIClient.axiosInstance.get({
        url: `${context.region.cma}/${context.version || 'v3'}/stacks/branches`,
        headers: {
          api_key: exportConfig.apiKey,
          authtoken: context.user.authtoken,
        },
      });
      if (result && result.body && Array.isArray(result.body.branches) && result.body.branches.length > 0) {
        branches = result.body.branches;
      }
    }
    // add branches list in the
    exportConfig.branches = branches;
  } catch (error) {
    logger.error('failed to setup the branch', error && error.body);
  }
}
