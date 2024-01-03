import * as fs from 'fs';
import * as path from 'path';
import { cliux } from '@contentstack/cli-utilities';
import { continueBootstrapCommand } from '../bootstrap/interactive';
import { AppConfig } from '../config';
import messageHandler from '../messages';

interface EnviornmentVariables {
  api_key: string;
  deliveryToken: string;
  environment: string;
  livePreviewEnabled?: boolean;
  preview_token: string;
}

/**
 * @description Setup the environment for a given app for each environment
 * Loads the environments for a given stack
 * Create delivery token
 * Create enviroment
 */

export const setupEnvironments = async (
  managementAPIClient: any,
  api_key: string,
  appConfig: AppConfig,
  clonedDirectory: string,
  region: any,
  livePreviewEnabled: boolean,
  managementToken?: string,
) => {
  const environmentResult = await managementAPIClient
    .stack({ api_key, management_token: managementToken })
    .environment()
    .query()
    .find();
  if (Array.isArray(environmentResult.items) && environmentResult.items.length > 0) {
    for (const environment of environmentResult.items) {
      if (environment.name) {
        const body = {
          token: {
            name: `Sample app ${environment.name}`,
            description: 'Sample app',
            scope: [
              {
                module: 'environment',
                environments: [environment.name],
                acl: { read: true },
              },
              {
                module: 'branch',
                acl: { read: true },
                branches: ['main'],
              },
            ],
          },
        };
        try {
          const tokenResult = !managementToken
            ? await managementAPIClient
                .stack({ api_key })
                .deliveryToken()
                .create(body, livePreviewEnabled ? { create_with_preview_token: true } : {})
            : {};
          if (livePreviewEnabled && !tokenResult.preview_token && !managementToken) {
            cliux.print(
              `warning: Live Preview using the Preview token is not available in your plan please contact the admin.`,
              {
                color: 'yellow',
              }
            );
            if ((await continueBootstrapCommand()) === 'no') {
              return;
            }
          }
          if (tokenResult.token) {
            const environmentVariables: EnviornmentVariables = {
              api_key,
              deliveryToken: tokenResult.token ?? '',
              environment: environment.name,
              livePreviewEnabled,
              preview_token: tokenResult.preview_token ?? '',
            };
            await envFileHandler(
              appConfig.appConfigKey || '',
              environmentVariables,
              clonedDirectory,
              region,
              livePreviewEnabled,
            );
          } else {
            cliux.print(messageHandler.parse('CLI_BOOTSTRAP_APP_FAILED_TO_CREATE_TOKEN_FOR_ENV', environment.name));
          }
        } catch (error) {
          console.log('error', error);
          cliux.print(messageHandler.parse('CLI_BOOTSTRAP_APP_FAILED_TO_CREATE_ENV_FILE_FOR_ENV', environment.name));
        }
      } else {
        cliux.print('No environments name found for the environment');
      }
    }
  } else {
    cliux.error(messageHandler.parse('CLI_BOOTSTRAP_APP_ENV_NOT_FOUND_FOR_THE_STACK'));
  }
};

const writeEnvFile = (content: string, fileName: string) => {
  if (!content || !fileName) {
    return;
  }
  return new Promise((resolve, reject) => {
    fs.writeFile(fileName, content, 'utf8', (error) => {
      if (error) {
        reject(error);
      } else {
        resolve('done');
      }
    });
  });
};

/**
 * @description Create environment files for each app
 * TBD: moving the content to config file
 */

