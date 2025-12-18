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
  log.debug('Starting environment validation.', { module: 'tokens-validation', apiKeyStatus: apiKey ? 'provided' : 'not-provided', environment });
  
  let result: { valid: boolean; message: string };
  try {
    log.debug('Making environment validation API call.', { module: 'tokens-validation', environment });
    const validationResult = await contentStackClient.Stack({ api_key: apiKey }).environment(environment).fetch();
    log.debug('Environment validation API response received.', { module: 'tokens-validation', validationResult });
    
    if (validationResult.name === environment) {
      log.debug('Environment validation successful.', { module: 'tokens-validation', environment, validationResult });
      result = { valid: true, message: validationResult };
    } else {
      log.debug('Environment validation failed: name mismatch.', { module: 'tokens-validation', expected: environment, actual: validationResult.name });
      result = { valid: false, message: messageHandler.parse('CLI_AUTH_TOKENS_VALIDATION_INVALID_ENVIRONMENT_NAME') };
    }
  } catch (error) {
    log.debug('Environment validation API call failed.', { module: 'tokens-validation', error: error.message, environment });
    handleAndLogError(error, { apiKey, environment }, );
    result = { valid: false, message: 'CLI_AUTH_TOKENS_VALIDATION_INVALID_ENVIRONMENT_NAME' };
  }
  
  log.debug('Environment validation completed.', { module: 'tokens-validation', result });
  return result;
};

/**
 * Validate API key
 * @param contentStackClient
 * @param apiKey
 * @returns
 */
export const validateAPIKey = async (contentStackClient: any, apiKey: string): Promise<any> => {
  log.debug('Starting API key validation.', { module: 'tokens-validation', apiKeyStatus: apiKey ? 'provided' : 'not-provided' });
  
  let result: { valid: boolean; message: string };
  try {
    log.debug('Making API key validation API call.', { module: 'tokens-validation' });
    const validateAPIKeyResult = await contentStackClient.stack({ api_key: apiKey }).fetch();
    log.debug('API key validation API response received.', { module: 'tokens-validation', validateAPIKeyResult });
    
    if (validateAPIKeyResult.api_key === apiKey) {
      log.debug('API key validation successful.', { module: 'tokens-validation', apiKey: validateAPIKeyResult.api_key });
      result = { valid: true, message: validateAPIKeyResult };
    } else {
      log.debug('API key validation failed: key mismatch.', { module: 'tokens-validation', expected: apiKey, actual: validateAPIKeyResult.api_key });
      result = { valid: false, message: messageHandler.parse('CLI_AUTH_TOKENS_VALIDATION_INVALID_API_KEY') };
    }
  } catch (error) {
    log.debug('API key validation API call failed.', { module: 'tokens-validation', error: error.message });
    handleAndLogError(error, { apiKey }, );
    result = { valid: false, message: messageHandler.parse('CLI_AUTH_TOKENS_VALIDATION_INVALID_API_KEY') };
  }

  log.debug('API key validation completed.', { module: 'tokens-validation', result });
  return result;
};
