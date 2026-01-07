import { log, fsUtil } from '../../utils';
import { join } from 'path';
import { ImportConfig, ModuleClassParams } from '../../types';
import { get, isEmpty } from 'lodash';
import {
  formatError,
  isAuthenticated,
  marketplaceSDKClient,
  ContentstackMarketplaceClient,
  NodeCrypto,
  createDeveloperHubUrl,
  sanitizePath,
} from '@contentstack/cli-utilities';
import BaseImportSetup from './base-setup';
import { MODULE_NAMES, MODULE_CONTEXTS, PROCESS_NAMES, PROCESS_STATUS } from '../../utils';

export default class marketplaceAppImportSetup extends BaseImportSetup {
  private marketplaceAppsFilePath: string;
  private marketplaceAppMapper: any;
  private marketplaceAppsConfig: ImportConfig['modules']['marketplace-apps'];
  private mapperDirPath: string;
  private marketplaceAppsFolderPath: string;
  private marketplaceAppsUidMapperPath: string;
  public developerHubBaseUrl: string;
  public marketplaceAppPath: string;
  public nodeCrypto: NodeCrypto;
  public appSdk: ContentstackMarketplaceClient;

  constructor({ config, stackAPIClient }: ModuleClassParams) {
    super({ config, stackAPIClient, dependencies: [] });
    this.currentModuleName = MODULE_NAMES[MODULE_CONTEXTS.MARKETPLACE_APPS];
    this.marketplaceAppsFilePath = join(
      sanitizePath(this.config.contentDir),
      'marketplace_apps',
      'marketplace_apps.json',
    );
    this.marketplaceAppsConfig = config.modules['marketplace-apps'];
    this.marketplaceAppsUidMapperPath = join(sanitizePath(this.config.backupDir), 'mapper', 'marketplace_apps');
    this.marketplaceAppMapper = { app_uid: {}, installation_uid: {}, extension_uid: {} };
  }

  /**
   * Start the marketplaceApp import setup
   * This method reads the marketplaceApps from the content folder and generates a mapper file
   * @returns {Promise<void>}
   */
  async start() {
    try {
      const sourceMarketplaceApps: any = await this.withLoadingSpinner('MARKETPLACE APPS: Analyzing import data...', async () => {
        return await fsUtil.readFile(this.marketplaceAppsFilePath);
      });

      if (!isEmpty(sourceMarketplaceApps)) {
        const appsArray = Array.isArray(sourceMarketplaceApps) ? sourceMarketplaceApps : Object.values(sourceMarketplaceApps);
        const progress = this.createNestedProgress(this.currentModuleName);
        
        // Add processes
        progress.addProcess(PROCESS_NAMES.MARKETPLACE_APPS_MAPPER_GENERATION, 1);
        progress.addProcess(PROCESS_NAMES.MARKETPLACE_APPS_FETCH, appsArray.length);

        // Create mapper directory
        progress
          .startProcess(PROCESS_NAMES.MARKETPLACE_APPS_MAPPER_GENERATION)
          .updateStatus(
            PROCESS_STATUS.MARKETPLACE_APPS_MAPPER_GENERATION.GENERATING,
            PROCESS_NAMES.MARKETPLACE_APPS_MAPPER_GENERATION,
          );
        fsUtil.makeDirectory(this.marketplaceAppsUidMapperPath);
        this.progressManager?.tick(true, 'mapper directory created', null, PROCESS_NAMES.MARKETPLACE_APPS_MAPPER_GENERATION);
        progress.completeProcess(PROCESS_NAMES.MARKETPLACE_APPS_MAPPER_GENERATION, true);

        // Fetch marketplace apps
        progress
          .startProcess(PROCESS_NAMES.MARKETPLACE_APPS_FETCH)
          .updateStatus(
            PROCESS_STATUS.MARKETPLACE_APPS_FETCH.FETCHING,
            PROCESS_NAMES.MARKETPLACE_APPS_FETCH,
          );
        
        this.developerHubBaseUrl = this.config.developerHubBaseUrl || (await createDeveloperHubUrl(this.config.host));
        // NOTE init marketplace app sdk
        const host = this.developerHubBaseUrl.split('://').pop();
        this.appSdk = await marketplaceSDKClient({ host });
        const targetMarketplaceApps: any = await this.getMarketplaceApps();
        
        this.progressManager?.tick(true, 'marketplace apps fetched', null, PROCESS_NAMES.MARKETPLACE_APPS_FETCH);
        
        this.createMapper(sourceMarketplaceApps, targetMarketplaceApps);
        await fsUtil.writeFile(join(this.marketplaceAppsUidMapperPath, 'uid-mapping.json'), this.marketplaceAppMapper);
        
        progress.completeProcess(PROCESS_NAMES.MARKETPLACE_APPS_FETCH, true);
        this.completeProgress(true);

        log(this.config, `The required setup files for Marketplace apps have been generated successfully.`, 'success');
      } else {
        log(this.config, 'No Marketplace apps found in the content folder.', 'info');
      }
    } catch (error) {
      this.completeProgress(false, error?.message || 'Marketplace apps mapper generation failed');
      log(this.config, `Error occurred while generating the Marketplace app mapper: ${error.message}.`, 'error');
    }
  }

