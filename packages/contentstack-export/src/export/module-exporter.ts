import * as path from 'path';
import { setupBranches, setupExportDir, log, formatError } from '../utils';
import startModuleExport from './modules';
import startJSModuleExport from './modules-js';

class ModuleExporter {
  private managementAPIClient: any;
  private exportConfig: any;
  private stackAPIClient: any;

  constructor(managementAPIClient, exportConfig) {
    this.managementAPIClient = managementAPIClient;
    this.stackAPIClient = this.managementAPIClient.stack({
      api_key: exportConfig.apiKey,
      management_token: exportConfig.management_token,
    });
    this.exportConfig = exportConfig;
  }

  async start(): Promise<any> {
    // setup the branches
    await setupBranches(this.exportConfig, this.managementAPIClient);
    await setupExportDir(this.exportConfig);
    // if branches available run it export by branches
    if (this.exportConfig.branches) {
      this.exportConfig.branchEnabled = true;
      return this.exportByBranches();
    }
    return this.export();
  }

  async exportByBranches(): Promise<any> {
    // loop through the branches and export it parallel
    for (const branch of this.exportConfig.branches) {
      try {
        this.exportConfig.branchName = branch.uid;
        this.exportConfig.branchDir = path.join(this.exportConfig.exportDir, branch.uid);
        await this.export();
        log(this.exportConfig, `The content of branch ${branch.uid} has been exported successfully!`, 'success');
      } catch (error) {
        log(this.exportConfig, formatError(error), 'error');
        throw new Error(`Failed to export contents from branch ${branch.uid}`);
      }
    }
  }

  async export() {
    // checks for single module or all modules
    if (this.exportConfig.singleModuleExport) {
      return this.exportByModuleByName(this.exportConfig.moduleName);
    }
    return this.exportAllModules();
  }

  async exportByModuleByName(moduleName) {
    log(this.exportConfig, `Starting export of ${moduleName} module`, 'info');
    // export the modules by name
    // calls the module runner which inturn calls the module itself
    let exportedModuleResponse;
    if (this.exportConfig.updatedModules.indexOf(moduleName) !== -1) {
      exportedModuleResponse = await startModuleExport({
        stackAPIClient: this.stackAPIClient,
        exportConfig: this.exportConfig,
        moduleName,
      });
    } else {
      exportedModuleResponse = await startJSModuleExport({
        stackAPIClient: this.stackAPIClient,
        exportConfig: this.exportConfig,
        moduleName,
      });
    }

    // set master locale to config
    if (moduleName === 'stack' && exportedModuleResponse.code) {
      this.exportConfig.master_locale = { code: exportedModuleResponse.code };
    }
  }

  async exportAllModules(): Promise<any> {
    // use the algorithm to determine the parallel and sequential execution of modules
    for (const moduleName of this.exportConfig.modules.types) {
      await this.exportByModuleByName(moduleName);
    }
  }
}

export default ModuleExporter;
