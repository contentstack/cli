import * as fs from 'fs';
import * as path from 'path';
import { cliux, pathValidator, sanitizePath } from '@contentstack/cli-utilities';
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
let managementTokenResult: any;
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

  //create management token if not present
  if(!managementToken){
    const managementBody = {
      "token":{
          "name":"sample app",
          "description":"This is a sample management token.",
          "scope":[
              {
                  "module":"content_type",
                  "acl":{
                      "read":true,
                      "write":true
                  }
              },
              {
                  "module":"branch",
                  "branches":[
                      "main"
                  ],
                  "acl":{
                      "read":true
                  }
              }
          ],
          "expires_on": "3000-01-01",
          "is_email_notification_enabled":false
      }
  }
  managementTokenResult = await managementAPIClient
    .stack({ api_key: api_key })
    .managementToken()
    .create(managementBody);
  if(!managementTokenResult.uid){
    cliux.print(
      `Info: Failed to generate a management token.\nNote: Management token is not available in your plan. Please contact the admin for support.`,
      {
        color: 'yellow',
      },
    );
    if ((await continueBootstrapCommand()) === 'no') {
      return;
    }
  } 
  }
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
              `Info: Failed to generate a preview token for the ${environment.name} environment.\nNote: Live Preview using a preview token is not available in your plan. Please contact the admin for support.`,
              {
                color: 'yellow',
              },
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
  let appHost: string;
  const managementAPIHost = region?.cma?.substring('8');
  const regionName = region && region.name && region.name.toLowerCase();
  previewHost = region?.uiHost?.substring(8)?.replace('app', 'rest-preview');
  const cdnHost = region?.cda?.substring('8');
  appHost = region?.uiHost?.substring(8);
  const isUSRegion = regionName === 'us' || regionName === 'na';
  if (regionName !== 'eu' && !isUSRegion) {
    customHost = region?.cma?.substring(8);
  }
  const production = environmentVariables.environment === 'production' ? true : false;
  switch (appConfigKey) {
    case 'reactjs':
    case 'reactjs-starter':
      fileName = `.env.${environmentVariables.environment}.local`;
      filePath = pathValidator(path.join(sanitizePath(clonedDirectory), sanitizePath(fileName)));
      content = `REACT_APP_CONTENTSTACK_API_KEY=${
        environmentVariables.api_key
      }\nREACT_APP_CONTENTSTACK_DELIVERY_TOKEN=${environmentVariables.deliveryToken}${
        livePreviewEnabled
          ? `\nREACT_APP_CONTENTSTACK_PREVIEW_TOKEN=${
              environmentVariables.preview_token || `''`
            }\nREACT_APP_CONTENTSTACK_PREVIEW_HOST=${previewHost}\nREACT_APP_CONTENTSTACK_APP_HOST=${appHost}\n`
          : '\n'
      }\nREACT_APP_CONTENTSTACK_ENVIRONMENT=${environmentVariables.environment}\n${
        customHost ? '\nREACT_APP_CONTENTSTACK_API_HOST=' + customHost : ''
      }${
        !isUSRegion && !customHost ? '\nREACT_APP_CONTENTSTACK_REGION=' + region.name : ''
      }\nSKIP_PREFLIGHT_CHECK=true\nREACT_APP_CONTENTSTACK_LIVE_PREVIEW=${livePreviewEnabled}`;
      result = await writeEnvFile(content, filePath);
      break;
    case 'nextjs':
    case 'nextjs-starter':
      fileName = `.env.${environmentVariables.environment}.local`;
      filePath = pathValidator(path.join(sanitizePath(clonedDirectory), sanitizePath(fileName)));
      content = `CONTENTSTACK_API_KEY=${environmentVariables.api_key}\nCONTENTSTACK_DELIVERY_TOKEN=${
        environmentVariables.deliveryToken
      }\n${
        livePreviewEnabled
          ? `\nCONTENTSTACK_PREVIEW_TOKEN=${
              environmentVariables.preview_token || `''`
            }\nCONTENTSTACK_PREVIEW_HOST=${previewHost}\nCONTENTSTACK_APP_HOST=${appHost}\n`
          : '\n'
      }CONTENTSTACK_ENVIRONMENT=${environmentVariables.environment}\nCONTENTSTACK_API_HOST=${
        customHost ? customHost : managementAPIHost
      }${
        !isUSRegion && !customHost ? '\nCONTENTSTACK_REGION=' + region.name : ''
      }\nCONTENTSTACK_LIVE_PREVIEW=${livePreviewEnabled}\nCONTENTSTACK_LIVE_EDIT_TAGS=false`;
      result = await writeEnvFile(content, filePath);
      break;
    case 'compass-app':
      fileName = '.env';
      filePath = pathValidator(path.join(sanitizePath(clonedDirectory), sanitizePath(fileName)));
      content = `CONTENTSTACK_API_KEY=${environmentVariables.api_key}\nCONTENTSTACK_DELIVERY_TOKEN=${
        environmentVariables.deliveryToken
      }\nCONTENTSTACK_BRANCH=main${
        livePreviewEnabled
          ? `\nCONTENTSTACK_PREVIEW_TOKEN=${
              environmentVariables.preview_token || `''`
            }\nCONTENTSTACK_PREVIEW_HOST=${previewHost}\n`
          : '\n'
      }CONTENTSTACK_ENVIRONMENT=${environmentVariables.environment}${
        !isUSRegion && !customHost ? '\nCONTENTSTACK_REGION=' + region.name : ''
      }\nCONTENTSTACK_LIVE_PREVIEW=${livePreviewEnabled}\nCONTENTSTACK_LIVE_EDIT_TAGS=false\nCONTENTSTACK_API_HOST=${
        customHost ? customHost : managementAPIHost
      }${
        !isUSRegion && !customHost ? '\nCONTENTSTACK_REGION=' + region.name : ''
      }\nCONTENTSTACK_APP_HOST=${appHost}\nCONTENTSTACK_MANAGEMENT_TOKEN=${managementTokenResult.uid}\nCONTENTSTACK_HOST=${cdnHost}`;
      result = await writeEnvFile(content, filePath);
    case 'gatsby':
    case 'gatsby-starter':
      fileName = `.env.${environmentVariables.environment}`;
      filePath = pathValidator(path.join(sanitizePath(clonedDirectory), sanitizePath(fileName)));
      content = `CONTENTSTACK_API_KEY=${environmentVariables.api_key}\nCONTENTSTACK_DELIVERY_TOKEN=${
        environmentVariables.deliveryToken
      }\n${
        livePreviewEnabled
          ? `\nCONTENTSTACK_PREVIEW_TOKEN=${
              environmentVariables.preview_token || `''`
            }\nCONTENTSTACK_PREVIEW_HOST=${previewHost}\nCONTENTSTACK_APP_HOST=${appHost}\n`
          : '\n'
      }\nCONTENTSTACK_ENVIRONMENT=${
        environmentVariables.environment
      }\nCONTENTSTACK_API_HOST=${managementAPIHost}\nCONTENTSTACK_LIVE_PREVIEW=${livePreviewEnabled}`;
      result = await writeEnvFile(content, filePath);
      break;
    case 'angular':
      content = `export const environment = { \n\tproduction:${
        environmentVariables.environment === 'production' ? true : false
      }, \n\tconfig : { \n\t\tapi_key: '${environmentVariables.api_key}', \n\t\tdelivery_token: '${
        environmentVariables.deliveryToken
      }',\n${
        livePreviewEnabled
          ? `\n\tpreivew_token:'${
              environmentVariables.preview_token || `''`
            }'\n\tpreview_host:'${previewHost}'\n\tapp_host:'${appHost}'\n`
          : '\n'
      },\n\t\tenvironment: '${environmentVariables.environment}'${
        !isUSRegion && !customHost ? `,\n\t\tregion: '${region.name}'` : ''
      } \n\t } \n };`;
      fileName = `.env${environmentVariables.environment === 'production' ? '.prod' : ''}`;
      filePath = pathValidator(path.join(sanitizePath(clonedDirectory), 'src', 'environments', sanitizePath(fileName)));
      result = await writeEnvFile(content, filePath);
      break;
    case 'angular-starter':
      content = `CONTENTSTACK_API_KEY=${environmentVariables.api_key}\nCONTENTSTACK_DELIVERY_TOKEN=${
        environmentVariables.deliveryToken
      }\n${
        livePreviewEnabled
          ? `\nCONTENTSTACK_PREVIEW_TOKEN=${
              environmentVariables.preview_token || `''`
            }\nCONTENTSTACK_PREVIEW_HOST=${previewHost}\nCONTENTSTACK_APP_HOST=${appHost}\n`
          : '\n'
      }CONTENTSTACK_ENVIRONMENT=${environmentVariables.environment}\nCONTENTSTACK_API_HOST=${
        customHost ? customHost : managementAPIHost
      }${
        !isUSRegion && !customHost ? '\nCONTENTSTACK_REGION=' + region.name : ''
      }\nCONTENTSTACK_LIVE_PREVIEW=${livePreviewEnabled}\nCONTENTSTACK_LIVE_EDIT_TAGS=false`;
      fileName = `.env${environmentVariables.environment === 'production' ? '.prod' : ''}`;
      filePath = pathValidator(path.join(sanitizePath(clonedDirectory), sanitizePath(fileName)));
      result = await writeEnvFile(content, filePath);
      break;
    case 'nuxtjs':
    case 'nuxt-starter':
    case 'nuxt3-starter':
    case 'stencil-starter':
      fileName = production ? '.env.production' : '.env';
      filePath = pathValidator(path.join(sanitizePath(clonedDirectory), sanitizePath(fileName)));
      // Note: Stencil app needs all the env variables, even if they are not having values otherwise the rollup does not work properly and throws process in undefined error.
      content = `CONTENTSTACK_API_KEY=${environmentVariables.api_key}\nCONTENTSTACK_DELIVERY_TOKEN=${
        environmentVariables.deliveryToken
      }\n${
        livePreviewEnabled
          ? `\nCONTENTSTACK_PREVIEW_TOKEN=${environmentVariables.preview_token || `''`}\nCONTENTSTACK_PREVIEW_HOST=${
              customHost ?? previewHost
            }\nCONTENTSTACK_APP_HOST=${appHost}`
          : '\n'
      }\nCONTENTSTACK_ENVIRONMENT=${environmentVariables.environment}${
        !isUSRegion && !customHost ? '\nCONTENTSTACK_REGION=' + region.name : ''
      }\nCONTENTSTACK_API_HOST=${
        customHost ? customHost : managementAPIHost
      }\nCONTENTSTACK_LIVE_PREVIEW=${livePreviewEnabled}\n\nCONTENTSTACK_LIVE_EDIT_TAGS=false`;
      result = await writeEnvFile(content, filePath);
      break;
    case 'vue-starter':
      fileName = '.env';
      filePath = pathValidator(path.join(sanitizePath(clonedDirectory), sanitizePath(fileName)));
      content = `VUE_APP_CONTENTSTACK_API_KEY=${environmentVariables.api_key}\nVUE_APP_CONTENTSTACK_DELIVERY_TOKEN=${
        environmentVariables.deliveryToken
      }\n${
        livePreviewEnabled
          ? `\nVUE_APP_CONTENTSTACK_PREVIEW_TOKEN=${
              environmentVariables.preview_token || `''`
            }\nVUE_APP_CONTENTSTACK_PREVIEW_HOST=${previewHost}\nVUE_APP_CONTENTSTACK_APP_HOST=${appHost}\n`
          : '\n'
      }\nVUE_APP_CONTENTSTACK_ENVIRONMENT=${environmentVariables.environment}${
        customHost ? '\nVUE_APP_CONTENTSTACK_API_HOST=' + customHost : ''
      }${
        !isUSRegion && !customHost ? '\nVUE_APP_CONTENTSTACK_REGION=' + region.name : ''
      }\nVUE_APP_CONTENTSTACK_LIVE_PREVIEW=${livePreviewEnabled}`;
      result = await writeEnvFile(content, filePath);
      break;
    default:
      cliux.error(messageHandler.parse('CLI_BOOTSTRAP_INVALID_APP_NAME'));
  }

  return result;
};
