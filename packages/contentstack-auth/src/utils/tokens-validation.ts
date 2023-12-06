import { messageHandler } from '@contentstack/cli-utilities';
import { LoggerService } from '@contentstack/cli-utilities';
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
  const newLogger = new LoggerService(process.cwd(),'cli-log');
  let result: { valid: boolean; message: string };
  try {
    const validationResult = await contentStackClient.Stack({ api_key: apiKey }).environment(environment).fetch();
    newLogger.debug('environment validation result', validationResult);
    if (validationResult.name === environment) {
      result = { valid: true, message: validationResult };
    } else {
      result = { valid: false, message: messageHandler.parse('CLI_AUTH_TOKENS_VALIDATION_INVALID_ENVIRONMENT_NAME') };
    }
  } catch (error) {
    newLogger.error('validate environment error', error);
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
  const newLogger = new LoggerService(process.cwd(),'cli-log');
  let result: { valid: boolean; message: string };
  try {
    const validateAPIKeyResult = await contentStackClient.stack({ api_key: apiKey }).fetch();
    newLogger.debug('api key validation result', validateAPIKeyResult);
    if (validateAPIKeyResult.api_key === apiKey) {
      result = { valid: true, message: validateAPIKeyResult };
    } else {
      result = { valid: false, message: messageHandler.parse('CLI_AUTH_TOKENS_VALIDATION_INVALID_API_KEY') };
    }
  } catch (error) {
    newLogger.error('validate api key error', error);
    result = { valid: false, message: messageHandler.parse('CLI_AUTH_TOKENS_VALIDATION_INVALID_API_KEY') };
  }

  return result;
};
