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
      return { valid: true, message: `valid token and stack api key` }
    } else if(response?.error_code) {
      return { valid: false, message: response.error_message };
    } else {
      throw typeof response === "string"? response : "";
    }
  } catch (error) {
    return { valid: false, message: error };
  }
}