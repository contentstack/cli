import Module from 'module';
import { ImportConfig, Modules } from '../types';
import { backupHandler, log } from '../utils';
import { ContentstackClient, formatError } from '@contentstack/cli-utilities';

export default class ImportSetup {
  protected config: ImportConfig;
  private managementAPIClient: ContentstackClient;
  private importConfig: ImportConfig;
  private stackAPIClient: any;
  public dependencyTree: { [key: string]: string[] } = {};

  constructor(config: ImportConfig, managementAPIClient: ContentstackClient) {
    this.config = config;
    this.managementAPIClient = managementAPIClient;
    this.stackAPIClient = this.managementAPIClient.stack({
      api_key: this.config.apiKey,
      management_token: this.config.management_token,
    });
  }

  /**
   * Generate mapper logic
   * This method generates dependency tree based on the selected modules
   * @returns {Promise<Array<void | string>>}
   */
  protected async generateDependencyTree() {
    type ModulesKey = keyof typeof this.config.modules;

    const getAllDependencies = (module: ModulesKey, visited: Set<string> = new Set()): Modules[] => {
      if (visited.has(module)) return [];

      visited.add(module);
      let dependencies: Modules[] = this.config.modules[module as ModulesKey]?.dependencies || [];

      for (const dependency of dependencies) {
        dependencies = dependencies.concat(getAllDependencies(dependency as ModulesKey, visited));
      }

      return dependencies;
    };

    for (const module of this.config.selectedModules) {
      const allDependencies = getAllDependencies(module as ModulesKey);
      this.dependencyTree[module] = Array.from(new Set(allDependencies));
    }
  }

  /**
   * Run module imports based on the selected modules
   * This method dynamically imports modules based on the selected modules
   * and runs the start method of each module
   * @returns {Promise<void>}
   */
  protected async runModuleImports() {
    for (const moduleName in this.dependencyTree) {
      try {
        const modulePath = `./modules/${moduleName}`;
        const { default: ModuleClass } = await import(modulePath);

        const modulePayload = {
          config: this.config,
          dependencies: this.dependencyTree[moduleName],
          stackAPIClient: this.stackAPIClient,
        };

        const moduleInstance = new ModuleClass(modulePayload);
        await moduleInstance.start();
      } catch (error) {
        log(this.config, `Error importing '${moduleName}': ${formatError(error)}`, 'error');
        throw error;
      }
    }
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

      const backupDir = await backupHandler(this.config);
      if (backupDir) {
        this.config.backupDir = backupDir;
      }
      await this.generateDependencyTree();
      await this.runModuleImports();
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
