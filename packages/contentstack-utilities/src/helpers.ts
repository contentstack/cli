import { checkSync } from 'recheck';
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
      return { valid: true };
    } else if (response?.error_code) {
      return { valid: false, message: response.error_message };
    } else {
      throw typeof response === 'string' ? response : '';
    }
  } catch (error) {
    return { valid: 'failedToCheck', message: `Failed to check the validity of the Management token. ${error}` };
  }
};

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
    cliux.print(`\nPlease add a directory path without any of the special characters: (*,&,{,},[,],$,%,<,>,?,!)`, {
      color: 'yellow',
    });
    return false;
  }
  return true;
};

// To escape special characters in a string
export const escapeRegExp = (str: string) => str?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// To remove the relative path
export const sanitizePath = (str: string) => str?.replace(/^(\.\.(\/|\\|$))+/, '');

// To validate the UIDs of assets
export const validateUids = (uid) => /^[a-zA-Z0-9]+$/.test(uid);

// Validate File name
export const validateFileName = (fileName) => /^[a-zA-Z0-9-_\.]+$/.test(fileName);

// Validate Regex for ReDDos
export const validateRegex = (str) => checkSync(str, '');

export const formatError = function (error: any) {
  let parsedError: any;

  // Parse the error
  try {
    if (typeof error === 'string') {
      parsedError = JSON.parse(error);
    } else if (typeof error?.message === 'string') {
      parsedError = JSON.parse(error.message);
    } else {
      parsedError = error;
    }
  } catch (e) {
    parsedError = error;
  }

  // Determine the error message
  let message = parsedError.errorMessage || parsedError.error_message || parsedError.message || parsedError;
  if (typeof message === 'object') {
    message = JSON.stringify(message);
  }

  // If message is in JSON format, parse it to extract the actual message string
  try {
    const parsedMessage = JSON.parse(message);
    if (typeof parsedMessage === 'object') {
      message = parsedMessage?.message || message;
    }
  } catch (e) {
    // message is not in JSON format, no need to parse
  }

  // Append detailed error information if available
  if (parsedError.errors && Object.keys(parsedError.errors).length > 0) {
    const entityNames: { [key: string]: string } = {
      authorization: 'Authentication',
      api_key: 'Stack API key',
      uid: 'Content Type',
      access_token: 'Delivery Token',
    };

    message +=
      ' ' +
      Object.entries(parsedError.errors)
        .map(([key, value]) => `${entityNames[key] || key} ${value}`)
        .join(' ');
  }

  return message;
};
