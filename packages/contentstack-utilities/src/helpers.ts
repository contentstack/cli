import { checkSync } from 'recheck';
import traverse from 'traverse';
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
export const sanitizePath = (str: string) => {
  const decodedStr = decodeURIComponent(str);
  return decodedStr
    ?.replace(/^([\/\\]){2,}/, "./") // Normalize leading slashes/backslashes to ''
    .replace(/[\/\\]+/g, "/") // Replace multiple slashes/backslashes with a single '/'
    .replace(/(\.\.(\/|\\|$))+/g, ""); // Remove directory traversal (../ or ..\)
};
// To validate the UIDs of assets
export const validateUids = (uid) => /^[a-zA-Z0-9]+$/.test(uid);

// Validate File name
export const validateFileName = (fileName) => /^[a-zA-Z0-9-_\.]+$/.test(fileName);

// Validate Regex for ReDDos
export const validateRegex = (str: unknown) => {
  const stringValue = typeof str === 'string' ? str : str.toString();
  return checkSync(stringValue, '');
};

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

  // Check if parsedError is an empty object
  if (parsedError && typeof parsedError === 'object' && Object.keys(parsedError).length === 0) {
    return `An unknown error occurred. ${error}`;
  }

  // Check for specific SSL error
  if (parsedError?.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY') {
    return 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY occurred during SSL certificate verification! Please check your certificate configuration.';
  }

  // Handle self signed certificate error
  if (parsedError?.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
    return 'Self-signed certificate in the certificate chain! Please ensure your certificate configuration is correct and the necessary CA certificates are trusted.';
  }

  // Determine the error message
  let message =
    parsedError.errorMessage || parsedError.error_message || parsedError?.code || parsedError.message || parsedError;
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

/**
 * The function checks if a given key string matches any of the sensitive keys defined in an array.
 * @param {string} keyStr - The parameter `keyStr` is a string that represents a key.
 * @returns a boolean value. It returns true if the keyStr matches any of the regular expressions in
 * the sensitiveKeys array, and false otherwise.
 */
const isSensitiveKey = function (keyStr: string) {
  if (keyStr && typeof keyStr === 'string') {
    return sensitiveKeys.some((regex) => regex.test(keyStr));
  }
};

/**
 * The function redactObject takes an object as input and replaces any sensitive keys with the string
 * '[REDACTED]'.
 * @param {any} obj - The `obj` parameter is an object that you want to redact sensitive information
 * from.
 */
export const redactObject = function (obj: any) {
  traverse(obj).forEach(function redactor() {
    // Check if the current key is sensitive
    if (isSensitiveKey(this.key)) {
      // Update the current value with '[REDACTED]'
      this.update('[REDACTED]');
    }
  });

  return obj;
};

/* The `sensitiveKeys` array is used to store regular expressions that match sensitive keys. These
  keys are used to redact sensitive information from log messages. When logging an object, any keys
  that match the regular expressions in the `sensitiveKeys` array will be replaced with the string
  '[REDACTED]'. This helps to prevent sensitive information from being logged or displayed. */
const sensitiveKeys = [
  /authtoken/i,
  /^email$/,
  /^password$/i,
  /secret/i,
  /token/i,
  /api[-._]?key/i,
  /management[-._]?token/i,
  /delivery[-._]?token/i,
];
