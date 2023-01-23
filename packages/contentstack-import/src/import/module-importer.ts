import { FsUtility } from '@contentstack/cli-utilities';
import * as path from 'path';
import { backupHandler, log } from '../utils';
import startModuleImport from './modules';
import startJSModuleImport from './modules-js';

class ModuleImporter {
  private managementAPIClient: any;
  private importConfig: any;
  private stackAPIClient: any;

  constructor(managementAPIClient, importConfig) {
    this.managementAPIClient = managementAPIClient;
    this.stackAPIClient = this.managementAPIClient.stack({
      api_key: importConfig.apiKey,
      management_token: importConfig.mToken,
    });
    this.importConfig = importConfig;
  }

  async start(): Promise<any> {
    const backupDir = await backupHandler(this.importConfig);
    if (backupDir) {
      this.importConfig.backupDir = backupDir;
    }
    return this.import();
  }

  async import() {
    // checks for single module or all modules
    if (this.importConfig.singleModuleImport) {
      return this.importByModuleByName(this.importConfig.moduleName);
    }
    return this.importAllModules();
  }

  async importByModuleByName(moduleName) {
    const basePath = `${this.importConfig.backupDir}/${moduleName}`;
    // import the modules by name
    // calls the module runner which inturn calls the module itself
    if (new FsUtility({ basePath }).isNewFsStructure && this.importConfig.updatedModules.indexOf(moduleName) !== -1) {
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
      try {
        await this.importByModuleByName(moduleName);
      } catch (error) {
        console.log(error.stack);
        log(this.importConfig, `failed to import the module ${moduleName}`, 'error');
        throw error;
      }
    }
  }

  async importByBranches(): Promise<any> {
    // loop through the branches and import it parallel
    for (let branch of this.importConfig.branches) {
      try {
        this.importConfig.branchName = branch.uid;
        this.importConfig.branchDir = path.join(this.importConfig.importDir, branch.uid);
        await this.import();
      } catch (error) {
        log(this.importConfig, `error in importing contents branch ${branch.uid}`, 'error');
      }
    }
  }
}

export default ModuleImporter;
