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

export const isManagementTokenValid =async (stackAPIKey, managementToken) => {
  const httpClient = new HttpClient({ headers: { api_key: stackAPIKey, authorization: managementToken } });

  const response = (await httpClient.get(`${configHandler.get('region').cma}/v3/environments?limit=1`)).data;
  
  if (response?.error_code === 105 || "error_code" in response) {
    cliux.print(`error: Management Token or Stack API key is Not Valid. ${response.error_message || response.errorMessage}`,{color:"red"});
    return false
  }
  return true
}