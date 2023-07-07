import isEmpty from 'lodash/isEmpty';
import find from 'lodash/find';
import map from 'lodash/map';
import omit from 'lodash/omit';
import filter from 'lodash/filter';
import includes from 'lodash/includes';
import chalk from 'chalk';
import { cliux, configHandler, HttpClient, NodeCrypto } from '@contentstack/cli-utilities';

import { ImportConfig } from '../types';
import { log } from './logger';
import { askDeveloperHubUrl } from './interactive';
import { formatError } from '../utils';
import { askEncryptionKey, getAppName, askAppName, selectConfiguration } from '../utils/interactive';

export const getAllStackSpecificApps = async (developerHubBaseUrl: string, httpClient: HttpClient, config: ImportConfig) => {
  return await httpClient
    .get(`${developerHubBaseUrl}/installations?target_uids=${config.target_stack}`)
    .then(({ data }) => data.data)
    .catch((error) => log(config, `Failed to export marketplace-apps ${formatError(error)}`, 'error'));
};

export const getDeveloperHubUrl = async (config: ImportConfig): Promise<string> => {
  const { cma, name } = configHandler.get('region') || {};
  let developerHubBaseUrl = config.developerHubUrls[cma];

  if (!developerHubBaseUrl) {
    developerHubBaseUrl = await askDeveloperHubUrl(name);
  }

  return developerHubBaseUrl.startsWith('http') ? developerHubBaseUrl : `https://${developerHubBaseUrl}`;
};

export const getOrgUid = async (stackAPIClient: any, config: ImportConfig): Promise<string> => {
  const tempStackData = await stackAPIClient.fetch().catch((error: any) => {
    log(config, formatError(error), 'error');
  });

  return tempStackData?.org_uid || '';
};

export const getAndValidateEncryptionKey = async (params: {
  defaultValue: string;
  retry: number;
  marketplaceApps: Record<string, any>;
  config?: ImportConfig;
}): Promise<string> => {
  const { defaultValue, retry, marketplaceApps, config } = params;
  let appConfig = find(
    marketplaceApps,
    ({ configuration, server_configuration }) => isEmpty(configuration) || isEmpty(server_configuration),
  );

  if (!appConfig) {
    return defaultValue;
  }

  const encryptionKey = await askEncryptionKey(defaultValue);

  try {
    appConfig = isEmpty(appConfig.configuration) ? appConfig.configuration : appConfig.server_configuration;
    const nodeCrypto = new NodeCrypto({ encryptionKey });
    nodeCrypto.decrypt(appConfig);
  } catch (error) {
    if (retry < config.getEncryptionKeyMaxRetry && error.code === 'ERR_OSSL_EVP_BAD_DECRYPT') {
      cliux.print(
        `Provided encryption key is not valid or your data might be corrupted.! attempt(${retry}/${config.getEncryptionKeyMaxRetry})`,
        { color: 'red' },
      );
      // NOTE max retry limit is 3
      return getAndValidateEncryptionKey({ defaultValue: encryptionKey, retry: retry + 1, marketplaceApps });
    } else {
      cliux.print(
        `Maximum retry limit exceeded. Closing the process, please try again.! attempt(${retry}/${config.getEncryptionKeyMaxRetry})`,
        { color: 'red' },
      );
      process.exit(1);
    }
  }

  return encryptionKey;
};

export const getConfirmationToCreateApps = async (privateApps: any, config: ImportConfig): Promise<boolean> => {
  console.log("getConfirmationToCreateApps----",config.forceStopMarketplaceAppsPrompt)
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
        return Promise.resolve(true);
      }

      if (
        !(await cliux.confirm(
          chalk.yellow('\nWould you like to re-create the private app and then proceed with the installation? (y/n)'),
        ))
      ) {
        process.exit();
      }
    }
  }
};

export const createPrivateApp = async (client: any, config: ImportConfig, app: any): Promise<any> => {
  return await client
    .organization(config.org_uid)
    .app()
    .create(omit(app, ['uid']))
    .catch((error: any) => error);
};

