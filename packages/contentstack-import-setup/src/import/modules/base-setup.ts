import { log, fsUtil } from '../../utils';
import { ImportConfig, ModuleClassParams } from '../../types';

export default class BaseImportSetup {
  public config: ImportConfig;
  public stackAPIClient: ModuleClassParams['stackAPIClient'];
  public dependencies: ModuleClassParams['dependencies'];

  constructor({ config, stackAPIClient, dependencies }: ModuleClassParams) {
    this.config = config;
    this.stackAPIClient = stackAPIClient;
    this.dependencies = dependencies;
  }

  async setupDependencies() {
    for (const moduleName of this.dependencies) {
      try {
        const modulePath = `./${moduleName}`;
        const { default: ModuleClass } = await import(modulePath);

        const modulePayload = {
          config: this.config,
          stackAPIClient: this.stackAPIClient,
        };

        const moduleInstance = new ModuleClass(modulePayload);
        await moduleInstance.start();
      } catch (error) {
        log(this.config, `Error importing '${moduleName}': ${error.message}`, 'error');
      }
    }
  }
}
