import { messageHandler, handleAndLogError, log } from '@contentstack/cli-utilities';
/**
 * Validate environment
 * @param contentStackClient
 * @param apiKey
 * @param environment
 * @returns
 */
export const validateEnvironment = async (
  contentStackClient: any,
  apiKey: string,
  environment: string,
): Promise<any> => {
  let result: { valid: boolean; message: string };
  try {
    const validationResult = await contentStackClient.Stack({ api_key: apiKey }).environment(environment).fetch();
    log.debug('environment validation result', validationResult);
    if (validationResult.name === environment) {
      result = { valid: true, message: validationResult };
    } else {
      result = { valid: false, message: messageHandler.parse('CLI_AUTH_TOKENS_VALIDATION_INVALID_ENVIRONMENT_NAME') };
    }
  } catch (error) {
    handleAndLogError(error, { apiKey, environment }, );
    result = { valid: false, message: 'CLI_AUTH_TOKENS_VALIDATION_INVALID_ENVIRONMENT_NAME' };
  }
  return result;
};

/**
 * Validate API key
 * @param contentStackClient
 * @param apiKey
 * @returns
 */
export const validateAPIKey = async (contentStackClient: any, apiKey: string): Promise<any> => {
  let result: { valid: boolean; message: string };
  try {
    const validateAPIKeyResult = await contentStackClient.stack({ api_key: apiKey }).fetch();
    log.debug('validate api key result', validateAPIKeyResult);
    if (validateAPIKeyResult.api_key === apiKey) {
      result = { valid: true, message: validateAPIKeyResult };
    } else {
      result = { valid: false, message: messageHandler.parse('CLI_AUTH_TOKENS_VALIDATION_INVALID_API_KEY') };
    }
  } catch (error) {
    handleAndLogError(error, { apiKey }, );
    result = { valid: false, message: messageHandler.parse('CLI_AUTH_TOKENS_VALIDATION_INVALID_API_KEY') };
  }

  return result;
};
