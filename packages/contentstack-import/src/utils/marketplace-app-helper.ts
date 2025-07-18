import chalk from 'chalk';
import map from 'lodash/map';
import omitBy from 'lodash/omitBy';
import isEmpty from 'lodash/isEmpty';
import includes from 'lodash/includes';
import {
  cliux,
  HttpClient,
  configHandler,
  managementSDKClient,
  marketplaceSDKClient,
  createDeveloperHubUrl,
  log,
  handleAndLogError
} from '@contentstack/cli-utilities';

import { trace } from '../utils/log';
import { ImportConfig, Installation } from '../types';
import { formatError } from '../utils';
import { getAppName, askAppName, selectConfiguration } from '../utils/interactive';

export const getAllStackSpecificApps = async (
  config: ImportConfig,
  skip = 0,
  listOfApps: Installation[] = [],
): Promise<Installation[]> => {
  log.debug(`Fetching stack-specific apps with skip: ${skip}, current list size: ${listOfApps.length}`);
  
  const appSdk = await marketplaceSDKClient({
    host: config.developerHubBaseUrl.split('://').pop(),
  });
  
  const collection = await appSdk
    .marketplace(config.org_uid)
    .installation()
    .fetchAll({ target_uids: config.target_stack, skip })
    .catch((error) => {
      handleAndLogError(error)
      trace(error, 'error', true);
    });

  if (collection) {
    const { items: apps, count } = collection;
    log.debug(`Retrieved ${apps.length} apps from API, total count: ${count}`);
    
    // NOTE Remove all the chain functions
    const installation = map(apps, (app) =>
      omitBy(app, (val, _key) => {
        if (val instanceof Function) return true;
        return false;
      }),
    ) as unknown as Installation[];
    
    listOfApps = listOfApps.concat(installation);
    log.debug(`Updated list size: ${listOfApps.length}`);

    if (count - (skip + 50) > 0) {
      log.debug(`Fetching more apps, remaining: ${count - (skip + 50)}`);
      return await getAllStackSpecificApps(config, skip + 50, listOfApps);
    }
  }

  log.info(`Successfully retrieved ${listOfApps.length} stack-specific apps`);
  return listOfApps;
};

export const getDeveloperHubUrl = async (config: ImportConfig): Promise<string> => {
  log.debug('Creating developer hub URL');
  const url = createDeveloperHubUrl(config.host);
  log.debug(`Developer hub URL: ${url}`);
  return url;
};

export const getOrgUid = async (config: ImportConfig): Promise<string> => {
  log.debug('Fetching organization UID');
  
  const tempAPIClient = await managementSDKClient({ host: config.host });
  const tempStackData = await tempAPIClient
    .stack({ api_key: config.target_stack })
    .fetch()
    .catch((error: any) => {
      handleAndLogError(error);
      trace(error, 'error', true);
    });

  const orgUid = tempStackData?.org_uid || '';
  log.debug(`Organization UID: ${orgUid}`);
  return orgUid;
};

export const getConfirmationToCreateApps = async (privateApps: any, config: ImportConfig): Promise<boolean> => {
  log.debug(`Requesting confirmation to create ${privateApps?.length} private apps`);
  
  if (!config.forceStopMarketplaceAppsPrompt) {
    if (
      !(await cliux.confirm(
        chalk.yellow(
          `WARNING!!! The listed apps are private apps that are not available in the destination stack: \n\n${map(
            privateApps,
            ({ manifest: { name } }, index) => `${String(index + 1)}) ${name}`,
          ).join('\n')}\n\nWould you like to re-create the private app and then proceed with the installation? (y/n)`,
        ),
      ))
    ) {
      log.debug('User declined to create private apps');
      
      if (
        await cliux.confirm(
          chalk.yellow(
            `\nWARNING!!! Canceling the app re-creation may break the content type and entry import. Would you like to proceed without re-create the private app? (y/n)`,
          ),
        )
      ) {
        log.warn('User confirmed to proceed without creating private apps');
        return Promise.resolve(false);
      } else {
        if (
          await cliux.confirm(
            chalk.yellow('\nWould you like to re-create the private app and then proceed with the installation? (y/n)'),
          )
        ) {
          log.info('User confirmed to create private apps');
          return Promise.resolve(true);
        } else {
          log.debug('User declined to create private apps (second prompt)');
          return Promise.resolve(false);
        }
      }
    } else {
      log.info('User confirmed to create private apps');
      return Promise.resolve(true);
    }
  } else {
    log.debug('Force prompt disabled, automatically creating private apps');
    return Promise.resolve(true);
  }
};

