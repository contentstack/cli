import authHandler from './auth-handler';
import { HttpClient, cliux, configHandler } from '.';
export const isAuthenticated = () => authHandler.isAuthenticated();
export const doesBranchExist = async (stack, branchName) => {
  return stack
    .branch(branchName)
    .fetch()
    .catch((error) => {
      return error;
    });
};

export const isManagementTokenValid = async (stackAPIKey, managementToken) => {
  const httpClient = new HttpClient({ headers: { api_key: stackAPIKey, authorization: managementToken } });
  try {
    const response = (await httpClient.get(`${configHandler.get('region').cma}/v3/environments?limit=1`))?.data;
    if (response?.environments) {
      return { valid: true }
    } else if(response?.error_code) {
      return { valid: false, message: response.error_message };
    } else {
      throw typeof response === "string"? response : "";
    }
  } catch (error) {
    return { valid: 'failedToCheck',message:`Failed to check the validity of the Management token. ${error}`};
  }
}

export const createDeveloperHubUrl = (developerHubBaseUrl: string): string => {
  developerHubBaseUrl = developerHubBaseUrl?.replace('api', 'developerhub-api');
  developerHubBaseUrl = developerHubBaseUrl.startsWith('dev11')
    ? developerHubBaseUrl.replace('dev11', 'dev')
    : developerHubBaseUrl;
  developerHubBaseUrl = developerHubBaseUrl.endsWith('io')
    ? developerHubBaseUrl.replace('io', 'com')
    : developerHubBaseUrl;
  return developerHubBaseUrl.startsWith('http') ? developerHubBaseUrl : `https://${developerHubBaseUrl}`;
};

export const validatePath = (input: string) => {
  const pattern = /[*$%#<>{}!&?]/g;
  if (pattern.test(input)) {
    cliux.print(
      `\nPlease add a directory path without any of the special characters: (*,&,{,},[,],$,%,<,>,?,!)`,
      {
        color: 'yellow',
      },
    );
    return false;
  }
  return true;
};

// To escape special characters in a string
export const escapeRegExp = (str: string) => str?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