const envFileHandler = async (
  appConfigKey: string,
  environmentVariables: EnviornmentVariables,
  clonedDirectory: string,
  region: any,
  livePreviewEnabled: boolean,
) => {
  if (!appConfigKey || !environmentVariables) {
    return;
  }
  let content;
  let result;
  let filePath;
  let fileName;
  let customHost;
  let previewHost: string;
  const regionName = region && region.name && region.name.toLowerCase();
  previewHost = region.cda?.substring('8').replace('cdn', 'rest-preview');
  const isUSRegion = regionName === 'us' || regionName === 'na';
  if (regionName !== 'eu' && !isUSRegion) {
    customHost = region.cda && region.cda.substring('8');
    customHost = customHost.replace('cdn', 'rest-preview');
  }
  const production = environmentVariables.environment === 'production' ? true : false;
  switch (appConfigKey) {
    case 'reactjs':
    case 'reactjs-starter':
      fileName = `.env.${environmentVariables.environment}.local`;
      filePath = path.join(clonedDirectory, fileName);
      content = `REACT_APP_CONTENTSTACK_API_KEY=${
        environmentVariables.api_key
      }\nREACT_APP_CONTENTSTACK_DELIVERY_TOKEN=${environmentVariables.deliveryToken}${
        livePreviewEnabled
          ? `\nREACT_APP_CONTENTSTACK_PREVIEW_TOKEN=${
              environmentVariables.preview_token || `''`
            }\nREACT_APP_CONTENTSTACK_PREVIEW_HOST=${customHost ?? previewHost}\n`
          : '\n'
      }REACT_APP_CONTENTSTACK_APP_HOST=''\nREACT_APP_CONTENTSTACK_ENVIRONMENT=${environmentVariables.environment}${
        !isUSRegion && !customHost ? '\nREACT_APP_CONTENTSTACK_REGION=' + region.name : ''
      }\nSKIP_PREFLIGHT_CHECK=true\nREACT_APP_CONTENTSTACK_LIVE_PREVIEW=${livePreviewEnabled}`;
      result = await writeEnvFile(content, filePath);
      break;
    case 'nextjs':
    case 'nextjs-starter':
      fileName = `.env.${environmentVariables.environment}.local`;
      filePath = path.join(clonedDirectory, fileName);
      content = `CONTENTSTACK_API_KEY=${environmentVariables.api_key}\nCONTENTSTACK_DELIVERY_TOKEN=${
        environmentVariables.deliveryToken
      }\n${
        livePreviewEnabled
          ? `\nCONTENTSTACK_PREVIEW_TOKEN=${environmentVariables.preview_token || `''`}\nCONTENTSTACK_PREVIEW_HOST=${
              customHost ?? previewHost
            }\n`
          : '\n'
      }CONTENTSTACK_ENVIRONMENT=${environmentVariables.environment}\n${
        !isUSRegion && !customHost ? '\nCONTENTSTACK_REGION=' + region.name : ''
      }\nCONTENTSTACK_LIVE_PREVIEW=${livePreviewEnabled}\nCONTENTSTACK_MANAGEMENT_TOKEN=''\nCONTENTSTACK_APP_HOST=''\nCONTENTSTACK_LIVE_EDIT_TAGS=false`;
      result = await writeEnvFile(content, filePath);
      break;
    case 'gatsby':
    case 'gatsby-starter':
      fileName = `.env.${environmentVariables.environment}`;
      filePath = path.join(clonedDirectory, fileName);
      content = `CONTENTSTACK_API_KEY=${environmentVariables.api_key}\nCONTENTSTACK_DELIVERY_TOKEN=${
        environmentVariables.deliveryToken
      }\n${
        livePreviewEnabled
          ? `\nCONTENTSTACK_PREVIEW_TOKEN=${environmentVariables.preview_token || `''`}\nCONTENTSTACK_PREVIEW_HOST=${
              customHost ?? previewHost
            }\n`
          : '\n'
      }CONTENTSTACK_APP_HOST=''\nCONTENTSTACK_ENVIRONMENT=${environmentVariables.environment}\nCONTENTSTACK_LIVE_PREVIEW=${livePreviewEnabled}`;
      result = await writeEnvFile(content, filePath);
      break;
    case 'angular':
      content = `export const environment = { \n\tproduction:${
        environmentVariables.environment === 'production' ? true : false
      }, \n\tconfig : { \n\t\tapi_key: '${environmentVariables.api_key}', \n\t\tdelivery_token: '${
        environmentVariables.deliveryToken
      }',\n${
        livePreviewEnabled
          ? `\npreivew_token=${environmentVariables.preview_token || `''`}\npreview_host=${customHost ?? previewHost}\n`
          : '\n'
      },\tapp_host: '',\n\t\tenvironment: '${environmentVariables.environment}'${
        !isUSRegion && !customHost ? `,\n\t\tregion: '${region.name}'` : ''
      } \n\t } \n };`;
      fileName = `environment${environmentVariables.environment === 'production' ? '.prod.' : '.'}ts`;
      filePath = path.join(clonedDirectory, 'src', 'environments', fileName);
      result = await writeEnvFile(content, filePath);
      break;
    case 'angular-starter':
      content = `export const environment = { \n\tproduction: true \n}; \nexport const Config = { \n\tapi_key: '${
        environmentVariables.api_key
      }', \n\tdelivery_token: '${environmentVariables.deliveryToken}',\n\t${
        livePreviewEnabled
          ? `\npreview_token=${environmentVariables.preview_token || `''`}\npreview_host=${customHost ?? previewHost}\n`
          : '\n'
      },\n\tenvironment: '${environmentVariables.environment}'${
        !isUSRegion && !customHost ? `,\n\tregion: '${region.name}'` : ''
      },\n\t\n\tapp_host: '',\n\tmanagement_token: '',\n\tlive_preview: ${livePreviewEnabled}\n};`;
      fileName = `environment${environmentVariables.environment === 'production' ? '.prod.' : '.'}ts`;
      filePath = path.join(clonedDirectory, 'src', 'environments', fileName);
      result = await writeEnvFile(content, filePath);
      break;
    case 'nuxtjs':
    case 'nuxt-starter':
    case 'stencil-starter':
      fileName = production ? '.env.production' : '.env';
      filePath = path.join(clonedDirectory, fileName);
      // Note: Stencil app needs all the env variables, even if they are not having values otherwise the rollup does not work properly and throws process in undefined error.
      content = `CONTENTSTACK_API_KEY=${environmentVariables.api_key}\nCONTENTSTACK_DELIVERY_TOKEN=${
        environmentVariables.deliveryToken
      }\n${
        livePreviewEnabled
          ? `\nCONTENTSTACK_PREVIEW_TOKEN=${environmentVariables.preview_token || `''`}\nCONTENTSTACK_PREVIEW_HOST=${
              customHost ?? previewHost
            }\n`
          : '\n'
      }\nCONTENTSTACK_ENVIRONMENT=${environmentVariables.environment}${
        !isUSRegion && !customHost ? '\nCONTENTSTACK_REGION=' + region.name : ''
      }\nCONTENTSTACK_LIVE_PREVIEW=${livePreviewEnabled}\n\nCONTENTSTACK_APP_HOST=''\nCONTENTSTACK_LIVE_EDIT_TAGS=false`;
      result = await writeEnvFile(content, filePath);
      break;
    case 'vue-starter':
      fileName = '.env';
      filePath = path.join(clonedDirectory, fileName);
      content = `VUE_APP_CONTENTSTACK_API_KEY=${environmentVariables.api_key}\nVUE_APP_CONTENTSTACK_DELIVERY_TOKEN=${
        environmentVariables.deliveryToken
      }\n${
        livePreviewEnabled
          ? `\nVUE_APP_CONTENTSTACK_PREVIEW_TOKEN=${
              environmentVariables.preview_token || `''`
            }\nVUE_APP_CONTENTSTACK_PREVIEW_HOST=${customHost ?? previewHost}\n`
          : '\n'
      }VUE_APP_CONTENTSTACK_APP_HOST=''\nVUE_APP_CONTENTSTACK_ENVIRONMENT=${environmentVariables.environment}${
        !isUSRegion && !customHost ? '\nVUE_APP_CONTENTSTACK_REGION=' + region.name : ''
      }\nVUE_APP_CONTENTSTACK_LIVE_PREVIEW=${livePreviewEnabled}`;
      result = await writeEnvFile(content, filePath);
      break;
    default:
      cliux.error(messageHandler.parse('CLI_BOOTSTRAP_INVALID_APP_NAME'));
  }

  return result;
};
