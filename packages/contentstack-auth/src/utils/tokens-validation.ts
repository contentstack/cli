import logger from './logger';

/**
 * Validate delivery token
 * @param contentStackClient
 * @param apiKey
 * @param deliveryToken
 * @returns
 */
export const validateDeliveryToken = async (
  contentStackClient: any,
  apiKey: string,
  deliveryToken: string,
): Promise<any> => {
  let result: { valid: boolean; message: string };
  try {
    const deliveryTokenResult = await contentStackClient
      .stack({ api_key: apiKey })
      .deliveryToken()
      .query({ query: { token: deliveryToken } })
      .find();
    logger.debug('delivery token validation result', deliveryTokenResult);
    result = { valid: true, message: deliveryTokenResult };
  } catch (error) {
    logger.error(error);
    result = { valid: false, message: error.errorMessage };
  }
  return result;
};

/**
 * Validate management token
 * @param contentStackClient
 * @param apiKey
 * @param managementToken
 * @returns
 * TBD: management client not providing managentToken validation api atm
 */
export const validateManagementToken = async (
  contentStackClient: any,
  apiKey: string,
  managementToken: string,
): Promise<any> => {
  return { valid: true };
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
    result = { valid: true, message: validateAPIKeyResult };
  } catch (error) {
    logger.error(error);
    result = { valid: false, message: error.errorMessage };
  }

  return result;
};