  async getMarketplaceApps() {
    // Implement this method to get the marketplaceApp from the stack
    return new Promise(async (resolve, reject) => {
      const { items: marketplaceApps = [] } =
        (await this.appSdk
          .marketplace(this.config.org_uid)
          .installation()
          .fetchAll({ target_uids: this.config.apiKey })
          .catch((error: Error) => {
            reject(error);
          })) || {};
      resolve(marketplaceApps);
    });
  }

  createMapper(sourceMarketplaceApps: any, targetMarketplaceApps: any) {
    const appsArray = Array.isArray(sourceMarketplaceApps) ? sourceMarketplaceApps : Object.values(sourceMarketplaceApps);
    
    appsArray.forEach((sourceApp: any) => {
      // Find matching target item based on manifest.name
      // TBD: This logic is not foolproof, need to find a better way to match source and target apps
      // Reason: While importing apps, if an app exist in the target with the same name, it will be a conflict and will not be imported
      // So, import command gives an option to import the app with a different name by appending ◈ to the app name. Considering this we are matching the app name without the ◈ character
      const getAppName = (app: any) => get(app, 'manifest.name', '').split('◈')[0];

      const sourceAppName = getAppName(sourceApp);

      const targetApp = targetMarketplaceApps.find((app: any) => getAppName(app) === sourceAppName);

      if (targetApp) {
        // Map app_uid from source and target
        this.marketplaceAppMapper.app_uid[sourceApp.manifest.uid] = targetApp.manifest.uid;

        // Map installation_uid from source and target
        this.marketplaceAppMapper.installation_uid[sourceApp.installation_uid] = targetApp.installation_uid;

        // Map extension_uid by comparing meta.uid in source and target's ui_location.locations
        sourceApp.ui_location.locations.forEach((sourceAppLocation: any) => {
          const targetAppLocation = targetApp.ui_location.locations.find(
            (targetAppLocation: any) => targetAppLocation.type === sourceAppLocation.type,
          );

          if (targetAppLocation) {
            sourceAppLocation.meta.forEach((sourceAppMeta: any) => {
              const targetAppMeta = targetAppLocation.meta.find(
                (targetAppMeta: any) => targetAppMeta.uid === sourceAppMeta.uid,
              );

              if (targetAppMeta && sourceAppMeta.extension_uid && targetAppMeta.extension_uid) {
                this.marketplaceAppMapper.extension_uid[sourceAppMeta.extension_uid] = targetAppMeta.extension_uid;
              }
            });
          }
        });
        this.progressManager?.tick(true, `app: ${sourceAppName}`, null, PROCESS_NAMES.MARKETPLACE_APPS_FETCH);
      } else {
        this.progressManager?.tick(false, `app: ${sourceAppName}`, 'Not found in target stack', PROCESS_NAMES.MARKETPLACE_APPS_FETCH);
        log(this.config, `No matching Marketplace app found in the target stack with name ${sourceAppName}`, 'info');
      }
    });
  }
}
