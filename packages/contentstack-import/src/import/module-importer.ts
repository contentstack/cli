import { ContentstackClient, HttpClient } from '@contentstack/cli-utilities';

import startModuleImport from './modules';
import startJSModuleImport from './modules-js';
import { ImportConfig, Modules } from '../types';
import { backupHandler, log, validateBranch, masterLocalDetails, sanitizeStack, initLogger } from '../utils';

class ModuleImporter {
  private managementAPIClient: ContentstackClient;
  private importConfig: ImportConfig;
  private stackAPIClient: any;

  constructor(managementAPIClient: ContentstackClient, importConfig: ImportConfig) {
    this.managementAPIClient = managementAPIClient;
    this.stackAPIClient = this.managementAPIClient.stack({
      api_key: importConfig.apiKey,
      management_token: importConfig.management_token,
    });
    this.importConfig = importConfig;
  }

  async start(): Promise<any> {
    if (this.importConfig.branchName) {
      await validateBranch(this.stackAPIClient, this.importConfig, this.importConfig.branchName);
    }

    // Temporarily adding this api call to verify management token has read and write permissions
    // TODO: CS-40354 - CLI | import rewrite | Migrate HTTP call to SDK call once fix is ready from SDK side
    const httpClient = new HttpClient({
      headers: { api_key: this.importConfig.apiKey, authorization: this.importConfig.management_token },
    });

    const { data } = await httpClient.post(`https://${this.importConfig.host}/v3/locales`, {
      locale: {
        name: 'English',
        code: 'en-us',
      },
    });

    if (data.error_code === 161) {
      throw new Error(data.error_message);
    }

    if (!this.importConfig.master_locale) {
      let masterLocalResponse = await masterLocalDetails(this.stackAPIClient);
      this.importConfig['master_locale'] = { code: masterLocalResponse.code };
      this.importConfig.masterLocale = { code: masterLocalResponse.code };
    }
    const backupDir = await backupHandler(this.importConfig);
    if (backupDir) {
      this.importConfig.backupDir = backupDir;
      // To support the old config
      this.importConfig.data = backupDir;
    }

    // NOTE init log
    initLogger(this.importConfig);

    await sanitizeStack(this.stackAPIClient);

    return this.import();
  }

  async import() {
    log(this.importConfig, `Starting to import content version ${this.importConfig.contentVersion}`, 'info');

    // checks for single module or all modules
    if (this.importConfig.singleModuleImport) {
      return this.importByModuleByName(this.importConfig.moduleName);
    }
    return this.importAllModules();
  }

  async importByModuleByName(moduleName: Modules) {
    log(this.importConfig, `Starting import of ${moduleName} module`, 'info');
    // import the modules by name
    // calls the module runner which inturn calls the module itself
    // NOTE: Implement a mechanism to determine whether module is new or old
    if (this.importConfig.contentVersion === 2) {
      return startModuleImport({
        stackAPIClient: this.stackAPIClient,
        importConfig: this.importConfig,
        moduleName,
      });
    } else {
      //NOTE - new modules support only ts
      if (this.importConfig.onlyTSModules.indexOf(moduleName) === -1) {
        return startJSModuleImport({
          stackAPIClient: this.stackAPIClient,
          importConfig: this.importConfig,
          moduleName,
        });
      }
    }
  }

  async importAllModules(): Promise<any> {
    // use the algorithm to determine the parallel and sequential execution of modules
    for (let moduleName of this.importConfig.modules.types) {
      await this.importByModuleByName(moduleName);
    }
  }
}

export default ModuleImporter;
