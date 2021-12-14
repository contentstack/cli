import * as path from 'path';
import { logger } from '@contentstack/cli-utilities';
import { setupBranches, backupHandler } from '../utils';
import startModuleImport from './modules';
class ModuleImporter {
  private context: any;
  private managementAPIClient: any;
  private importConfig: any;
  private stackAPIClient: any;

  constructor(context, managementAPIClient, importConfig) {
    this.context = context;
    this.managementAPIClient = managementAPIClient;
    this.stackAPIClient = this.managementAPIClient.stack({
      api_key: importConfig.apiKey,
      management_token: importConfig.mToken,
    });
    this.importConfig = importConfig;
  }

  async start(): Promise<any> {
    // setup the branches
    // await setupBranches(this.context, this.managementAPIClient, this.importConfig);
    const backupDir = await backupHandler(this.context, this.importConfig);
    if (backupDir) {
      this.importConfig.backupDir = backupDir;
    }
    // if branches available run it export by branches
    if (this.importConfig.branches) {
      this.importConfig.branchEnabled = true;
      return this.importByBranches();
    }
    return this.import();
  }

  async import() {
    // checks for single module or all modules
    if (this.importConfig.singleModuleExport) {
      return this.importByModuleByName(this.importConfig.moduleName);
    }
    return this.importAllModules();
  }

  async importByModuleByName(moduleName) {
    console.log('module name', moduleName);
    // import the modules by name
    // calls the module runner which inturn calls the module itself
    return startModuleImport(this.context, this.stackAPIClient, this.importConfig, moduleName);
  }

  async importAllModules(): Promise<any> {
    // use the algorithm to determine the parallel and sequential execution of modules
    for (let moduleName of this.importConfig.moduleNames) {
      try {
        await this.importByModuleByName(moduleName);
      } catch (error) {
        logger.error(`failed to import the module ${moduleName}`, error);
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
        logger.error(`error in importing contents branch ${branch.uid}`, error);
      }
    }
  }
}

export default ModuleImporter;
