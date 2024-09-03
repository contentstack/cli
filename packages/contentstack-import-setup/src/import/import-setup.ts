import { ImportConfig } from '../types';
import { log } from '../utils';

export default class ImportSetup {
  protected config: ImportConfig;
  public mapperLogic: { [key: string]: string[] } = {};

  constructor(config: ImportConfig) {
    this.config = config;
  }

  /**
   * Generate mapper logic
   * This method generates mapper logic based on the selected modules
   * @returns {Promise<Array<void | string>>}
   */
  protected async generateMapperLogic() {
    function getAllDependencies(module: string, visited: Set<string> = new Set()): string[] {
      if (visited.has(module)) return [];

      visited.add(module);
      let dependencies = this.config.modules[module]?.dependencies || [];

      for (const dependency of dependencies) {
        dependencies = dependencies.concat(getAllDependencies(dependency, visited));
      }

      return dependencies;
    }

    for (const module of this.config.selectedModules) {
      const allDependencies = getAllDependencies(module);
      this.mapperLogic[module] = Array.from(new Set(allDependencies));
    }

    log(this.config, 'Mapper logic generated:', 'info');
  }

  /**
   * Run module imports based on the selected modules
   * This method dynamically imports modules based on the selected modules
   * and runs the start method of each module
   * @returns {Promise<void>}
   */
  protected async runModuleImports() {
    for (const moduleName in this.mapperLogic) {
      try {
        const modulePath = `./${moduleName}`;
        const { default: ModuleClass } = await import(modulePath);

        const modulePayload = {
          config: this.config,
          dependencies: this.mapperLogic[moduleName],
        };

        const moduleInstance = new ModuleClass(modulePayload);
        await moduleInstance.start();
      } catch (error) {
        log(this.config, `Error importing '${moduleName}': ${error.message}`, 'error');
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
      await this.generateMapperLogic();
      await this.runModuleImports();
    } catch (error) {
      log(this.config, `An error occurred during import setup: ${error.message}`, 'error');
    }
  }
}
