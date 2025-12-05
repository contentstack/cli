import * as path from 'path';
import {
  ContentstackClient,
  handleAndLogError,
  messageHandler,
  log,
  getBranchFromAlias,
  CLIProgressManager,
} from '@contentstack/cli-utilities';
import startModuleExport from './modules';
import { ExportConfig, Modules } from '../types';
import { setupBranches, setupExportDir } from '../utils';

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
    try {
      if (!this.exportConfig.branchName && this.exportConfig.branchAlias) {
        this.exportConfig.branchName = await getBranchFromAlias(this.stackAPIClient, this.exportConfig.branchAlias);
      }
      await setupBranches(this.exportConfig, this.stackAPIClient);
      await setupExportDir(this.exportConfig);
      // if branches available run it export by branches
      if (this.exportConfig.branches) {
        this.exportConfig.branchEnabled = true;
        return this.exportByBranches();
      }
      // If branches disabled then initialize the global summary
      CLIProgressManager.initializeGlobalSummary('EXPORT', this.exportConfig.branchName, 'Exporting content...');
      return this.export();
    } catch (error) {
      throw error;
    }
  }

  async exportByBranches(): Promise<void> {
    let targetBranch;

    if (this.exportConfig.branchName) {
      // User specified a branch - export only that branch
      targetBranch = this.exportConfig.branches.find((branch) => branch.uid === this.exportConfig.branchName);
      if (!targetBranch) {
        throw new Error(`Branch '${this.exportConfig.branchName}' not found in available branches`);
      }
    } else {
      // No specific branch mentioned - export only the main branch
      targetBranch = this.exportConfig.branches.find((branch) => branch.uid === 'main');
      if (!targetBranch) {
        throw new Error('No main branch or available branches found');
      }
    }

    try {
      this.exportConfig.branchName = targetBranch.uid;
      this.stackAPIClient.stackHeaders.branch = targetBranch.uid;
      this.exportConfig.branchDir = path.join(this.exportConfig.exportDir, targetBranch.uid);

      // Initialize progress manager for the target branch
      CLIProgressManager.clearGlobalSummary();
      CLIProgressManager.initializeGlobalSummary(
        `EXPORT-${targetBranch.uid}`,
        targetBranch.uid,
        `Exporting "${targetBranch.uid}" branch content...`,
      );

      log.info(`Exporting content from '${targetBranch.uid}' branch`, this.exportConfig.context);
      await this.export();
      CLIProgressManager.printGlobalSummary();

      log.success(
        `The content of branch ${targetBranch.uid} has been exported successfully!`,
        this.exportConfig.context,
      );
    } catch (error) {
      handleAndLogError(
        error,
        { ...this.exportConfig.context, branch: targetBranch?.uid },
        messageHandler.parse('FAILED_EXPORT_CONTENT_BRANCH', { branch: targetBranch?.uid }),
      );
      throw new Error(messageHandler.parse('FAILED_EXPORT_CONTENT_BRANCH', { branch: targetBranch?.uid }));
    }
  }

  async export() {
    log.info(`Started to export content`, this.exportConfig.context);
    // checks for single module or all modules
    if (this.exportConfig.singleModuleExport) {
      return this.exportSingleModule(this.exportConfig.moduleName);
    }
    return this.exportAllModules();
  }

  async exportByModuleByName(moduleName: Modules) {
    log.info(`Exporting module: '${moduleName}'...`, this.exportConfig.context);
    // export the modules by name
    // calls the module runner which inturn calls the module itself
    await startModuleExport({
      stackAPIClient: this.stackAPIClient,
      exportConfig: this.exportConfig,
      moduleName,
    });
  }

  async exportSingleModule(moduleName: Modules): Promise<void> {
    // Note stack is always exported
    let exportModules: Modules[] = [];
    if (!this.exportConfig.skipStackSettings) {
      exportModules.push('stack');
    }

    if (!this.exportConfig.skipDependencies) {
      const {
        modules: { [moduleName]: { dependencies = [] } = {} },
      } = this.exportConfig;

      if (dependencies.length > 0) {
        exportModules = exportModules.concat(dependencies);
      }
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
