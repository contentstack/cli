import * as path from 'path';
import { logger } from '@contentstack/cli-utilities';
import { setupBranches, setupExportDir } from '../utils';
import startModuleExport from './modules';
class ModuleExporter {
  private context: any;
  private managementAPIClient: any;
  private exportConfig: any;
  private stackAPIClient: any;

  constructor(context, managementAPIClient, exportConfig) {
    this.context = context;
    this.managementAPIClient = managementAPIClient;
    this.stackAPIClient = this.managementAPIClient.stack({
      api_key: exportConfig.apiKey,
      management_token: exportConfig.mToken,
    });
    this.exportConfig = exportConfig;
  }

  async start(): Promise<any> {
    // setup the branches
    await setupBranches(this.context, this.managementAPIClient, this.exportConfig);
    await setupExportDir(this.context, this.exportConfig);
    // if branches available run it export by branches
    if (this.exportConfig.branches) {
      this.exportConfig.branchEnabled = true;
      return this.exportByBranches();
    }
    return this.export();
  }

  async export() {
    // checks for single module or all modules
    if (this.exportConfig.singleModuleExport) {
      return this.exportByModuleByName(this.exportConfig.moduleName);
    }
    return this.exportAllModules();
  }

  async exportByModuleByName(moduleName) {
    console.log('module name', moduleName);
    // export the modules by name
    // calls the module runner which inturn calls the module itself
    return startModuleExport(this.context, this.stackAPIClient, this.exportConfig, moduleName);
  }

  async exportAllModules(): Promise<any> {
    // use the algorithm to determine the parallel and sequential execution of modules
    for (let moduleName of this.exportConfig.moduleNames) {
      try {
        await this.exportByModuleByName(moduleName);
      } catch (error) {
        logger.error(`failed to export the module ${moduleName}`, error);
      }
    }
  }

  async exportByBranches(): Promise<any> {
    // loop through the branches and export it parallel
    for (let branch of this.exportConfig.branches) {
      try {
        this.exportConfig.branchName = branch.uid;
        this.exportConfig.branchDir = path.join(this.exportConfig.exportDir, branch.uid);
        await this.export();
      } catch (error) {
        logger.error(`error in exporting contents branch ${branch.uid}`, error);
      }
    }
  }
}

export default ModuleExporter;