export const installApp = async (
  client: any,
  config: ImportConfig,
  appManifestUid?: string,
  mappedUid?: unknown,
): Promise<any> => {
  return await client
    .organization(config.org_uid)
    .app(mappedUid || appManifestUid)
    .install({ targetUid: config.target_stack, targetType: 'stack' })
    .catch((error: any) => error);
};

export const handleNameConflict = async (app: any, appSuffix: number, config: ImportConfig) => {
  const appName = config.forceStopMarketplaceAppsPrompt
    ? getAppName(app.name, appSuffix)
    : await askAppName(app, appSuffix);
  app.name = appName;

  return app;
};

export const makeRedirectUrlCall = async (response: any, appName: string, config: ImportConfig) => {
  if (response.redirect_url) {
    log(config, `${appName} - OAuth api call started.!`, 'info');
    await new HttpClient({ maxRedirects: 20, maxBodyLength: Infinity })
      .get(response.redirect_url)
      .then(async ({ response }: any) => {
        if (includes([501, 403], response.status)) {
          log(config, `${appName} - ${response.statusText}, OAuth api call failed.!`, 'error');
          log(config, formatError(response), 'error');
          await confirmToCloseProcess(response.data, config);
        } else {
          log(config, `${appName} - OAuth api call completed.!`, 'success');
        }
      })
      .catch((error) => {
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

  if (isEmpty(configuration) || isEmpty(server_configuration)) {
    cliux.print(
      `\nWARNING!!! The ${name} app already exists and it may have its own configuration. But the current app you install has its own configuration which is used internally to manage content.\n`,
      { color: 'yellow' },
    );
      console.log("config.forceStopMarketplaceAppsPrompt------",config.forceStopMarketplaceAppsPrompt)
    const configOption = config.forceStopMarketplaceAppsPrompt
      ? 'Update it with the new configuration.'
      : await selectConfiguration();
      console.log("configOption---",configOption)
    if (configOption === 'Exit') {
      process.exit();
    } else if (configOption === 'Update it with the new configuration.') {
      console.log("here---",configOption)
      updateParam = { manifest: app.manifest, ...currentStackApp, configuration, server_configuration };
    }
    console.log("updateParam---",updateParam)
  }

  return updateParam;
};

export const updateAppConfig = async (
  client: any,
  config: ImportConfig,
  app: any,
  payload: { configuration: Record<string, unknown>; server_configuration: Record<string, unknown> },
): Promise<any> => {
  let installation = client.organization(config.org_uid).app(app?.manifest?.uid).installation(app?.uid);

  installation = Object.assign(installation, payload);
  console.log("installation---",installation)
  return await installation
    .update()
    .then((data: any) => {
      log(config, `${app?.manifest?.name} app config updated successfully.!`, 'success');
    })
    .catch((error: any) => log(config, `Failed to update app config - ${formatError(error)}`, 'error'));
};

export const generateUidMapper = async (
  installedApps: Record<string, any>[],
  marketplaceApps: Record<string, any>[],
  appNameMapping: Record<string, unknown>,
):Promise<Record<string, unknown>> => {
  const listOfNewMeta = [];
  const listOfOldMeta = [];
  const extensionUidMap: Record<string, unknown>={};

  for (const app of marketplaceApps) {
    listOfOldMeta.push(...map(app?.ui_location?.locations, 'meta').flat());
  }
  for (const app of installedApps) {
    listOfNewMeta.push(...map(app?.ui_location?.locations, 'meta').flat());
  }
  for (const { extension_uid, name, path } of filter(listOfOldMeta, 'name')) {
    const meta = find(listOfNewMeta, { name, path }) || find(listOfNewMeta, { name: appNameMapping[name], path });

    if (meta) {
      extensionUidMap[extension_uid] = meta.extension_uid;
    }
  }

  return extensionUidMap;
};
