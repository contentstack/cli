import { messageHandler, logger } from '@contentstack/cli-utilities';

/**
 * Validate delivery token
 * @param contentStackClient
 * @param apiKey
 * @param deliveryToken
 * @param environment
 * @param region
 * @returns
 */
export const validateDeliveryToken = async (
  contentStackClient: any,
  apiKey: string,
  deliveryToken: string,
  environment: string,
  region: string,
  host: string,
): Promise<any> => {
  let result: { valid: boolean; message: string };
  try {
    const regionMap = {
      EU: 'eu',
      NA: 'us',
      AZURE_NA: 'azure-na',
    };
    
    const stack = contentStackClient
      .Stack({
        api_key: apiKey,
        delivery_token: deliveryToken,
        environment,
        region: regionMap[region],
        host,
       });
    const parsedHost = host.replace(/^https?:\/\//, '');
    stack.setHost(parsedHost);
    const deliveryTokenResult = await stack.getContentTypes({ limit: 1 });

    logger.debug('delivery token validation result', deliveryTokenResult);
    if (deliveryTokenResult?.content_types) {
      result = { valid: true, message: deliveryTokenResult };
    } else {
      result = { valid: false, message: messageHandler.parse('CLI_AUTH_TOKENS_VALIDATION_INVALID_DELIVERY_TOKEN') };
    }
  } catch (error) {
    logger.debug('validate delivery token error', error);
    if (error.error_code === 109) {
      result = { valid: false, message: messageHandler.parse('CLI_AUTH_TOKENS_VALIDATION_INVALID_API_KEY') };
    } else if (error.error_code === 141) {
      result = { valid: false, message: messageHandler.parse('CLI_AUTH_TOKENS_VALIDATION_INVALID_ENVIRONMENT_NAME') };
    } else {
      result = { valid: false, message: messageHandler.parse('CLI_AUTH_TOKENS_VALIDATION_INVALID_DELIVERY_TOKEN') };
    }
  }
  return result;
};

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
    const validationResult = await contentStackClient.stack({ api_key: apiKey }).environment(environment).fetch();
    logger.debug('environment validation result', validationResult);
    if (validationResult.name === environment) {
      result = { valid: true, message: validationResult };
    } else {
      result = { valid: false, message: messageHandler.parse('CLI_AUTH_TOKENS_VALIDATION_INVALID_ENVIRONMENT_NAME') };
    }
  } catch (error) {
    logger.error('validate environment error', error);
    result = { valid: false, message: 'CLI_AUTH_TOKENS_VALIDATION_INVALID_ENVIRONMENT_NAME' };
  }
  return result;
};

/**
 * Validate management token
 * @param contentStackClient
 * @param apiKey
 * @param managementToken
 * @returns { valid: boolean; message: any }
 * Note: Fetching one content type using the management token to check whether it is valid or not
 */
export const validateManagementToken = async (
  contentStackClient: any,
  apiKey: string,
  managementToken: string,
): Promise<any> => {
  let result: { valid: boolean; message: string };
  try {
    const validationResuslt = await contentStackClient.axiosInstance.get('/content_types?limit=1', {
      headers: { api_key: apiKey, authorization: managementToken },
    });

    logger.debug('Management validation result', validationResuslt);
    if (validationResuslt.status === 200) {
      result = { valid: true, message: validationResuslt };
    } else {
      result = { valid: false, message: messageHandler.parse('CLI_AUTH_TOKENS_VALIDATION_INVALID_MANAGEMENT_TOKEN') };
    }
  } catch (error) {
    logger.error('Failed to validate management token', error);
    if (error.response && error.response.status === 401) {
      result = { valid: false, message: messageHandler.parse('CLI_AUTH_TOKENS_VALIDATION_INVALID_MANAGEMENT_TOKEN') };
    } else {
      result = { valid: false, message: messageHandler.parse('CLI_AUTH_TOKENS_VALIDATION_INVALID_API_KEY') };
    }
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
    logger.debug('api key validation result', validateAPIKeyResult);
    if (validateAPIKeyResult.api_key === apiKey) {
      result = { valid: true, message: validateAPIKeyResult };
    } else {
      result = { valid: false, message: messageHandler.parse('CLI_AUTH_TOKENS_VALIDATION_INVALID_API_KEY') };
    }
  } catch (error) {
    logger.error('validate api key error', error);
    result = { valid: false, message: messageHandler.parse('CLI_AUTH_TOKENS_VALIDATION_INVALID_API_KEY') };
  }

  return result;
};