export const handleNameConflict = async (app: any, appSuffix: number, config: ImportConfig) => {
  log.debug(`Handling name conflict for app: ${app?.name}, suffix: ${appSuffix}`);
  
  const appName = config.forceStopMarketplaceAppsPrompt
    ? getAppName(app.name, appSuffix)
    : await askAppName(app, appSuffix);
  
  app.name = appName;
  log.debug(`Updated app name to: ${appName}`);

  return app;
};

export const makeRedirectUrlCall = async (response: any, appName: string, config: ImportConfig): Promise<void> => {
  if (response.redirect_url) {
    log.info(`Starting OAuth API call for app: ${appName}`);
    
    await new HttpClient({ maxRedirects: 20, maxBodyLength: Infinity })
      .get(response.redirect_url)
      .then(async ({ response }: any) => {
        if (includes([501, 403], response.status)) {
          log.error(`OAuth API call failed for ${appName}: ${response.statusText}`);
          trace(response, 'error', true);
          await confirmToCloseProcess(response.data, config);
        } else {
          log.success(`OAuth API call completed successfully for app: ${appName}`);
        }
      })
      .catch((error) => {
        trace(error, 'error', true);

        if (includes([501, 403], error.status)) {
          handleAndLogError(error);
        }
      });
  } else {
    log.debug(`No redirect URL found for app: ${appName}`);
  }
};

export const confirmToCloseProcess = async (installation: any, config: ImportConfig) => {
  log.warn(`Installation error occurred: ${formatError(installation?.message)}`);

  if (!config.forceStopMarketplaceAppsPrompt) {
    if (
      !(await cliux.confirm(
        chalk.yellow(
          'WARNING!!! The above error may have an impact if the failed app is referenced in entries/content type. Would you like to proceed? (y/n)',
        ),
      ))
    ) {
      log.debug('User chose to exit due to installation error');
      process.exit();
    } else {
      log.warn('User chose to proceed despite installation error');
    }
  } else {
    log.debug('Force prompt disabled, continuing despite installation error');
  }
};

export const ifAppAlreadyExist = async (app: any, currentStackApp: any, config: ImportConfig) => {
  log.debug(`Checking if app already exists: ${app?.manifest?.name}`);
  
  let updateParam = {};
  const {
    manifest: { name },
    configuration,
    server_configuration,
  } = app;

  if (!isEmpty(configuration) || !isEmpty(server_configuration)) {
    log.warn(`App ${name} already exists with existing configuration`);
    
    cliux.print(
      `\nWARNING!!! The ${name} app already exists and it may have its own configuration. But the current app you install has its own configuration which is used internally to manage content.\n`,
      { color: 'yellow' },
    );

    const configOption = config.forceStopMarketplaceAppsPrompt
      ? 'Update it with the new configuration.'
      : await selectConfiguration();
      
    if (configOption === 'Exit') {
      log.debug('User chose to exit due to configuration conflict');
      process.exit();
    } else if (configOption === 'Update it with the new configuration.') {
      log.info(`Updating app configuration for: ${name}`);
      updateParam = { manifest: app.manifest, ...currentStackApp, configuration, server_configuration };
    } else {
      log.debug(`User chose to keep existing configuration for: ${name}`);
    }
  } else {
    log.debug(`App ${name} has no configuration conflicts`);
  }

  return updateParam;
};
