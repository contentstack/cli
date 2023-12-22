import { resolve } from 'path';
import { AuditFix } from '@contentstack/cli-audit';
import { addLocale, cliux, ContentstackClient } from '@contentstack/cli-utilities';

import startModuleImport from './modules';
import startJSModuleImport from './modules-js';
import { ImportConfig, Modules } from '../types';
import { backupHandler, log, validateBranch, masterLocalDetails, sanitizeStack, initLogger, trace } from '../utils';

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

    if (this.importConfig.management_token) {
      await addLocale(this.importConfig.apiKey, this.importConfig.management_token, this.importConfig.host);
    }

    const backupDir = await backupHandler(this.importConfig);
    if (backupDir) {
      this.importConfig.backupDir = backupDir;
      // To support the old config
      this.importConfig.data = backupDir;
    }

    // NOTE init log
    initLogger(this.importConfig);

    // NOTE audit and fix the import content.
    if (
      !this.importConfig.skipAudit &&
      (!this.importConfig.moduleName ||
        ['content-types', 'global-fields', 'entries'].includes(this.importConfig.moduleName))
    ) {
      if (!(await this.auditImportData())) {
        return;
      }
    }

    if (!this.importConfig.master_locale) {
      let masterLocalResponse = await masterLocalDetails(this.stackAPIClient);
      this.importConfig['master_locale'] = { code: masterLocalResponse.code };
      this.importConfig.masterLocale = { code: masterLocalResponse.code };
    }

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

  /**
   * The `auditImportData` function performs an audit process on imported data, using a specified
   * configuration, and returns a boolean indicating whether a fix is needed.
   * @returns The function `auditImportData()` returns a boolean value. It returns `true` if there is a
   * fix available and the user confirms to proceed with the fix, otherwise it returns `false`.
   */
  async auditImportData() {
    const basePath = resolve(this.importConfig.backupDir, 'logs', 'audit');
    const auditConfig = {
      noLog: false, // Skip logs printing on terminal
      skipConfirm: true, // Skip confirmation if any
      returnResponse: true, // On process completion should return config used in the command
      noTerminalOutput: false, // Skip final audit table output on terminal
      config: { basePath }, // To overwrite any build-in config. This config is equal to --config flag.
    };
    try {
      const args = [
        '--data-dir',
        this.importConfig.backupDir,
        '--external-config',
        JSON.stringify(auditConfig),
        '--report-path',
        basePath,
      ];

      if (this.importConfig.moduleName) {
        args.push('--modules', this.importConfig.moduleName);
      }

      log(this.importConfig, 'Starting audit process', 'info');
      const result = await AuditFix.run(args);
      log(this.importConfig, 'Starting audit process completed', 'info');

      if (result) {
        const { hasFix } = result;

        if (hasFix) {
          if (
            this.importConfig.forceStopMarketplaceAppsPrompt ||
            (await cliux.inquire({
              type: 'confirm',
              message: 'Can you check the fix on the given path and confirm if you would like to proceed with the fix?',
              name: 'confirmation',
            }))
          ) {
            return true;
          }

          return false;
        }
      }
    } catch (error) {
      trace(error);
      log(this.importConfig, `Audit failed with following error. ${error}`, 'error');
    }
  }
}

export default ModuleImporter;
