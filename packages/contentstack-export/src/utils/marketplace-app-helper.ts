let { default: config } = require('../config');
const { cliux, configHandler } = require('@contentstack/cli-utilities');

export const getDeveloperHubUrl = async () => {
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
      message: `Enter the developer-hub base URL for the ${name} region - `,
    });
  }

  return developerHubBaseUrl.startsWith('http') ? developerHubBaseUrl : `https://${developerHubBaseUrl}`;
};
