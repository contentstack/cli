import * as path from 'path';
import { ContentstackClient } from '@contentstack/cli-utilities';
import { setupBranches, setupExportDir, log, formatError, writeExportMetaFile } from '../utils';
import startModuleExport from './modules';
import startJSModuleExport from './modules-js';
import { ExportConfig, Modules } from '../types';

class ModuleExporter {
  private managementAPIClient: ContentstackClient;
  private exportConfig: ExportConfig;
  private stackAPIClient: ReturnType<ContentstackClient['stack']>;

  constructor(managementAPIClient: ContentstackClient, exportConfig: ExportConfig) {
    this.managementAPIClient = managementAPIClient;
    this.stackAPIClient = this.managementAPIClient.stack({
      api_key: exportConfig.apiKey,
      management_token: exportConfig.management_token,
    });
    this.exportConfig = exportConfig;
  }

  async start(): Promise<any> {
    // setup the branches
    await setupBranches(this.exportConfig, this.stackAPIClient);
    await setupExportDir(this.exportConfig);
    // if branches available run it export by branches
    if (this.exportConfig.branches) {
      this.exportConfig.branchEnabled = true;
      return this.exportByBranches();
    }
    return this.export();
  }

  async exportByBranches(): Promise<void> {
    // loop through the branches and export it parallel
    for (const branch of this.exportConfig.branches) {
      try {
        this.exportConfig.branchName = branch.uid;
        this.stackAPIClient.stackHeaders.branch = branch.uid;
        this.exportConfig.branchDir = path.join(this.exportConfig.exportDir, branch.uid);
        log(this.exportConfig, `Exporting content from branch ${branch.uid}`, 'success');
        writeExportMetaFile(this.exportConfig, this.exportConfig.branchDir);
        await this.export();
        log(this.exportConfig, `The content of branch ${branch.uid} has been exported successfully!`, 'success');
      } catch (error) {
        log(this.exportConfig, formatError(error), 'error');
        throw new Error(`Failed to export contents from branch ${branch.uid}`);
      }
    }
  }

  async export() {
    log(this.exportConfig, `Started to export content, version is ${this.exportConfig.contentVersion}`, 'info');
    // checks for single module or all modules
    if (this.exportConfig.singleModuleExport) {
      return this.exportSingleModule(this.exportConfig.moduleName);
    }
    return this.exportAllModules();
  }

  async exportByModuleByName(moduleName: Modules) {
    log(this.exportConfig, `Starting export of ${moduleName} module`, 'info');
    // export the modules by name
    // calls the module runner which inturn calls the module itself
    let exportedModuleResponse;
    if (this.exportConfig.contentVersion === 2) {
      exportedModuleResponse = await startModuleExport({
        stackAPIClient: this.stackAPIClient,
        exportConfig: this.exportConfig,
        moduleName,
      });
    } else {
      //NOTE - new modules support only ts
      if (this.exportConfig.onlyTSModules.indexOf(moduleName) === -1) {
        exportedModuleResponse = await startJSModuleExport({
          stackAPIClient: this.stackAPIClient,
          exportConfig: this.exportConfig,
          moduleName,
        });
      }
    }

    // set master locale to config
    if (moduleName === 'stack' && exportedModuleResponse?.code) {
      this.exportConfig.master_locale = { code: exportedModuleResponse.code };
    }
  }

  async exportSingleModule(moduleName: Modules): Promise<void> {
    // Note stack is always exported
    let exportModules: Modules[] = ['stack'];
    const {
      modules: { [moduleName]: { dependencies = [] } = {} },
    } = this.exportConfig;

    if (dependencies.length > 0) {
      exportModules = exportModules.concat(dependencies);
    }
    exportModules.push(moduleName);

    for (const moduleName of exportModules) {
      await this.exportByModuleByName(moduleName);
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
