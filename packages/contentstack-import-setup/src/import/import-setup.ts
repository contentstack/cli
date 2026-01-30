import { ImportConfig, Modules } from '../types';
import { backupHandler as defaultBackupHandler, setupBranchConfig as defaultSetupBranchConfig } from '../utils';
import {
  ContentstackClient,
  log as defaultLog,
  handleAndLogError as defaultHandleAndLogError,
} from '@contentstack/cli-utilities';

/**
 * Dependencies for ImportSetup - can be injected for testing
 */
export interface ImportSetupDeps {
  backupHandler?: typeof defaultBackupHandler;
  setupBranchConfig?: typeof defaultSetupBranchConfig;
  log?: typeof defaultLog;
  handleAndLogError?: typeof defaultHandleAndLogError;
}

export default class ImportSetup {
  protected config: ImportConfig;
  private readonly managementAPIClient: ContentstackClient;
  private readonly importConfig: ImportConfig;
  private readonly stackAPIClient: any;
  public dependencyTree: { [key: string]: string[] } = {};

  // Injected dependencies
  private readonly backupHandler: typeof defaultBackupHandler;
  private readonly setupBranchConfig: typeof defaultSetupBranchConfig;
  private readonly log: typeof defaultLog;
  private readonly handleAndLogError: typeof defaultHandleAndLogError;

  constructor(config: ImportConfig, managementAPIClient: ContentstackClient, deps: ImportSetupDeps = {}) {
    this.config = config;
    this.managementAPIClient = managementAPIClient;
    this.stackAPIClient = this.managementAPIClient.stack({
      api_key: this.config.apiKey,
      management_token: this.config.management_token,
    });

    // Use injected dependencies or defaults
    this.backupHandler = deps.backupHandler ?? defaultBackupHandler;
    this.setupBranchConfig = deps.setupBranchConfig ?? defaultSetupBranchConfig;
    this.log = deps.log ?? defaultLog;
    this.handleAndLogError = deps.handleAndLogError ?? defaultHandleAndLogError;
  }

  /**
   * Generate mapper logic
   * This method generates dependency tree based on the selected modules
   * @returns {Promise<Array<void | string>>}
   */
  protected async generateDependencyTree() {
    type ModulesKey = keyof typeof this.config.modules;
    const visited: Set<string> = new Set();
    const assignedDependencies: Set<string> = new Set(); // Track assigned dependencies

    const getAllDependencies = (module: ModulesKey): Modules[] => {
      if (visited.has(module)) return [];

      visited.add(module);
      const dependencies: Modules[] = this.config.modules[module]?.dependencies || [];

      const allDeps: Modules[] = [...dependencies];

      for (const dependency of dependencies) {
        allDeps.push(...getAllDependencies(dependency as ModulesKey));
      }

      return allDeps;
    };

    this.dependencyTree = {}; // Reset before building

    for (const module of this.config.selectedModules) {
      let allDependencies = getAllDependencies(module as ModulesKey);
      allDependencies = allDependencies.filter((dep) => !assignedDependencies.has(dep)); // Remove assigned ones

      this.dependencyTree[module] = allDependencies;

      // Mark these dependencies as assigned so they won't be included in later modules
      for (const dep of allDependencies) {
        assignedDependencies.add(dep);
      }
    }
  }

  /**
   * Run module imports based on the selected modules
   * This method dynamically imports modules based on the selected modules
   * and runs the start method of each module
   * @returns {Promise<void>}
   */
  protected async runModuleImports() {
    this.log.debug('Starting module imports', { modules: Object.keys(this.dependencyTree) });
    for (const moduleName in this.dependencyTree) {
      try {
        this.log.debug(`Importing module: ${moduleName}`, {
          moduleName,
          dependencies: this.dependencyTree[moduleName],
        });
        const modulePath = `./modules/${moduleName}`;
        const { default: ModuleClass } = await import(modulePath);

        const modulePayload = {
          config: this.config,
          dependencies: this.dependencyTree[moduleName],
          stackAPIClient: this.stackAPIClient,
        };

        const moduleInstance = new ModuleClass(modulePayload);
        await moduleInstance.start();
        this.log.debug(`Module ${moduleName} imported successfully`);
      } catch (error) {
        this.handleAndLogError(
          error,
          { ...this.config.context, moduleName },
          `Error occurred while importing '${moduleName}'`,
        );
        throw error;
      }
    }
    this.log.debug('All module imports completed');
  }

  /**
   * Start the import setup process
   * This method generates mapper logic and runs module imports
   * based on the selected modules
   * @returns {Promise<void>}
   */
  async start() {
    try {
      if (!this.config.management_token) {
        const stackDetails: Record<string, unknown> = await this.stackAPIClient.fetch();
        this.config.stackName = stackDetails.name as string;
        this.config.org_uid = stackDetails.org_uid as string;
      }

      this.log.debug('Creating backup directory');
      const backupDir = await this.backupHandler(this.config);
      if (backupDir) {
        this.config.backupDir = backupDir;
        this.log.debug('Backup directory created', { backupDir });
      }

      this.log.debug('Setting up branch configuration');
      await this.setupBranchConfig(this.config, this.stackAPIClient);
      this.log.debug('Branch configuration completed', { branchName: this.config.branchName });

      await this.generateDependencyTree();
      await this.runModuleImports();
      this.log.debug('Import setup process completed successfully');
    } catch (error) {
      this.handleAndLogError(error, { ...this.config.context }, 'Import setup failed');
      throw error;
    }
  }
}
