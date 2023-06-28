import { cliux, configHandler, HttpClient } from '@contentstack/cli-utilities';
import { ImportConfig } from '../types';
import { log } from './logger';
const { formatError } = require('.');

export const getAllStackSpecificApps = (developerHubBaseUrl: string, httpClient: HttpClient, config: ImportConfig) => {
  return httpClient
    .get(`${developerHubBaseUrl}/installations?target_uids=${config.target_stack}`)
    .then(({ data }) => data.data)
    .catch((error) => log(config, `Failed to export marketplace-apps ${formatError(error)}`, 'error'));
};

export const getDeveloperHubUrl = async (config: ImportConfig) => {
  const { cma, name } = configHandler.get('region') || {};
  let developerHubBaseUrl = config.developerHubUrls[cma];

  if (!developerHubBaseUrl) {
    developerHubBaseUrl = await cliux.inquire({
      type: 'input',
      name: 'name',
      validate: (url) => {
        if (!url) return "Developer-hub URL can't be empty.";
        return true;
      },
      message: `Enter the developer-hub base URL for the ${name} region -`,
    });
  }

  return developerHubBaseUrl.startsWith('http') ? developerHubBaseUrl : `https://${developerHubBaseUrl}`;
};
