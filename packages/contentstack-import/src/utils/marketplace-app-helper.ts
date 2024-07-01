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
} from '@contentstack/cli-utilities';

import { log } from './logger';
import { trace } from '../utils/log';
import { ImportConfig, Installation } from '../types';
import { formatError } from '../utils';
import { getAppName, askAppName, selectConfiguration } from '../utils/interactive';

export const getAllStackSpecificApps = async (
  config: ImportConfig,
  skip = 0,
  listOfApps: Installation[] = [],
): Promise<Installation[]> => {
  const appSdk = await marketplaceSDKClient({
    host: config.developerHubBaseUrl.split('://').pop(),
  });
  const collection = await appSdk
    .marketplace(config.org_uid)
    .installation()
    .fetchAll({ target_uids: config.target_stack, skip })
    .catch((error) => {
      trace(error, 'error', true);
      log(config, `Failed to export marketplace-apps ${formatError(error)}`, 'error');
    });

  if (collection) {
    const { items: apps, count } = collection;
    // NOTE Remove all the chain functions
    const installation = map(apps, (app) =>
      omitBy(app, (val, _key) => {
        if (val instanceof Function) return true;
        return false;
      }),
    ) as unknown as Installation[];
    listOfApps = listOfApps.concat(installation);

    if (count - (skip + 50) > 0) {
      return await getAllStackSpecificApps(config, skip + 50, listOfApps);
    }
  }

  return listOfApps;
};

export const getDeveloperHubUrl = async (config: ImportConfig): Promise<string> => {
  return createDeveloperHubUrl(config.host);
};

export const getOrgUid = async (config: ImportConfig): Promise<string> => {
  const tempAPIClient = await managementSDKClient({ host: config.host });
  const tempStackData = await tempAPIClient
    .stack({ api_key: config.target_stack })
    .fetch()
    .catch((error: any) => {
      trace(error, 'error', true);
      log(config, formatError(error), 'error');
    });

  return tempStackData?.org_uid || '';
};

export const getConfirmationToCreateApps = async (privateApps: any, config: ImportConfig): Promise<boolean> => {
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
      if (
        await cliux.confirm(
          chalk.yellow(
            `\nWARNING!!! Canceling the app re-creation may break the content type and entry import. Would you like to proceed without re-create the private app? (y/n)`,
          ),
        )
      ) {
        return Promise.resolve(false);
      } else {
        if (
          await cliux.confirm(
            chalk.yellow('\nWould you like to re-create the private app and then proceed with the installation? (y/n)'),
          )
        ) {
          return Promise.resolve(true);
        } else {
          return Promise.resolve(false);
        }
      }
    } else {
      return Promise.resolve(true);
    }
  } else {
    return Promise.resolve(true);
  }
};

export const handleNameConflict = async (app: any, appSuffix: number, config: ImportConfig) => {
  const appName = config.forceStopMarketplaceAppsPrompt
    ? getAppName(app.name, appSuffix)
    : await askAppName(app, appSuffix);
  app.name = appName;

  return app;
};

export const makeRedirectUrlCall = async (response: any, appName: string, config: ImportConfig): Promise<void> => {
  if (response.redirect_url) {
    log(config, `${appName} - OAuth api call started.!`, 'info');
    await new HttpClient({ maxRedirects: 20, maxBodyLength: Infinity })
      .get(response.redirect_url)
      .then(async ({ response }: any) => {
        if (includes([501, 403], response.status)) {
          trace(response, 'error', true);
          log(config, `${appName} - ${response.statusText}, OAuth api call failed.!`, 'error');
          log(config, formatError(response), 'error');
          await confirmToCloseProcess(response.data, config);
        } else {
          log(config, `${appName} - OAuth api call completed.!`, 'success');
        }
      })
      .catch((error) => {
        trace(error, 'error', true);

        if (includes([501, 403], error.status)) {
          log(config, formatError(error), 'error');
        }
      });
  }
};

export const confirmToCloseProcess = async (installation: any, config: ImportConfig) => {
  cliux.print(`\nWARNING!!! ${formatError(installation.message)}\n`, { color: 'yellow' });

  if (!config.forceStopMarketplaceAppsPrompt) {
    if (
      !(await cliux.confirm(
        chalk.yellow(
          'WARNING!!! The above error may have an impact if the failed app is referenced in entries/content type. Would you like to proceed? (y/n)',
        ),
      ))
    ) {
      process.exit();
    }
  }
};

export const ifAppAlreadyExist = async (app: any, currentStackApp: any, config: ImportConfig) => {
  let updateParam = {};
  const {
    manifest: { name },
    configuration,
    server_configuration,
  } = app;

  if (!isEmpty(configuration) || !isEmpty(server_configuration)) {
    cliux.print(
      `\nWARNING!!! The ${name} app already exists and it may have its own configuration. But the current app you install has its own configuration which is used internally to manage content.\n`,
      { color: 'yellow' },
    );

    const configOption = config.forceStopMarketplaceAppsPrompt
      ? 'Update it with the new configuration.'
      : await selectConfiguration();
    if (configOption === 'Exit') {
      process.exit();
    } else if (configOption === 'Update it with the new configuration.') {
      updateParam = { manifest: app.manifest, ...currentStackApp, configuration, server_configuration };
    }
  }

  return updateParam;
};
