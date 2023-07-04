import { ContentstackClient, FsUtility } from '@contentstack/cli-utilities';
import { ImportConfig, Modules } from '../types';
import { backupHandler, log, validateBranch, masterLocalDetails, sanitizeStack } from '../utils';
import startModuleImport from './modules';
import startJSModuleImport from './modules-js';

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

    await sanitizeStack(this.stackAPIClient);

    return this.import();
  }

  async import() {
    // checks for single module or all modules
    if (this.importConfig.singleModuleImport) {
      return this.importByModuleByName(this.importConfig.moduleName);
    }
    return this.importAllModules();
  }

  async importByModuleByName(moduleName: Modules) {
    log(this.importConfig, `Starting import of ${moduleName} module`, 'info');

    const basePath = `${this.importConfig.backupDir}/${moduleName}`;
    // import the modules by name
    // calls the module runner which inturn calls the module itself
    if (
      this.importConfig.useNewModuleStructure &&
      this.importConfig.updatedModules.indexOf(moduleName) !== -1
      //&& new FsUtility({ basePath }).isNewFsStructure
    ) {
      return startModuleImport({
        stackAPIClient: this.stackAPIClient,
        importConfig: this.importConfig,
        moduleName,
      });
    }
    return startJSModuleImport({
      stackAPIClient: this.stackAPIClient,
      importConfig: this.importConfig,
      moduleName,
    });
  }

  async importAllModules(): Promise<any> {
    // use the algorithm to determine the parallel and sequential execution of modules
    for (let moduleName of this.importConfig.modules.types) {
      await this.importByModuleByName(moduleName);
    }
  }
}

export default ModuleImporter;
